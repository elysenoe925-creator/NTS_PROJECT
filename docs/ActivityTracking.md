# Fonctionnalité de Suivi des Actions

## Vue d'ensemble

La fonctionnalité de suivi des actions permet de journaliser automatiquement toutes les opérations effectuées par les employés dans le système GSM. Les administrateurs peuvent alors consulter et analyser ces journaux pour assurer la traçabilité et le contrôle des opérations.

## Caractéristiques

### Actions enregistrées

Le système enregistre automatiquement les actions suivantes:

1. **Ventes** (`VENTE`)
   - Enregistrement: Description du produit, quantité, client et montant
   - Exemple: "Vente de 2 x iPhone 12 (SKU: IP12) à Dupont SARL pour 4500000 ariary"

2. **Création de produit** (`CREATION_PRODUIT`)
   - Enregistrement: SKU, nom du produit et quantité initiale
   - Exemple: "Produit créé: SKU001 - iPhone 13 (Qté: 50)"

3. **Modification de produit** (`MISE_A_JOUR_PRODUIT`)
   - Enregistrement: SKU et nom du produit modifié
   - Exemple: "Produit IP12 mis à jour: iPhone 12 Pro"

4. **Suppression de produit** (`SUPPRESSION_PRODUIT`)
   - Enregistrement: SKU du produit supprimé
   - Exemple: "Produit SKU001 supprimé"

5. **Création d'utilisateur** (`CREATION_UTILISATEUR`)
   - Enregistrement: Nom d'utilisateur, nom d'affichage et rôle
   - Exemple: "Nouvel utilisateur créé: jean_doe (Jean Doe) - Rôle: employee"

6. **Modification d'utilisateur** (`MODIFICATION_UTILISATEUR`)
   - Enregistrement: Nom d'utilisateur, rôle et magasin
   - Exemple: "Utilisateur john_smith modifié - Rôle: admin, Magasin: all"

7. **Suppression d'utilisateur** (`SUPPRESSION_UTILISATEUR`)
   - Enregistrement: Nom d'utilisateur supprimé
   - Exemple: "Utilisateur jane_doe supprimé"

## Accès à la fonctionnalité

### Consulter le suivi des actions

1. **Accès**: Menu principal → "Suivi des actions" (visible uniquement pour les admins)
2. **URL**: `http://localhost:3000/#/tracking`
3. **Permission requise**: Rôle `admin`

### Interface du suivi

La page de suivi des actions affiche:
- Un tableau complet de toutes les actions enregistrées
- La date et l'heure exacte de chaque action
- L'employé qui a effectué l'action
- Le type d'action
- Une description détaillée de l'action
- Le magasin concerné

### Filtrage des données

Les administrateurs peuvent filtrer les journaux selon:

1. **Toutes les actions** (par défaut)
   - Affiche tous les journaux de tous les employés

2. **Par employé**
   - Sélectionner un employé dans la liste déroulante
   - Affiche uniquement les actions de cet employé

3. **Par magasin**
   - Sélectionner un magasin dans la liste déroulante
   - Affiche uniquement les actions effectuées dans ce magasin

## Structure des données

### Table ActionLog

```
ActionLog {
  id: Int              // ID unique
  userId: Int          // ID de l'employé
  user: User          // Relation vers l'utilisateur
  action: String      // Type d'action (VENTE, CREATION_PRODUIT, etc.)
  description: String // Description détaillée de l'action
  timestamp: DateTime // Date et heure de l'action
  store: String       // Magasin concerné (optionnel)
}
```

## API Endpoints

### Enregistrer une action

**Endpoint:** `POST /api/logs`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "action": "VENTE",
  "description": "Vente de 2 x iPhone 12 à Dupont SARL"
}
```

**Réponse:**
```json
{
  "ok": true,
  "log": {
    "id": 1,
    "userId": 5,
    "action": "VENTE",
    "description": "Vente de 2 x iPhone 12 à Dupont SARL",
    "timestamp": "2026-01-18T14:30:00Z",
    "store": "majunga"
  }
}
```

### Récupérer tous les journaux

**Endpoint:** `GET /api/logs`

**Headers:**
```
Authorization: Bearer {token}
```

**Permission:** Admin uniquement

**Réponse:** Array de journaux avec les informations de l'utilisateur

### Récupérer les journaux d'un utilisateur

**Endpoint:** `GET /api/logs/user/{userId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Permission:** Admin uniquement

**Réponse:** Array des journaux de l'utilisateur spécifié

### Récupérer les journaux d'un magasin

**Endpoint:** `GET /api/logs/store/{store}`

**Headers:**
```
Authorization: Bearer {token}
```

**Permission:** Admin uniquement

**Réponse:** Array des journaux du magasin spécifié

## Implémentation côté client

### Fonction utilitaire

```javascript
import { logAction } from '../lib/actionLogger'

// Enregistrer une action
await logAction('VENTE', 'Vente de 5 x iPhone 13')
```

### Composant d'affichage

```javascript
import ActivityTracking from './ActivityTracking'

// Utiliser le composant dans votre application
<ActivityTracking />
```

## Gestion de la confidentialité

- Seuls les administrateurs peuvent consulter les journaux d'actions
- Les employés ne peuvent pas accéder à la page de suivi
- Les journaux sont stockés de manière permanente dans la base de données
- La suppression des journaux n'est pas implémentée pour maintenir l'intégrité des données

## Considérations de performance

- Les journaux sont indexés par date (timestamp) pour des requêtes rapides
- Les filtres par employé et magasin utilisent des requêtes optimisées
- Les logs sont récupérés avec pagination possible (à implémenter selon les besoins)

## Extension future

Possibilités d'amélioration:
- Ajout de filtres par plage de dates
- Export des logs en CSV ou PDF
- Alertes automatiques pour certaines actions
- Analyse des patterns d'utilisation
- Audit détaillé des modifications (avant/après)
- Suppression programmée des anciens logs (archivage)
