"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

// PUBLIC_INTERFACE
export function Modal({ open, title, onClose, children, footer, className }: Props) {
  /** Simple modal dialog (ESC to close). */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        className={cn("relative z-10 w-[min(720px,100%)] retro-card p-4", className)}
      >
        <header className="flex items-start justify-between gap-3">
          <h2 className="retro-title text-lg">{title}</h2>
          <Button onClick={onClose} small>
            Close
          </Button>
        </header>
        <div className="my-3 retro-divider" />
        <div className="text-sm">{children}</div>
        {footer ? (
          <>
            <div className="my-3 retro-divider" />
            <footer className="flex flex-wrap items-center justify-end gap-2">{footer}</footer>
          </>
        ) : null}
      </section>
    </div>
  );
}
