require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'file:./dev.db'
        }
    }
})

async function resetTrackingAndArrivals() {
    try {
        console.log('🧹 Réinitialisation des suivis et des arrivages...')

        console.log('   • Suppression des ActionLogs...')
        await prisma.actionLog.deleteMany({})

        console.log('   • Suppression des ArrivalItems...')
        await prisma.arrivalItem.deleteMany({})

        console.log('   • Suppression des Arrivals...')
        await prisma.arrival.deleteMany({})

        console.log('\n✅ Suivis et arrivages réinitialisés avec succès !')

    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

resetTrackingAndArrivals()
