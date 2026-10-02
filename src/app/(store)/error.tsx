"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-[68ch] px-5 py-14 lg:px-16 lg:py-20">
      <h1 className="text-4xl font-extrabold tracking-[-0.03em] lg:text-6xl">
        Algo salió mal
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        Tuvimos un problema al cargar esta página. Probá de nuevo y, si sigue
        pasando, escribinos por WhatsApp.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button className="h-11 px-6 text-base" onClick={() => retry()}>
          Reintentar
        </Button>
        <Button asChild variant="outline" className="h-11 px-6 text-base">
          <Link href="/#catalogo">Ver el catálogo</Link>
        </Button>
      </div>
    </div>
  );
}
