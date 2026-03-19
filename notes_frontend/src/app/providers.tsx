"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/settings";
import { clearSession, getSession, loginLocal, registerLocal } from "@/lib/auth";
import type { Session } from "@/lib/types";

/** Toast types shown in the UI. */
type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  // PUBLIC_INTERFACE
  addToast: (kind: ToastKind, message: string) => void;
  // PUBLIC_INTERFACE
  dismissToast: (id: string) => void;
  toasts: ToastItem[];
};

const ToastContext = createContext<ToastApi | null>(null);

// PUBLIC_INTERFACE
export function useToast(): ToastApi {
  /** Hook to show snackbars/toasts. */
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <Providers />");
  return ctx;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthApi = {
  status: AuthStatus;
  session: Session | null;
  // PUBLIC_INTERFACE
  login: (email: string, password: string) => Promise<void>;
  // PUBLIC_INTERFACE
  register: (email: string, password: string) => Promise<void>;
  // PUBLIC_INTERFACE
  logout: () => void;
};

const AuthContext = createContext<AuthApi | null>(null);

// PUBLIC_INTERFACE
export function useAuth(): AuthApi {
  /** Hook to access authenticated session and login/register/logout actions. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <Providers />");
  return ctx;
}

// PUBLIC_INTERFACE
export default function Providers({ children }: { children: React.ReactNode }) {
  /** App-wide client providers: theme, auth session, toasts. */
  const [theme, setTheme] = useState<Theme>("light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Theme init: sync from localStorage as early as possible on the client.
  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    document.documentElement.dataset.theme = stored;
  }, []);

  const addToast = useCallback((kind: ToastKind, message: string) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const next: ToastItem = { id, kind, message };
    setToasts((prev) => [next, ...prev].slice(0, 3));
    // Auto-dismiss after ~3.5s
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Session init
  useEffect(() => {
    const s = getSession();
    setSession(s);
    setStatus(s ? "authenticated" : "unauthenticated");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const s = await loginLocal(email, password);
      setSession(s);
      setStatus("authenticated");
      addToast("success", "Welcome back!");
    },
    [addToast],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const s = await registerLocal(email, password);
      setSession(s);
      setStatus("authenticated");
      addToast("success", "Account created.");
    },
    [addToast],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setStatus("unauthenticated");
    addToast("info", "Signed out.");
  }, [addToast]);

  // React to theme changes (settings modal will call setStoredTheme directly).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setStoredTheme(theme);
  }, [theme]);

  const toastApi = useMemo<ToastApi>(() => ({ addToast, dismissToast, toasts }), [addToast, dismissToast, toasts]);

  const authApi = useMemo<AuthApi>(
    () => ({
      status,
      session,
      login,
      register,
      logout,
    }),
    [status, session, login, register, logout],
  );

  return (
    <AuthContext.Provider value={authApi}>
      <ToastContext.Provider value={toastApi}>
        {children}
        <div
          aria-live="polite"
          aria-relevant="additions"
          className="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
        >
          {toasts.map((t) => (
            <button
              key={t.id}
              onClick={() => dismissToast(t.id)}
              className="retro-card px-3 py-3 text-left"
              title="Dismiss"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="retro-title text-sm">
                  {t.kind === "success" ? "OK" : t.kind === "error" ? "ERR" : "INFO"}
                </div>
                <div className="text-sm retro-muted">tap to dismiss</div>
              </div>
              <div className="mt-1 text-sm">{t.message}</div>
            </button>
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
