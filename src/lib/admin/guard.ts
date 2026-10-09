import { auth } from "@/lib/auth";

/**
 * Authorization for Server Actions.
 *
 * The `/admin` layout protects rendering, while a Server Action is a public
 * HTTP endpoint. Anyone with its ID can invoke it without passing through the
 * layout or `proxy.ts`, so every panel action that reads or writes data starts
 * with this guard.
 *
 * See node_modules/next/dist/docs/01-app/02-guides/authentication.md
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
