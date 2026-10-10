import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads the connection URL for Migrate and other CLI commands from
// this config rather than schema.prisma. The runtime client in src/lib/db.ts
// creates its driver adapter from the same environment variable.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read directly instead of prisma's strict `env()` helper, which throws
    // when unset: `prisma generate` (postinstall) needs no database. Commands
    // that connect (migrate, seed) still fail with a connection-URL error.
    url: process.env.DATABASE_URL,
  },
});
