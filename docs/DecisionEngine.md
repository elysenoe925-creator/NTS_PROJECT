# DecisionEngine / DecisionCenter — Documentation

## Objectif

Le module de décision analyse l'historique des ventes et l'état des stocks pour recommander quels produits commander, en quelle quantité et à quel moment.

Deux vues liées existent maintenant :

- `DecisionEngine` (ancien composant utilisé pour calculs et métriques) : `src/components/DecisionEngine.jsx` (conserve certaines vues/utilitaires).
- `DecisionCenter` (nouvelle page dédiée pour consulter et gérer les décisions) : `src/components/DecisionCenter.jsx` (route `#/decisions`).

## Emplacement

- Composants React: `src/components/DecisionEngine.jsx`, `src/components/DecisionCenter.jsx`
- Moteur de décision amélioré: `src/lib/advancedDecisionEngine.js` 
- Stockage des produits: `src/lib/productsStore.js` (localStorage key: `gsm_products_v1`)
- Stockage des ventes: `src/lib/salesStore.js` (localStorage key: `gsm_sales_v1`)

## Améliorations apportées (2026-01-20) — Précision du moteur

Le moteur de décision a été considérablement amélioré pour offrir des recommandations plus précises et pertinentes :

### 1. **Analyse de tendance des ventes**
- Détecte si les ventes sont **en croissance**, **en décroissance** ou **stables**
- Ajuste automatiquement la demande projetée en fonction de la tendance
- Exemple: Si les ventes croissent de 30%, la demande projetée est majorée de 30% maximum

### 2. **Calcul de la volatilité (écart-type)**
- Mesure la variabilité des ventes quotidiennes
- Produits avec ventes prévisibles → marge de sécurité réduite
- Produits avec ventes imprévisibles → marge de sécurité augmentée
- Évite les sur-stocks ou les ruptures

### 3. **Marge de sécurité adaptative**
- Remplace le seuil fixe par une marge calculée dynamiquement
- Basée sur:
  - L'écart-type des ventes
  - La longueur du délai d'importation
  - Le niveau de service souhaité (~95%)
- Formule: `safetyStock = z-score × σ × √(leadDays/30)` avec ajustement selon la volatilité

### 4. **Filtrage des produits inactifs**
- Les produits **sans ventes depuis 30 jours** ne génèrent plus d'alertes
- Évite les faux positifs pour les produits obsolètes ou saisonniers
- Réduit le bruit des recommandations

### 5. **Affichage du score de santé du stock**
- Nouvelle section dans `DecisionCenter` affichant:
  - **Score de santé**: Pourcentage de produits en bon état (0-100%)
  - **Ratio stock/demande**: Couverture actuelle (ex: 2.5x)
  - **Urgents**: Nombre de produits nécessitant action immédiate
  - **Attention**: Nombre de produits avec alerte prochaine

### 6. **Détails de volatilité**
- Table enrichie montrant pour chaque produit:
  - Volatilité (coefficient de variation)
  - Écart-type des ventes
  - Tendance détectée (croissance/décroissance/stable)
  - Marge de sécurité calculée

## Changements récents (2026-01-16 → 2026-01-20)

- ✅ Moteur amélioré : `src/lib/advancedDecisionEngine.js` (nouveau)
- ✅ Analyse de tendance intégrée
- ✅ Volatilité mesurée par écart-type
- ✅ Marge de sécurité adaptative
- ✅ Filtrage des produits sans ventes récentes
- ✅ Score de santé du stock global
- ✅ Détails enrichis dans la table
- La fenêtre d'historique utilisée pour agréger les ventes est au minimum de 7 jours (`effectiveLookback ≥ 7`)
- `leadDays` (délai d'importation) par défaut : 120 jours (≈ 4 mois). L'utilisateur peut modifier cette valeur depuis l'UI et le calcul se met à jour.
- Calcul ajouté : `avgSalesPerDay` (moyenne journalière des ventes sur la fenêtre effective) — affichée dans la table
- Calcul de la quantité à commander : `ceil(projectedDemand - stock)` lorsque le réapprovisionnement est nécessaire
- Estimation de la date de commande : basée sur la vitesse de vente et le délai d'importation
- Support multi-boutiques : les données produit et ventes sont segmentées par `store`

### Schéma de données — multi-boutiques

- Produits : chaque produit contient un champ `stockByStore` avec les quantités par boutique
- Ventes : chaque vente inclut un champ `store` indiquant la boutique d'origine

### API helpers (lib)

Les utilitaires disponibles dans `src/lib` :

- `getProducts()` — retourne la liste complète
- `getProductsForStore(storeId)` — retourne la liste des produits avec quantité pour `storeId` (ou somme si `storeId === 'all'`)
- `setStock(sku, storeId, qty)` — met à jour le stock d'un produit pour une boutique
- `getSales(storeId?)` — retourne les ventes, optionnellement filtrées par boutique

## Nouvelles fonctions du moteur (`advancedDecisionEngine.js`)

### `computeDecisions(options)`
Effectue tous les calculs de recommandation avec options:
- `lookback` (jours): fenêtre d'analyse
- `leadDays` (jours): horizon de livraison  
- `storeId`: filtrer par boutique (null = tous)
- `includeDetails` (bool): inclure volatilité, trend, etc.

**Retourne**: Array d'objets avec:
```javascript
{
  sku, name,
  sold,                 // qty vendue
  velocity,             // ventes/jour
  avgSalesPerDay,       // idem
  projectedDemand,      // avec ajustement trend
  stock, threshold,
  reorderNeeded,        // bool
  orderQty,             // qty à commander
  orderDate,            // quand commander
  expectedProfit,
  details: {            // si includeDetails=true
    hasRecentSales,
    trend,
    trendRatio,
    stdDev,
    safetyStock,
    volatility
  }
}
```

### `getTopReorderItems(limit, options)`
Retourne les `limit` produits prioritaires (urgent d'abord, puis warning).

### `getStockHealth(options)`
Analyse la santé globale du stock:
```javascript
{
  totalProducts,
  urgentReorder,
  warningReorder,
  okProducts,
  totalProjectedDemand,
  totalCurrentStock,
  coverageRatio,        // stock / demande
  healthScore           // 0-100
}
```

## Entrées

- `lookback` (jours) — fenêtre d'historique pour agréger les ventes (minimum 7 jours automatique; `effectiveLookback = Math.max(lookback, 7)`)
- `leadDays` (jours) — horizon de livraison pour projeter la demande future (par défaut 120 jours)
- Données sources :
  - `getProducts()` / `getProductsForStore()` (SKU, qty, reorderThreshold, price, cost, category, etc.)
  - `getSales()` (SKU, qty, date, store)

## Calculs et sorties

Pour chaque produit, le moteur calcule :

- `sold`: quantité vendue sur la période `effectiveLookback`
- `avgSalesPerDay`: moyenne journalière = `sold / effectiveLookback`
- `stdDev`: écart-type des ventes quotidiennes → mesure la volatilité
- `trend`: tendance détectée (croissance/décroissance/stable)
- `trendRatio`: ajustement de demande selon tendance (ex: 1.3 si croissance)
- `projectedDemand`: `avgSalesPerDay × leadDays × trendRatio` — demande projetée avec tendance
- `safetyStock`: marge calculée = `z-score × stdDev × √(leadDays/30)` — adaptatif selon volatilité
- `reorderNeeded`: booléen, true si:
  - Produit a ventes récentes (derniers 30j)
  - `avgSalesPerDay > 0`
  - `projectedDemand > (stock + safetyStock)`
- `orderQty`: `ceil(projectedDemand - stock)` si `reorderNeeded`
- `orderDate`: estimation en soustrayant `leadDays` aux jours avant rupture

Les listes sont triées pour prioriser:
1. Produits en rupture imminente (orderDate ≤ maintenant)
2. Produits en alerte (orderDate dans les jours)
3. Produits OK, par profit décroissant

## Affichage (UI)

- **DecisionCenter** (`#/decisions`): 
  - **Panneau santé**: score, ratio, urgents, attention
  - **Table détaillée**: SKU, Produit, Stock, Ventes, Moyenne, **Volatilité**, Qté à commander, Quand
  - Lignes colorées: rouge (urgent), orange (attention), vert (OK)
  - Contrôles: Période d'analyse, Délai d'importation

- **DecisionEngine** (dashboard):
  - Affichage des 8 produits prioritaires
  - Cartes avec synthèse (SKU, ventes, vitesse, demande projetée, profit)
  - Boutons "Marquer réappro"

## Contrôles utilisateur

- `Période d'analyse (jours)` (`lookback`) — saisie numérique, minimum 7 jours appliqué
- `Délai d'importation (jours)` (`leadDays`) — saisie numérique, par défaut 120

## Tests manuels recommandés

1. Lancer l'app (`npm run dev`) et naviguer vers `#/decisions`
2. Vérifier le panneau de santé (score, ratio, décompte)
3. Vérifier la table:
   - Colonne **Volatilité** affichée et cohérente
   - Ligne colorée selon statut (urgent/attention/ok)
   - Quand "Commander maintenant" apparaît pour les urgents
4. Créer des ventes avec pattern croissant (ex: 1 → 2 → 3 unités/jour) et vérifier l'ajustement de tendance
5. Créer des ventes avec haute variabilité et vérifier que safetyStock augmente
6. Arrêter les ventes d'un produit et vérifier qu'il disparaît des alertes après 30 jours sans ventes
7. Modifier `Période d'analyse` et `Délai d'importation` et vérifier les mises à jour en temps réel

## Points forts des améliorations

✅ **Réduction des faux positifs**: Filtrage des produits sans ventes récentes  
✅ **Adaptabilité**: Marge de sécurité basée sur volatilité réelle, pas fixe  
✅ **Anticipation**: Tendance détectée pour adapter demande future  
✅ **Transparence**: Volatilité visible pour comprendre les recommandations  
✅ **Vue globale**: Score de santé pour monitorer l'ensemble du stock  
✅ **Précision accrue**: Combinaison de 4 facteurs (trend, stdDev, leadDays, historique)

## Limitations et points d'amélioration futures


- Le modèle reste heuristique (projection linéaire) et ne gère pas saisonnalité ou promotions.
- La quantité recommandée est une approximation simple; considérer l'ajout de MOQ, contraintes fournisseurs et optimisation de coût.
- Améliorations futures : modèles statistiques/ML, lead times par fournisseur, export de commandes.

## Fichiers pertinents

- `src/components/DecisionCenter.jsx` (nouvelle page)
- `src/components/DecisionEngine.jsx` (calculs et utilitaires existants)
- `src/lib/productsStore.js`
- `src/lib/salesStore.js`

---
Generated on 2026-01-16.
