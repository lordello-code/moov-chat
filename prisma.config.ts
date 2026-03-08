// prisma.config.ts — Supabase + Hostinger VPS
// DATABASE_URL: Transaction mode via PgBouncer (porta 6543) — queries da app
// DIRECT_URL: Session mode (porta 5432) — prisma migrate dev/deploy
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // directUrl é necessário para migrations com Supabase PgBouncer
    ...(process.env["DIRECT_URL"] ? { directUrl: process.env["DIRECT_URL"] } : {}),
  },
});
