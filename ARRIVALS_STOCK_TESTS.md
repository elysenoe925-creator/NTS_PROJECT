# Plan de Test - Intégration Arrivage-Stock avec Coût Moyen Pondéré

## Test 1: Premier Arrivage d'un Produit

### Prérequis
- Produit créé: Résistance 10k (SKU: P-001)
- Aucun stock existant
- Marge produit: 20%

### Étapes
1. Créer un arrivage avec:
   - SKU: P-001
   - Quantité: 10
   - Coût unitaire: 1.00 Ar
   
2. Confirmer l'arrivage

### Attendus
- ✅ Stock créé: 10 units
- ✅ Coût: 1.00 Ar (pas de calcul, première arrivée)
- ✅ Prix: 1.00 × 1.20 = 1.20 Ar
- ✅ Status: "confirmed"
- ✅ Toast: "Arrivage confirmé - Stock et coût moyen pondéré mis à jour"

### Validation
```sql
SELECT * FROM stock WHERE productId = (SELECT id FROM product WHERE sku = 'P-001');
-- Doit retourner: qty=10, cost=1.00
```

---

## Test 2: Réapprovisionement Coût Inférieur

### Prérequis
- Résistance 10k en stock: 20 units @ 1.00 Ar
- Nouvelle arrivage: 10 units @ 0.90 Ar

### Étapes
1. Créer arrivage:
   - SKU: P-001
   - Quantité: 10
   - Coût unitaire: 0.90 Ar

2. Confirmer

### Attendus
```
Coût moyen = (1.00 × 20 + 0.90 × 10) / 30 = 29 / 30 = 0.9667 Ar
Prix = 0.9667 × 1.20 = 1.16 Ar

- ✅ Stock: 30 units
- ✅ Coût: 0.9667 Ar
- ✅ Prix: 1.16 Ar (baisse de 1.20 à 1.16)
```

### Validation
```sql
SELECT qty, cost FROM stock WHERE productId = (SELECT id FROM product WHERE sku = 'P-001');
-- Doit retourner: qty=30, cost≈0.9667
```

---

## Test 3: Réapprovisionement Coût Supérieur

### Prérequis
- Résistance 10k en stock: 30 units @ 0.9667 Ar
- Nouvelle arrivage: 5 units @ 1.10 Ar (inflation)

### Étapes
1. Créer arrivage avec coût plus élevé
2. Confirmer

### Attendus
```
Coût moyen = (0.9667 × 30 + 1.10 × 5) / 35 = 34.501 / 35 = 0.9857 Ar
Prix = 0.9857 × 1.20 = 1.1829 Ar

- ✅ Stock: 35 units
- ✅ Coût: 0.9857 Ar
- ✅ Prix: 1.1829 Ar (hausse de 1.16 à 1.1829)
```

---

## Test 4: Produits Sans Marge Définie

### Prérequis
- Produit créé sans marge (margin = null)
- Pas de stock existant

### Étapes
1. Créer arrivage:
   - Quantité: 5
   - Coût: 50 Ar

2. Confirmer

### Attendus
- ✅ Stock: 5 units @ 50 Ar
- ✅ Prix = 50 × (1 + 0/100) = 50 Ar (marge par défaut = 0%)
- ✅ Pas d'erreur

---

## Test 5: Marges Différentes par Boutique

### Prérequis
- Produit en stock:
  - Majunga: 20 units @ 100 Ar, marge 30%
  - Tamatave: 15 units @ 95 Ar, marge 25%

### Étapes
1. Créer arrivage pour Majunga:
   - Quantité: 10
   - Coût: 110 Ar

2. Confirmer pour Majunga

### Attendus
```
Coût moyen Majunga = (100 × 20 + 110 × 10) / 30 = 3100 / 30 = 103.33 Ar
Prix Majunga = 103.33 × 1.30 = 134.33 Ar

- ✅ Majunga: 30 units @ 103.33 Ar, Prix 134.33 Ar
- ✅ Tamatave: Inchangé - 15 units @ 95 Ar, Prix 118.75 Ar
```

### Validation
```sql
SELECT store, qty, cost FROM stock 
WHERE productId = X 
ORDER BY store;
-- Majunga: qty=30, cost≈103.33
-- Tamatave: qty=15, cost=95
```

---

## Test 6: Annulation d'Arrivage

### Prérequis
- Arrivage en status "pending"

### Étapes
1. Cliquer "Annuler"
2. Confirmer l'annulation

### Attendus
- ✅ Status: "cancelled"
- ✅ Stock: Inchangé
- ✅ Prix: Inchangé
- ✅ Action log: ARRIVAL_CANCELLED

---

## Test 7: Confirmations Multiples

### Prérequis
- Produit: 10 units @ 100 Ar
- 3 arrivages successifs

### Étapes
1. Arrivage 1: 5 units @ 110 Ar → Confirmer
2. Arrivage 2: 8 units @ 105 Ar → Confirmer
3. Arrivage 3: 3 units @ 120 Ar → Confirmer

### Attendus
```
Après Arrivage 1:
- Coût = (100×10 + 110×5) / 15 = 103.33 Ar
- Qty = 15

Après Arrivage 2:
- Coût = (103.33×15 + 105×8) / 23 = 103.96 Ar
- Qty = 23

Après Arrivage 3:
- Coût = (103.96×23 + 120×3) / 26 = 106.81 Ar
- Qty = 26
```

### Validation
- Stock augmente progressivement: 10 → 15 → 23 → 26
- Coût converge vers la moyenne pondérée correcte

---

## Test 8: Interface Utilisateur

### Étapes
1. Naviguer vers Arrivages
2. Créer un arrivage
3. Remplir tous les champs
4. Cliquer "Confirmer & Augmenter Stock"
5. Vérifier le message de confirmation

### Attendus
- ✅ Message affiche: "Coût moyen pondéré sera calculé"
- ✅ Toast affiche: "Stock et coût moyen pondéré mis à jour"
- ✅ Status passe à "confirmed"
- ✅ Aucune erreur console

---

## Test 9: Synchronisation en Temps Réel

### Étapes
1. Ouvrir Arrivages et Stock dans 2 onglets
2. Confirmer arrivage dans onglet 1
3. Vérifier mise à jour dans onglet 2

### Attendus
- ✅ Stock se met à jour automatiquement (broadcast WebSocket)
- ✅ Quantité augmente
- ✅ Prix mis à jour

---

## Test 10: Cas Limites

### Test 10.1: Stock avec qty = 0
- Prérequis: Stock avec qty = 0 (ancien stock épuisé)
- Arrivage: 5 units @ 100 Ar
- **Attendu**: Coût = 100 Ar (ignore le coût du stock vide)

### Test 10.2: Coût null
- Prérequis: Stock existant avec cost = null
- Arrivage: 3 units @ 50 Ar
- **Attendu**: Coût = 50 Ar (prix défini par l'arrivage)

### Test 10.3: Très petites quantités
- Prérequis: Stock: 1000 units @ 0.01 Ar
- Arrivage: 1 unit @ 0.02 Ar
- **Attendu**: Coût = (0.01 × 1000 + 0.02 × 1) / 1001 ≈ 0.01000999 Ar

---

## Checklist de Validation Globale

- [ ] API retourne status 200 après confirmation
- [ ] Stock en base de données augmente correctement
- [ ] Coût moyen pondéré calculé correctement
- [ ] Prix recalculé automatiquement
- [ ] Action log enregistrée
- [ ] Broadcast WebSocket envoyé
- [ ] UI mise à jour en temps réel
- [ ] Aucune erreur console
- [ ] Aucune erreur base de données
- [ ] Messages utilisateur clairs
- [ ] Comportement identique sur tous navigateurs
- [ ] Performances acceptables (< 1s)

---

## Commandes de Debug

### Vérifier les arrivages
```sql
SELECT * FROM arrival WHERE status = 'confirmed' ORDER BY updatedAt DESC;
```

### Vérifier les stocks
```sql
SELECT p.sku, s.store, s.qty, s.cost, s.margin, p.price 
FROM stock s 
JOIN product p ON s.productId = p.id 
ORDER BY p.sku;
```

### Vérifier l'historique
```sql
SELECT * FROM actionLog WHERE action LIKE 'ARRIVAL%' ORDER BY timestamp DESC;
```

### Logs serveur
```
Chercher: [DEBUG] ou [ERROR] dans les logs lors de la confirmation
```
