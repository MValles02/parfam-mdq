import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 saco la URL de conexion del schema.prisma: Migrate y el resto de
// los comandos de la CLI la toman de aca. El cliente en runtime (src/lib/db.ts)
// arma su propio driver adapter con la misma variable de entorno.
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
