const mongoose = require('mongoose');
const Message = require('./Message'); // Assurez-vous que le chemin est correct
const Utilisateur = require('./models/Utilisateur'); // Assurez-vous que ce modèle est correctement défini

// Schéma de conversation
const ConversationSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
  ],
  parentInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  medecinInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  lastMessage: {
    type: String,
    default: '',
  },
  lastMessageDate: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

// Modèle Conversation
const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);

module.exports = (app, io) => {
  const authenticateUser = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: "Token d'authentification requis" });
      }

      const decoded = jwt.verify(token, 'votre_secret_key'); // Remplacez par votre clé secrète
      const user = await Utilisateur.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Utilisateur non trouvé ou inactif' });
      }

      req.user = {
        userId: decoded.userId,
        userType: decoded.userType,
        email: decoded.email,
      };
      next();
    } catch (error) {
      res.status(401).json({ message: 'Token invalide' });
    }
  };

  // Créer une conversation
  app.post('/api/conversations', authenticateUser, async (req, res) => {
    try {
      const { otherUserId } = req.body;

      // Vérifiez si les utilisateurs existent
      const [currentUser, otherUser] = await Promise.all([
        Utilisateur.findById(req.user.userId),
        Utilisateur.findById(otherUserId),
      ]);

      if (!currentUser || !otherUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Vérifiez si une conversation existe déjà
      const existingConversation = await Conversation.findOne({
        participants: { $all: [req.user.userId, otherUserId] },
      });

      if (existingConversation) {
        return res.json(existingConversation);
      }

      // Déterminez qui est le médecin et qui est le parent
      const medecinId = currentUser.usertype === 'Medecin' ? currentUser._id : otherUser._id;
      const parentId = currentUser.usertype === 'Parent' ? currentUser._id : otherUser._id;

      // Créez une nouvelle conversation
      const conversation = new Conversation({
        participants: [req.user.userId, otherUserId],
        parentInfo: parentId,
        medecinInfo: medecinId,
      });

      await conversation.save();
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la création de la conversation' });
    }
  });

  // Obtenir la liste des conversations
  app.get('/api/conversations', authenticateUser, async (req, res) => {
    try {
      const conversations = await Conversation.find({
        participants: req.user.userId,
      })
        .populate('participants', 'usrname usertype')
        .populate('parentInfo', 'usrname bebe')
        .populate('medecinInfo', 'usrname')
        .sort({ lastMessageDate: -1 });

      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la récupération des conversations' });
    }
  });

  // Envoyer un message
  app.post('/api/messages', authenticateUser, async (req, res) => {
    try {
      const { conversationId, content } = req.body;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation non trouvée' });
      }

      if (!conversation.participants.includes(req.user.userId)) {
        return res.status(403).json({ message: 'Non autorisé' });
      }

      const message = new Message({
        conversation: conversationId,
        sender: req.user.userId,
        content,
      });

      await message.save();

      // Mettre à jour la conversation
      conversation.lastMessage = content;
      conversation.lastMessageDate = new Date();
      await conversation.save();

      // Émettre le message via Socket.IO
      io.to(conversationId).emit('nouveau_message', {
        message: await Message.findById(message._id).populate('sender', 'usrname usertype'),
      });

      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'envoi du message" });
    }
  });

  // Obtenir les messages d'une conversation
  app.get('/api/conversations/:conversationId/messages', authenticateUser, async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation non trouvée' });
      }

      if (!conversation.participants.includes(req.user.userId)) {
        return res.status(403).json({ message: 'Non autorisé' });
      }

      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'usrname usertype')
        .sort({ timestamp: 1 });

      // Marquer les messages comme lus
      await Message.updateMany(
        { conversation: conversationId, sender: { $ne: req.user.userId }, read: false },
        { read: true }
      );

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    }
  });

  // Configuration Socket.IO
  io.on('connection', (socket) => {
    console.log('Nouvelle connexion Socket.IO');

    socket.on('rejoindre_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`Utilisateur a rejoint la conversation: ${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log('Utilisateur déconnecté');
    });
  });
};
