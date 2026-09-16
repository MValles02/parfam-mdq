import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Hash descartable de una contraseña random. Si el email no existe igual
 * corremos un `verify` contra esto para que la respuesta tarde lo mismo que
 * con un email válido — si no, la diferencia de tiempos permite averiguar
 * qué emails están registrados.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$keEaT4q3U3YZt4iNsOXi+w$M3VA5pYzqzq8bdNho7z/XzOkEvMl6qH2t9cTbd+WUmw";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          await verify(DUMMY_HASH, password);
          return null;
        }

        const ok = await verify(user.passwordHash, password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
