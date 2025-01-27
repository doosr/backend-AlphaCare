const express = require("express");
const mongoose = require('mongoose');
const Utilisateur = require('./models/utilisateur'); // Assurez-vous que le chemin d'accès est correct
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt=require('jsonwebtoken');
const socketIo = require('socket.io');
const http = require('http');
const fs = require('fs');
const path = require('path');
const Suivie = require('./models/invitation');
const BabyData = require('./models/BabyData'); // Import du modèle d'image
const Appointment=require('./models/Appointment');

const cron = require('node-cron');
const ImageModel =require('./models/image');
// Importez le module 'path'

const app = express();
const server = http.createServer(app);
// Créez une instance de Socket.IO en passant le serveur HTTP créé précédemment
const io = socketIo(server);


// Middleware pour analyser les données de requête
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(bodyParser )
// Route pour récupérer tous les utilisateurs
app.get('/Utilisateurs', async (req, res) => {
    try {
        const resultats = await Utilisateur.find({});
        res.send(resultats);
    } catch (erreur) {
        console.log(erreur);
        res.status(500).send("Erreur lors de la récupération des utilisateurs");
    }
    
});
// PUT /Utilisateurs/:id/activate - Toggle user activation status
app.put('/Utilisateurs/:id/activate', async (req, res) => {
    try {
        const userId = req.params.id;
        const { isActive } = req.body;

        // Check if the user exists
        const utilisateur = await Utilisateur.findById(userId);
        if (!utilisateur) {
            return res.status(404).send("Utilisateur non trouvé");
        }

        // Toggle activation status
        utilisateur.isActive = isActive;
        await utilisateur.save();

        res.send(utilisateur);
    } catch (erreur) {
        console.log(erreur);
        res.status(500).send("Erreur lors de la mise à jour de l'activation de l'utilisateur");
    }
});
app.delete('/Utilisateurs/:id', async (req, res) => {
    try {
      const userId = req.params.id;
  
      // Vérifier si l'utilisateur existe
      const utilisateur = await Utilisateur.findById(userId);
      if (!utilisateur) {
        return res.status(404).send("Utilisateur non trouvé");
      }
  
      // Supprimer l'utilisateur
      await Utilisateur.deleteOne({ _id: userId });
  
      res.send(`L'utilisateur avec l'ID ${userId} a été supprimé avec succès.`);
    } catch (erreur) {
      console.log(erreur);
      res.status(500).send("Erreur lors de la suppression de l'utilisateur");
    }
  });
app.post('/registre', async (req, res) => {
    try {
        const { usertype, usrname, email, password, telephone, namebebe, fullname, datenaissance } = req.body;

        // Générer un code d'activation
        const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let activationCode = "";
        for (let i = 0; i < 25; i++) {
            activationCode += characters[Math.floor(Math.random() * characters.length)];
        }

        // Création d'une nouvelle instance de l'utilisateur
        const nouvelUtilisateur = new Utilisateur({
            usertype,
            usrname,
            email,
            password: bcrypt.hashSync(password, 8),
            telephone,
            activationCode,
            isActive: false
        });

        // Si l'utilisateur est un parent, ajouter les données du bébé
        if (usertype === 'Parent') {
            nouvelUtilisateur.bebe = {
                namebebe,
                fullname,
                datenaissance
            };
        }

        // Sauvegarde du nouvel utilisateur dans la base de données
        await nouvelUtilisateur.save();

        // Configuration du lien d'activation (utilisez votre propre domaine)
        const activationLink = `https://node-1lwj.onrender.com/activation/${activationCode}`;

        // Configuration du transporter Nodemailer

// Configuration du transporter Nodemailer
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'belgacemdawser65@gmail.com', // Remplacez par votre adresse e-mail Gmail
        pass: 'pggmzrbqvdhgmoot', // Remplacez par votre mot de passe Gmail
    },
});

// Configuration de l'e-mail à envoyer
let info = await transporter.sendMail({
    from: '"AlphaCare" <belgacemdawser65@gmail.com>',
    to: req.body.email,
    subject: 'Activation de compte',
    text: `Bonjour ${req.body.usrname},\n\nVeuillez cliquer sur le lien suivant pour activer votre compte : ${activationLink}`,
    // Vous pouvez également inclure du HTML dans le message
    // html: '<b>Hello world?</b>'
});

console.log('Message envoyé : %s', info.messageId);

        res.send("Utilisateur ajouté avec succès. Un e-mail d'activation a été envoyé.");
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de l'ajout de l'utilisateur");
    }
});
app.get("/activation/:activationcode", async (req, res) => {
  try {
      const activationcode = req.params.activationcode;
      // Recherche de l'utilisateur avec le code d'activation fourni
      const utilisateur = await Utilisateur.findOneAndUpdate(
          { activationCode: activationcode},
          { isActive: true}, // Mettre à jour le champ isActive à true
          { new: true } // Renvoyer le document mis à jour
      );
      if (utilisateur) {             
          res.send("Votre compte a été activé avec succès.");
      } else {
          res.status(404).send("Code d'activation invalide.");
      }
  } catch (err) {
      console.log(err);
      res.status(500).send("Erreur lors de l'activation du compte.");
  }
});
/*
app.get("/activation/:activationcode", async (req, res) => {
  try {
      const activationcode = req.params.activationcode;
      const utilisateur = await Utilisateur.findOneAndUpdate(
          { activationCode: activationcode},
          { isActive: true},
          { new: true }
      );
      
      if (utilisateur) {
          // Renvoyer la page HTML avec le message de succès
          res.sendFile(path.join(__dirname, 'views', 'activation.html'));
      } else {
          // Rediriger vers la même page avec un paramètre d'erreur
          res.redirect('/activation.html?status=error');
      }
  } catch (err) {
      console.log(err);
      res.status(500).send("Erreur lors de l'activation du compte.");
  }
});
*/
// Route pour gérer la connexion d'un utilisateur
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
         // Vérifier si les informations d'identification correspondent à celles de l'administrateur
         if (email === 'admin@gmail.com' && password === 'admin1234') {
            // Générer un jeton JWT pour l'administrateur
            const adminToken = jwt.sign({
                isAdmin: true
            }, 'votre_secret_key_admin', { expiresIn: '1h' });

            // Envoyer une réponse spécifique pour l'administrateur
            return res.json({
                token: adminToken,
                message: "Connexion réussie en tant qu'administrateur",
                isAdmin: true
            });
        }

        // Vérifier si l'utilisateur existe dans la base de données
        const utilisateur = await Utilisateur.findOne({ email });
        // Vérifier si l'utilisateur existe et si son compte est actif
        if (utilisateur && utilisateur.isActive) {
            // Vérifier si le mot de passe est correct
            if (bcrypt.compareSync(password, utilisateur.password)) {
                // Générer un jeton JWT
                let bebeData = {};
                // Vérifier si l'utilisateur a des données de bébé
                if (utilisateur.bebe) {
                    // Si l'utilisateur a des données de bébé, récupérer les informations pertinentes
                    bebeData = {
                        namebebe: utilisateur.bebe.namebebe,
                        fullname: utilisateur.bebe.fullname,
                        datenaissance: utilisateur.bebe.datenaissance,
                        bebeId: utilisateur.bebe._id // Ajouter l'ID du bébé

                    };
                }
                // Générer un jeton JWT avec les données de l'utilisateur et du bébé
                const token = jwt.sign({
                    email: utilisateur.email,
                    userType: utilisateur.usertype,
                    usrname: utilisateur.usrname,
                    telephone: utilisateur.telephone,
                    bebe: bebeData,
                    userId: utilisateur._id 
                    // Ajoutez l'ID de l'utilisateur au jeton
                }, 'votre_secret_key', { expiresIn: '1h' });
                // Envoyer une réponse en fonction du type de l'utilisateur
                let message = "";
                if (utilisateur.usertype === 'Medecin') { // Utilisez utilisateur.usertype
                    message = "Connexion réussie en tant que Médecin";
                } else if (utilisateur.usertype === 'Parent'){
                    message = "Connexion réussie en tant qu'utilisateur parent";
                }
                // Renvoyer le jeton JWT avec la réponse
                res.json({
                    token: token,
                    message: message,
                    userType: utilisateur.usertype,// Utilisez utilisateur.usertype
                    userId: utilisateur._id ,
                    bebeId: utilisateur.bebe?._id
                    // Renvoyer également l'ID de l'utilisateur dans la réponse

                });
                
                    // Créer une nouvelle tâche pour déconnecter l'utilisateur après une heure
                /*setTimeout(() => {
                    // Logique de déconnexion de l'utilisateur ici
                    // Vous pouvez supprimer le jeton ou effectuer toute autre action de déconnexion nécessaire
                    console.log("Déconnexion automatique de l'utilisateur après 1 heure");
                }, 10); // 1 heure en millisecondes (3600000 ms)

             */
            } else {
                res.status(401).send("Mot de passe incorrect");
            }
        } else {
            res.status(401).send("Compte utilisateur non activé ou introuvable");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la tentative de connexion");
    }
});
// Route pour la réinitialisation de mot de passe
app.post('/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        // Vérifier si l'utilisateur existe dans la base de données
        const utilisateur = await Utilisateur.findOne({ email });
        if (utilisateur && utilisateur.isActive) {
            // Générer un nouveau mot de passe temporaire
            const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            let newPassword = "";
            for (let i = 0; i < 10; i++) {
                newPassword += characters[Math.floor(Math.random() * characters.length)];
            }
            // Mettre à jour le mot de passe de l'utilisateur dans la base de données
            utilisateur.password = bcrypt.hashSync(newPassword, 8);
            await utilisateur.save();
            // Envoi d'un e-mail contenant le nouveau mot de passe temporaire
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'belgacemdawser65@gmail.com', // Remplacez par votre adresse e-mail Gmail
                    pass: 'pggmzrbqvdhgmoot', // Remplacez par votre mot de passe Gmail
                },
            });
            let info = await transporter.sendMail({
                from: '"AlphaCare" <belgacemdawser65@gmail.com>',
                to: email,
                subject: 'Réinitialisation de mot de passe',
                text: `Votre nouveau mot de passe temporaire est : ${newPassword}`,
            });

            console.log('Message envoyé : %s', info.messageId);
            res.send("Un e-mail contenant le nouveau mot de passe temporaire a été envoyé.");
        } else {
            res.status(404).send("Compte utilisateur non activé ou introuvable");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la réinitialisation du mot de passe");
    }
});
// Route pour envoyer l'identifiant du bébé par e-mail
app.post('/send-babyid', async (req, res) => {
    try {
        const { email } = req.body;
        // Vérifier si l'utilisateur existe dans la base de données
        const utilisateur = await Utilisateur.findOne({ email });
        if (utilisateur && utilisateur.isActive) {
            // Récupérer l'identifiant du bébé
            const babyId = utilisateur.bebe._id;
            // Configuration du transporter Nodemailer
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'belgacemdawser65@gmail.com', // Remplacez par votre adresse e-mail Gmail
                    pass: 'pggmzrbqvdhgmoot', // Remplacez par votre mot de passe Gmail
                },
            });
            // Envoi d'un e-mail contenant l'identifiant du bébé
            let info = await transporter.sendMail({
                from: '"AlphaCare" <belgacemdawser65@gmail.com>',
                to: email,
                subject: 'Identifiant de votre bébé',
                text: `L'identifiant de votre bébé est : ${babyId}`,
            });

            console.log('Message envoyé : %s', info.messageId);
            res.send("L'identifiant de votre bébé a été envoyé par e-mail.");
        } else {
            res.status(404).send("Compte utilisateur non activé ou introuvable");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de l'envoi de l'identifiant du bébé par e-mail.");
    }
});
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send('Accès refusé. Token JWT manquant.');
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
        return res.status(401).send('Accès refusé. Format de Token JWT invalide.');
    }
    jwt.verify(token, 'votre_secret_key', (err, decoded) => {
        if (err) return res.status(403).send('Accès refusé. Token JWT invalide.');
        req.user = decoded;
        next();
    });
};
app.get('/profile', verifyToken, async (req, res) => {
    try {
        // Récupérer les données de l'utilisateur à partir du jeton JWT
        const utilisateur = req.user;
        // Vous pouvez maintenant utiliser les données de l'utilisateur pour afficher le profil
        res.json({
            telephone: utilisateur.telephone,
            usrname: utilisateur.usrname,
            email: utilisateur.email,
            namebebe: utilisateur.bebe?.namebebe,
            fullname: utilisateur.bebe?.fullname,
            datenaissance: utilisateur.bebe?.datenaissance,
         
            // Ajoutez d'autres données de profil si nécessaire
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la récupération du profil de l'utilisateur");
    }
});

// Route de mise à jour de profil
app.put('/profilee', verifyToken, async (req, res) => {
    try {
        const { usrname, email, telephone, namebebe, fullname, datenaissance } = req.body;
        
        // Trouver l'utilisateur à mettre à jour
        const utilisateur = await Utilisateur.findOne({ email: email });
        
        // Vérifier si l'utilisateur existe
        if (!utilisateur) {
            return res.status(404).send("Utilisateur non trouvé");
        }

        // Mettre à jour les données du profil avec les nouvelles données reçues dans la requête
        utilisateur.usrname = usrname;
        utilisateur.telephone = telephone;

        // Vérifier si l'utilisateur a des données de bébé
        if (utilisateur.bebe) {
            // Si l'utilisateur a des données de bébé, mettre à jour les informations pertinentes du bébé
            utilisateur.bebe.namebebe = namebebe;
            utilisateur.bebe.fullname = fullname;
            utilisateur.bebe.datenaissance = datenaissance;
        }

        // Sauvegarder les modifications dans la base de données
        const updatedUser = await utilisateur.save();

        // Envoyer les données mises à jour de l'utilisateur en réponse
        res.status(200).json(updatedUser);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la mise à jour du profil de l'utilisateur");
    }
});



// Répertoire de destination pour enregistrer les images
const uploadDirectory = path.join(__dirname, 'uploads');

// Assurez-vous que le répertoire existe, sinon créez-le
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}


// Route pour l'upload de l'image
app.post('/upload-image', verifyToken, async (req, res) => {
    try {
      if (!req.body.image) {
        return res.status(400).json({ error: 'Aucune donnée d\'image fournie' });
      }
  
      const userId = req.user.userId;
      const base64Data = req.body.image;
      const fileName = `image_${Date.now()}.jpg`;
  
      // Récupérer l'utilisateur
      const utilisateur = await Utilisateur.findById(userId);
      if (!utilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
      // Vérifier si l'utilisateur a déjà une image enregistrée
      let previousImage = utilisateur.image;
      if (previousImage) {
        // Supprimer l'ancienne image du dossier "uploads"
        const previousImagePath = path.join(__dirname, 'uploads', path.basename(previousImage));
        if (fs.existsSync(previousImagePath)) {
          fs.unlinkSync(previousImagePath);
        }
      }
  
      // Chemin complet du fichier pour la nouvelle image
      const filePath = path.join(__dirname, 'uploads', fileName);
  
      // Convertir les données binaires de l'image en Buffer
      const buffer = Buffer.from(base64Data, 'base64');
  
      // Écrire le fichier sur le disque
      fs.writeFileSync(filePath, buffer);
  
      // Enregistrement de l'image dans la base de données
      const imageUrl = `https://node-1lwj.onrender.com/uploads/${fileName}`;
  
      // Mettre à jour l'URL de l'image dans le modèle Utilisateur
      utilisateur.image = imageUrl;
      await utilisateur.save();
  
      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'image :', error);
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'image' });
    }
  });
 
// Route pour récupérer l'image d'un utilisateur
app.get('/user/:userId/image', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Récupérer l'utilisateur à partir de la base de données
    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier si l'utilisateur a une image enregistrée
    if (!utilisateur.image) {
      return res.status(404).json({ error: 'Aucune image trouvée pour cet utilisateur' });
    }

    // Récupérer le chemin relatif de l'image
    const imagePath = utilisateur.image;

    // Construire le chemin absolu vers le fichier image
    const absoluteImagePath = path.join(__dirname, 'uploads', path.basename(imagePath));

    // Vérifier si le fichier image existe
    if (!fs.existsSync(absoluteImagePath)) {
      return res.status(404).json({ error: 'Fichier image introuvable' });
    }

    // Lire le fichier image depuis le disque
    fs.readFile(absoluteImagePath, (err, data) => {
      if (err) {
        console.error('Erreur lors de la lecture de l\'image :', err);
        return res.status(500).json({ error: 'Erreur lors de la lecture de l\'image' });
      }

      // Envoyer le contenu de l'image comme réponse
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      io.emit('imageRetrieved', { imageUrl: utilisateur.image });

      res.end(data);
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'image' });
  }
});

  
// Connexion à la base de données MongoDB
mongoose.connect('mongodb+srv://demo_user:dmGxGOJYzrXNYITg@cluster0.qkg2qo9.mongodb.net/mydatabase?retryWrites=true&w=majority')
    .then(() => {
        console.log('Connecté à MongoDB Atlas');  
    })
    .catch((erreur) => {
        console.error('Erreur de connexion à MongoDB Atlas :', erreur);
    });  

app.get('/temperature/:babyId', (req, res) => {
        const baby_id = req.params.baby_id;
    
        // Recherchez d'abord l'utilisateur par le baby_id
        Utilisateur.findOne({ 'bebe.babyId': baby_id })
            .then((utilisateur) => {
                if (utilisateur) {
                    const bebe_temperature = utilisateur.bebe.bebe_temperature;
                  
                    const last_spo2 = utilisateur.bebe.last_spo2;
                    const last_bpm = utilisateur.bebe.last_bpm;

                    res.status(200).json({ baby_id: baby_id, bebe_temperature: bebe_temperature,last_spo2: last_spo2,last_bpm:last_bpm});
                } else {
                    console.error("Utilisateur non trouvé pour le baby_id :", baby_id);
                    res.status(404).send("Utilisateur non trouvé pour le baby_id");
                }
            })
            .catch((erreur) => {
                console.error("Erreur lors de la recherche de l'utilisateur dans MongoDB :", erreur);
                res.status(500).send("Erreur lors de la recherche de l'utilisateur dans MongoDB");
            });
    });
 
       
// Démarrage du serveur sur un port spécifique
const PORT = process.env.PORT || 5000;
server.listen(PORT,/*'0.0.0.0',*/ () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

app.get('/TypesMedecins', async (req, res) => {
    try {
        // Récupérer tous les médecins de la base de données
        const medecins = await Utilisateur.find({ usertype: 'Medecin' });

        // Créer un tableau pour stocker les types de médecins avec leur nom et identifiant
        const typesMedecins = medecins.map(medecin => ({
            id: medecin._id.toString(),
            nom: medecin.usrname,
            type: medecin.usertype
        }));

        // Envoyer la liste des types de médecins en réponse
        res.send(typesMedecins);
    } catch (erreur) {
        console.log(erreur);
        res.status(500).send("Erreur lors de la récupération des types de médecins");
    }
});


// Route pour envoyer une invitation
app.post('/invitation/send', verifyToken, async (req, res) => {
    try {
        const { receiverId} = req.body;
        const senderId = req.user.bebe.bebeId;
        const user = req.user.userId;

        const babyId = req.user.bebe._id; // Obtenir l'ID du bébé à partir de l'utilisateur connecté

        const invitation = new Suivie({ sender: senderId, receiver: receiverId,babyId ,user});
        await invitation.save();
        console.log(receiverId,userConnected)
        const exist=userConnected.find((el)=>el.idUser==receiverId)
        console.log(exist)
        if(exist){
            console.log(exist.idSocket,invitation)
            io.to(exist.idSocket).emit('new invitation',invitation)
            console.log('socket envoyé')
        }

        // Récupération des invitations après l'envoi de l'invitation
        const receivedInvitations = await Suivie.find({ receiver: receiverId });
        
        // Renvoyer les invitations reçues
        res.status(200).json(receivedInvitations);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sending invitation.');
    }
});

// Intervalles de lecture initiaux (en secondes)
let temperatureInterval = 1; // 30 minutes
let heartbeatInterval = 1; // 15 minutes

// Gérez la connexion Socket.IO
var userConnected=[]
io.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected`);
    console.log(userConnected)
    socket.on('userConnected',(data)=>{
        if(data!=''){
            userConnected.push({idUser:data,idSocket:socket.id})
            console.log(userConnected)

        }
    })
  
    // Écoute de l'événement pour obtenir l'ID du bébé
  socket.on('getBabyId', () => {
    fs.readFile('baby_id.txt', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading baby_id.txt:', err);
        return;
      }
      // Émettre l'ID du bébé au client
      socket.emit('babyId', { babyId: data });
    });
  });
// Gestion de la suppression hebdomadaire des données de BabyData
async function deleteOldBabyData() {
    try {
      // Calcul de la date il y a une semaine
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
      // Suppression des données de BabyData plus anciennes qu'une semaine
      const deleted = await BabyData.deleteMany({ createdAt: { $lt: oneWeekAgo } });
      console.log(`${deleted.deletedCount} données de BabyData supprimées.`);
    } catch (error) {
      console.error('Erreur lors de la suppression des anciennes données de BabyData :', error);
    }
  }
  
  // Cron job pour la suppression hebdomadaire des données de BabyData
  cron.schedule('0 0 * * 0', deleteOldBabyData, {
    scheduled: true,
    timezone: 'Europe/Paris'
  });
  
  // Lors de la réception des données de température
  socket.on('updateTemperature', async (data) => {
    try {
      // Recherchez l'utilisateur correspondant au baby_id dans la base de données
      const utilisateur = await Utilisateur.findOne({ 'bebe._id': data.baby_id });
      if (!utilisateur) {
        console.log('Utilisateur non trouvé pour le baby_id :', data.baby_id);
        return;
      }
  
      // Créez un nouvel enregistrement de BabyData
      const babyData = new BabyData({
        baby_id: data.baby_id,
        temperature: data.bebe_temperature,
        // Ajoutez d'autres champs si nécessaire
      });
      await babyData.save();
  
      // Mettez à jour les données de température du bébé dans la base de données
      utilisateur.bebe.bebe_temperature = data.bebe_temperature;
      utilisateur.bebe.ambient_temperature = data.ambient_temperature;
      await utilisateur.save();
  
      console.log('Données de température mises à jour pour le bébé ID :', data.baby_id);
      io.emit('updateTemperatureSuccess', { message: 'Température mise à jour avec succès', data });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données de température :', error);
    }
  });
  // Écouter l'événement pour mettre à jour les intervalles de lecture
socket.on('updateIntervals', (data) => {
    temperatureInterval = data.temperature_interval || temperatureInterval;
    heartbeatInterval = data.heartbeat_interval || heartbeatInterval;
    console.log(`Intervalles de lecture mis à jour : Température = ${temperatureInterval} secondes, BPM/SpO2 = ${heartbeatInterval} secondes`);
  
    // Émettre un événement pour notifier les clients des nouveaux intervalles
    io.emit('updateIntervals', { temperature_interval: temperatureInterval, heartbeat_interval: heartbeatInterval });
  });
  

  
  // Lors de la réception des données de battement de cœur
  socket.on('updateHeartbeat', async (data) => {
    try {
      // Recherchez l'utilisateur correspondant au baby_id dans la base de données
      const utilisateur = await Utilisateur.findOne({ 'bebe._id': data.baby_id });
      if (!utilisateur) {
        console.log('Utilisateur non trouvé pour le baby_id :', data.baby_id);
        return;
      }
  
      // Créez un nouvel enregistrement de BabyData
      const babyData = new BabyData({
        baby_id: data.baby_id,
        bpm: data.last_bpm,
        spo2: data.last_spo2,
        temperature: data.bebe_temperature,
        // Ajoutez d'autres champs si nécessaire
      });
      await babyData.save();
  
      // Mettez à jour les données de fréquence cardiaque et de SpO2 du bébé dans la base de données
      utilisateur.bebe.last_bpm = data.last_bpm;
      utilisateur.bebe.last_spo2 = data.last_spo2;
      await utilisateur.save();
  
      console.log('Données de fréquence cardiaque et de SpO2 mises à jour pour le bébé ID :', data.baby_id);
      io.emit('updateHeartbeatSuccess', { message: 'Heartbeat mise à jour avec succès', data });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données de fréquence cardiaque et de SpO2 :', error);
    }
  });
    // Gérez la déconnexion du client si nécessaire
    socket.on('disconnect', () => {
        console.log('User disconnected');
        userConnected.splice(userConnected.findIndex((el)=>el.idSocket==socket.id),1)
        console.log(userConnected)
    });
});
// Route pour recevoir l'ID du bébé
app.post('/babyId', (req, res) => {
    const { babyId } = req.body;
    
    // Vérifier si l'ID du bébé est valide
    if (!babyId) {
      return res.status(400).json({ error: 'Invalid baby ID' });
    }
  
    // Écrire l'ID du bébé dans le fichier baby_id.txt
    fs.writeFile('baby_id.txt', babyId, (err) => {
      if (err) {
        console.error('Error writing baby ID:', err);
        return res.status(500).json({ error: 'Failed to save baby ID' });
      }
      console.log('Baby ID saved successfully:', babyId);
      res.sendStatus(200);
    });
  });
  app.get('/babyId', (req, res) => {
    // Lecture de l'ID du bébé à partir du fichier baby_id.txt
    fs.readFile('baby_id.txt', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading baby ID:', err);
            return res.status(500).json({ error: 'Failed to read baby ID' });
        }
        const babyId = data.trim();
        console.log('Baby ID read successfully:', babyId);
        res.status(200).json({ babyId });
    });
});
  
// Route pour récupérer les invitations reçues par un utilisateur
app.get('/invitations/received', verifyToken, async (req, res) => {
    try {
        const receiverId = req.user.userId; // L'ID de l'utilisateur connecté
        const receivedInvitations = await Suivie.find({ receiver: receiverId }).populate({
            path: 'receiver',
            select: 'namebebe fullname datenaissance', // Sélectionnez les champs du bébé que vous voulez renvoyer
            model: 'Utilisateur' // Le modèle Utilisateur contient les informations du bébé
        });

        res.status(200).json(receivedInvitations);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la récupération des invitations.');
    }
});

app.get('/invitations/accepted', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId; // ID de l'utilisateur connecté
        
        // Recherche des invitations acceptées pour l'utilisateur donné
        const acceptedInvitations = await Suivie.find({ receiver: userId, status: 'accepted' });

        res.status(200).json(acceptedInvitations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/invitation/accept', verifyToken, async (req, res) => {
  try {
    const { invitationId, namebebe, fullname, datenaissance } = req.body;
    const receiverId = req.user.userId;

    // Mettre à jour l'invitation pour la marquer comme acceptée
    const invitation = await Suivie.findByIdAndUpdate(
        invitationId,
        { status: 'accepted', dateReceived: new Date() },
        { new: true }
      );
    // Vérifier si l'utilisateur qui a envoyé l'invitation est connecté
    const exist = userConnected.find((el) => el.idUser === invitation.user.toString());

    if (exist) {
      console.log(exist.idSocket, invitation);
      io.to(exist.idSocket).emit('invitationAccepted', invitation);
      console.log('socket envoyé');
    }

    // Mettre à jour le document utilisateur pour ajouter l'invitation acceptée
    await Utilisateur.findByIdAndUpdate(receiverId, {
      $push: { invitationsAccepted: invitationId },
      $set: { namebebe, fullname, datenaissance }
    });

    res.status(200).send('Invitation acceptée avec succès.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de l\'acceptation de l\'invitation.');
  }
});

app.post('/invitation/reject', verifyToken, async (req, res) => {
    try {
        const { invitationId } = req.body;
        const receiverId = req.user.userId; // L'ID de l'utilisateur connecté

        // Mettre à jour le statut de l'invitation dans la base de données
const invitation = await Suivie.findByIdAndUpdate(
        invitationId,
        { status: 'rejected', dateReceived: new Date() },
        { new: true }
      );
              // Vérifier si l'utilisateur qui a envoyé l'invitation est connecté
        const exist = userConnected.find((el) => el.idUser === invitation.user.toString());

        if (exist) {
        console.log(exist.idSocket, invitation);
        io.to(exist.idSocket).emit('invitationRejected', invitation);
        console.log('socket envoyé');
        }
        // Retirez l'invitation rejetée de l'utilisateur connecté
        await Utilisateur.findByIdAndUpdate(receiverId, { $pull: { invitations: invitationId } });

        res.status(200).send('Invitation rejetée avec succès.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors du rejet de l\'invitation.');
    }
});

app.get('/getBabyDetails/:babyId', async (req, res) => {
    try {
        const babyId = req.params.babyId;
        // Recherche du bébé dans la base de données en fonction de son ID
        const baby = await Utilisateur.findOne({ 'bebe._id': babyId });
        if (baby) {
            // Si le bébé est trouvé, renvoyer ses détails
            res.json({
                babyId: baby.bebe._id,
                namebebe: baby.bebe.namebebe,
                fullname: baby.bebe.fullname,
                datenaissance: baby.bebe.datenaissance
            });
        } else {
            // Si le bébé n'est pas trouvé, renvoyer un message d'erreur
            res.status(404).send('Bébé non trouvé');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la recherche du bébé');
    }
});

// Route for deleting invitations
app.delete('/invitation/delete/:invitationId', verifyToken, async (req, res) => {
    try {
        const invitationId = req.params.invitationId;
        const receiverId = req.user.userId; // ID de l'utilisateur connecté
        
        // Vérifie si l'utilisateur connecté a cette invitation dans ses invitations reçues
        const invitation = await Suivie.findOne({ _id: invitationId, receiver: receiverId });
        if (!invitation) {
            return res.status(404).send("Invitation not found or you don't have permission to delete it.");
        }
        
        // Supprimer l'invitation de la base de données
        await Suivie.findByIdAndDelete(invitationId);
        
        // Retirez l'invitation de la liste des invitations de l'utilisateur
        await Utilisateur.findByIdAndUpdate(receiverId, { $pull: { invitations: invitationId } });

        res.status(200).send('Invitation deleted successfully.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting invitation.');
    }
});

  app.get('/page', verifyToken, async (req, res) => {
    try {
        // Récupérer les données de l'utilisateur à partir du jeton JWT
        const utilisateur = req.user;
        // Vous pouvez maintenant utiliser les données de l'utilisateur pour afficher le profil
        res.json({
            userType:utilisateur.userType,
            usrname: utilisateur.usrname,
          
         
            // Ajoutez d'autres données de profil si nécessaire
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la récupération du profil de l'utilisateur");
    }
});
app.get('/api/measurements/:babyId', async (req, res) => {
    try {
      const babyId = req.params.babyId;
      const measurements = await BabyData.find({ baby_id: babyId }).sort({ createdAt: 1 });
  
      // Préparer les données pour le graphique
      const timestamps = measurements.map(measurement => new Date(measurement.createdAt).toLocaleString());
      const temperatures = measurements.map(measurement => measurement.temperature > 0 ? measurement.temperature : null);
      const spo2Values = measurements.map(measurement => measurement.spo2 > 0 && measurement.spo2 < 100 ? measurement.spo2 : null);
      const bpmValues = measurements.map(measurement => measurement.bpm > 0 ? measurement.bpm : null);
  
      // Filtrer les données nulles
      const filteredTimestamps = timestamps.filter((_, index) => temperatures[index] !== null || spo2Values[index] !== null || bpmValues[index] !== null);
      const filteredTemperatures = temperatures.filter(value => value !== null);
      const filteredSpo2Values = spo2Values.filter(value => value !== null);
      const filteredBpmValues = bpmValues.filter(value => value !== null);
  
      // Créer le graphique
      const chartData = {
        labels: filteredTimestamps,
        datasets: [
          {
            label: 'Température (°C)',
            data: filteredTemperatures,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'SpO2 (%)',
            data: filteredSpo2Values,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'BPM',
            data: filteredBpmValues,
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          }
        ]
      };
  
      res.status(200).json(chartData);
    } catch (error) {
      console.error('Error fetching measurements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
 
  




  

///les rendez_vous///

// Route pour créer un rendez-vous
app.post('/appointments', async (req, res) => {
    try {
        const appointmentData = req.body;

        // Vérifier la validité des données du rendez-vous
        if (!isValidAppointment(appointmentData)) {
            return res.status(400).json({ message: 'Invalid appointment data' });
        }

        // Rechercher l'utilisateur (médecin) par son nom d'utilisateur
        const doctorUsername = appointmentData.doctor;
        const doctorUser = await Utilisateur.findOne({ usrname: doctorUsername });
        if (!doctorUser) {
            return res.status(400).json({ message: 'Doctor user not found' });
        }

        // Créer un nouvel objet rendez-vous avec l'ID du médecin et l'ID de l'expéditeur
        const newAppointment = new Appointment({
            senderId: appointmentData.senderId,
            doctor: doctorUser._id,
            babyName: appointmentData.babyName,
            appointmentObject: appointmentData.appointmentObject,
            lastVisitDateTime: appointmentData.lastVisitDateTime // Inclure la dernière date et heure de visite du nouveau rendez-vous
        
        });

        // Enregistrer le rendez-vous dans la base de données
        await newAppointment.save();
        await newAppointment.save();
     /*   io.emit('demande', appointmentData);*/
        await newAppointment.save();
        const exist = userConnected.find((el) => el.idUser == doctorUser._id); // Assurez-vous que userConnected est disponible
        if (exist) {
            io.to(exist.idSocket).emit('demande', appointmentData);
            console.log('Socket envoyé');
        }
        return res.status(201).json({ message: 'Rendez-vous créé avec succès' });
          } catch (error) {
        console.error('Error processing appointment request:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

function isValidAppointment(appointmentData) {
    return (
      appointmentData &&
      appointmentData.babyName &&
      appointmentData.doctor &&
      appointmentData.appointmentObject &&
      appointmentData.senderId // Vérifier la présence de senderId

    );
  }
 // Route pour mettre à jour la dernière date et heure de visite d'un rendez-vous spécifique
/*app.put('/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { lastVisitDateTime } = req.body;

        // Mettre à jour la dernière date et heure de visite du rendez-vous spécifique
        const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, { $set: { lastVisitDateTime } }, { new: true });

        // Trouver l'utilisateur (médecin) pour le rendez-vous mis à jour
        const doctorUser = await Utilisateur.findById(updatedAppointment.doctor);
        const exist = userConnected.find((el) => el.idUser == doctorUser._id); // Assurez-vous que userConnected est disponible

        // Envoyer la notification de mise à jour au médecin via la socket
        if (exist) {
            io.to(exist.idSocket).emit('updateAppointment', updatedAppointment);
            console.log('Socket de mise à jour envoyée');
        }

        return res.status(200).json({ message: 'Last visit date and time updated successfully' });
    } catch (error) {
        console.error('Error updating last visit date and time:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});*/
 // Route pour mettre à jour la dernière date et heure de visite d'un rendez-vous spécifique
app.put('/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { lastVisitDateTime } = req.body;

        // Mettre à jour la dernière date et heure de visite du rendez-vous spécifique
        const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, { $set: { lastVisitDateTime } }, { new: true });

        // Trouver l'utilisateur (parent) pour le rendez-vous mis à jour
        const parentUser = await Utilisateur.findById(updatedAppointment.senderId);
        const exist = userConnected.find((el) => el.idUser.toString() === parentUser._id.toString());

        // Envoyer la notification de mise à jour au parent via la socket
        if (exist) {
            io.to(exist.idSocket).emit('updateAppointment', updatedAppointment);
            console.log('Socket de mise à jour envoyée');
        }

        return res.status(200).json({ message: 'Last visit date and time updated successfully' });
    } catch (error) {
        console.error('Error updating last visit date and time:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
 // Route pour mettre à jour la dernière date et heure de visite d'un rendez-vous spécifique
/*app.put('/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const { lastVisitDateTime } = req.body;
        
        // Mettre à jour la dernière date et heure de visite du rendez-vous spécifique
        await Appointment.findByIdAndUpdate(appointmentId, { $set: { lastVisitDateTime } });

        return res.status(200).json({ message: 'Last visit date and time updated successfully' });
    } catch (error) {
        console.error('Error updating last visit date and time:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});*/

// Route pour récupérer tous les rendez-vous avec filtres doctor et senderId
app.get('/appointments', async (req, res) => {
    try {
        const { doctor, senderId } = req.query;
        let query = {};

        // Vérifier si les paramètres de requête doctor et senderId sont présents
        if (doctor) {
            query.doctor = doctor;
        }
        if (senderId) {
            query.senderId = senderId;
        }

        // Récupérer les rendez-vous depuis la base de données en fonction des filtres
        const appointments = await Appointment.find(query);
        
        // Envoyer les rendez-vous récupérés en réponse
        return res.status(200).json({ appointments });

    } catch (error) {
        console.error('Error fetching appointments:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/baby/:babyId/data', async (req, res) => {
    try {
      const babyId = req.params.babyId;
      const utilisateur = await Utilisateur.findOne({ 'bebe._id': babyId });
  
      if (!utilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
      const babyData = {
        temperature: utilisateur.bebe.bebe_temperature,
        ambientTemperature: utilisateur.bebe.ambient_temperature,
        heartRate: utilisateur.bebe.last_bpm,
        spo2: utilisateur.bebe.last_spo2,
      };
  
      res.status(200).json(babyData);
    } catch (error) {
      console.error('Erreur lors de la récupération des données du bébé :', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des données du bébé' });
    }
  });

// Route pour supprimer un rendez-vous
app.delete('/appointments/:id', async (req, res) => {
    try {
      const appointmentId = req.params.id;
  
      // Trouver et supprimer le rendez-vous correspondant à l'ID fourni
      const deletedAppointment = await Appointment.findByIdAndDelete(appointmentId);
  
      if (!deletedAppointment) {
        return res.status(404).json({ message: 'Rendez-vous non trouvé' });
      }
  
      return res.status(200).json({ message: 'Rendez-vous supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  Suivie.getInvitationsByUserSenderStatus = async (user, sender, status) => {
    const filter = {};
   
    if (user) filter.user = user;
    if (sender) filter.sender = sender;
    if (status) filter.status = status;
   
    const invitations = await Suivie.find(filter);
    return invitations;
   };
   app.get('/invitations', async (req, res) => {
    const { user, sender, status } = req.query;
  
    try {
      const invitations = await Suivie.getInvitationsByUserSenderStatus(user, sender, status);
      res.json(invitations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Une erreur est survenue' });
    }
  });

app.get('/TyypesMedecins', async (req, res) => {
  try {
      // Récupérer tous les médecins de la base de données
      const medecins = await Utilisateur.find({ usertype: 'Medecin' });

      // Vérifier si des médecins ont été trouvés
      if (medecins.length === 0) {
          return res.status(404).json({ message: 'Aucun médecin trouvé' });
      }

      // Créer un tableau pour stocker les types de médecins avec leur nom et identifiant
      const tyypesMedecins = medecins.map(medecin => ({
          id: medecin._id.toString(), // Assurez-vous que l'ID est converti en chaîne de caractères
          nom: medecin.usrname, // Assurez-vous que le nom est bien défini
          type: medecin.usertype // Vérifiez que le type est bien défini
      }));

      // Envoyer la liste des types de médecins en réponse, avec un en-tête Content-Type explicitement défini
      res.status(200).json(tyypesMedecins);
  } catch (erreur) {
      console.error(erreur);
      res.status(500).send("Erreur lors de la récupération des types de médecins");
  }
});

