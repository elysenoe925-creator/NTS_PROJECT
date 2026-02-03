# 📦 Système d'Arrivages - Guide Complet

## 🎯 Principes Fondamentaux

### La Distinction Clé

Le système sépare deux concepts distincts pour assurer une traçabilité complète :

#### 1. **La Fiche Produit (Le Référentiel)**
- **Definition** : C'est la définition/description de l'objet
- **Creation** : Vous pouvez créer un produit même si vous en avez 0 en stock
- **Champs principaux** :
  - Nom du produit
  - SKU (code-barres)
  - Catégorie
  - Prix de vente
  - Seuil d'alerte
  - Fournisseur par défaut
- **Action** : Création unique (une seule fois par produit)
- **Lieu** : Onglet "Stock" → Section "Produits"

#### 2. **L'Arrivage (Le Flux)**
- **Definition** : C'est l'acte d'achat ou de réception de marchandise
- **Quand** : C'est ici que la quantité est générée/enregistrée
- **Champs principaux** :
  - Quantité reçue
  - Prix d'achat unitaire
  - Date d'arrivée
  - Fournisseur
  - Notes (bon de livraison, etc.)
- **Action** : Répétitive (chaque semaine, mois, etc.)
- **Lieu** : Onglet "Arrivages"

---

## 🔄 Workflow Idéal

### Étape A : Créer le Catalogue (Stock/Produits)
Avant de recevoir une marchandise, le produit doit exister dans la base de données.

1. **Accédez à** : Stock → Onglet "Produits"
2. **Cliquez sur** : "Ajouter un produit"
3. **Remplissez** :
   - SKU : `IPHONE15N` (code unique)
   - Nom : `iPhone 15 - Noir`
   - Catégorie : `Téléphones`
   - Prix de vente : `450000` Ar
   - Seuil d'alerte : `5` unités
4. **Stock initial** : Mettez `0` (le stock viendra via les arrivages)
5. **Validez** : "Créer le produit"

✅ Le produit existe maintenant. Stock = 0

---

### Étape B : Enregistrer l'Entrée (Arrivage)
C'est ici que le stock augmente de manière justifiée et traçable.

1. **Accédez à** : Onglet "Arrivages"
2. **Cliquez sur** : "Nouvel Arrivage"
3. **Remplissez** :
   - **Numéro de Référence** : `ARR-2026-001` (unique)
   - **Fournisseur** : `Fournisseur XYZ`
   - **Date d'Arrivée** : `24/01/2026`
   - **Notes** : `Bon de livraison BL-12345`
4. **Ajoutez les Articles** :
   - Sélectionnez `iPhone 15 - Noir`
   - Quantité reçue : `50`
   - Prix d'achat : `380000` Ar/unité
   - Notes : `Condition: Bon état`
5. **Validez** : "Créer l'Arrivage"

✅ Arrivage créé en status "**En Attente**"

---

### Étape C : Vérifier & Confirmer
Vérifiez le bon de livraison avant de confirmer.

1. **Accédez à** : Arrivage créé
2. **Vérifiez** : 
   - Quantité attendue vs reçue
   - État des produits
   - Références bon de livraison
3. **Si correct** : Cliquez "Confirmer & Augmenter Stock"
4. **Si erreur** : Cliquez "Annuler"

✅ Stock augmente automatiquement : `0 → 50` unités

---

## ✅ Avantages de cette Approche

| Aspect | Approach "Stock Direct" (❌ Mauvaise) | Approach "Arrivage" (✅ Bonne) |
|--------|---------------------------------------|--------------------------------|
| **Traçabilité** | ❌ On ne sait pas d'où viennent les 50 unités | ✅ Fournisseur XYZ, le 24/01/2026 |
| **Vérification** | ❌ Impossible de vérifier si le livreur a fait une erreur | ✅ On peut comparer le bon de livraison et la saisie |
| **Historique Prix** | ❌ Pas d'historique de prix d'achat | ✅ On suit si le prix d'achat augmente |
| **Audit** | ❌ Risque de fraude invisible | ✅ Chaque mouvement est logué |
| **Correction** | ❌ Changement direct dans le stock | ✅ Nouvel arrivage = correction propre |

---

## 🔍 États d'un Arrivage

### 1. **En Attente** (🟡 Pending)
- Arrivage enregistré mais pas encore confirmé
- Stock **n'a pas changé**
- Actions possibles :
  - ✅ Confirmer & Augmenter Stock
  - ❌ Annuler

### 2. **Confirmé** (🟢 Confirmed)
- Arrivage confirmé et traité
- Stock **a été augmenté**
- ✓ Plus d'actions possibles (historique)

### 3. **Annulé** (🔴 Cancelled)
- Arrivage annulé
- Stock **n'a pas changé**
- ✓ Plus d'actions possibles (historique)

---

## 📊 Traçabilité & Audit Trail

Chaque arrivage génère automatiquement des logs :

```
Action: ARRIVAL_CREATED
Description: Arrivage créé: ARR-2026-001 de Fournisseur XYZ (1 articles)
Utilisateur: Jean Dupont
Date: 24/01/2026 10:30:45
Magasin: Antananarivo

Action: ARRIVAL_CONFIRMED
Description: Arrivage confirmé: ARR-2026-001 - Stock augmenté
Utilisateur: Jean Dupont
Date: 24/01/2026 10:45:30
Magasin: Antananarivo
```

✅ Consultable dans : Suivi des actions → Tableau d'audit complet

---

## 🛡️ Bonnes Pratiques

### ✅ À Faire
1. ✅ Créer d'abord tous les produits du catalogue
2. ✅ Enregistrer un arrivage pour chaque réception
3. ✅ Vérifier le bon de livraison avant de confirmer
4. ✅ Consulter l'historique des prix via les arrivages
5. ✅ Documenter les problèmes dans les notes

### ❌ À Éviter
1. ❌ Ne pas modifier le stock directement (edit direct)
2. ❌ Ne pas créer plusieurs arrivages pour une même réception
3. ❌ Ne pas oublier de confirmer après vérification
4. ❌ Ne pas mélanger les fournisseurs dans un seul arrivage

---

## 🔧 Champs Détaillés

### Arrivage
- **Numéro de Référence** : Identifiant unique (format : ARR-YYYY-XXX)
- **Fournisseur** : Nom du fournisseur
- **Date d'Arrivée** : Date de réception
- **Notes** : Références bon de livraison, détails importants
- **Articles** : Liste des produits et quantités

### Article d'Arrivage
- **Produit** : Sélectionner dans le catalogue
- **Quantité Reçue** : Nombre d'unités reçues
- **Prix d'Achat** : Prix unitaire d'achat (TVA incluse)
- **Notes** : État du produit, détails

---

## 📈 Impact sur le Stock

### Avant Confirmation
```
Stock Actuel: 100 unités
Arrivage En Attente (50 unités): IGNORÉ
Stock Réel: 100 unités
```

### Après Confirmation
```
Stock Précédent: 100 unités
+ Arrivage Confirmé: 50 unités
= Stock Actuel: 150 unités
```

---

## 📞 Support & Questions

### Q: Pourquoi je ne peux pas modifier directement le stock?
**R**: Pour éviter les erreurs de traçabilité. Chaque changement doit être lié à une action (vente, arrivage, ajustement).

### Q: Que faire si j'ai enregistré une quantité incorrecte?
**R**: Annulez l'arrivage et créez-en un nouveau avec les bonnes quantités.

### Q: Comment suivre les prix d'achat historiques?
**R**: Consultez la liste des arrivages confirmés. Chaque article contient le prix d'achat du jour.

### Q: Un arrivage peut-il contenir plusieurs fournisseurs?
**R**: Non, un arrivage = une réception d'un fournisseur. Pour plusieurs fournisseurs, créez plusieurs arrivages.

---

## 🎓 Cas d'Usage

### Cas 1: Nouvelle Réception
```
1. Reçevez 100 iPhone 15 du fournisseur A
2. Créez arrivage ARR-2026-001
3. Vérifiez le bon de livraison
4. Confirmez → Stock +100
```

### Cas 2: Rectification de Quantité
```
1. Vous aviez saisi 100, mais c'était 90
2. Annulez l'arrivage En Attente
3. Créez un nouvel arrivage avec 90
4. Confirmez → Stock correct
```

### Cas 3: Suivi de Prix
```
1. Janvier: Acheté 50 unités à 380000 Ar
2. Février: Acheté 50 unités à 390000 Ar (+2.6%)
3. Consultez les arrivages pour voir la tendance
```

---

**Version**: 1.0  
**Date**: 24 Janvier 2026  
**Dernière mise à jour**: 24 Janvier 2026
