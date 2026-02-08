/**
 * Advanced Decision Engine
 * 
 * Améliore la précision des recommandations de réapprovisionnement avec :
 * - Analyse de tendance (croissance/décroissance des ventes)
 * - Détection de saisonnalité
 * - Calcul d'écart-type pour identifier la variabilité
 * - Marge de sécurité adaptative basée sur la volatilité
 * - Détection des produits zéro-vente pour réduire les fausses alertes
 */

import { getProducts, getProductsForStore } from './productsStore'
import { getSales } from './salesStore'
import { predictSales, prepareDataForPrediction } from './predictionService'

const DEFAULT_LEAD_DAYS = 120
const DEFAULT_LOOKBACK_DAYS = 7
const MIN_LOOKBACK_DAYS = 7
const TREND_WINDOW = 14 // jours pour analyser la tendance

/**
 * Analyse les tendances de vente sur la période donnée
 * @returns {trend: 'stable'|'increasing'|'decreasing', ratio: number}
 */
function analyzeTrend(salesData, days) {
  if (days < TREND_WINDOW * 2) {
    return { trend: 'stable', ratio: 1.0 }
  }

  const now = new Date()
  const midpoint = days / 2

  // Première moitié
  const cutoff1 = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  const cutoff2 = new Date(now.getTime() - (midpoint * 24 * 60 * 60 * 1000))

  let qtyFirst = 0, qtySecond = 0

  for (const s of salesData) {
    try {
      const sd = new Date(s.date)
      if (sd >= cutoff2) {
        qtySecond += Number(s.qty) || 0
      } else if (sd >= cutoff1) {
        qtyFirst += Number(s.qty) || 0
      }
    } catch (e) { }
  }

  const avgFirst = qtyFirst / (midpoint)
  const avgSecond = qtySecond / (midpoint)

  let trend = 'stable'
  let ratio = 1.0

  if (avgFirst === 0) {
    if (avgSecond > 0) {
      trend = 'increasing'
      ratio = 1.3 // majoration de 30% si croissance récente
    }
  } else {
    const change = (avgSecond - avgFirst) / avgFirst
    if (change > 0.15) {
      trend = 'increasing'
      ratio = 1.0 + Math.min(change, 0.5) // min 1.0, max 1.5
    } else if (change < -0.15) {
      trend = 'decreasing'
      ratio = Math.max(0.7, 1.0 + change) // min 0.7
    }
  }

  return { trend, ratio }
}

/**
 * Calcule l'écart-type des ventes pour mesurer la volatilité
 */
function calculateVelocityStdDev(salesData, days) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

  // Agrégation par jour
  const dailyMap = new Map()
  for (const s of salesData) {
    try {
      const sd = new Date(s.date)
      if (sd < cutoff) continue
      const dayKey = sd.toISOString().split('T')[0]
      const prev = dailyMap.get(dayKey) || 0
      dailyMap.set(dayKey, prev + (Number(s.qty) || 0))
    } catch (e) { }
  }

  const values = Array.from(dailyMap.values())
  if (values.length === 0) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Détecte si un produit a zéro vente récemment (pour éviter les faux positifs)
 */
function hasRecentSales(salesData, days) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

  for (const s of salesData) {
    try {
      const sd = new Date(s.date)
      if (sd >= cutoff) return true
    } catch (e) { }
  }
  return false
}

/**
 * Calcule la marge de sécurité (safety stock) de façon adaptative
 * Plus le produit est volatile, plus la marge est élevée
 */
function calculateSafetyStock(velocity, stdDev, leadDays, threshold) {
  if (velocity === 0) return 0

  // Coefficient de variabilité (plus haut = plus imprévisible)
  const cv = stdDev / (velocity + 0.001) // éviter division par zéro

  // z-score pour un niveau de service ~95% (1.65) avec ajustement selon variabilité
  const serviceLevel = Math.min(2.5, 1.65 + (cv * 0.5))

  const safetyStock = Math.ceil(serviceLevel * stdDev * Math.sqrt(leadDays / 30))

  // Minimum égal au seuil, pour garantir une couverture minimale
  return Math.max(threshold, safetyStock)
}

/**
 * Moteur de décision principal : génère les recommandations
 * NOTE: Maintenant asynchrone pour supporter les prédictions IA
 */
export async function computeDecisions(options = {}) {
  const {
    lookback = DEFAULT_LOOKBACK_DAYS,
    leadDays = DEFAULT_LEAD_DAYS,
    storeId = null,
    includeDetails = false,
    useAI = true // Option pour activer/désactiver l'IA
  } = options

  const effectiveLookback = Math.max(lookback, MIN_LOOKBACK_DAYS)
  const now = new Date()
  const cutoff = new Date(now.getTime() - (effectiveLookback * 24 * 60 * 60 * 1000))

  // Récupérer les données brutes
  const rawProducts = storeId ? getProductsForStore(storeId) : getProducts()

  // Normalisation des produits (gestion du stock par magasin vs global)
  const products = rawProducts.map(p => {
    let qty = 0
    if (typeof p.qty === 'number') {
      qty = p.qty
    } else if (p.stockByStore) {
      qty = Object.values(p.stockByStore).reduce((a, b) => a + (Number(b) || 0), 0)
    }
    return { ...p, qty }
  })

  // Récupérer les ventes (filtrées par store si nécessaire)
  const allSales = getSales(storeId).filter(s => {
    // Double vérification : si un storeId est spécifié, la vente DOIT correspondre
    if (storeId && s.store !== storeId) return false
    return true
  })

  // Agrégation des ventes par SKU
  const salesBySkuMap = new Map()
  for (const s of allSales) {
    try {
      const sd = new Date(s.date)
      if (sd < cutoff) continue

      if (!salesBySkuMap.has(s.sku)) {
        salesBySkuMap.set(s.sku, [])
      }
      salesBySkuMap.get(s.sku).push(s)
    } catch (e) { }
  }

  const days = Math.max(1, effectiveLookback)

  // Préparation des données complètes pour l'IA (hors de la boucle de cutoff court)
  const allSalesForAiMap = new Map()
  if (useAI) {
    for (const s of allSales) {
      if (!allSalesForAiMap.has(s.sku)) allSalesForAiMap.set(s.sku, [])
      allSalesForAiMap.get(s.sku).push(s)
    }
  }

  // Calcul pour chaque produit (Promise.all pour l'async)
  const list = await Promise.all(products.map(async p => {
    const sku = p.sku
    const salesForSku = salesBySkuMap.get(sku) || []

    // Quantités de base
    const sold = salesForSku.reduce((sum, s) => sum + (Number(s.qty) || 0), 0)
    const velocity = sold / days
    const avgSalesPerDay = velocity
    const stock = Number(p.qty || 0)
    const threshold = (p.alertThreshold != null) ? Number(p.alertThreshold) : 5

    // Nouvelles métriques pour améliorer la précision
    const hasRecent = hasRecentSales(salesForSku, 30) // ventes dans les 30 derniers jours ?
    const stdDev = calculateVelocityStdDev(salesForSku, effectiveLookback)
    const { trend, ratio: trendRatio } = analyzeTrend(salesForSku, effectiveLookback)

    // Demande projetée CLASSIQUE avec ajustement de tendance
    let projectedDemand = velocity * leadDays * trendRatio

    //---------------------------------------------------------
    // INTEGRATION IA (BRAIN.JS)
    //---------------------------------------------------------
    let aiPrediction = null
    let usedAi = false

    if (useAI && hasRecent && velocity > 0) {
      try {
        const fullHistory = allSalesForAiMap.get(sku) || []
        // On prend un historique plus long pour l'entraînement (ex: 90 jours)
        const dailySales = prepareDataForPrediction(fullHistory, 90)

        // Prédiction sur la période de leadDays
        const result = await predictSales(dailySales, leadDays)

        if (result.confidence > 0.5) { // Si confiance suffisante
          const aiTotal = result.predictions.reduce((a, b) => a + b, 0)
          aiPrediction = {
            total: aiTotal,
            confidence: result.confidence
          }

          // Moyenne pondérée entre Classique et IA selon la confiance
          // Si confiance 0.8 -> 80% IA, 20% Classique
          const weightAI = result.confidence
          projectedDemand = (aiTotal * weightAI) + (projectedDemand * (1 - weightAI))
          usedAi = true
        }
      } catch (err) {
        console.error("AI Prediction error for " + sku, err)
      }
    }
    //---------------------------------------------------------

    // Marge de sécurité adaptative
    const safetyStock = calculateSafetyStock(velocity, stdDev, leadDays, threshold)

    // Amélioration : un produit sans ventes récentes ne doit pas générer une alerte
    const reorderNeeded = hasRecent && velocity > 0 && projectedDemand > (stock + safetyStock)

    const orderQty = reorderNeeded ? Math.max(0, Math.ceil(projectedDemand - stock)) : 0

    // Estimation date de commande avec marges adaptatives
    const daysUntilStockout = velocity > 0 ? (stock / velocity) : Infinity
    const daysUntilOrder = daysUntilStockout - leadDays
    const orderDate = (daysUntilOrder <= 0) ? new Date() : new Date(now.getTime() + (daysUntilOrder * 24 * 60 * 60 * 1000))

    // Nouvelle métrique : estimation de la couverture en jours
    const coverageDays = velocity > 0 ? Math.floor(stock / velocity) : null

    // Calcul du profit attendu
    const priceRaw = Number(p.price || 0)
    const price = isNaN(priceRaw) ? 0 : priceRaw

    let costRaw = Number(p.cost)
    if (isNaN(costRaw) || costRaw <= 0) {
      costRaw = price * 0.6 // Fallback standard
    }
    const cost = costRaw

    const margin = price - cost
    const roi = (cost > 0) ? ((margin / cost) * 100) : 0
    // Protection ultime contre NaN (ex: si cost très proche de 0 ou infini)
    const safeRoi = isNaN(roi) || !isFinite(roi) ? 0 : roi

    const expectedProfit = margin * projectedDemand

    // Score d'opportunité pour l'investissement
    // On favorise : Gros profit total, fort ROI, tendance positive
    const opportunityScore = (expectedProfit * 0.7) + (safeRoi * 10) * trendRatio

    const item = {
      sku,
      name: p.name,
      sold,
      velocity,
      avgSalesPerDay,
      projectedDemand,
      projectedDemandAdjusted: projectedDemand, // après trend et IA
      stock,
      threshold,
      reorderNeeded,
      orderQty,
      orderDate,
      coverageDays,
      expectedProfit,
      price,
      cost,
      roi: safeRoi,
      opportunityScore,
      aiPrediction, // Info pour l'UI
      usedAi
    }

    // Détails additionnels si demandés
    if (includeDetails) {
      item.details = {
        hasRecentSales: hasRecent,
        trend,
        trendRatio: trendRatio.toFixed(2),
        stdDev: stdDev.toFixed(2),
        safetyStock: Math.round(safetyStock),
        volatility: (stdDev / (velocity + 0.001)).toFixed(2),
        coverageDaysInfo: coverageDays !== null
          ? `${coverageDays} jour${coverageDays !== 1 ? 's' : ''}`
          : 'Aucune vente',
        aiConfidence: aiPrediction && !isNaN(aiPrediction.confidence) ? (aiPrediction.confidence * 100).toFixed(0) + '%' : 'N/A'
      }
    }

    return item
  }))

  // Tri : réapprovisionnement urgent d'abord, puis par profit décroissant
  list.sort((a, b) => {
    if (a.reorderNeeded === b.reorderNeeded) {
      return b.expectedProfit - a.expectedProfit
    }
    return a.reorderNeeded ? -1 : 1
  })

  // DEBUG LOG
  console.log('computeDecisions returning:', list)

  return list
}

/**
 * Retourne un résumé pour affichage rapide (top N produits)
 */
export async function getTopReorderItems(limit = 8, options = {}) {
  const decisions = await computeDecisions(options)

  // Filtrer les vrais prioritaires
  const urgent = decisions.filter(d => d.reorderNeeded && d.orderDate <= new Date())
  const warning = decisions.filter(d => d.reorderNeeded && d.orderDate > new Date())

  // Retourner urgent d'abord, puis warning, jusqu'à limit
  return [
    ...urgent.slice(0, limit),
    ...warning.slice(0, Math.max(0, limit - urgent.length))
  ]
}

/**
 * Analyse la santé générale du stock
 */
export async function getStockHealth(options = {}) {
  const decisions = await computeDecisions(options)
  console.log('getStockHealth received:', decisions)


  const totalProducts = decisions.length
  const urgentReorder = decisions.filter(d => d.reorderNeeded && d.orderDate <= new Date()).length
  const warningReorder = decisions.filter(d => d.reorderNeeded && d.orderDate > new Date()).length
  const okProducts = totalProducts - urgentReorder - warningReorder

  const totalProjectedDemand = decisions.reduce((sum, d) => sum + d.projectedDemand, 0)
  const totalCurrentStock = decisions.reduce((sum, d) => sum + d.stock, 0)
  const coverageRatio = totalCurrentStock / (totalProjectedDemand + 0.001)

  return {
    totalProducts,
    urgentReorder,
    warningReorder,
    okProducts,
    totalProjectedDemand: Math.round(totalProjectedDemand),
    totalCurrentStock,
    coverageRatio: coverageRatio.toFixed(2),
    healthScore: Math.round(Math.min(100, (okProducts / totalProducts * 100)))
  }
}
