# Exemples d'Utilisation - Intégration Arrivage-Stock

## Exemple 1: Premier Arrivage d'un Produit

### Situation Initiale
- Produit A n'a pas encore de stock
- Arrivage de 10 units à 100 Ar/unit avec marge 20%

### Processus
1. Arrivage créé avec status "pending"
2. Utilisateur confirme l'arrivage
3. Système:
   - Crée un nouveau Stock pour le produit A
   - Quantité: 10 units
   - Coût: 100 Ar (car pas de stock préexistant)
   - Prix calculé: 100 × (1 + 20/100) = **120 Ar**

### Résultat Final
- Stock: 10 units @ 100 Ar = 1000 Ar total
- Prix de vente: 120 Ar/unit

---

## Exemple 2: Réapprovisionement avec Coût Différent

### Situation Initiale
- Produit B en stock: 50 units @ 80 Ar/unit
- Marge: 25%
- Arrivage de 20 units à 90 Ar/unit

### Calcul du Coût Moyen Pondéré
```
Ancien coût: 80 Ar × 50 units = 4000 Ar
Nouveau coût: 90 Ar × 20 units = 1800 Ar
Total: 4000 + 1800 = 5800 Ar
Quantité totale: 50 + 20 = 70 units

Coût moyen = 5800 / 70 = 82.86 Ar/unit
```

### Calcul du Prix
```
Prix = 82.86 × (1 + 25/100) = 82.86 × 1.25 = 103.57 Ar
```

### Résultat Final
- Stock: 70 units @ 82.86 Ar = 5800 Ar total
- Prix de vente: 103.57 Ar/unit
- Ancien prix (120 Ar) → Nouveau prix (103.57 Ar)

---

## Exemple 3: Produit avec Marges Différentes par Boutique

### Situation
- Produit C dans 2 boutiques:
  - Boutique Majunga: 15 units @ 50 Ar, marge 30%
  - Boutique Tamatave: 10 units @ 45 Ar, marge 25%

### Arrivage pour Majunga
- 5 units @ 55 Ar

### Calcul Majunga
```
Coût moyen = (50 × 15 + 55 × 5) / (15 + 5) = 900 / 20 = 51.43 Ar
Prix = 51.43 × (1 + 30/100) = 51.43 × 1.30 = 66.86 Ar
```

### Résultat
- **Majunga**: 20 units @ 51.43 Ar, Prix: 66.86 Ar
- **Tamatave**: Inchangé - 10 units @ 45 Ar, Prix: 56.25 Ar

---

## Exemple 4: Arrive avec Coût Supérieur (Inflation)

### Situation
- Produit D: 30 units @ 100 Ar (marge 15%)
- Marché inflation - nouvel arrivage à 120 Ar

### Avant
- Stock: 30 × 100 = 3000 Ar
- Prix: 100 × 1.15 = 115 Ar

### Arrivage
- Quantité: 10 units @ 120 Ar

### Après Confirmation
```
Coût moyen = (100 × 30 + 120 × 10) / 40 = 4200 / 40 = 105 Ar
Prix = 105 × 1.15 = 120.75 Ar
```

### Résultat
- Stock: 40 units @ 105 Ar = 4200 Ar
- Prix augmente de 115 Ar → 120.75 Ar
- Le système ajuste automatiquement le prix pour maintenir la marge

---

## Flux Détaillé dans l'UI

### 1. Créer un Arrivage
```
Component: Arrivals.jsx
Action: "Ajouter" → Form
Contenu:
- Référence: ARR-001
- Fournisseur: Electronix
- Date: 25/01/2026
- Items:
  * Produit: Résistance 10k
  * Quantité: 5
  * Coût Unitaire: 0.06 Ar
```

### 2. Confirmer l'Arrivage
```
Status: pending → (Cliquer "Confirmer & Augmenter Stock")
Message de confirmation: "Confirmer cet arrivage? Le stock sera augmenté et 
                         le coût moyen pondéré sera calculé automatiquement."
```

### 3. Après Confirmation
```
Status: pending → confirmed
Message: "Arrivage confirmé - Stock augmenté et coût moyen pondéré 
          calculé le 25/01/2026"
Toast: "Arrivage confirmé - Stock et coût moyen pondéré mis à jour"
Log: "ARRIVAL_CONFIRMED - Arrivage confirmé - Stock augmenté et coût moyen 
      pondéré calculé"
```

### 4. Affichage dans Stock
```
Component: Stock.jsx
Produit: Résistance 10k
Quantité: 15 (augmentée de 10)
Coût: 0.057 Ar (coût moyen pondéré)
Prix de vente: 0.074 Ar (recalculé avec marge)
```

---

## Bonnes Pratiques

### ✅ À Faire
1. **Vérifier les coûts avant confirmation** - Assurez-vous que le costPrice est correct
2. **Documenter les arrivages** - Utilisez le champ notes pour traçabilité
3. **Confirmer rapidement** - Les stocks en attente ne reflètent pas la réalité
4. **Vérifier les prix après arrivage** - Assurez-vous que les prix sont réalistes

### ❌ À Éviter
1. Ne pas modifier manuellement le coût après confirmation - Le système le recalcule
2. Ne pas créer d'arrivages en doublon - Cela fausserait le coût moyen pondéré
3. Ne pas ignorer les avertissements de coût anormal

---

## Validation du Système

Pour confirmer que le système fonctionne correctement:

1. **Vérification en Base de Données**
```sql
-- Vérifier le stock
SELECT * FROM stock WHERE productId = X;

-- Vérifier l'historique
SELECT * FROM actionLog WHERE action = 'ARRIVAL_CONFIRMED';
```

2. **Vérification dans l'UI**
- Stock affiche la bonne quantité
- Prix est recalculé correctement
- Historique enregistre l'action

3. **Vérification en Backend**
- Logs d'arrivage confirmés
- Broadcast reçu par les clients
- Pas d'erreurs de calcul

---

## Dépannage

### Problème: Prix non mis à jour
**Cause possible**: Marge = 0 ou non définie
**Solution**: Vérifier Stock.margin et Product.margin

### Problème: Coût moyen incorrect
**Cause possible**: calcul avec qty = 0
**Solution**: Système ignore les stocks vides et utilise uniquement le nouveau coût

### Problème: Arrivage non confirmé
**Cause possible**: Status n'est pas 'pending'
**Solution**: Vérifier le statut de l'arrivage dans la base de données
