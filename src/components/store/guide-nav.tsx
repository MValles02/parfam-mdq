import Link from "next/link";
import {
  ContentPageBreadcrumb,
  getContentPageBreadcrumbs,
} from "@/components/store/content-page";
import { JsonLd } from "@/components/store/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

const GUIDES = [
  { href: "/presentaciones", label: "Frasco o decant" },
  { href: "/concentraciones", label: "Concentraciones" },
] as const;

type GuidePath = (typeof GUIDES)[number]["href"];

/** Side navigation between the two guides; desktop only. */
export function GuideNav({ current }: { current: GuidePath }) {
  // The store header is static from `lg` up, so no offset is needed for it:
  // top-6 only leaves breathing room while the nav sticks.
  return (
    <nav
      aria-label="En esta guía"
      className="hidden flex-col lg:sticky lg:top-6 lg:flex lg:self-start"
    >
      {GUIDES.map((guide) => (
        <Link
          key={guide.href}
          href={guide.href}
          aria-current={guide.href === current ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center border-l-2 px-4 text-sm font-medium",
            guide.href === current
              ? "border-primary text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
            FOCUS_VISIBLE,
          )}
        >
          {guide.label}
        </Link>
      ))}
    </nav>
  );
}

/** Shared page frame for both guides: side nav, breadcrumb and JSON-LD. */
export function GuideShell({
  current,
  title,
  children,
}: {
  current: GuidePath;
  title: string;
  children: React.ReactNode;
}) {
  const breadcrumbs = getContentPageBreadcrumbs(title, current);

  return (
    <div className="mx-auto max-w-page px-5 py-14 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:px-16 lg:py-20">
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />
      <GuideNav current={current} />
      <div className="max-w-3xl">
        <ContentPageBreadcrumb title={title} />
        {children}
      </div>
    </div>
  );
}
