#!/usr/bin/env node

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('\n📊 VÉRIFICATION DE LA BASE DE DONNÉES\n')
  console.log('='.repeat(60))

  try {
    // 1. Users
    console.log('\n👤 UTILISATEURS:')
    const users = await prisma.user.findMany()
    console.log(`   Total: ${users.length} utilisateurs`)
    users.forEach(u => {
      console.log(`   - ${u.username} (${u.displayName}) - Role: ${u.role} - Store: ${u.store}`)
    })

    // 2. Products
    console.log('\n📦 PRODUITS:')
    const products = await prisma.product.findMany({ include: { stocks: true, sales: true } })
    console.log(`   Total: ${products.length} produits`)
    if (products.length > 0) {
      const sample = products.slice(0, 3)
      sample.forEach(p => {
        console.log(`   - ${p.sku}: ${p.name} (${p.stocks.length} stock(s), ${p.sales.length} vente(s))`)
      })
      if (products.length > 3) {
        console.log(`   ... et ${products.length - 3} autres`)
      }
    }

    // 3. Stocks
    console.log('\n🏪 STOCK:')
    const stocks = await prisma.stock.findMany({ include: { product: true } })
    console.log(`   Total: ${stocks.length} entrées de stock`)
    const stockByStore = {}
    stocks.forEach(s => {
      if (!stockByStore[s.store]) stockByStore[s.store] = 0
      stockByStore[s.store]++
    })
    Object.entries(stockByStore).forEach(([store, count]) => {
      console.log(`   - ${store}: ${count} articles en stock`)
    })

    // Total stock value
    let totalStockValue = 0
    stocks.forEach(s => {
      if (s.qty && s.product.price) {
        totalStockValue += s.qty * s.product.price
      }
    })
    console.log(`   💰 Valeur totale du stock: ${totalStockValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`)

    // 4. Sales
    console.log('\n💰 VENTES:')
    const sales = await prisma.sale.findMany()
    console.log(`   Total: ${sales.length} ventes`)
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
    const totalQty = sales.reduce((sum, s) => sum + s.qty, 0)
    console.log(`   - Chiffre d'affaires: ${totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`)
    console.log(`   - Quantité vendue: ${totalQty} unités`)
    
    const salesByStore = {}
    sales.forEach(s => {
      if (!salesByStore[s.store]) salesByStore[s.store] = { count: 0, total: 0 }
      salesByStore[s.store].count++
      salesByStore[s.store].total += s.total
    })
    Object.entries(salesByStore).forEach(([store, data]) => {
      console.log(`   - ${store}: ${data.count} ventes, ${data.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`)
    })

    // 5. Action Logs
    console.log('\n📝 JOURNAUX D\'ACTION:')
    const actionLogs = await prisma.actionLog.findMany({ include: { user: true }, take: 10, orderBy: { timestamp: 'desc' } })
    console.log(`   Total: ${await prisma.actionLog.count()} entrées`)
    if (actionLogs.length > 0) {
      console.log(`   Dernières actions:`)
      actionLogs.forEach(log => {
        console.log(`   - [${log.timestamp.toLocaleString('fr-FR')}] ${log.user.username}: ${log.action} (${log.description})`)
      })
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ RÉSUMÉ:')
    console.log(`   • Utilisateurs: ${users.length}`)
    console.log(`   • Produits: ${products.length}`)
    console.log(`   • Entrées de stock: ${stocks.length}`)
    console.log(`   • Valeur du stock: ${totalStockValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`)
    console.log(`   • Ventes: ${sales.length}`)
    console.log(`   • Chiffre d'affaires: ${totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`)
    console.log(`   • Journaux d'action: ${await prisma.actionLog.count()}`)
    console.log('\n' + '='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
