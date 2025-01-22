const mongoose = require('mongoose');

// Définissez le schéma de l'invitation
const invitationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    dateReceived: { type: Date, default: Date.now }, // Ajoutez le champ dateReceived avec la valeur par défaut comme la date actuelle
    // Ajoutez d'autres champs d'invitation si nécessaire
});
// Créez un modèle à partir du schéma
const Suivie = mongoose.model('Suivie', invitationSchema);

// Exportez le modèle
module.exports = Suivie;
