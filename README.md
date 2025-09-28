# Chrono Carto - Plateforme d'Histoire-Géographie

## 🎯 Description
Plateforme éducative d'Histoire-Géographie avec dashboard admin pour la gestion des utilisateurs, présences et paiements.

## 🚀 Déploiement

### Prérequis
- Docker et Docker Compose installés
- Domaine configuré : `www.chronocarto.tn` et `chronocarto.tn`

### Configuration des URLs
Toutes les URLs localhost ont été remplacées par `www.chronocarto.tn` :
- Frontend : `https://www.chronocarto.tn`
- API Backend : `https://www.chronocarto.tn/api`
- Redirection automatique de `chronocarto.tn` vers `www.chronocarto.tn`

### Déploiement rapide
```bash
# Cloner le projet
git clone <repository-url>
cd Deploying-a-NextJs-NestJs-app

# Déployer
chmod +x deploy.sh
./deploy.sh
```

### Configuration SSL
```bash
# Obtenir les certificats SSL
chmod +x nginx/init-letsencrypt.sh
./nginx/init-letsencrypt.sh
```

## 🔧 Configuration

### Variables d'environnement
Créer les fichiers `.env` avec les bonnes URLs :

**chronofrontend/.env.local**
```
NEXT_PUBLIC_API_URL=https://www.chronocarto.tn/api
NEXT_PUBLIC_APP_URL=https://www.chronocarto.tn
NODE_ENV=production
```

**chronobackend/.env**
```
NODE_ENV=production
PORT=3001
DB_HOST=mysql-db
FRONTEND_URL=https://www.chronocarto.tn
BACKEND_URL=https://www.chronocarto.tn/api
# ... autres variables
```

## 📊 Admin Dashboard

### Fonctionnalités disponibles
- ✅ Approbation des utilisateurs
- ✅ Gestion des présences (via module paiements)
- ✅ Gestion des paiements
- ✅ Gestion des étudiants et parents

### API Endpoints
- `GET /api/admin/users` - Liste des utilisateurs
- `PATCH /api/admin/users/approve` - Approuver un utilisateur
- `GET /api/attendance` - Liste des présences
- `GET /api/admin/payments` - Liste des paiements
- `PATCH /api/admin/payments/[id]` - Mettre à jour un paiement

## 🌐 URLs de production
- **Site principal** : https://www.chronocarto.tn
- **API** : https://www.chronocarto.tn/api
- **Redirection** : chronocarto.tn → www.chronocarto.tn

## 🔒 Sécurité
- Configuration SSL avec Let's Encrypt
- Headers de sécurité configurés
- CORS configuré pour les domaines de production
- Redirection HTTPS forcée
