// models/Conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur'
    }],
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageDate: {
        type: Date,
        default: Date.now
    },
    created: {
        type: Date,
        default: Date.now
    }
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

// models/Message.js
const MessageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
});

const Message = mongoose.model('Message', MessageSchema);

// Middleware d'authentification (à ajouter dans votre code existant)
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Token d'authentification requis" });
    }

    try {
        const decoded = jwt.verify(token, 'votre_secret_key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token invalide" });
    }
};

// Routes de messagerie
// Créer une nouvelle conversation
app.post('/api/conversations', authenticateUser, async (req, res) => {
    try {
        const { participantId } = req.body;
        
        // Vérifier si une conversation existe déjà
        const existingConversation = await Conversation.findOne({
            participants: {
                $all: [req.user.userId, participantId]
            }
        });

        if (existingConversation) {
            return res.json(existingConversation);
        }

        // Créer une nouvelle conversation
        const conversation = new Conversation({
            participants: [req.user.userId, participantId]
        });

        await conversation.save();
        res.status(201).json(conversation);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création de la conversation" });
    }
});

// Obtenir la liste des conversations d'un utilisateur
app.get('/api/conversations', authenticateUser, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user.userId
        })
        .populate('participants', 'usrname usertype')
        .sort({ lastMessageDate: -1 });

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des conversations" });
    }
});

// Envoyer un message
app.post('/api/messages', authenticateUser, async (req, res) => {
    try {
        const { conversationId, content } = req.body;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation non trouvée" });
        }

        // Vérifier si l'utilisateur fait partie de la conversation
        if (!conversation.participants.includes(req.user.userId)) {
            return res.status(403).json({ message: "Non autorisé" });
        }

        const message = new Message({
            conversation: conversationId,
            sender: req.user.userId,
            content
        });

        await message.save();

        // Mettre à jour la conversation avec le dernier message
        conversation.lastMessage = content;
        conversation.lastMessageDate = new Date();
        await conversation.save();

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
            return res.status(404).json({ message: "Conversation non trouvée" });
        }

        // Vérifier si l'utilisateur fait partie de la conversation
        if (!conversation.participants.includes(req.user.userId)) {
            return res.status(403).json({ message: "Non autorisé" });
        }

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'usrname usertype')
            .sort({ timestamp: 1 });

        // Marquer les messages non lus comme lus
        await Message.updateMany({
            conversation: conversationId,
            sender: { $ne: req.user.userId },
            read: false
        }, { read: true });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des messages" });
    }
});

// Obtenir le nombre de messages non lus
app.get('/api/messages/unread', authenticateUser, async (req, res) => {
    try {
        const unreadCount = await Message.countDocuments({
            conversation: { 
                $in: await Conversation.find({ 
                    participants: req.user.userId 
                }).distinct('_id')
            },
            sender: { $ne: req.user.userId },
            read: false
        });

        res.json({ unreadCount });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors du comptage des messages non lus" });
    }
});