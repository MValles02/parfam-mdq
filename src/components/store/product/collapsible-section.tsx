"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;

// Desktop on the server so the plain, always-expanded markup is rendered
// without JavaScript.
const getServerSnapshot = () => true;

/**
 * At `lg` and up renders the title and children in a plain `<div>`, with no
 * disclosure semantics or extra tab stops. Below `lg` renders a native
 * `<details>` whose summary toggles the content; it starts open only when
 * `defaultOpenOnMobile` is set. `title` is the section heading element.
 */
export function CollapsibleSection({
  title,
  defaultOpenOnMobile = false,
  className,
  children,
}: {
  title: ReactNode;
  defaultOpenOnMobile?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpenOnMobile);
  const isDesktop = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (isDesktop) {
    return (
      <div className={className}>
        {title}
        {children}
      </div>
    );
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={className}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm [&::-webkit-details-marker]:hidden",
          FOCUS_VISIBLE,
        )}
      >
        {title}
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </summary>
      {children}
    </details>
  );
}
