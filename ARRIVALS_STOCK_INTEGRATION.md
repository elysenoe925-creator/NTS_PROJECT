# Intégration Arrivage-Stock avec Coût Moyen Pondéré

## Fonctionnalité Implémentée

Quand un produit arrive dans un arrivage et que cet arrivage est confirmé:

1. **Stock augmente**: La quantité du stock du produit A augmente de la quantité reçue
2. **Coût moyen pondéré calculé**: Le coût unitaire est recalculé en utilisant la formule du coût moyen pondéré
3. **Prix total mis à jour automatiquement**: Le prix de vente est recalculé basé sur le coût moyen pondéré et la marge bénéficiaire

## Formules Utilisées

### Coût Moyen Pondéré
```
Nouveau Coût = (Ancien Coût × Ancienne Quantité + Nouveau Coût × Nouvelle Quantité) / (Ancienne Quantité + Nouvelle Quantité)
```

Exemple:
- Stock existant: 10 units @ 100 Ar/unit = 1000 Ar
- Nouvel arrivage: 5 units @ 120 Ar/unit = 600 Ar
- Nouveau coût = (100 × 10 + 120 × 5) / (10 + 5) = 2000 / 15 = **106.67 Ar/unit**
- Nouveau stock: 15 units @ 106.67 Ar/unit

### Prix de Vente
```
Prix de Vente = Coût Moyen × (1 + Marge / 100)
```

Exemple:
- Coût moyen: 106.67 Ar
- Marge: 30%
- Prix de vente = 106.67 × (1 + 30/100) = 106.67 × 1.30 = **138.67 Ar**

## Architecture

### Base de Données
- **Stock.cost**: Stocke le coût moyen pondéré pour chaque produit par boutique
- **Stock.margin**: Stocke la marge bénéficiaire pour chaque produit par boutique
- **Product.cost**: Stocke le coût global du produit (mis à jour lors de confirmations)
- **Product.price**: Stocke le prix global du produit (recalculé automatiquement)
- **ArrivalItem.costPrice**: Contient le coût unitaire de chaque article arrivé

### API Backend
- **PUT `/api/arrivals/:id/confirm`**: Confirmation de l'arrivage
  - Vérifie l'existence du stock existant
  - Calcule le coût moyen pondéré
  - Mise à jour du stock avec nouveau coût
  - Recalcul du prix de vente basé sur la marge
  - Mise à jour du statut à "confirmed"

### UI Frontend
- Confirmation d'arrivage affiche: "Arrivage confirmé - Stock augmenté et coût moyen pondéré calculé"
- Action logging enregistre le coût moyen pondéré calculé
- Toast notification confirme la mise à jour

## Flux de Données

```
1. Arrivage Créé (Status: pending)
   └─ Contient items avec costPrice

2. Utilisateur Confirme l'Arrivage
   └─ API reçoit PUT /api/arrivals/:id/confirm

3. Pour Chaque Item:
   └─ Récupère le stock existant
   └─ Calcule: weighted_avg_cost = (old_cost * old_qty + new_cost * new_qty) / (old_qty + new_qty)
   └─ Met à jour Stock:
      - qty += qtyReceived
      - cost = weighted_avg_cost
      - margin = marge existante ou du produit
   └─ Met à jour Product:
      - cost = weighted_avg_cost
      - price = cost * (1 + margin/100)

4. Broadcast aux Clients
   └─ broadcastProducts() → met à jour l'UI
   └─ broadcastArrivals() → met à jour le statut
   └─ broadcastLogs() → enregistre l'action
```

## Cas Limites Gérés

1. **Premier arrivage d'un produit**: 
   - Si aucun stock n'existe, création d'une nouvelle ligne Stock
   - Coût initial = costPrice de l'arrivage

2. **Marge non définie**:
   - Utilise la marge du stock existant, sinon la marge du produit, sinon 0%

3. **Coût null**:
   - Le prix n'est calculé que si le coût est défini

## Testing

Pour tester la fonctionnalité:

1. Créer un produit avec une quantité initiale et un coût
2. Créer un arrivage avec un coût unitaire différent
3. Confirmer l'arrivage
4. Vérifier que:
   - La quantité augmente correctement
   - Le coût moyen pondéré est calculé
   - Le prix se met à jour automatiquement
   - L'historique d'actions enregistre la mise à jour
