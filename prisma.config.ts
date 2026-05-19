import "dotenv/config"
import { defineConfig } from "prisma/config"

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL

export default defineConfig({
  schema: isProduction ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: isProduction
      ? process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
      : process.env.DATABASE_URL || "file:./dev.db",
  },
})
