"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CATALOG_HREF } from "@/lib/store/links";
import {
  CONTENT_PAGE_CLASS,
  CONTENT_PAGE_LEAD_CLASS,
  CONTENT_PAGE_TITLE_CLASS,
} from "@/components/store/content-page";

/**
 * Store error boundary. It renders inside the store layout (header/footer
 * stay). The error and its digest are intentionally not shown to the user.
 *
 * No WhatsApp link: the number is an admin-managed `SiteSetting` read through
 * Prisma, which a Client Component cannot import, and `siteDefaults` could
 * point to a stale number.
 */
export default function StoreError({ retry }: { retry: () => void }) {
  return (
    <div className={CONTENT_PAGE_CLASS}>
      <h1 className={CONTENT_PAGE_TITLE_CLASS}>Algo salió mal</h1>
      <p className={CONTENT_PAGE_LEAD_CLASS}>
        Tuvimos un problema al cargar esta página. Probá de nuevo y, si sigue
        pasando, escribinos por WhatsApp.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button className="h-11 px-6 text-base" onClick={() => retry()}>
          Reintentar
        </Button>
        <Button asChild variant="outline" className="h-11 px-6 text-base">
          <Link href={CATALOG_HREF}>Ver el catálogo</Link>
        </Button>
      </div>
    </div>
  );
}
