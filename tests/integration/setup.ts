import "dotenv/config";

// Integration tests write to and delete from a real database: refuse anything
// but a local one. Mirrors assertLocalDatabase in prisma/seed-fixtures.ts
// (copied, because importing that module runs its main()).
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Integration tests: DATABASE_URL is not set.");
  const url = new URL(raw);
  if (url.searchParams.has("host") || url.searchParams.has("hostaddr")) {
    throw new Error(
      "Integration tests refuse a DATABASE_URL with a host/hostaddr query param.",
    );
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `Integration tests refuse a non-local DATABASE_URL host (${hostname}).`,
    );
  }
}

assertLocalDatabase();
