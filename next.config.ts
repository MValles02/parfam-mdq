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
  },
};

export default nextConfig;
