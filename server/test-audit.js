const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('Testing AuditLog table...')
    const logs = await prisma.auditLog.findMany({ take: 1 })
    console.log('✅ AuditLog table exists and is accessible')
    console.log('Logs count:', logs.length)
  } catch (e) {
    console.error('❌ Error accessing AuditLog:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
