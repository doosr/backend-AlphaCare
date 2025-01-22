

const mongoose = require("mongoose");

// Définition du schéma d'image
const imageSchema = new mongoose.Schema({
    imageData: Buffer // Champ pour stocker les données binaires de l'image
});

// Création du modèle d'image à partir du schéma défini
const ImageModel = mongoose.model("Image", imageSchema);

// Exportation du modèle d'image pour une utilisation dans d'autres parties de l'application
module.exports = ImageModel;
