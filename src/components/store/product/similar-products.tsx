"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const INITIAL_VISIBLE_COUNT = 5;
const REVEAL_STEP = 5;

/**
 * Progressive reveal for the "Se parece a" section. The parent Server
 * Component passes up to 20 already-rendered `ProductCard` elements as
 * `children` (built from `getSimilarProducts` in
 * `src/lib/store/similar-products.ts`), so this stays a plain presentational
 * Client Component: it never touches Prisma-backed data itself (see the Client Component boundary in
 * `docs/architecture.md`).
 */
export function SimilarProducts({ children }: { children: React.ReactNode[] }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const hasMore = visibleCount < children.length;

  return (
    <>
      <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-7">
        {children.slice(0, visibleCount)}
      </div>
      {hasMore ? (
        <div className="mt-7 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisibleCount((count) => count + REVEAL_STEP)}
          >
            Mostrar más
          </Button>
        </div>
      ) : null}
    </>
  );
}
