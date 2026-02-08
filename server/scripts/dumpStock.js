require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function dump() {
    const products = await prisma.product.findMany({ include: { stocks: true } })
    console.log(JSON.stringify(products, null, 2))
    await prisma.$disconnect()
}
dump()
