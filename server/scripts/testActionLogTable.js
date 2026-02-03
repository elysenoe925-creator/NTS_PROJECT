#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testActionLogTable() {
  console.log('\n🔍 TEST DE LA TABLE ActionLog\n')
  console.log('='.repeat(60))

  try {
    // 1. Vérifier si la table existe en essayant de compter les enregistrements
    console.log('\n📋 Étape 1: Vérification de l\'existence de la table...')
    const count = await prisma.actionLog.count()
    console.log(`   ✅ Table ActionLog existe - ${count} enregistrement(s) trouvé(s)`)

    // 2. Tester la structure de la table en essayant de récupérer tous les champs
    console.log('\n📋 Étape 2: Vérification de la structure de la table...')
    const sample = await prisma.actionLog.findFirst({
      include: { user: true }
    })
    
    if (sample) {
      console.log('   ✅ Structure de la table correcte:')
      console.log(`      - id: ${sample.id}`)
      console.log(`      - userId: ${sample.userId}`)
      console.log(`      - action: ${sample.action}`)
      console.log(`      - description: ${sample.description}`)
      console.log(`      - timestamp: ${sample.timestamp}`)
      console.log(`      - store: ${sample.store || 'null'}`)
      console.log(`      - user relation: ${sample.user ? `${sample.user.username} (${sample.user.displayName})` : 'non chargé'}`)
    } else {
      console.log('   ℹ️  Aucun enregistrement dans la table (table vide mais structure correcte)')
    }

    // 3. Tester une requête complète avec relation
    console.log('\n📋 Étape 3: Test de requête avec relation User...')
    const logsWithUsers = await prisma.actionLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            store: true
          }
        }
      },
      take: 5,
      orderBy: { timestamp: 'desc' }
    })
    console.log(`   ✅ Requête avec relation réussie - ${logsWithUsers.length} résultat(s)`)

    // 4. Tester la création d'un enregistrement (si au moins un utilisateur existe)
    console.log('\n📋 Étape 4: Test de création d\'un enregistrement...')
    const firstUser = await prisma.user.findFirst()
    
    if (firstUser) {
      try {
        const testLog = await prisma.actionLog.create({
          data: {
            userId: firstUser.id,
            action: 'TEST_TABLE',
            description: 'Test de vérification de la table ActionLog',
            store: firstUser.store || 'test'
          }
        })
        console.log(`   ✅ Création réussie - ID: ${testLog.id}`)
        
        // Supprimer le log de test
        await prisma.actionLog.delete({
          where: { id: testLog.id }
        })
        console.log('   ✅ Log de test supprimé')
      } catch (createError) {
        console.log(`   ❌ Erreur lors de la création: ${createError.message}`)
      }
    } else {
      console.log('   ⚠️  Aucun utilisateur trouvé - impossible de tester la création')
    }

    // 5. Statistiques
    console.log('\n📋 Étape 5: Statistiques...')
    const totalLogs = await prisma.actionLog.count()
    const logsByAction = await prisma.actionLog.groupBy({
      by: ['action'],
      _count: { action: true }
    })
    const logsByStore = await prisma.actionLog.groupBy({
      by: ['store'],
      _count: { store: true }
    })

    console.log(`   • Total de logs: ${totalLogs}`)
    if (logsByAction.length > 0) {
      console.log('   • Logs par action:')
      logsByAction.forEach(item => {
        console.log(`      - ${item.action}: ${item._count.action}`)
      })
    }
    if (logsByStore.length > 0) {
      console.log('   • Logs par magasin:')
      logsByStore.forEach(item => {
        console.log(`      - ${item.store || 'null'}: ${item._count.store}`)
      })
    }

    // Résumé final
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ RÉSULTAT: La table ActionLog est opérationnelle!\n')
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message)
    console.error('\nDétails:', error)
    
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.error('\n⚠️  La table ActionLog n\'existe pas dans la base de données.')
      console.error('   Solution: Exécutez les migrations Prisma avec:')
      console.error('   cd server && npx prisma migrate deploy')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testActionLogTable()
