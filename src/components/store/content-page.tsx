import Link from "next/link";

/**
 * Layout pieces shared by the single-column store pages: the content pages
 * (`/como-comprar`, `/contacto`, `/presentaciones`) and the error and
 * not-found pages. This module imports only `next/link`, so the client-side
 * error boundary can use it too.
 */

/** Narrow reading column. */
export const CONTENT_PAGE_CLASS =
  "mx-auto max-w-[68ch] px-5 py-14 lg:px-16 lg:py-20";

export const CONTENT_PAGE_TITLE_CLASS =
  "text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl";

/** Muted paragraph right below the page title. */
export const CONTENT_PAGE_LEAD_CLASS =
  "mt-4 text-lg leading-relaxed text-muted-foreground";

/** Breadcrumb link with a taller touch target below `lg`. */
export const BREADCRUMB_LINK_CLASS =
  "relative before:absolute before:inset-x-0 before:-inset-y-4 hover:text-foreground lg:before:content-none";

export const HOME_BREADCRUMB = { name: "Inicio", path: "/" };

/** Breadcrumb trail for a page one level below home, for structured data. */
export function getContentPageBreadcrumbs(title: string, path: string) {
  return [HOME_BREADCRUMB, { name: title, path }];
}

/** Visible "Inicio · <title>" trail matching `getContentPageBreadcrumbs`. */
export function ContentPageBreadcrumb({ title }: { title: string }) {
  return (
    <nav
      aria-label="Miga de pan"
      className="mb-8 text-sm text-muted-foreground"
    >
      <Link href={HOME_BREADCRUMB.path} className={BREADCRUMB_LINK_CLASS}>
        {HOME_BREADCRUMB.name}
      </Link>
      <span className="mx-2">·</span>
      <span className="text-foreground">{title}</span>
    </nav>
  );
}
