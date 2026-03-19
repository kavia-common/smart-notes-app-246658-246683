"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger";
  small?: boolean;
};

// PUBLIC_INTERFACE
export function Button({ className, variant = "default", small, ...props }: Props) {
  /** Retro button component with variants. */
  return (
    <button
      {...props}
      className={cn(
        "retro-btn inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed",
        variant === "primary" && "retro-btn-primary",
        variant === "danger" && "retro-btn-danger",
        small && "px-3 py-2 text-sm",
        className,
      )}
    />
  );
}
