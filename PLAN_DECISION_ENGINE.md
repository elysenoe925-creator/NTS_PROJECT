# 📊 PLAN DÉTAILLÉ - MOTEUR DE DÉCISIONS GSM

## 1️⃣ OBJECTIF GLOBAL

Recommander **quels produits commander**, **en quelle quantité** et **à quel moment**, basé sur :
- L'historique des ventes
- L'état du stock actuel
- Les tendances de marché
- La variabilité des ventes
- Le délai d'approvisionnement

---

## 2️⃣ ARCHITECTURE DES COMPOSANTS

```
┌─────────────────────────────────────────────┐
│         INTERFACE UTILISATEUR                 │
├─────────────────────────────────────────────┤
│ DecisionCenter.jsx (page) & DecisionEngine   │
│         (composant dashboard)                 │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      MOTEUR DE DÉCISIONS (logique)           │
├─────────────────────────────────────────────┤
│  advancedDecisionEngine.js                   │
│  - computeDecisions()                         │
│  - getTopReorderItems()                       │
│  - getStockHealth()                           │
│  - Analyse de tendance                        │
│  - Calcul de volatilité                       │
│  - Marge de sécurité adaptative               │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          SOURCES DE DONNÉES                   │
├─────────────────────────────────────────────┤
│ productsStore.js (SKU, stock, prix)          │
│ salesStore.js (historique ventes)            │
│ Socket.IO (synchronisation temps réel)       │
└─────────────────────────────────────────────┘
```

---

## 3️⃣ FLUX DE DONNÉES - ÉTAPE PAR ÉTAPE

### Phase 1️⃣ : COLLECTE DES DONNÉES

```javascript
// 1. Récupérer les produits
const products = getProducts()  // ou getProductsForStore(storeId)
// Structure: { sku, name, qty, price, cost, reorderThreshold, ... }

// 2. Récupérer l'historique des ventes
const allSales = getSales(storeId)
// Structure: { sku, qty, date, store, ... }

// 3. Filtrer les ventes dans la fenêtre de temps
const effectiveLookback = Math.max(lookback, 7)  // minimum 7 jours
const cutoff = now - (effectiveLookback * 24h)
const recentSales = allSales.filter(s => s.date >= cutoff)
```

**Entrées utilisateur :**
- `lookback` : fenêtre d'analyse (jours) — ex: 30 jours d'historique
- `leadDays` : délai de livraison (jours) — ex: 120 jours
- `storeId` : magasin à analyser (ou `null` pour tous)

---

### Phase 2️⃣ : CALCULS FONDAMENTAUX

Pour chaque produit, calculer les métriques de base :

#### **A. Ventes et Vitesse**
```javascript
sold = SUM(qty de chaque vente)
// Exemple: 3 ventes de 5, 7, 8 unités = 20 vendues

velocity = sold / lookback_days
// 20 unités / 30 jours = 0.67 unités/jour

avgSalesPerDay = velocity  // synonyme
```

#### **B. Stock Actuel et Seuil**
```javascript
stock = produit.qty          // quantité en stock maintenant
threshold = reorderThreshold // seuil de réapprov (ex: 5 unités)
// Défaut: 5 si non défini
```

#### **C. Analyse de Tendance**
```
Diviser la période en 2 moitiés :
- Première moitié : moyenne ventes = M1
- Deuxième moitié : moyenne ventes = M2

Calcul du changement :
change = (M2 - M1) / M1

Si change > +15% → CROISSANCE (trendRatio = 1.0 + change, max 1.5)
Si change < -15% → DÉCROISSANCE (trendRatio = 0.7 à 1.0)
Sinon → STABLE (trendRatio = 1.0)

Exemple:
  M1 = 5 units/jour, M2 = 10 units/jour
  change = (10-5)/5 = 100% → CROISSANCE
  trendRatio = min(1.5, 1.0 + 1.0) = 1.5
  → Demande estimée augmentée de 50%
```

#### **D. Volatilité (Écart-type)**
```javascript
// Agréger les ventes par jour sur la fenêtre
dailyMap = {
  "2026-01-20": 5,   // 5 unités vendues ce jour
  "2026-01-21": 3,   // 3 unités vendues ce jour
  "2026-01-22": 8,   // 8 unités vendues ce jour
  ...
}

values = [5, 3, 8, ...]
mean = sum(values) / count = 5.3

// Écart-type (mesure de variabilité)
variance = SUM((value - mean)²) / count
stdDev = √variance

// Coefficient de variation (volatility)
volatility = stdDev / (velocity + 0.001)
// volatility > 0.5 → très variable
// volatility < 0.2 → très prévisible
```

---

### Phase 3️⃣ : CALCULS AVANCÉS

#### **A. Marge de Sécurité (Safety Stock)**

Cette marge protège contre les ruptures de stock dues à :
- Variations imprévisibles des ventes
- Retards de livraison

```javascript
// Formule adaptative :
safetyStock = z-score × stdDev × √(leadDays/30)

// Où:
// - z-score ≈ 1.65 pour 95% de niveau de service
// - Ajusté selon la variabilité: z = 1.65 + (volatility × 0.5)
// - leadDays normalisé à 30 jours de base

// Exemple:
// stdDev = 2.5 unités, volatility = 0.3, leadDays = 120
// z-score = 1.65 + (0.3 × 0.5) = 1.8
// safetyStock = 1.8 × 2.5 × √(120/30) = 9.0 unités
// → Garder au minimum 9 unités en stock
```

**Cas spéciaux:**
- Si `velocity = 0` → `safetyStock = 0` (produit non vendu)
- Minimum : `safetyStock = max(threshold, calcul)` — jamais inférieur au seuil

#### **B. Demande Projetée**

```javascript
projectedDemand = velocity × leadDays × trendRatio

// Interprétation:
// - velocity × leadDays = demande "neutre" sans tendance
// - × trendRatio = ajuste selon la tendance détectée

// Exemple:
// velocity = 2 unités/jour
// leadDays = 120 jours
// trendRatio = 1.2 (croissance détectée)
// projectedDemand = 2 × 120 × 1.2 = 288 unités
// → On aura besoin de 288 unités pendant les 4 prochains mois
```

---

### Phase 4️⃣ : DÉCISION DE RÉAPPROVISIONNEMENT

#### **Condition pour Réapprovisionner**

```javascript
reorderNeeded = 
  hasRecentSales(derniers 30 jours) 
  && velocity > 0
  && projectedDemand > (stock + safetyStock)

// Explication:
// 1. Produit doit avoir ventes récentes (sinon produit obsolète)
// 2. Vitesse positive (sinon pas de demande)
// 3. Demande future > stock + marges
//    → Sinon, on a assez de stock
```

#### **Quantité à Commander**

```javascript
if (reorderNeeded) {
  orderQty = CEIL(projectedDemand - stock)
} else {
  orderQty = 0
}

// Exemple:
// projectedDemand = 288 unités
// stock = 50 unités
// orderQty = CEIL(288 - 50) = 238 unités
// → Commander 238 unités
```

#### **Timing de Commande**

```javascript
daysUntilStockout = stock / velocity
daysUntilOrder = daysUntilStockout - leadDays
orderDate = now + (daysUntilOrder × 24h)

// Exemple:
// stock = 50, velocity = 2 unités/jour
// daysUntilStockout = 50 / 2 = 25 jours
// leadDays = 120 jours (4 mois)
// daysUntilOrder = 25 - 120 = -95 jours
// → Urgence ! Commander maintenant (orderDate = today)

// Cas normal:
// stock = 500, velocity = 2 unités/jour
// daysUntilStockout = 250 jours
// daysUntilOrder = 250 - 120 = 130 jours
// orderDate = now + 130 jours
// → Pas urgent, commander dans 4+ mois
```

---

### Phase 5️⃣ : MÉTRIQUES SUPPLÉMENTAIRES

#### **Couverture en Jours**
```javascript
coverageDays = stock / velocity
// Combien de jours le stock actuel peut tenir

// Exemple:
// stock = 50, velocity = 2/jour
// coverageDays = 25 jours
// → Le stock actuel tiendra 25 jours
```

#### **Profit Attendu**
```javascript
expectedProfit = (price - cost) × projectedDemand

// Exemple:
// price = 100 Ar, cost = 60 Ar
// projectedDemand = 288 unités
// expectedProfit = 40 × 288 = 11,520 Ar
// → Profit estimé sur la période
```

---

## 4️⃣ PRIORITÉS ET TRI

Les produits sont classés par **urgence** :

```
URGENT (Réapprovisionnement immédiat)
  ├─ orderDate <= today
  └─ Exemple: stock fini dans 2 jours, livraison 4 mois
  
ATTENTION (À surveiller)
  ├─ reorderNeeded = true
  ├─ orderDate > today
  └─ Exemple: Commander dans 30 jours
  
OK (Pas d'alerte)
  └─ reorderNeeded = false
     → Stock suffisant jusqu'à fin de période
```

**Tri au sein d'une catégorie :**
- Par profit décroissant (produits à haute marge d'abord)

---

## 5️⃣ SANTÉ GLOBALE DU STOCK

La fonction `getStockHealth()` analyse le portfolio complet :

```javascript
totalProducts = nombre total de produits

urgentReorder = nombre de produits en urgence
warningReorder = nombre de produits en attention
okProducts = nombre de produits OK

healthScore = (okProducts / totalProducts) × 100
// 100 = parfait état, 0 = tous en rupture

coverageRatio = totalStock / totalProjectedDemand
// > 2.0 = sur-stocké
// 1.0 - 2.0 = sain
// < 1.0 = sous-stocké (risque)

// Exemple de résumé:
{
  totalProducts: 150
  urgentReorder: 3      ← CRITIQUE!
  warningReorder: 15
  okProducts: 132
  healthScore: 88%      ← Bon état
  coverageRatio: 1.45   ← Sain
  totalCurrentStock: 4500
  totalProjectedDemand: 3100
}
```

---

## 6️⃣ INTERFACE UTILISATEUR

### **DecisionCenter** (page `/decisions`)

```
┌─────────────────────────────────────────────┐
│         📊 SANTÉ DU STOCK                    │
├─────────────────────────────────────────────┤
│ Score: 88% | Ratio: 1.45x | Urgents: 3     │
│ Attention: 15 | OK: 132                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│    PARAMÈTRES D'ANALYSE                      │
├─────────────────────────────────────────────┤
│ Période: [7] jours | Délai: [120] jours    │
│ Magasin: [Tous ▼]                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│    TABLEAU DÉTAILLÉ                         │
├──────┬─────────┬───────┬─────┬──────┬───────┤
│ SKU  │ Produit │Stock  │Ventes/j│Qté Cmd│Quand │
├──────┼─────────┼───────┼─────┼──────┼───────┤
│ P-01 │ Widget  │ 5     │ 2.5 │ 235  │URGENT │ (rouge)
│ P-02 │ Gadget  │ 50    │ 1.2 │ 95   │30j    │ (orange)
│ P-03 │ Truc    │ 200   │ 0.8 │ 0    │OK     │ (vert)
└──────┴─────────┴───────┴─────┴──────┴───────┘
```

### **DecisionEngine** (widgets du dashboard)

- Affiche top 8 produits prioritaires
- Cartes avec synthèse rapide
- Boutons "Marquer réappro"

---

## 7️⃣ PARAMÈTRES CLÉS

| Paramètre | Valeur par défaut | Explication |
|-----------|-------------------|-------------|
| `lookback` | 7 jours | Fenêtre d'historique pour analyser les ventes |
| `leadDays` | 120 jours | Horizon de projection / délai de livraison |
| `MIN_LOOKBACK_DAYS` | 7 jours | Minimum appliqué, même si user rentre < 7 |
| `TREND_WINDOW` | 14 jours | Fenêtre pour analyser la tendance |
| `recentSales_window` | 30 jours | Seuil pour considérer un produit "actif" |
| `z-score de base` | 1.65 | Niveau de service ~95% (stock-out < 5%) |

---

## 8️⃣ FORMULES RÉSUMÉES

```
┌─ FONDAMENTAUX ────────────────────────────┐
│ velocity = sold / lookback_days            │
│ coverage = stock / velocity                │
└────────────────────────────────────────────┘

┌─ TENDANCE ────────────────────────────────┐
│ trend_ratio = 0.7 à 1.5 (selon croissance) │
└────────────────────────────────────────────┘

┌─ VOLATILITÉ ──────────────────────────────┐
│ stdDev = √( Σ(daily_sales - mean)² / N )  │
│ volatility = stdDev / velocity             │
└────────────────────────────────────────────┘

┌─ MARGE DE SÉCURITÉ ────────────────────────┐
│ z = 1.65 + (volatility × 0.5)              │
│ safetyStock = z × stdDev × √(lead/30)      │
└────────────────────────────────────────────┘

┌─ DEMANDE PROJETÉE ─────────────────────────┐
│ projDemand = velocity × leadDays × trend   │
└────────────────────────────────────────────┘

┌─ SEUIL DE RÉAPPRO ─────────────────────────┐
│ IF (recent_sales AND velocity > 0           │
│     AND projDemand > (stock + safety))      │
│   THEN reorderNeeded = TRUE                │
└────────────────────────────────────────────┘

┌─ QUANTITÉ À COMMANDER ─────────────────────┐
│ orderQty = CEIL(projDemand - stock)         │
└────────────────────────────────────────────┘
```

---

## 9️⃣ CAS D'USAGE - EXEMPLES

### **Cas 1 : Produit Stable**
```
Produit: Vis M6
Ventes (30j): 10, 10, 10, 10, 10
velocity = 50/30 = 1.67/jour
trend = stable (ratio=1.0)
stdDev ≈ 0 (très régulier)
safetyStock ≈ 2 unités
stock = 80, projDemand = 1.67 × 120 × 1.0 = 200
reorderNeeded: 200 > (80+2) → TRUE
orderQty = 200 - 80 = 120 ✓
→ Commande prévisible, marges réduites
```

### **Cas 2 : Produit Croissant**
```
Produit: Nouveau Widget
Ventes (30j): 5, 8, 12, 18, 25 (croissance!)
velocity = 68/30 = 2.27/jour
trend = increasing (ratio=1.3)
stdDev ≈ 8.5 (très variable)
safetyStock ≈ 15 unités (marges augmentées)
stock = 50, projDemand = 2.27 × 120 × 1.3 = 354
reorderNeeded: 354 > (50+15) → TRUE
orderQty = 354 - 50 = 304 ✓
→ Stock de sécurité plus haut pour absorber l'imprévisibilité
```

### **Cas 3 : Produit Inactif**
```
Produit: Ancien Gadget
Ventes (30j): 0, 0, 0, 0, 0 (aucune vente!)
velocity = 0/30 = 0
hasRecentSales = FALSE
reorderNeeded: FALSE ✓
→ Pas d'alerte → Évite les faux positifs
```

---

## 🔟 FLUX DE SYNCHRONISATION EN TEMPS RÉEL

```
User modifie ventes (Dashboard > Sales)
        ↓
POST /api/sales → Prisma DB
        ↓
broadcastSales() via Socket.IO
        ↓
Tous les clients reçoivent 'sales:updated'
        ↓
salesStore.setSales() → met à jour cache local
        ↓
DecisionCenter re-render
        ↓
computeDecisions() recalcule avec nouvelles données
        ↓
UI se met à jour en temps réel ✓
```

---

## 1️⃣1️⃣ POINTS À AMÉLIORER

- [ ] Intégrer les commandes existantes dans la projection (réduire projDemand)
- [ ] Gérer les promotions temporaires (spike de ventes)
- [ ] Alertes de fin de vie produit (phase out)
- [ ] Prédiction machine learning (demande future)
- [ ] Évaluation des fournisseurs (lead time variance)
- [ ] Optimisation des coûts de commande (regroupement)
- [ ] Analyse ABC (produits stratégiques vs autres)

---

## 1️⃣2️⃣ TESTING MANUEL

```bash
# 1. Lancer l'app
npm run dev

# 2. Aller sur /decisions

# 3. Vérifier le panneau de santé
# - Score, ratio, compte urgents

# 4. Créer des ventes avec patterns spécifiques
# - Ventes croissantes → voir trendRatio augmenter
# - Ventes variables → voir safetyStock augmenter

# 5. Modifier leadDays et lookback
# - Vérifier que les calculs se mettent à jour

# 6. Ouvrir 2 onglets et modifier depuis l'un
# - Vérifier la synchro Socket.IO
```

---

**Dernière mise à jour:** 2026-01-23
**Moteur:** advancedDecisionEngine.js (v2.0)
**Status:** ✅ Production-ready
