import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { NotFoundContent } from "@/components/store/not-found-content";
import { StoreToaster } from "@/components/store/store-toaster";

export const metadata: Metadata = {
  title: { absolute: "Página no encontrada" },
};

/**
 * Unmatched URLs only: they render inside the root layout, not
 * `(store)/layout.tsx`, so the store chrome is mounted here with the same
 * providers. `notFound()` inside `(store)` uses `(store)/not-found.tsx`.
 */
export default function NotFound() {
  return (
    <NuqsAdapter>
      <Header />
      <main className="flex-1">
        <NotFoundContent />
      </main>
      <Footer />
      <StoreToaster />
    </NuqsAdapter>
  );
}
