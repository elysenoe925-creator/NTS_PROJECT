/**
 * Script d'Export Annuel des Données
 * Exporte les ventes et arrivages d'une année spécifique en JSON et CSV
 * 
 * Usage: node scripts/exportYearlyData.js [année]
 * Exemple: node scripts/exportYearlyData.js 2025
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

async function exportYear(year) {
    console.log(`\n📊 Export des données pour l'année ${year}...\n`)

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`)

    try {
        // 1. Export des ventes
        console.log('🔄 Récupération des ventes...')
        const sales = await prisma.sale.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: { product: true },
            orderBy: { date: 'asc' }
        })

        // 2. Export des arrivages
        console.log('🔄 Récupération des arrivages...')
        const arrivals = await prisma.arrival.findMany({
            where: {
                arrivalDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: { include: { product: true } },
                user: { select: { username: true, displayName: true } }
            },
            orderBy: { arrivalDate: 'asc' }
        })

        // 3. Statistiques de stock (snapshot fin d'année)
        console.log('🔄 Récupération du stock...')
        const stocks = await prisma.stock.findMany({
            include: { product: true }
        })

        // 4. Créer le dossier d'export
        const exportDir = path.join(__dirname, '../exports', year.toString())
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true })
        }

        // 5. Sauvegarder en JSON
        console.log('💾 Sauvegarde JSON...')
        fs.writeFileSync(
            path.join(exportDir, `ventes_${year}.json`),
            JSON.stringify(sales, null, 2),
            'utf-8'
        )

        fs.writeFileSync(
            path.join(exportDir, `arrivages_${year}.json`),
            JSON.stringify(arrivals, null, 2),
            'utf-8'
        )

        fs.writeFileSync(
            path.join(exportDir, `stock_${year}.json`),
            JSON.stringify(stocks, null, 2),
            'utf-8'
        )

        // 6. Sauvegarder en CSV (ventes)
        console.log('💾 Sauvegarde CSV (ventes)...')
        const csvHeaderSales = 'Date,Produit,SKU,Quantité,Prix Unitaire,Total,Client,Magasin\n'
        const csvRowsSales = sales.map(s => {
            const date = new Date(s.date).toLocaleDateString('fr-FR')
            const unitPrice = (s.total / s.qty).toFixed(2)
            return `${date},"${s.product?.name || 'N/A'}",${s.product?.sku || 'N/A'},${s.qty},${unitPrice},${s.total},"${s.client}",${s.store}`
        }).join('\n')

        fs.writeFileSync(
            path.join(exportDir, `ventes_${year}.csv`),
            csvHeaderSales + csvRowsSales,
            'utf-8'
        )

        // 7. Sauvegarder en CSV (arrivages)
        console.log('💾 Sauvegarde CSV (arrivages)...')
        const csvHeaderArrivals = 'Date,Référence,Fournisseur,Produit,SKU,Quantité,Coût,Magasin,Statut\n'
        const csvRowsArrivals = []
        arrivals.forEach(a => {
            a.items.forEach(item => {
                const date = new Date(a.arrivalDate).toLocaleDateString('fr-FR')
                csvRowsArrivals.push(
                    `${date},${a.referenceNumber},"${a.supplier}","${item.product?.name || 'N/A'}",${item.product?.sku || 'N/A'},${item.qtyReceived},${item.costPrice},${a.store},${a.status}`
                )
            })
        })

        fs.writeFileSync(
            path.join(exportDir, `arrivages_${year}.csv`),
            csvHeaderArrivals + csvRowsArrivals.join('\n'),
            'utf-8'
        )

        // 8. Créer un rapport récapitulatif
        const summary = {
            année: year,
            période: `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`,
            statistiques: {
                totalVentes: sales.length,
                chiffreAffaires: sales.reduce((sum, s) => sum + s.total, 0),
                totalArrivages: arrivals.length,
                produitsEnStock: stocks.length,
                stockTotal: stocks.reduce((sum, s) => sum + s.qty, 0)
            },
            exportéLe: new Date().toISOString(),
            fichiers: [
                `ventes_${year}.json`,
                `ventes_${year}.csv`,
                `arrivages_${year}.json`,
                `arrivages_${year}.csv`,
                `stock_${year}.json`,
                `rapport_${year}.json`
            ]
        }

        fs.writeFileSync(
            path.join(exportDir, `rapport_${year}.json`),
            JSON.stringify(summary, null, 2),
            'utf-8'
        )

        // 9. Afficher le résumé
        console.log('\n✅ Export terminé avec succès!\n')
        console.log('📊 Résumé:')
        console.log(`   - Ventes: ${summary.statistiques.totalVentes}`)
        console.log(`   - Chiffre d'affaires: ${summary.statistiques.chiffreAffaires.toFixed(2)} Ar`)
        console.log(`   - Arrivages: ${summary.statistiques.totalArrivages}`)
        console.log(`   - Produits en stock: ${summary.statistiques.produitsEnStock}`)
        console.log(`\n📁 Fichiers créés dans: ${exportDir}\n`)

    } catch (error) {
        console.error('❌ Erreur lors de l\'export:', error.message)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Récupérer l'année depuis les arguments ou utiliser l'année dernière
const year = process.argv[2] ? parseInt(process.argv[2]) : new Date().getFullYear() - 1

if (isNaN(year) || year < 2000 || year > 2100) {
    console.error('❌ Année invalide. Usage: node exportYearlyData.js [année]')
    process.exit(1)
}

exportYear(year)
    .then(() => {
        console.log('✅ Script terminé')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Erreur fatale:', error)
        process.exit(1)
    })
