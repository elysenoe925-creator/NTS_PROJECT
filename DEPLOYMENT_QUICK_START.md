# 📋 GUIDE RAPIDE - Déployer sur Render + Netlify

## 🎯 Résumé en 3 étapes

### **ÉTAPE 1: Backend sur Render (5 minutes)**
1. Créer compte sur [render.com](https://render.com)
2. Connecter GitHub
3. Nouveau **Web Service**
4. Sélectionner repo `gsm`
5. Build Command: `npm install && npm run prisma:generate`
6. Start Command: `npm start`
7. Ajouter variables d'environnement (voir `DEPLOYMENT_GUIDE.md`)
8. Copier l'URL générée (ex: `https://gsm-server.onrender.com`)

### **ÉTAPE 2: Frontend sur Netlify (5 minutes)**
1. Aller sur [netlify.com](https://netlify.com)
2. **New site from Git** → Connecter GitHub → Repo `gsm`
3. Build Command: `npm run build`
4. Publish: `dist`
5. Ajouter variable: `VITE_API_BASE=https://gsm-server.onrender.com`
6. Déployer → Attendre 2-3 minutes

### **ÉTAPE 3: Tester**
- Ouvrir ton site Netlify
- Se connecter (admin/admin123)
- Vérifier que le Dashboard s'affiche

---

## 🔗 URLs après déploiement
- **Site**: `https://ton-nom.netlify.app`
- **API**: `https://gsm-server.onrender.com`

---

## ⚠️ Points importants
- Render (Free) remet la base de données à zéro après chaque déploiement
- Pour une DB persistante, ajoute PostgreSQL gratuit sur Render
- Premier appel au site peut être lent (15 min de sleep)

---

**Besoin de détails? Vois `DEPLOYMENT_GUIDE.md`**
