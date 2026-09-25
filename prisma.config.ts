import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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
    url: env("DATABASE_URL"),
  },
});
