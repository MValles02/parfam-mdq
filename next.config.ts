import type { NextConfig } from "next";

/**
 * El host de las fotos es configuracion (R2_PUBLIC_URL), pero `remotePatterns`
 * se evalua al construir el config, no por request: por eso se lee de
 * `process.env` y no de `src/lib/env.ts`, que valida del lado del server.
 * Si la variable falta, la lista queda vacia y `next/image` rechaza el host
 * en vez de servir cualquier cosa.
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
  images: {
    remotePatterns: hostDeImagenes.map(({ protocol, hostname }) => ({
      protocol: protocol as "https" | "http",
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
