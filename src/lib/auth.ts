import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Disposable hash for a random password. When the email does not exist, a
 * `verify` still runs against this value so the response takes the same time
 * as a valid email. Otherwise, timing differences could reveal registered
 * addresses.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$keEaT4q3U3YZt4iNsOXi+w$M3VA5pYzqzq8bdNho7z/XzOkEvMl6qH2t9cTbd+WUmw";

/**
 * Thrown by `authorize` when a login key (IP + email) exceeds the attempt
 * limit. `@auth/core` rethrows the same instance to the `signIn` caller (see
 * the `isRaw` branch in its `Auth()` function), so `retryAfter` (seconds)
 * survives to the login Server Action for the "try again in N minutes" copy.
 */
export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
  retryAfter: number;

  constructor(retryAfter: number) {
    super();
    this.retryAfter = retryAfter;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Shared IP derivation with src/app/(store)/checkout/actions.ts; this
        // is also the entry point for POST /api/auth/callback/credentials,
        // which bypasses the login Server Action.
        const ipAddress = getClientIp(request.headers);
        const rateLimitKey = `login:${ipAddress}:${email.toLowerCase()}`;

        const limit = rateLimit(rateLimitKey, {
          limit: 5,
          windowMs: 1000 * 60 * 10,
        });
        if (!limit.ok) throw new RateLimitedSignin(limit.retryAfter);

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          await verify(DUMMY_HASH, password);
          return null;
        }

        const ok = await verify(user.passwordHash, password);
        if (!ok) return null;

        resetRateLimit(rateLimitKey);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
