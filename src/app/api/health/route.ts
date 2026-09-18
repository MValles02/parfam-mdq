import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Healthcheck del contenedor. Lo consultan el `HEALTHCHECK` del
 * Dockerfile y el de Dokploy, que es lo que dispara el rollback cuando un
 * deploy sale mal.
 *
 * Por eso pega contra la base de verdad y no devuelve 200 fijo: un servidor
 * que levanta pero no puede consultar Postgres no sirve ninguna página, y
 * darlo por sano dejaría el sitio caído sin que el rollback se active nunca.
 *
 * `force-dynamic` para que no se prerenderice: un health cacheado en el build
 * sería exactamente el 200 fijo que queremos evitar.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { estado: "ok", base: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] la base de datos no responde:", error);
    return NextResponse.json(
      { estado: "error", base: "sin conexión" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
