import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";

/**
 * Self-hosted Umami uses two optional variables (see `src/lib/env.ts`), and
 * not every environment has an instance, so this renders nothing without them.
 * It belongs in the store layout rather than the root layout to avoid tracking
 * admin-panel usage; it measures only customer traffic (see F-17 in
 * `docs/findings.md`: the integration infrastructure existed but no component
 * used it).
 */
function ScriptUmami() {
  if (!env.NEXT_PUBLIC_UMAMI_URL || !env.NEXT_PUBLIC_UMAMI_WEBSITE_ID) {
    return null;
  }
  return (
    <Script
      src={`${env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
      data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
    />
  );
}

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
      <Toaster position="top-right" richColors />
      <ScriptUmami />
    </NuqsAdapter>
  );
}
