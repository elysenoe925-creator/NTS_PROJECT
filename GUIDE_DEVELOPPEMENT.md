# Guide de Développement - Intégration Arrivage-Stock

## Objectif Fonctionnel

Implémenter une intégration complète entre les modules Arrivages et Stock:
- Quand un arrivage est confirmé, le stock du produit augmente
- Le coût unitaire est recalculé en utilisant le coût moyen pondéré
- Le prix de vente est mise à jour automatiquement

## Architecture Technique

### Composants Affectés

```
Frontend
├── src/components/Arrivals.jsx (confirmArrival)
└── src/components/Stock.jsx (affichage mis à jour)

Backend
├── server/src/index.js (PUT /api/arrivals/:id/confirm)
└── server/prisma/schema.prisma (inchangé - utilise structure existante)
```

### Flux de Données

```
Utilisateur confirme arrivage
        ↓
PUT /api/arrivals/:id/confirm
        ↓
Récupère l'arrivage et ses items
        ↓
Pour chaque item:
  ├─ Récupère le produit
  ├─ Récupère le stock existant
  ├─ Calcule coût moyen pondéré
  ├─ Calcule nouveau prix
  ├─ Met à jour ou crée le stock
  └─ Met à jour le produit
        ↓
Met à jour statut arrivage
        ↓
Enregistre action log
        ↓
Broadcast aux clients
        ↓
UI mise à jour en temps réel
```

## Détails Implémentation

### 1. Endpoint Backend

**Route**: `PUT /api/arrivals/:id/confirm`

**Logique**:
```javascript
1. Valider que l'arrivage existe et est en status "pending"
2. Pour chaque item de l'arrivage:
   a. Récupérer le produit
   b. Récupérer le stock existant (s'il existe)
   c. Calculer le coût moyen pondéré:
      - Si stock existe et qty > 0:
        newCost = (old_cost × old_qty + new_cost × new_qty) / (old_qty + new_qty)
      - Sinon: newCost = costPrice de l'item
   d. Calculer le prix de vente:
      newPrice = newCost × (1 + margin / 100)
   e. Mettre à jour ou créer le stock:
      - qty += qtyReceived
      - cost = newCost
      - margin = marge existante ou du produit
   f. Mettre à jour le produit:
      - price = newPrice
      - cost = newCost
3. Mettre à jour statut de l'arrivage à "confirmed"
4. Créer un action log
5. Broadcaster les mises à jour
```

### 2. Frontend

**Fonction**: `confirmArrival(id)` dans `Arrivals.jsx`

**Améliorations**:
- Message de confirmation affiche que le coût moyen pondéré sera calculé
- Toast notification détaillée
- Action log incluent le coût moyen pondéré

### 3. Base de Données

**Utilise la structure existante**:
- `Stock.qty` : Quantité en stock
- `Stock.cost` : Coût moyen pondéré
- `Stock.margin` : Marge bénéficiaire
- `Product.price` : Prix de vente
- `Product.cost` : Coût global
- `ArrivalItem.costPrice` : Coût unitaire du produit arrivé

**Aucune migration nécessaire** - la structure existe déjà

## Formules Mathématiques

### Coût Moyen Pondéré (Weighted Average Cost)
```
Formula: WAC = (Σ(cost_i × qty_i)) / (Σ qty_i)

Pour 2 périodes:
WAC = (cost_old × qty_old + cost_new × qty_new) / (qty_old + qty_new)

Exemple:
- Stock: 100 units @ 10 Ar = 1000 Ar
- Arrivage: 50 units @ 12 Ar = 600 Ar
- WAC = (10 × 100 + 12 × 50) / 150 = 1600 / 150 = 10.67 Ar
```

### Prix de Vente (Markup Calculation)
```
Formula: Price = Cost × (1 + Margin%)

Exemple:
- Coût: 10.67 Ar
- Marge: 20%
- Price = 10.67 × 1.20 = 12.80 Ar
```

## Cas Gérés

### ✅ Stock Existant
- Coût moyen pondéré calculé
- Quantité augmente
- Prix ajusté

### ✅ Pas de Stock Existant
- Nouvelle ligne stock créée
- Coût = costPrice de l'arrivage
- Prix calculé avec marge

### ✅ Marge Non Définie
- Utilise margin du stock existant
- Sinon utilise margin du produit
- Sinon 0% (pas de marge)

### ✅ Coût Null
- Prix non recalculé si coût null

### ✅ Arrivage Annulé
- Pas de modification du stock
- Status = "cancelled"

## Testing

### Unit Tests (Recommandé)
```javascript
// Tester le calcul du coût moyen pondéré
const weightedAvgCost = (oldCost, oldQty, newCost, newQty) => {
  if (oldQty === 0) return newCost;
  return (oldCost * oldQty + newCost * newQty) / (oldQty + newQty);
};

test('calcule WAC correctement', () => {
  expect(weightedAvgCost(10, 100, 12, 50)).toBe(10.67);
});
```

### Integration Tests
1. Créer un arrivage
2. Confirmer
3. Vérifier base de données
4. Vérifier broadcast WebSocket
5. Vérifier UI mise à jour

## Documentation Créée

1. **ARRIVALS_STOCK_INTEGRATION.md**: Architecture et fonctionnalité
2. **ARRIVALS_STOCK_UPDATE.md**: Résumé des changements
3. **ARRIVALS_STOCK_EXAMPLES.md**: Exemples détaillés avec calculs
4. **ARRIVALS_STOCK_TESTS.md**: Plan de test complet
5. **GUIDE_DEVELOPPEMENT.md**: Ce fichier

## Performance

### Optimisations
- Utilise des findUnique avec indexes uniques (productId_store)
- Une query par item (acceptable pour arrivages typiques)
- Broadcast groupé (une fois par arrivage)

### Considérations
- Pour 100 items: ~100 queries (4 par item en moyenne)
- Temps attendu: < 500ms
- Pour optimiser: utiliser transactions si arrivages très volumineux

## Sécurité

### Validations
- ✅ Authentification requise (middleware auth)
- ✅ Status checked avant confirmation
- ✅ Validation des données numériques
- ✅ Gestion des erreurs avec try-catch

### Permissions
- À implémenter: Vérifier que l'utilisateur a accès à la boutique

## Maintenance Future

### Extensions Possibles
1. **Historique des coûts**: Enregistrer chaque WAC dans une table d'audit
2. **Écarts de prix**: Alerter si costPrice s'écarte trop du WAC
3. **FIFO/LIFO**: Implémenter d'autres méthodes d'évaluation de stock
4. **Ajustement manuel**: Permettre modifier le WAC après confirmation
5. **Rapports**: Ajouter rapports d'analyse de coûts

### Points de Vigilance
- Le WAC peut fluctuer à chaque arrivage - comportement normal
- Les prix de vente changent automatiquement - bien communiquer aux utilisateurs
- Les marges par boutique peuvent créer des prix différents par store

## Questions Fréquentes

### Q: Pourquoi le prix change après un arrivage?
**R**: Parce que le coût moyen pondéré change. Avec une marge fixe, un coût différent = prix différent.

### Q: Peut-on annuler une confirmation?
**R**: Non, pas implémenté. Créer un "debit" (retour de marchandise) à la place.

### Q: Comment gérer les retours de marchandise?
**R**: Créer un arrivage négatif ou implémenter un module de retours.

### Q: La marge est-elle par boutique ou globale?
**R**: Peut être les deux - Stock.margin par boutique, Product.margin globale.

## Ressources

- Base de données: SQLite avec Prisma
- Frontend: React
- Backend: Express.js
- Communication temps réel: Socket.IO
