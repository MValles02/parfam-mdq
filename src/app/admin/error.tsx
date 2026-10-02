"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Panel error boundary. The error and its digest are intentionally not shown:
 * they can leak internals, and admins get details from the server logs.
 */
export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tuvimos un problema al cargar esta página. Probá de nuevo.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => retry()}>Reintentar</Button>
        <Button asChild variant="outline">
          <Link href="/admin">Ir al panel</Link>
        </Button>
      </div>
    </div>
  );
}
