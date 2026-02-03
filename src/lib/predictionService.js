
/**
 * Service de prédiction des ventes basé sur API Python (Server-Side)
 * Remplace Brain.js pour performance et précision.
 */

/**
 * Prédit les ventes futures basées sur l'historique VIA L'API PYTHON
 * @param {Array} itemsData - Tableau d'objets { sku, history: number[] }
 * @param {number} forecastDays - Nombre de jours à préduire
 * @returns {Promise<Object>} - Map { sku: { prediction, confidence } }
 */
export async function predictSalesBatch(itemsData, forecastDays = 30) {
    try {
        const response = await fetch('http://localhost:4000/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                details: itemsData,
                horizon: forecastDays
            })
        })

        if (!response.ok) {
            throw new Error('Prediction API failed')
        }

        return await response.json()
    } catch (e) {
        console.error('Prediction Check Error:', e)
        return {}
    }
}

/**
 * Fonction utilitaire pour préparer les données depuis le format de l'app
 * @param {Array} salesData - Objets ventes { date, qty }
 * @param {number} daysToLookBack - Nombre de jours d'historique à utiliser
 */
export function prepareDataForPrediction(salesData, daysToLookBack = 90) {
    const now = new Date()
    const cutoff = new Date(now.getTime() - (daysToLookBack * 24 * 60 * 60 * 1000))

    const dailyMap = new Map()

    // Initialiser tous les jours avec 0
    for (let i = 0; i < daysToLookBack; i++) {
        const d = new Date(cutoff.getTime() + (i * 24 * 60 * 60 * 1000))
        const key = d.toISOString().split('T')[0]
        dailyMap.set(key, 0)
    }

    // Remplir avec les données réelles
    for (const s of salesData) {
        try {
            const d = new Date(s.date)
            if (d >= cutoff) {
                const key = d.toISOString().split('T')[0]
                if (dailyMap.has(key)) {
                    dailyMap.set(key, (dailyMap.get(key) || 0) + (Number(s.qty) || 0))
                }
            }
        } catch (e) { }
    }

    // Retourner le tableau trié par date
    return Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(entry => entry[1])
}

// Wrapper de compatibilité pour appels unitaires (pour ne pas casser le code existant qui attendrait ça)
// Mais logic business devrait utiliser predictSalesBatch
export async function predictSales(salesHistory, forecastDays = 30) {
    // Simule l'ancien format de retour promesse { predictions, confidence }
    // en utilisant le batch d'un seul item
    const result = await predictSalesBatch([{ sku: 'temp', history: salesHistory }], forecastDays)

    if (result && result['temp']) {
        // Python retourne un total (prediction) et une conf.
        // On étale le total sur les jours pour simuler une array de predictions journalières
        const daily = result['temp'].prediction / forecastDays
        return {
            predictions: Array(forecastDays).fill(daily),
            confidence: result['temp'].confidence
        }
    }

    return { predictions: [], confidence: 0 }
}
