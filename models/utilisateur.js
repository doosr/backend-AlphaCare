const mongoose = require('mongoose');

// Définition du schéma pour les informations du bébé
const bebeSchema = new mongoose.Schema({
    baby_id: String, // Renommer baby_id pour être l'identifiant principal du bébé
    namebebe: { type: String, required: true },
    fullname: { type: String, required: true },
    datenaissance: { type: String, required: true },
    bebe_temperature: { type: Number, default: 0 }, // Valeur par défaut de la température
    ambient_temperature: { type: Number, default: 0 },

    last_spo2: { type: Number, default: 0 }, // Valeur par défaut de SpO2
    last_bpm: { type: Number, default: 0 },
    

    timestamp: { type: Date, default: Date.now }
});

// Définition du schéma pour les données de l'utilisateur
const utilisateurSchema = new mongoose.Schema({
    usertype: { type: String, required: true },
    usrname: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    telephone: { type: String, required: true },
    bebe: bebeSchema, // Ajout du schéma pour le bébé
    isActive: { type: Boolean, default: false },
    activationCode: { type: String },
    
    image: {
        type: String, // Ou mongoose.Schema.Types.ObjectId si vous utilisez un modèle d'image séparé
        default: null
      }
});

// Création du modèle Utilisateur à partir du schéma utilisateurSchema
const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);

// Export du modèle Utilisateur
module.exports = Utilisateur;
