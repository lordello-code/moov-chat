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
    // Migrations precisam de conexão direta (porta 5432) — PgBouncer (6543) trava DDL
    // PrismaClient em runtime usa o PrismaPg adapter com DATABASE_URL (não usa esta url)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!,
  },
});
