/**
 * Service de Backups Automatiques Planifiés
 * - Backup quotidien à 2h du matin (rétention: 90 jours)
 * - Backup hebdomadaire le dimanche à 3h (rétention: 1 an)
 * - Nettoyage automatique des anciens backups
 */

const cron = require('node-cron')
const { createBackup, listBackups, deleteBackup } = require('./utils/backupService')

// Backup quotidien à 2h du matin
cron.schedule('0 2 * * *', async () => {
    try {
        console.log('🔄 [BACKUP QUOTIDIEN] Création en cours...')
        const backup = await createBackup()
        console.log(`✅ [BACKUP QUOTIDIEN] Créé: ${backup.filename} (${(backup.size / 1024).toFixed(2)} KB)`)

        // Nettoyer les backups quotidiens de plus de 90 jours
        cleanupOldBackups(90, 'quotidien')
    } catch (e) {
        console.error('❌ [BACKUP QUOTIDIEN] Erreur:', e.message)
    }
})

// Backup hebdomadaire (dimanche à 3h) - conservation longue durée
cron.schedule('0 3 * * 0', async () => {
    try {
        console.log('🔄 [BACKUP HEBDOMADAIRE] Création en cours...')
        const backup = await createBackup()

        // Renommer pour identifier comme backup hebdomadaire
        const weekNumber = getWeekNumber(new Date())
        console.log(`✅ [BACKUP HEBDOMADAIRE] Créé: ${backup.filename} (Semaine ${weekNumber})`)

        // Nettoyer les backups hebdomadaires de plus de 1 an
        cleanupOldBackups(365, 'hebdomadaire')
    } catch (e) {
        console.error('❌ [BACKUP HEBDOMADAIRE] Erreur:', e.message)
    }
})

// Backup mensuel (1er du mois à 4h) - conservation permanente
cron.schedule('0 4 1 * *', async () => {
    try {
        console.log('🔄 [BACKUP MENSUEL] Création en cours...')
        const backup = await createBackup()
        const month = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
        console.log(`✅ [BACKUP MENSUEL] Créé: ${backup.filename} (${month})`)
        // Les backups mensuels ne sont jamais supprimés automatiquement
    } catch (e) {
        console.error('❌ [BACKUP MENSUEL] Erreur:', e.message)
    }
})

/**
 * Nettoie les backups plus anciens que le nombre de jours spécifié
 * @param {number} daysToKeep - Nombre de jours à conserver
 * @param {string} type - Type de backup (pour les logs)
 */
function cleanupOldBackups(daysToKeep, type = 'backup') {
    try {
        const backups = listBackups()
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

        let deletedCount = 0
        backups.forEach(backup => {
            if (new Date(backup.createdAt) < cutoffDate) {
                // Ne pas supprimer les backups mensuels (1er du mois)
                const backupDate = new Date(backup.createdAt)
                if (backupDate.getDate() === 1) {
                    return // Conserver les backups mensuels
                }

                deleteBackup(backup.filename)
                deletedCount++
            }
        })

        if (deletedCount > 0) {
            console.log(`🗑️  [NETTOYAGE ${type.toUpperCase()}] ${deletedCount} ancien(s) backup(s) supprimé(s)`)
        }
    } catch (e) {
        console.error(`❌ [NETTOYAGE ${type.toUpperCase()}] Erreur:`, e.message)
    }
}

/**
 * Calcule le numéro de semaine dans l'année
 * @param {Date} date 
 * @returns {number}
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Backup immédiat au démarrage du serveur (pour test)
if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️  [BACKUP] Service de backups automatiques activé')
    console.log('   - Quotidien: 2h00 (rétention 90 jours)')
    console.log('   - Hebdomadaire: Dimanche 3h00 (rétention 1 an)')
    console.log('   - Mensuel: 1er du mois 4h00 (permanent)')
}

module.exports = {
    cleanupOldBackups,
    getWeekNumber
}
