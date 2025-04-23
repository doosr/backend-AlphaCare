# 🧠 AlphaCare Backend

Le backend de l'application **AlphaCare**, une solution IoT intelligente dédiée à la **santé et au suivi médical des bébés**. Ce backend gère l'authentification, les comptes utilisateurs (parents et médecins), les profils de bébés, les rendez-vous médicaux, ainsi que toutes les données de suivi de santé (température, soins, etc.).


---

## 🚀 Fonctionnalités

- 🔐 Authentification sécurisée avec JWT
- 👩‍⚕️ Gestion des comptes Médecins & Parents
- 👶 Gestion des profils Bébé
- 📅 Création et suivi des rendez-vous médicaux
- 📊 API RESTful pour communication avec l'application Flutter
- 🗣️ Détection intelligente des pleurs avec système d'alerte
- 📩 Notifications email (optionnel)
- 🛡️ Sécurité renforcée avec validation des données

---

## 🛠️ Stack technique

| Outil         | Description                     |
|---------------|---------------------------------|
| Node.js       | Runtime JavaScript côté serveur |
| Express.js    | Framework serveur HTTP léger    |
| MongoDB       | Base de données NoSQL           |
| Mongoose      | ODM pour MongoDB                |
| JWT           | Authentification sécurisée      |
| dotenv        | Variables d’environnement       |
| nodemailer    | Envoi d’e-mails (optionnel)     |

---

---

## ⚙️ Installation

1. **Cloner le dépôt** :

```bash
git clone https://github.com/doosr/backend-AlphaCare.git
cd backend-AlphaCare
2. **Installer les dépendances** :
```bash
npm install
3.**Configurer les variables d'environnement** :

Crée un fichier .env basé sur .env.example :

env

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email (optionnel)
EMAIL_PASS=your_password (optionnel)

4**Lancer le serveur** :
```bash
npm start
