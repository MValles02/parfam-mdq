"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Native `<details>` that collapses below `lg` and is always expanded at `lg`
 * and up. It starts open so the server render and the first client render
 * match and the content is visible without JavaScript; the collapsed default
 * is applied after mount. `title` is the section heading element.
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
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    // Deferred so the initial collapse is not a synchronous setState in the
    // effect body (react-hooks/set-state-in-effect).
    if (!query.matches) queueMicrotask(() => setOpen(defaultOpenOnMobile));
    // Resizing up to desktop must never leave content hidden.
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(true);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [defaultOpenOnMobile]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={className}
    >
      <summary
        onClick={(e) => {
          // pointer-events-none does not stop keyboard toggling at lg.
          if (window.matchMedia(DESKTOP_QUERY).matches) e.preventDefault();
        }}
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm lg:pointer-events-none lg:min-h-0 lg:cursor-default [&::-webkit-details-marker]:hidden",
          FOCUS_VISIBLE,
        )}
      >
        {title}
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform lg:hidden",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </summary>
      {children}
    </details>
  );
}
