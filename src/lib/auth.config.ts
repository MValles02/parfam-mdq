import type { NextAuthConfig } from "next-auth";

/**
 * Configuracion base de Auth.js, sin acceso a base de datos ni a argon2.
 *
 * Se separa del archivo `auth.ts` a proposito: `proxy.ts` importa SOLO esto,
 * asi el proxy no arrastra Prisma ni el binario de argon2 y queda liviano
 * (corre en cada request antes del render).
 */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    // 30 dias: es un panel interno de una sola persona, no hace falta
    // que expire seguido.
    maxAge: 60 * 60 * 24 * 30,
  },
  callbacks: {
    /**
     * Copia el id y el rol al token la primera vez (cuando viene `user`),
     * y de ahi a la sesion, para poder leerlos sin tocar la base.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = "ADMIN";
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
