import { auth } from "@/lib/auth";

/**
 * Autorizacion para Server Actions.
 *
 * El layout de `/admin` protege lo que se *renderiza*, pero una Server Action
 * es un endpoint HTTP publico: cualquiera que conozca su ID puede invocarla sin
 * pasar nunca por el layout ni por `proxy.ts`. Asi que toda accion que lea o
 * escriba datos del panel arranca llamando a esto.
 *
 * Ver node_modules/next/dist/docs/01-app/02-guides/authentication.md
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autorizado.");
  }
  return session.user;
}
