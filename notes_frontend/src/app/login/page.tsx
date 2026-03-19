"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth, useToast } from "@/app/providers";

// PUBLIC_INTERFACE
export default function LoginPage() {
  /** Login screen (local device auth) with redirect to /app on success. */
  const router = useRouter();
  const { status, session, login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session) router.replace("/app");
  }, [status, session, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/app");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="retro-card p-5 w-[min(520px,100%)]">
        <header>
          <h1 className="retro-title text-xl">Sign In</h1>
          <p className="mt-2 text-sm retro-muted">
            Sign in to sync across devices. If you’re offline, a local-only fallback is available.
          </p>
        </header>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between gap-3">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <Link className="text-sm underline retro-muted" href="/register">
              Create account
            </Link>
          </div>
        </form>

        <div className="mt-4 retro-inset p-3 text-xs retro-muted">
          Tip: Notes are always saved to IndexedDB for offline use; sync runs when online.
        </div>
      </section>
    </main>
  );
}
