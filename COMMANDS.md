# Commandes Utiles

## Démarrage de l'Application

### Terminal 1 - Backend
```bash
cd server
npm run dev
```
Le serveur tourne sur `http://localhost:4000`

### Terminal 2 - Frontend
```bash
npm run dev
```
L'application tourne sur `http://localhost:5173` (ou 5174 si 5173 est occupé)

---

## Réinitialisation des Données

### Option 1: Nettoyer sans perdre la config
```bash
cd server
node scripts/resetData.js
```
Supprime: ventes, stocks, arrivages, logs
Conserve: produits, utilisateurs

### Option 2: Réinitialisation complète
```bash
cd server
node scripts/resetAll.js
```
Supprime TOUT

### Option 3: Réinitialiser + Données de test
```bash
cd server
node scripts/reseed.js
```
Recrée: utilisateurs, produits, stocks

---

## Vérification de la Base de Données

### Vérifier les utilisateurs
```bash
cd server
sqlite3 prisma/dev.db "SELECT username, role, store FROM User;"
```

### Vérifier les produits
```bash
sqlite3 prisma/dev.db "SELECT sku, name, cost, margin, price FROM Product;"
```

### Vérifier les stocks
```bash
sqlite3 prisma/dev.db "SELECT p.sku, s.store, s.qty, s.cost, s.margin FROM Stock s JOIN Product p ON s.productId = p.id;"
```

### Vérifier les arrivages
```bash
sqlite3 prisma/dev.db "SELECT r.referenceNumber, r.supplier, r.status, COUNT(i.id) as items FROM Arrival r LEFT JOIN ArrivalItem i ON r.id = i.arrivalId GROUP BY r.id;"
```

### Vérifier les ventes
```bash
sqlite3 prisma/dev.db "SELECT p.sku, s.qty, s.total, s.client, s.store FROM Sale s JOIN Product p ON s.productId = p.id ORDER BY s.date DESC LIMIT 10;"
```

---

## Identifiants de Test

Après avoir lancé `node scripts/reseed.js`:

### Admin
- **Utilisateur:** admin
- **Mot de passe:** admin123
- **Rôle:** Admin (accès à tout)
- **Magasin:** Tous

### Manager Majunga
- **Utilisateur:** manager_mj
- **Mot de passe:** mjpass
- **Rôle:** Manager
- **Magasin:** Majunga

### Employé Tamatave
- **Utilisateur:** emp_tm
- **Mot de passe:** tmpass
- **Rôle:** Employé
- **Magasin:** Tamatave

---

## Troubleshooting

### Le port 4000 est déjà utilisé
```bash
# Trouver le processus
netstat -ano | findstr :4000

# Tuer le processus (replace PID)
taskkill /PID <PID> /F
```

### Le port 5173 est déjà utilisé
Vite utilisera automatiquement 5174, 5175, etc.

### Prisma not found
```bash
cd server
npm install
```

### Base de données corrompue
```bash
cd server
rm prisma/dev.db
npx prisma migrate deploy
node scripts/reseed.js
```

---

## Commandes Prisma Utiles

### Générer le client Prisma
```bash
cd server
npx prisma generate
```

### Voir l'interface de la base
```bash
cd server
npx prisma studio
```
Ouvre une interface web sur `http://localhost:5555`

### Vérifier les migrations
```bash
cd server
npx prisma migrate status
```

### Appliquer les migrations
```bash
cd server
npx prisma migrate deploy
```

---

## Logs et Debugging

### Activer les logs Prisma
```bash
cd server
DEBUG=prisma* npm run dev
```

### Vérifier les erreurs de Prisma
Chercher dans les logs du serveur les messages d'erreur de Prisma

### Monitorer les requêtes API
Ouvrir la console du navigateur (F12)
Aller sur l'onglet "Network" pour voir toutes les requêtes

### Vérifier les erreurs Frontend
Console du navigateur (F12 → Console)

---

## Export/Import de Données

### Exporter la base en CSV
```bash
sqlite3 -header -csv prisma/dev.db "SELECT * FROM Product;" > products.csv
sqlite3 -header -csv prisma/dev.db "SELECT * FROM Stock;" > stocks.csv
```

### Faire une sauvegarde
```bash
copy prisma\dev.db prisma\dev.db.backup
```

### Restaurer une sauvegarde
```bash
copy prisma\dev.db.backup prisma\dev.db
```

---

## Développement

### Ajouter une nouvelle table
1. Modifier `server/prisma/schema.prisma`
2. Lancer: `npx prisma migrate dev --name <migration_name>`
3. Redémarrer le serveur

### Tester un changement
1. Faire la modification
2. Redémarrer le backend: `npm run dev` (Ctrl+C puis relancer)
3. Frontend recharge automatiquement

### Forcer un rechargement complet
Appuyer sur F5 dans le navigateur

---

## Performance

### Vérifier la taille de la base
```bash
dir prisma\dev.db
```

### Optimiser la base
```bash
cd server
sqlite3 prisma/dev.db "VACUUM;"
```

### Analyser les requêtes lentes
Activer les logs SQL:
```bash
cd server
PRISMA_QUERY_DEBUG=1 npm run dev
```

---

## Sécurité (Développement)

⚠️ Les identifiants par défaut sont pour développement UNIQUEMENT

Avant déploiement, changer:
- Les mots de passe
- JWT_SECRET
- CORS origins
- DATABASE_URL

---

## Support

Pour plus d'informations, consulter:
- `server/scripts/README.md` - Scripts de réinitialisation
- `ARRIVALS_STOCK_TESTS.md` - Plan de test
- `ARRIVALS_STOCK_EXAMPLES.md` - Exemples d'usage
- `ARRIVALS_STOCK_INTEGRATION.md` - Documentation technique
