"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Note, SyncConflict } from "@/lib/types";
import { createEmptyNote, listNotes, parseTags, seedDemoNotes, softDeleteNote, upsertNote } from "@/lib/notes";
import { cn, formatShortDate } from "@/lib/utils";
import { enqueueDelete, enqueueUpsert, getQueueCount, startBackgroundSync, syncNow } from "@/lib/sync";
import { getStoredSyncEnabled, getStoredTheme, setStoredSyncEnabled, setStoredTheme, type Theme } from "@/lib/settings";
import { getRuntimeConfig } from "@/lib/runtimeConfig";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/app/providers";

type FilterMode = "all" | "favorites" | "pinned";

function noteMatchesQuery(n: Note, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  return (
    n.title.toLowerCase().includes(query) ||
    n.content.toLowerCase().includes(query) ||
    n.tags.some((t) => t.includes(query))
  );
}

function getAllTags(notes: Note[]): string[] {
  const set = new Set<string>();
  notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// PUBLIC_INTERFACE
export function AppShell({ ownerId, onLogout }: { ownerId: string; onLogout: () => void }) {
  /** Main in-app UI: list + editor + sidebar + settings + sync indicators. */
  const { addToast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const [theme, setThemeState] = useState<Theme>("light");
  const [syncEnabled, setSyncEnabled] = useState(true);

  const [syncStatus, setSyncStatus] = useState("—");
  const [queueCount, setQueueCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [apiBaseLabel, setApiBaseLabel] = useState("—");

  const disposerRef = useRef<null | (() => void)>(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const visibleNotes = useMemo(() => {
    let list = notes;

    if (filterMode === "favorites") list = list.filter((n) => n.favorite);
    if (filterMode === "pinned") list = list.filter((n) => n.pinned);
    if (activeTag) list = list.filter((n) => n.tags.includes(activeTag));
    if (query.trim()) list = list.filter((n) => noteMatchesQuery(n, query));

    return list.sort((a, b) => {
      // pinned first, then updated
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, filterMode, activeTag, query]);

  const tags = useMemo(() => getAllTags(notes), [notes]);

  async function refreshNotes(selectId?: string | null) {
    const list = await listNotes(ownerId);
    setNotes(list);
    if (selectId !== undefined) setSelectedId(selectId);
  }

  useEffect(() => {
    // load persisted settings
    const t = getStoredTheme();
    setThemeState(t);
    setSyncEnabled(getStoredSyncEnabled());
  }, []);

  useEffect(() => {
    (async () => {
      const cfg = await getRuntimeConfig();
      setApiBaseLabel(cfg.apiBase || "—");
    })();
  }, []);

  useEffect(() => {
    // initial notes load and seed if empty
    (async () => {
      const list = await listNotes(ownerId);
      if (list.length === 0) {
        await seedDemoNotes(ownerId);
      }
      await refreshNotes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  useEffect(() => {
    // background sync loop
    if (disposerRef.current) disposerRef.current();
    disposerRef.current = startBackgroundSync(ownerId, {
      onConflict: (c) => {
        setConflicts((prev) => {
          const exists = prev.some((x) => x.noteId === c.noteId);
          return exists ? prev : [c, ...prev];
        });
        addToast("error", "Sync conflict detected. Open Sync to resolve.");
      },
      onStatus: (s) => setSyncStatus(s),
    });

    const interval = window.setInterval(async () => {
      const cnt = await getQueueCount(ownerId);
      setQueueCount(cnt);
    }, 1800);

    return () => {
      if (disposerRef.current) disposerRef.current();
      window.clearInterval(interval);
    };
  }, [ownerId, addToast]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    setStoredSyncEnabled(syncEnabled);
  }, [syncEnabled]);

  const openNewNote = async () => {
    const note = createEmptyNote(ownerId);
    await upsertNote(note);
    await enqueueUpsert(ownerId, note);
    await refreshNotes(note.id);
    addToast("success", "New note created.");
  };

  const updateSelected = async (patch: Partial<Note>) => {
    if (!selectedNote) return;
    const next: Note = { ...selectedNote, ...patch, updatedAt: Date.now() };
    await upsertNote(next);
    await enqueueUpsert(ownerId, next);
    setNotes((prev) => prev.map((n) => (n.id === next.id ? next : n)));
  };

  const deleteSelected = async () => {
    if (!selectedNote) return;
    await softDeleteNote(selectedNote);
    await enqueueDelete(ownerId, selectedNote.id);
    setSelectedId(null);
    await refreshNotes(null);
    addToast("info", "Note deleted.");
  };

  const resolveConflict = async (noteId: string, choice: "keep_local" | "take_remote") => {
    const c = conflicts.find((x) => x.noteId === noteId);
    if (!c) return;
    const chosen = choice === "keep_local" ? c.local : c.remote;
    await upsertNote(chosen);
    await enqueueUpsert(ownerId, chosen);
    setConflicts((prev) => prev.filter((x) => x.noteId !== noteId));
    await refreshNotes(chosen.id);
    addToast("success", "Conflict resolved.");
  };

  const runSyncNow = async () => {
    if (!syncEnabled) {
      addToast("info", "Sync disabled in Settings.");
      return;
    }
    const result = await syncNow(ownerId, {
      onConflict: (c) => setConflicts((prev) => [c, ...prev]),
      maxItems: 50,
    });
    setQueueCount(result.remaining);
    if (result.pausedUnsupported) {
      addToast("info", "Sync paused: backend endpoints not available yet.");
    } else if (result.synced > 0) {
      addToast("success", `Synced ${result.synced} changes.`);
    } else {
      addToast("info", result.remaining ? `Pending ${result.remaining}.` : "All caught up.");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur border-b-2 border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="retro-title text-lg">Smart Notes</div>
            <span className="retro-badge">offline-first</span>
          </div>

          <div className="hidden md:block flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, tags, content…"
              aria-label="Search"
              className="h-10"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button className="md:hidden" onClick={() => setMobileSidebarOpen(true)} small>
              Filters
            </Button>
            <Button variant="primary" onClick={openNewNote} small>
              + New
            </Button>
            <Button onClick={() => setSyncOpen(true)} small>
              Sync <span className="retro-chip">{queueCount}</span>
            </Button>
            <Button onClick={() => setSettingsOpen(true)} small>
              Settings
            </Button>
            <Button onClick={onLogout} small>
              Sign out
            </Button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search"
            className="h-10"
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[260px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block retro-card p-3 h-fit sticky top-[92px]">
          <div className="retro-title text-sm">Filters</div>
          <div className="mt-2 flex flex-col gap-2">
            <Button
              small
              className={cn(filterMode === "all" && "retro-btn-primary")}
              onClick={() => {
                setFilterMode("all");
                setActiveTag(null);
              }}
            >
              All notes <span className="retro-chip">{notes.length}</span>
            </Button>
            <Button
              small
              className={cn(filterMode === "favorites" && "retro-btn-primary")}
              onClick={() => {
                setFilterMode("favorites");
                setActiveTag(null);
              }}
            >
              Favorites
            </Button>
            <Button
              small
              className={cn(filterMode === "pinned" && "retro-btn-primary")}
              onClick={() => {
                setFilterMode("pinned");
                setActiveTag(null);
              }}
            >
              Pinned
            </Button>
          </div>

          <div className="my-3 retro-divider" />

          <div className="flex items-center justify-between">
            <div className="retro-title text-sm">Tags</div>
            {activeTag ? (
              <button
                className="text-xs retro-muted underline"
                onClick={() => setActiveTag(null)}
              >
                clear
              </button>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <div className="text-xs retro-muted">No tags yet.</div>
            ) : (
              tags.map((t) => (
                <button
                  key={t}
                  className={cn("retro-chip", activeTag === t && "retro-btn-primary")}
                  onClick={() => {
                    setActiveTag(t);
                    setFilterMode("all");
                  }}
                >
                  #{t}
                </button>
              ))
            )}
          </div>

          <div className="my-3 retro-divider" />
          <div className="text-xs retro-muted">
            <div className="retro-title text-xs">Sync</div>
            <div className="mt-1">{syncStatus}</div>
          </div>
        </aside>

        {/* Content */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <div className="retro-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="retro-title text-sm">Notes</div>
              <div className="text-xs retro-muted">{visibleNotes.length} shown</div>
            </div>
            <div className="my-3 retro-divider" />

            <div className="flex flex-col gap-2">
              {visibleNotes.length === 0 ? (
                <div className="retro-inset p-3 text-sm">
                  No notes match your filters. Try clearing search/tags, or create a new note.
                </div>
              ) : (
                visibleNotes.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      "text-left rounded-xl border-2 p-3 transition-colors",
                      "border-[var(--border)]",
                      selectedId === n.id ? "bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" : "bg-[var(--surface)]",
                    )}
                    onClick={() => setSelectedId(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {n.title.trim() ? n.title : "(untitled)"}
                        </div>
                        <div className="mt-1 text-xs retro-muted">
                          {formatShortDate(n.updatedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {n.pinned ? <span className="retro-chip">PIN</span> : null}
                        {n.favorite ? <span className="retro-chip">FAV</span> : null}
                      </div>
                    </div>
                    <div className="mt-2 text-xs retro-muted line-clamp-2">
                      {n.content.trim() ? n.content : "—"}
                    </div>
                    {n.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {n.tags.slice(0, 6).map((t) => (
                          <span key={t} className="retro-chip">
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="retro-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="retro-title text-sm">Editor</div>
                <div className="mt-1 text-xs retro-muted">
                  {selectedNote ? `Editing: ${selectedNote.title || "(untitled)"}` : "Select a note to edit."}
                </div>
              </div>
              {selectedNote ? (
                <Button variant="danger" onClick={deleteSelected} small>
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="my-3 retro-divider" />

            {!selectedNote ? (
              <div className="retro-inset p-4 text-sm">
                Pick a note on the left, or click <b>+ New</b>.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Input
                  label="Title"
                  value={selectedNote.title}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="A bold title…"
                />

                <label className="block">
                  <div className="mb-1 text-sm retro-title">Tags</div>
                  <input
                    className="retro-input"
                    value={selectedNote.tags.join(", ")}
                    onChange={(e) => updateSelected({ tags: parseTags(e.target.value) })}
                    placeholder="work, ideas, todo"
                  />
                  <div className="mt-1 text-xs retro-muted">Comma-separated, auto-normalized.</div>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    small
                    className={cn(selectedNote.pinned && "retro-btn-primary")}
                    onClick={() => updateSelected({ pinned: !selectedNote.pinned })}
                  >
                    {selectedNote.pinned ? "Pinned" : "Pin"}
                  </Button>
                  <Button
                    small
                    className={cn(selectedNote.favorite && "retro-btn-primary")}
                    onClick={() => updateSelected({ favorite: !selectedNote.favorite })}
                  >
                    {selectedNote.favorite ? "Favorited" : "Favorite"}
                  </Button>
                </div>

                <Textarea
                  label="Content"
                  value={selectedNote.content}
                  onChange={(e) => updateSelected({ content: e.target.value })}
                  placeholder="Type like it’s 1999…"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs retro-muted">
                    Updated: <span className="font-semibold">{formatShortDate(selectedNote.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={runSyncNow} small>
                      Sync now
                    </Button>
                    <Button
                      onClick={async () => {
                        await refreshNotes(selectedNote.id);
                        addToast("info", "Reloaded from device storage.");
                      }}
                      small
                    >
                      Reload
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile sidebar drawer */}
      <Modal
        open={mobileSidebarOpen}
        title="Filters & Tags"
        onClose={() => setMobileSidebarOpen(false)}
      >
        <div className="flex flex-col gap-2">
          <Button
            small
            className={cn(filterMode === "all" && "retro-btn-primary")}
            onClick={() => {
              setFilterMode("all");
              setActiveTag(null);
              setMobileSidebarOpen(false);
            }}
          >
            All notes <span className="retro-chip">{notes.length}</span>
          </Button>
          <Button
            small
            className={cn(filterMode === "favorites" && "retro-btn-primary")}
            onClick={() => {
              setFilterMode("favorites");
              setActiveTag(null);
              setMobileSidebarOpen(false);
            }}
          >
            Favorites
          </Button>
          <Button
            small
            className={cn(filterMode === "pinned" && "retro-btn-primary")}
            onClick={() => {
              setFilterMode("pinned");
              setActiveTag(null);
              setMobileSidebarOpen(false);
            }}
          >
            Pinned
          </Button>

          <div className="my-2 retro-divider" />
          <div className="retro-title text-sm">Tags</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <div className="text-xs retro-muted">No tags yet.</div>
            ) : (
              tags.map((t) => (
                <button
                  key={t}
                  className={cn("retro-chip", activeTag === t && "retro-btn-primary")}
                  onClick={() => {
                    setActiveTag(t);
                    setFilterMode("all");
                    setMobileSidebarOpen(false);
                  }}
                >
                  #{t}
                </button>
              ))
            )}
          </div>

          <div className="my-2 retro-divider" />
          <div className="text-xs retro-muted">
            <div className="retro-title text-xs">Sync</div>
            <div className="mt-1">{syncStatus}</div>
          </div>
        </div>
      </Modal>

      {/* Settings */}
      <Modal
        open={settingsOpen}
        title="Settings"
        onClose={() => setSettingsOpen(false)}
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setSettingsOpen(false);
              addToast("success", "Settings saved.");
            }}
          >
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Toggle
            label="Dark mode"
            checked={theme === "dark"}
            onChange={(v) => setThemeState(v ? "dark" : "light")}
            description="Switch between light/dark. Stored on this device."
          />
          <Toggle
            label="Cloud sync enabled"
            checked={syncEnabled}
            onChange={setSyncEnabled}
            description="When enabled, app will attempt to flush the offline queue when online. If the backend lacks endpoints, sync will pause automatically."
          />
          <div className="retro-inset p-3 text-xs retro-muted">
            Tip: This frontend is fully usable offline via IndexedDB. When online and signed in with cloud auth,
            sync pushes your offline queue and pulls updates from the backend.
          </div>
        </div>
      </Modal>

      {/* Sync & conflicts */}
      <Modal
        open={syncOpen}
        title="Sync Queue"
        onClose={() => setSyncOpen(false)}
        footer={
          <>
            <Button onClick={runSyncNow} variant="primary">
              Sync now
            </Button>
            <Button onClick={() => setSyncOpen(false)}>Close</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="retro-inset p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="retro-title text-sm">Status</div>
              <span className="retro-chip">{syncEnabled ? "ENABLED" : "DISABLED"}</span>
            </div>
            <div className="mt-2 text-sm">{syncStatus}</div>
            <div className="mt-2 text-xs retro-muted">
              API base:{" "}
              <span className="font-mono">
                {apiBaseLabel}
              </span>
            </div>
          </div>

          <div className="retro-inset p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="retro-title text-sm">Queue</div>
              <span className="retro-chip">{queueCount}</span>
            </div>
            <div className="mt-2 text-xs retro-muted">
              Changes are queued whenever you edit notes. When online, the app tries to flush the queue.
            </div>
          </div>

          <div className="retro-inset p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="retro-title text-sm">Conflicts</div>
              <span className="retro-chip">{conflicts.length}</span>
            </div>

            {conflicts.length === 0 ? (
              <div className="mt-2 text-xs retro-muted">No conflicts detected.</div>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {conflicts.map((c) => (
                  <div key={c.noteId} className="retro-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {(c.local.title || c.remote.title || "(untitled)")}
                        </div>
                        <div className="mt-1 text-xs retro-muted">
                          Detected: {formatShortDate(c.detectedAt)}
                        </div>
                      </div>
                      <span className="retro-badge">CONFLICT</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div className="retro-inset p-2">
                        <div className="retro-title text-xs">Local</div>
                        <div className="mt-1 text-xs retro-muted line-clamp-4">
                          {c.local.content || "—"}
                        </div>
                      </div>
                      <div className="retro-inset p-2">
                        <div className="retro-title text-xs">Remote</div>
                        <div className="mt-1 text-xs retro-muted line-clamp-4">
                          {c.remote.content || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button small onClick={() => resolveConflict(c.noteId, "keep_local")} variant="primary">
                        Keep local
                      </Button>
                      <Button small onClick={() => resolveConflict(c.noteId, "take_remote")}>
                        Take remote
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Mobile FAB */}
      <button
        onClick={openNewNote}
        className={cn(
          "fixed bottom-5 right-5 md:hidden",
          "retro-btn retro-btn-primary h-14 w-14 rounded-full text-xl",
        )}
        aria-label="Create new note"
        title="New note"
      >
        +
      </button>
    </div>
  );
}
