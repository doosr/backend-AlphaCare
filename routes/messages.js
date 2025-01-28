const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
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
// Obtenir les messages d'une conversation
router.get('/:otherUserId', verifyToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const otherUserId = req.params.otherUserId;

        // Rechercher les messages où l'utilisateur courant est soit l'expéditeur soit le destinataire
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        })
        .populate('sender', 'usrname usertype')
        .populate('receiver', 'usrname usertype')
        .sort('timestamp');

        res.json(messages);
    } catch (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des messages' });
    }
});

// Obtenir toutes les conversations de l'utilisateur
router.get('/api/conversations', verifyToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;

        // Trouver tous les messages où l'utilisateur est impliqué
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }]
        })
        .populate('sender', 'usrname usertype')
        .populate('receiver', 'usrname usertype')
        .sort('-timestamp');

        // Grouper les messages par conversation
        const conversations = new Map();

        messages.forEach(message => {
            const otherUser = message.sender._id.toString() === currentUserId 
                ? message.receiver 
                : message.sender;
            
            const otherUserId = otherUser._id.toString();

            if (!conversations.has(otherUserId)) {
                conversations.set(otherUserId, {
                    user: {
                        _id: otherUser._id,
                        usrname: otherUser.usrname,
                        usertype: otherUser.usertype
                    },
                    lastMessage: {
                        content: message.content,
                        timestamp: message.timestamp,
                        sender: message.sender._id,
                        receiver: message.receiver._id
                    }
                });
            }
        });

        res.json(Array.from(conversations.values()));
    } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des conversations' });
    }
});

// Envoyer un nouveau message (backup pour Socket.IO)
router.post('/send', verifyToken, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        
        if (!content || !receiverId) {
            return res.status(400).json({ message: 'Le contenu du message et l\'ID du destinataire sont requis' });
        }

        const message = new Message({
            sender: req.user.userId,
            receiver: receiverId,
            content: content
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'usrname usertype')
            .populate('receiver', 'usrname usertype');

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'envoi du message' });
    }
});

// Marquer les messages comme lus
router.put('/read/:otherUserId', verifyToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const otherUserId = req.params.otherUserId;

        await Message.updateMany(
            {
                sender: otherUserId,
                receiver: currentUserId,
                read: false
            },
            {
                $set: { read: true }
            }
        );

        res.json({ message: 'Messages marqués comme lus' });
    } catch (error) {
        console.error('Erreur lors du marquage des messages comme lus:', error);
        res.status(500).json({ message: 'Erreur serveur lors du marquage des messages' });
    }
});

// Supprimer un message
router.delete('/:messageId', verifyToken, async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.messageId,
            sender: req.user.userId
        });

        if (!message) {
            return res.status(404).json({ message: 'Message non trouvé ou non autorisé' });
        }

        await message.remove();
        res.json({ message: 'Message supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du message' });
    }
});

// Obtenir le nombre de messages non lus
router.get('/unread/count', verifyToken, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiver: req.user.userId,
            read: false
        });

        res.json({ unreadCount: count });
    } catch (error) {
        console.error('Erreur lors du comptage des messages non lus:', error);
        res.status(500).json({ message: 'Erreur serveur lors du comptage des messages non lus' });
    }
});

module.exports = router;