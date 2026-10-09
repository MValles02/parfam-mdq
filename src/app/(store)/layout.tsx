import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { StoreToaster } from "@/components/store/store-toaster";
import { getSiteSettings } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/**
 * Store layout. It wraps every public store route.
 *
 * Catalog filters live in the URL (AGENTS.md), so NuqsAdapter is mounted
 * here as well as in the admin-panel layout
 * (`src/app/admin/(panel)/layout.tsx`) and the root `src/app/not-found.tsx`,
 * which renders the store chrome outside this layout.
 *
 * The Toaster belongs here instead of in an individual page because multiple
 * routes use it: product-detail cart notifications and database cart
 * reconciliation notices (drawer, `/carrito`, and `/checkout`).
 */
export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <NuqsAdapter>
      <Header
        whatsappHref={buildWhatsAppLink(settings.whatsappNumber)}
        instagramHandle={settings.instagramHandle}
      />
      <main className="flex-1">{children}</main>
      <Footer />
      <StoreToaster />
    </NuqsAdapter>
  );
}
