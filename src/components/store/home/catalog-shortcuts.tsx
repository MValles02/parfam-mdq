import Link from "next/link";
import {
  GENDER_SHORTCUTS,
  KIND_SHORTCUTS,
  LATEST_SHORTCUT,
} from "@/lib/store/catalog-shortcuts";
import { FOCUS_VISIBLE, cn } from "@/lib/utils";

const SHORTCUTS = [...GENDER_SHORTCUTS, ...KIND_SHORTCUTS, LATEST_SHORTCUT];

/** One-tap entry points into the filtered catalog, right under the hero. */
export function CatalogShortcuts() {
  return (
    <nav
      aria-label="Atajos"
      className="mx-auto max-w-page px-4 pt-4 lg:px-16 lg:pt-8"
    >
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {SHORTCUTS.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className={cn(
                "flex h-11 items-center rounded border border-input bg-card px-4 text-sm font-medium whitespace-nowrap hover:bg-muted",
                FOCUS_VISIBLE,
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
