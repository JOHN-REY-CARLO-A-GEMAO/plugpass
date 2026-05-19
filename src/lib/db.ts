import { PrismaClient } from '@/generated/prisma'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaPg } from '@prisma/adapter-pg'
import * as path from 'path'

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

let adapter: any
if (isProduction) {
  const connectionString = process.env.DATABASE_URL!
  adapter = new PrismaPg({ connectionString })
} else {
  adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
