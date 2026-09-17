import type { NextConfig } from "next";

/**
 * El host de las fotos es configuracion (R2_PUBLIC_URL), pero `remotePatterns`
 * se evalua al construir el config, no por request: por eso se lee de
 * `process.env` y no de `src/lib/env.ts`, que valida del lado del server.
 * Si la variable falta, la lista queda vacia y `next/image` rechaza el host
 * en vez de servir cualquier cosa.
 *
 * OJO (Fase 7): como esto se resuelve en `next build` y queda serializado en
 * el output standalone, R2_PUBLIC_URL tiene que estar presente COMO BUILD ARG
 * en el build de CI. Cambiar el host de las imagenes obliga a rebuildear la
 * imagen; no alcanza con tocar la variable en Dokploy.
 */
const hostDeImagenes = (() => {
  const crudo = process.env.R2_PUBLIC_URL;
  if (!crudo) return [];
  try {
    const { protocol, hostname } = new URL(crudo);
    return [{ protocol: protocol.replace(":", ""), hostname } as const];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  // Fase 7: el Dockerfile despliega `.next/standalone` (server.js + solo los
  // node_modules que el trace considera necesarios), no el repo entero.
  output: "standalone",

  /**
   * `src/app/icon.tsx`, `src/app/opengraph-image.tsx` y la OG de producto leen
   * la fuente del disco en runtime con `join(process.cwd(), "src/assets/...")`.
   * El trace de @vercel/nft no resuelve ese path armado a mano, asi que hay que
   * pedirlo explicito o el standalone arranca sin la fuente y las OG revientan
   * recien cuando alguien comparte un link.
   */
  outputFileTracingIncludes: {
    "/*": ["src/assets/fonts/*.ttf"],
  },

  images: {
    remotePatterns: hostDeImagenes.map(({ protocol, hostname }) => ({
      protocol: protocol as "https" | "http",
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
