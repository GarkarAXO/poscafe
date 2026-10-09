import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: { rejectUnauthorized: false },
  })

if (!globalForPrisma.pool) {
  pool.on('error', (err) => {
    console.warn('Advertencia en pool de Postgres (inactivo/reconexión):', err.message)
  })
}

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}

export default prisma
