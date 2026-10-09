import type { NextAuthConfig } from "next-auth";

/** Panel entry point and the default destination after signing in. */
export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";

/**
 * Login query and form key that carries the page to reopen after signing in.
 * `volverA` is its previous name, still read from old bookmarks and from login
 * forms rendered before the rename.
 */
export const RETURN_TO_PARAM = "returnTo";
export const LEGACY_RETURN_TO_PARAM = "volverA";

/**
 * Bounds how long a stolen token stays usable: JWT sessions have no
 * server-side revocation, and weekly re-login is acceptable for a one-person
 * panel. Rotating AUTH_SECRET invalidates every session immediately if a token
 * is compromised sooner.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Base Auth.js configuration without database or argon2 access.
 *
 * This stays separate from `auth.ts` so `proxy.ts` imports only this module.
 * That prevents Proxy from loading Prisma and the argon2 binary on every
 * request before rendering.
 */
export const authConfig = {
  pages: {
    signIn: ADMIN_LOGIN_PATH,
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    /**
     * Copies the ID to the token when `user` is available, then to the session,
     * so `auth()` can identify the user without querying the database.
     *
     * The role is intentionally not stored. Authorization is binary in this
     * panel: a session exists or it does not (see `src/lib/admin/guard.ts`),
     * and `UserRole` has one value. If multiple roles are added, `User.role`
     * must supply the value through `authorize()`; a literal here would grant
     * every signed-in user the highest role.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
