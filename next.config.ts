import type { NextConfig } from "next";

/**
 * Photo host configuration comes from R2_PUBLIC_URL, but `remotePatterns` is
 * evaluated while building config rather than per request. Read `process.env`
 * instead of the server-validated src/lib/env.ts. Without the variable, an
 * empty list makes `next/image` reject the host.
 *
 * This resolves during `next build` and is serialized into standalone output,
 * so CI must provide R2_PUBLIC_URL as a build argument. Changing the image
 * host requires rebuilding the image; updating it only in Dokploy is not enough.
 */
const imageHosts = (() => {
  const rawUrl = process.env.R2_PUBLIC_URL;
  if (!rawUrl) return [];
  try {
    const { protocol, hostname } = new URL(rawUrl);
    return [{ protocol: protocol.replace(":", ""), hostname } as const];
  } catch {
    return [];
  }
})();

/** Origin (scheme + host) `next/image` is allowed to fetch from, reused by the CSP img-src below. */
const r2PublicOrigin = imageHosts[0]
  ? `${imageHosts[0].protocol}://${imageHosts[0].hostname}`
  : undefined;

/**
 * Umami is loaded with next/script only in the store layout
 * (src/app/(store)/layout.tsx) when both NEXT_PUBLIC_UMAMI_URL and
 * NEXT_PUBLIC_UMAMI_WEBSITE_ID are set. Its script tag and the tracking
 * beacon it sends both hit this same origin, so the CSP needs it in both
 * script-src and connect-src whenever it is configured.
 */
const umamiOrigin = (() => {
  const rawUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  if (!rawUrl) return undefined;
  try {
    return new URL(rawUrl).origin;
  } catch {
    return undefined;
  }
})();

const isDev = process.env.NODE_ENV === "development";

/**
 * The CSP is set here, in `headers()`, instead of as a per-request nonce in
 * src/proxy.ts, following the "Without Nonces" pattern documented in
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 * A nonce only works when every page renders dynamically (see that doc's
 * "Static vs Dynamic Rendering" section), which would disable static
 * generation and CDN caching for the whole storefront; src/proxy.ts also
 * only matches `/admin/:path*`, not the public catalog. `'unsafe-inline'`
 * for scripts and styles is the tradeoff that keeps static rendering intact.
 *
 * connect-src allows the whole `*.r2.cloudflarestorage.com` wildcard, not
 * just R2_PUBLIC_ORIGIN, because admin image uploads PUT directly from the
 * browser to a presigned R2 endpoint scoped to the account id
 * (`https://<account>.r2.cloudflarestorage.com`, see `getUploadUrl` in
 * src/lib/r2.ts and the XMLHttpRequest in image-panel.tsx) — a different
 * host than the public R2_PUBLIC_URL used to display images.
 *
 * Cloudflare injects its Web Analytics beacon (`static.cloudflareinsights.com`)
 * at the edge in production, so it never appears in this app's source; both
 * origins are listed unconditionally, in every environment, so the beacon
 * isn't blocked wherever Cloudflare happens to inject it.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://static.cloudflareinsights.com${umamiOrigin ? ` ${umamiOrigin}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${r2PublicOrigin ? ` ${r2PublicOrigin}` : ""}`,
  "font-src 'self'",
  `connect-src 'self' https://*.r2.cloudflarestorage.com https://cloudflareinsights.com${umamiOrigin ? ` ${umamiOrigin}` : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Docker deploys `.next/standalone`: server.js plus only traced node_modules.
  output: "standalone",

  /**
   * src/app/icon.tsx and OG image files read fonts from disk at runtime through
   * `join(process.cwd(), "src/assets/...")`. @vercel/nft cannot trace that
   * constructed path, so list it explicitly to keep standalone OG rendering
   * from failing when someone shares a link.
   */
  outputFileTracingIncludes: {
    "/*": ["src/assets/fonts/*.ttf"],
  },

  images: {
    remotePatterns: imageHosts.map(({ protocol, hostname }) => ({
      protocol: protocol as "https" | "http",
      hostname,
      pathname: "/**",
    })),
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
