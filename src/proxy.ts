import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

/**
 * In Next 16, `middleware.ts` was renamed to `proxy.ts` and runs in the Node
 * runtime. See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.
 *
 * This is an optimistic check for fast redirects: it validates the cookie JWT
 * without querying the database. The `/admin` layout uses `auth()` for the
 * authorization that protects data.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname, search } = req.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    // An authenticated user does not need to see the login screen again.
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/admin/login", req.nextUrl);
    // Preserve the requested destination after a successful sign-in.
    loginUrl.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
