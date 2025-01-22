const mongoose = require('mongoose');

// Schéma pour les informations de rendez-vous
const appointmentSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true }, // ID de l'expéditeur de la demande de rendez-vous
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true }, // ID du médecin qui reçoit le rendez-vous
    babyName: { type: String, required: true },
    appointmentObject: { type: String, required: true },
    appointmentDate: { type: Date, default: Date.now },
    lastVisitDateTime: { type: String } // Champ pour stocker la date et l'heure du dernier rendez-vous sous forme de type Date
});

// Modèle pour les rendez-vous
const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
