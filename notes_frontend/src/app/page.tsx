import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="retro-card p-6 w-[min(720px,100%)]">
        <header>
          <h1 className="retro-title text-2xl">Smart Notes</h1>
          <p className="mt-2 text-sm retro-muted">
            Retro-themed notes app with tags, pin/favorite, search, settings (light/dark), and offline-first storage.
          </p>
        </header>

        <div className="my-5 retro-divider" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="retro-inset p-4">
            <div className="retro-title text-sm">Offline-first</div>
            <p className="mt-2 text-sm retro-muted">
              Notes live in IndexedDB. Works with or without network.
            </p>
          </div>
          <div className="retro-inset p-4">
            <div className="retro-title text-sm">Organize</div>
            <p className="mt-2 text-sm retro-muted">
              Search + tags + pin + favorite. Filter in the sidebar.
            </p>
          </div>
          <div className="retro-inset p-4">
            <div className="retro-title text-sm">Sync queue</div>
            <p className="mt-2 text-sm retro-muted">
              Changes queue offline. Sync runs best-effort when online.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link className="retro-btn retro-btn-primary" href="/login">
            Sign in
          </Link>
          <Link className="retro-btn" href="/register">
            Create account
          </Link>
          <Link className="retro-btn" href="/app">
            Open app
          </Link>
        </div>

        <p className="mt-4 text-xs retro-muted">
          Note: Backend endpoints for sync may be expanded later. The frontend will automatically pause sync if endpoints are missing.
        </p>
      </section>
    </main>
  );
}
