import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

/**
 * En Next 16 `middleware.ts` pasó a llamarse `proxy.ts` y corre en runtime
 * Node (antes era Edge). Ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * Esto es un chequeo optimista para redirigir rápido: valida el JWT de la
 * cookie, no consulta la base. La autorización de verdad la hace el layout
 * de `/admin` con `auth()`, que es lo que protege los datos.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname, search } = req.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    // Ya logueado: no tiene sentido mostrarle el login de nuevo.
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/admin/login", req.nextUrl);
    // Para volver a donde queria ir despues de entrar.
    loginUrl.searchParams.set("volverA", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
