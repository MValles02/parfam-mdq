import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { StoreToaster } from "@/components/store/store-toaster";

/**
 * Store layout. It wraps the catalog, brand, product, and home routes.
 *
 * NuqsAdapter is otherwise mounted only in the admin-panel layout
 * (`src/app/admin/(panel)/layout.tsx`). Catalog filters live in the URL
 * (AGENTS.md), so it must also be mounted here.
 *
 * The Toaster belongs here instead of in an individual page because multiple
 * routes use it: product-detail cart notifications and database cart
 * reconciliation notices (drawer, `/carrito`, and `/checkout`).
 */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <NuqsAdapter>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <StoreToaster />
    </NuqsAdapter>
  );
}
