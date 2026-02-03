# Scripts de Réinitialisation et de Seed

Ce dossier contient les scripts utilitaires pour gérer les données de la base de données.

## Scripts Disponibles

### 1. `resetData.js` - Réinitialisation Partielle
Réinitialise les données opérationnelles en conservant les produits et utilisateurs.

```bash
npm run reset-data
# ou
node scripts/resetData.js
```

**Supprime:**
- ActionLogs (historique des actions)
- ArrivalItems (détails des arrivages)
- Arrivals (arrivages)
- Sales (ventes)
- Stocks (stocks)

**Conserve:**
- Produits
- Utilisateurs

**Utilité:** 
- Pour nettoyer les données de test sans perdre la configuration des produits
- Avant une nouvelle démonstration
- Pour réinitialiser les transactions

---

### 2. `resetAll.js` - Réinitialisation Complète
Réinitialise COMPLÈTEMENT la base de données (tous les données sont supprimées).

```bash
node scripts/resetAll.js
```

**Supprime:**
- Tous les utilisateurs
- Tous les produits
- Tous les stocks
- Toutes les ventes
- Tous les arrivages
- Tous les logs d'action

**Utilité:**
- Remise à zéro totale de la base de données
- Avant de déployer une nouvelle version
- Pour nettoyer complètement après les tests

---

### 3. `reseed.js` - Réinitialisation + Seed
Réinitialise la base de données ET crée les données de test initiales.

```bash
npm run reseed
# ou
node scripts/reseed.js
```

**Crée automatiquement:**

**Utilisateurs:**
- `admin` / `admin123` (Rôle: admin, Magasin: all)
- `manager_mj` / `mjpass` (Rôle: manager, Magasin: majunga)
- `emp_tm` / `tmpass` (Rôle: employee, Magasin: tamatave)

**Produits:**
- P-001: Résistance 10k (0.02 Ar, marge 150%)
- P-002: Coque iPhone 12 (2.50 Ar, marge 100%)
- P-003: Condensateur 100uF (0.05 Ar, marge 120%)

**Stocks:**
- 6 entrées de stock (3 produits × 2 magasins)
- Chaque stock inclut qty, cost, margin

**Utilité:**
- Première initialisation de l'environnement
- Préparer un environnement de démonstration
- Réinitialiser après un test destructif

---

## Configuration dans package.json

Ajouter au `package.json` du serveur:

```json
{
  "scripts": {
    "reset-data": "node scripts/resetData.js",
    "reset-all": "node scripts/resetAll.js",
    "reseed": "node scripts/reseed.js"
  }
}
```

Permet d'utiliser:
```bash
npm run reset-data
npm run reset-all
npm run reseed
```

---

## Flux de Réinitialisation

```
resetData.js          resetAll.js          reseed.js
     ↓                    ↓                    ↓
Sup ActionLog         Sup Users         Sup All Data
Sup ArrivalItems      Sup Products      Create Users
Sup Arrivals          Sup Stocks        Create Products
Sup Sales             Sup Sales         Create Stocks
Sup Stocks            Sup Arrivals      
    ↓                    ↓                    ↓
Produits ✓         Base vide           Prêt à tester
Utilisateurs ✓     (Aucune donnée)     (Données initiales)
```

---

## Cas d'Usage

### Cas 1: Préparer une démo
```bash
npm run reseed
# → Base remplie avec données de test
```

### Cas 2: Nettoyer après test
```bash
npm run reset-data
# → Ventes, arrivages, logs supprimés
# → Produits et utilisateurs conservés
```

### Cas 3: Recommencer de zéro
```bash
npm run reset-all
npm run reseed
# → Base complètement vidée puis remplie
```

---

## Environnement

Les scripts utilisent la variable d'environnement:
- `DATABASE_URL`: Par défaut `file:./dev.db`

Pour utiliser une autre base de données:
```bash
DATABASE_URL="postgresql://user:pass@localhost/dbname" npm run reseed
```

---

## Sécurité

⚠️ **ATTENTION:** Ces scripts **SUPPRIMENT DES DONNÉES**!

- ✅ Utiliser en développement uniquement
- ✅ Faire une sauvegarde avant si nécessaire
- ❌ Ne JAMAIS utiliser en production
- ❌ Ne JAMAIS commiter après avoir lancé ces scripts

---

## Problèmes Courants

### Erreur: "ENOENT: no such file or directory"
La base de données n'existe pas. Créer d'abord avec:
```bash
npx prisma migrate deploy
```

### Erreur: "Relations not found"
Assurez-vous que Prisma est bien généré:
```bash
npx prisma generate
```

### Les changements ne s'affichent pas
Redémarrer le serveur backend:
```bash
npm run dev
```

---

## Vérification

Pour vérifier que les données ont été correctement créées:

```bash
# Vérifier les utilisateurs
sqlite3 dev.db "SELECT username, role, store FROM User;"

# Vérifier les produits
sqlite3 dev.db "SELECT sku, name, cost, margin, price FROM Product;"

# Vérifier les stocks
sqlite3 dev.db "SELECT p.sku, s.store, s.qty, s.cost, s.margin FROM Stock s JOIN Product p ON s.productId = p.id;"
```
