# 🚀 Guide de déploiement sur Render + Netlify

## PARTIE 1: Déployer le Backend sur Render

### 1️⃣ Créer un compte Render
- Va sur [render.com](https://render.com)
- Clique sur **"Sign up"** (ou connecte-toi si tu as déjà un compte)
- Utilise GitHub pour faciliter la connexion

### 2️⃣ Créer une nouvelle Web Service
1. Clique sur **"New +"** en haut à droite
2. Sélectionne **"Web Service"**
3. **Sélectionne ton dépôt GitHub**:
   - Clique sur "Connect account" si nécessaire
   - Choisis `gsm` dans la liste
4. **Configure le service**:
   - **Name**: `gsm-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run prisma:generate`
   - **Start Command**: `npm start`
   - **Region**: Paris (eu-west-1) ou ta région
   - **Plan**: Free (c'est gratuit!)

### 3️⃣ Ajouter les variables d'environnement
1. Scroll down jusqu'à **"Environment"**
2. Clique sur **"Add Environment Variable"**
3. Ajoute ces variables:
   ```
   JWT_SECRET = your_super_secret_jwt_key_here_change_in_production
   FRONTEND_URL = https://ton-site.netlify.app
   NODE_ENV = production
   DATABASE_URL = file:./dev.db
   PORT = 4000
   ```

4. Clique sur **"Create Web Service"**

### 4️⃣ Attendre le déploiement
- Render va automatiquement builder et déployer ton backend
- Tu verras un URL comme: `https://gsm-server.onrender.com`
- ⚠️ Premier déploiement: 5-10 minutes (patient!)

---

## PARTIE 2: Configurer le Frontend sur Netlify

### 5️⃣ Mettre à jour le .env.production
Ajoute l'URL de ton backend Render à `.env.production`:

```env
VITE_API_BASE=https://gsm-server.onrender.com
```

### 6️⃣ Déployer le frontend
**Option A: GitHub + Netlify (Automatique)**
1. Va sur [netlify.com](https://netlify.com)
2. Clique sur **"New site from Git"**
3. Connecte GitHub
4. Choisis le repo `gsm`
5. Laisse les paramètres par défaut:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Clique **"Deploy site"**

**Option B: Drag & Drop**
```powershell
cd d:\Repository\gsm
npm run build
# Puis glisse-dépose le dossier dist sur netlify.com
```

### 7️⃣ Configurer les variables Netlify
1. Va dans **Settings** → **Build & deploy** → **Environment**
2. Ajoute `VITE_API_BASE` = `https://gsm-server.onrender.com`
3. Redéploie ton site

---

## ✅ Vérification après déploiement

### Test 1: Vérifie que le backend répond
```powershell
curl https://gsm-server.onrender.com/api/users
# Doit retourner 401 (not authenticated) ou error, pas de connection error
```

### Test 2: Teste la connexion
1. Va sur ton site Netlify
2. Essaie de te connecter (admin/admin123)
3. Le dashboard devrait s'afficher

### Test 3: Vérifie CORS
Ouvre la console dev (F12) → Console
- Pas d'erreur CORS? ✅ Tout va bien!
- Erreur CORS? Met à jour FRONTEND_URL sur Render

---

## 🔧 Troubleshooting

### ❌ "502 Bad Gateway" sur Render
- Attends 5-10 minutes (déploiement en cours)
- Vérifie les logs dans Render Dashboard

### ❌ Erreur CORS
1. Va sur Render Dashboard
2. Clique sur ton service
3. Va dans **Environment**
4. Mets à jour `FRONTEND_URL` avec ton URL Netlify exacte
5. Clique **"Manual Deploy"**

### ❌ Erreur de base de données
Render utilise un système de fichiers éphémère. Les données seront perdues après redéploiement.
**Solution**: Utilise PostgreSQL (gratuit sur Render)
1. Va dans Render Dashboard
2. Crée une nouvelle **PostgreSQL** database
3. Copie la connection string
4. Ajoute-la comme variable `DATABASE_URL` sur le service web

---

## 📱 Accéder à ton site

- **Frontend**: `https://ton-site.netlify.app`
- **Backend API**: `https://gsm-server.onrender.com/api`
- **Admin Login**: admin / admin123

---

## 💡 Tips

- ✅ Les données sur Render (Free) sont non persistantes
- ✅ Ajoute une vraie DB (PostgreSQL) si tu besoin de persistance
- ✅ Les sites Free Render se mettent en sleep après 15 min d'inactivité (premier appel peut être lent)
- ✅ Redéploiement auto quand tu push sur GitHub

**Besoin d'aide? Contacte-moi!**
