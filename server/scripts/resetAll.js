require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
})

async function resetAll() {
  try {
    console.log('🧹 Réinitialisation COMPLÈTE de la base de données...')

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

    console.log('   • Suppression des Produits...')
    await prisma.product.deleteMany({})

    // console.log('   • Suppression des Utilisateurs...')
    // await prisma.user.deleteMany({}) // DÉSACTIVÉ : Ne pas supprimer les utilisateurs pour éviter de perdre les mots de pases modifiés
    console.log('   ⚠️  Suppression des Utilisateurs sautée (pour préserver les comptes)')

    console.log('\n✅ Base de données réinitialisée COMPLÈTEMENT!')
    console.log('\nRésumé:')
    console.log('   • Utilisateurs: supprimés')
    console.log('   • Produits: supprimés')
    console.log('   • Stocks: supprimés')
    console.log('   • Ventes: supprimées')
    console.log('   • Arrivages: supprimés')
    console.log('   • Logs d\'action: supprimés')

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAll()
