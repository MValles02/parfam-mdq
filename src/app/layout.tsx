import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/seo";
import { siteDefaults } from "@/lib/site";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

/**
 * The brand name is fixed (`siteDefaults.name`), but
 * `seoDefaultTitle`/`seoDefaultDescription` still come from `SiteSetting`
 * (editable from `/admin/configuracion`): they are the default title and
 * description for the entire site. The template here wraps every page that
 * does not provide its own, so `getSiteSettings()` remains the only sensible
 * source for these two fields.
 */
export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteSettings();

  return {
    // metadataBase resolves relative openGraph/canonical paths against the
    // running environment (localhost in development, the production domain).
    metadataBase: new URL(SITE_URL),
    title: {
      default: config.seoDefaultTitle,
      template: `%s — ${siteDefaults.name}`,
    },
    description: config.seoDefaultDescription,
    // Google Search Console property verification is not secret: it is
    // published in every page's HTML, as Google expects. The root layout also
    // covers /admin.
    verification: {
      google: "Sie6f0R_-nTdSrgWAUCwjFG8j-dE3Eu1Ud4JQCwMoVQ",
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
