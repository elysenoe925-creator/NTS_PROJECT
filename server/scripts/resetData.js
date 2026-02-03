const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
})

async function resetData() {
  try {
    console.log('🧹 Réinitialisation des données...')

    // Supprimer les données dans l'ordre (respecter les contraintes de clés étrangères)
    console.log('   • Suppression des ActionLogs...')
    await prisma.actionLog.deleteMany({})

    console.log('   • Suppression des ArrivalItems...')
    await prisma.arrivalItem.deleteMany({})

    console.log('   • Suppression des Arrivals...')
    await prisma.arrival.deleteMany({})

    console.log('   • Suppression des Sales...')
    await prisma.sale.deleteMany({})

    console.log('   • Suppression des Stocks...')
    await prisma.stock.deleteMany({})

    console.log('✅ Données réinitialisées avec succès!')
    console.log('\nRésumé:')
    console.log('   • ActionLogs: supprimés')
    console.log('   • Arrivages (Arrivals & ArrivalItems): supprimés')
    console.log('   • Ventes (Sales): supprimées')
    console.log('   • Stocks: supprimés')
    console.log('\n⚠️  Les produits et utilisateurs ont été conservés.')

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetData()
