#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedDatabase() {
  console.log('\n🌱 AJOUT DE DONNÉES DE TEST\n')
  console.log('='.repeat(60))

  try {
    // Ajouter plus de produits
    console.log('\n📦 Ajout de produits...')
    
    const newProducts = [
      { sku: 'P-003', name: 'Câble USB-C', cost: 1.50, margin: 300, price: 5.99, category: 'Câbles', supplier: 'Aliexpress' },
      { sku: 'P-004', name: 'Adaptateur 5V 2A', cost: 2.00, margin: 350, price: 8.99, category: 'Alimentation', supplier: 'Aliexpress' },
      { sku: 'P-005', name: 'Batterie externe 20000mAh', cost: 8.00, margin: 212, price: 24.99, category: 'Batterie', supplier: 'Amazon' },
      { sku: 'P-006', name: 'Protecteur écran', cost: 0.50, margin: 698, price: 3.99, category: 'Protection', supplier: 'Aliexpress' },
      { sku: 'P-007', name: 'Housse silicone iPhone', cost: 1.50, margin: 366, price: 6.99, category: 'Accessoires', supplier: 'Aliexpress' },
    ]

    for (const prod of newProducts) {
      const existing = await prisma.product.findUnique({ where: { sku: prod.sku } })
      if (!existing) {
        await prisma.product.create({ data: prod })
        console.log(`   ✅ ${prod.sku}: ${prod.name}`)
      } else {
        console.log(`   ℹ️  ${prod.sku}: Existe déjà`)
      }
    }

    // Ajouter du stock pour les nouveaux produits
    console.log('\n🏪 Ajout de stock...')
    
    const newStocks = [
      { productSku: 'P-003', store: 'majunga', qty: 100 },
      { productSku: 'P-003', store: 'tamatave', qty: 80 },
      { productSku: 'P-004', store: 'majunga', qty: 50 },
      { productSku: 'P-004', store: 'tamatave', qty: 40 },
      { productSku: 'P-005', store: 'majunga', qty: 20 },
      { productSku: 'P-005', store: 'tamatave', qty: 15 },
      { productSku: 'P-006', store: 'majunga', qty: 200 },
      { productSku: 'P-006', store: 'tamatave', qty: 150 },
      { productSku: 'P-007', store: 'majunga', qty: 75 },
      { productSku: 'P-007', store: 'tamatave', qty: 60 },
    ]

    for (const stock of newStocks) {
      const product = await prisma.product.findUnique({ where: { sku: stock.productSku } })
      if (product) {
        const existing = await prisma.stock.findUnique({
          where: { Stock_productId_store_key: { productId: product.id, store: stock.store } }
        }).catch(() => null)
        
        if (!existing) {
          await prisma.stock.create({
            data: {
              productId: product.id,
              store: stock.store,
              qty: stock.qty
            }
          })
          console.log(`   ✅ ${stock.productSku} - ${stock.store}: ${stock.qty} unités`)
        } else {
          console.log(`   ℹ️  ${stock.productSku} - ${stock.store}: Existe déjà`)
        }
      }
    }

    // Ajouter des ventes de test
    console.log('\n💰 Ajout de ventes de test...')
    
    const sales = [
      { productSku: 'P-001', qty: 5, total: 4.75, store: 'majunga', client: 'Client A' },
      { productSku: 'P-001', qty: 3, total: 2.85, store: 'tamatave', client: 'Client B' },
      { productSku: 'P-002', qty: 2, total: 24.00, store: 'majunga', client: 'Client C' },
      { productSku: 'P-002', qty: 1, total: 12.00, store: 'tamatave', client: 'Client D' },
      { productSku: 'P-003', qty: 10, total: 59.90, store: 'majunga', client: 'Client E' },
      { productSku: 'P-003', qty: 8, total: 47.92, store: 'tamatave', client: 'Client F' },
      { productSku: 'P-004', qty: 5, total: 44.95, store: 'majunga', client: 'Client G' },
      { productSku: 'P-004', qty: 3, total: 26.97, store: 'tamatave', client: 'Client H' },
      { productSku: 'P-005', qty: 2, total: 49.98, store: 'majunga', client: 'Client I' },
      { productSku: 'P-005', qty: 1, total: 24.99, store: 'tamatave', client: 'Client J' },
    ]

    for (const sale of sales) {
      const product = await prisma.product.findUnique({ where: { sku: sale.productSku } })
      if (product) {
        await prisma.sale.create({
          data: {
            productId: product.id,
            qty: sale.qty,
            total: sale.total,
            store: sale.store,
            client: sale.client,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Derniers 30 jours
          }
        })
        console.log(`   ✅ ${sale.productSku}: ${sale.qty} unités vendues à ${sale.client}`)
      }
    }

    // Résumé
    const productCount = await prisma.product.count()
    const stockCount = await prisma.stock.count()
    const saleCount = await prisma.sale.count()
    const totalRevenue = (await prisma.sale.aggregate({ _sum: { total: true } }))._sum.total || 0

    console.log('\n' + '='.repeat(60))
    console.log('\n✅ DONNÉES AJOUTÉES AVEC SUCCÈS')
    console.log(`   • Produits: ${productCount}`)
    console.log(`   • Entrées de stock: ${stockCount}`)
    console.log(`   • Ventes: ${saleCount}`)
    console.log(`   • Chiffre d'affaires: ${totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`)
    console.log('\n' + '='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedDatabase()
