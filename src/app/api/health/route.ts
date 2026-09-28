import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Container health check. Dockerfile and Dokploy `HEALTHCHECK` probes call it
 * and trigger a rollback after a failed deployment.
 *
 * It queries the real database instead of always returning 200. A server that
 * starts without reaching Postgres cannot serve pages, and reporting it healthy
 * would prevent a rollback.
 *
 * `force-dynamic` prevents prerendering. A build-cached health response would
 * be equivalent to the fixed 200 response this endpoint avoids.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "ok", sha: process.env.GIT_SHA ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database did not respond:", error);
    return NextResponse.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
