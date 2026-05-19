import { PrismaClient } from '@/generated/prisma'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as path from 'path'

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const adapter = !isProduction ? new PrismaBetterSqlite3({ url: `file:${dbPath}` }) : undefined

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient(
  adapter ? { adapter } : {}
)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
