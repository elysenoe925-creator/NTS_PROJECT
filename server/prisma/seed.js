const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

async function main() {
  // Clear existing data (dev only)
  await prisma.sale.deleteMany().catch(()=>{})
  await prisma.stock.deleteMany().catch(()=>{})
  await prisma.product.deleteMany().catch(()=>{})
  await prisma.user.deleteMany().catch(()=>{})

  const pw = await bcrypt.hash('admin123', 10)
  await prisma.user.create({ data: { username: 'admin', displayName: 'Administrateur', passwordHash: pw, role: 'admin', store: 'all' } })
  const pw2 = await bcrypt.hash('mjpass', 10)
  await prisma.user.create({ data: { username: 'manager_mj', displayName: 'Manager Majunga', passwordHash: pw2, role: 'manager', store: 'majunga' } })
  const pw3 = await bcrypt.hash('tmpass', 10)
  await prisma.user.create({ data: { username: 'emp_tm', displayName: 'Employé Tamatave', passwordHash: pw3, role: 'employee', store: 'tamatave' } })

  // Marge est un pourcentage du coût d'achat
  // P-001: coût 0.02, marge 150% → prix = 0.02 * (1 + 150/100) = 0.05
  // P-002: coût 2.50, marge 100% → prix = 2.50 * (1 + 100/100) = 5.00
  const p1 = await prisma.product.create({ data: { sku: 'P-001', name: 'Résistance 10k', model: 'RES-10K', compatibleModels: 'MB-100,MB-101', cost: 0.02, margin: 150, price: 0.05, location: 'Entrepôt A', category: 'Composants', supplier: 'Electronix' } })
  const p2 = await prisma.product.create({ data: { sku: 'P-002', name: 'Coque iPhone 12', model: 'CASE-IP12', compatibleModels: 'iPhone12', cost: 2.50, margin: 100, price: 5.00, location: 'Entrepôt B', category: 'Accessoires', supplier: 'MobileCases' } })

  await prisma.stock.create({ data: { productId: p1.id, store: 'majunga', qty: 80, cost: 0.02, margin: 150 } })
  await prisma.stock.create({ data: { productId: p1.id, store: 'tamatave', qty: 40, cost: 0.02, margin: 150 } })
  await prisma.stock.create({ data: { productId: p2.id, store: 'majunga', qty: 20, cost: 2.50, margin: 100 } })
  await prisma.stock.create({ data: { productId: p2.id, store: 'tamatave', qty: 25, cost: 2.50, margin: 100 } })

  console.log('Seed done')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
