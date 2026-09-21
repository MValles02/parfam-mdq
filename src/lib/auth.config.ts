import type { NextAuthConfig } from "next-auth";

/**
 * Base Auth.js configuration without database or argon2 access.
 *
 * This stays separate from `auth.ts` so `proxy.ts` imports only this module.
 * That prevents Proxy from loading Prisma and the argon2 binary on every
 * request before rendering.
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    // Thirty days suits this single-person internal panel.
    maxAge: 60 * 60 * 24 * 30,
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
