import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="retro-card p-6 w-[min(560px,100%)]" role="alert" aria-live="assertive">
        <header>
          <h1 className="retro-title text-xl">404 — Page Not Found</h1>
          <p className="mt-2 text-sm retro-muted">
            The page you’re looking for doesn’t exist.
          </p>
        </header>
        <div className="my-4 retro-divider" />
        <Link className="retro-btn retro-btn-primary inline-flex" href="/">
          Back home
        </Link>
      </section>
    </main>
  );
}
