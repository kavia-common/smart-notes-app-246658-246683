"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";

// PUBLIC_INTERFACE
export default function AppPage() {
  /** Auth-guarded in-app experience (notes + settings + sync). */
  const router = useRouter();
  const { status, session, logout } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <section className="retro-card p-5 w-[min(520px,100%)]">
          <div className="retro-title text-lg">Loading</div>
          <div className="mt-2 text-sm retro-muted">Warming up the cassette deck…</div>
        </section>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppShell
      ownerId={session.userId}
      onLogout={() => {
        logout();
        router.replace("/login");
      }}
    />
  );
}
