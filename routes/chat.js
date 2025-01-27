const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const verifyToken = require('../middleware/verifyToken'); // Ajustez le chemin selon votre structure

// Envoyer un message
router.post('/messages', verifyToken, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const message = new Message({
            sender: req.user.userId,
            receiver: receiverId,
            content
        });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de l'envoi du message" });
    }
});

// Obtenir l'historique des messages
router.get('/messages/:otherUserId', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.userId, receiver: req.params.otherUserId },
                { sender: req.params.otherUserId, receiver: req.user.userId }
            ]
        })
        .sort({ timestamp: 1 })
        .populate('sender', 'usrname usertype')
        .populate('receiver', 'usrname usertype');
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des messages" });
    }
});

// Marquer les messages comme lus
router.put('/messages/read/:otherUserId', verifyToken, async (req, res) => {
    try {
        await Message.updateMany(
            {
                sender: req.params.otherUserId,
                receiver: req.user.userId,
                read: false
            },
            { read: true }
        );
        res.json({ message: "Messages marqués comme lus" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la mise à jour des messages" });
    }
});

// Obtenir la liste des conversations
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.userId },
                { receiver: req.user.userId }
            ]
        })
        .sort({ timestamp: -1 })
        .populate('sender', 'usrname usertype')
        .populate('receiver', 'usrname usertype');

        const conversations = {};
        messages.forEach(msg => {
            const otherUser = msg.sender._id.equals(req.user.userId) ? msg.receiver : msg.sender;
            if (!conversations[otherUser._id]) {
                conversations[otherUser._id] = {
                    user: otherUser,
                    lastMessage: msg
                };
            }
        });

        res.json(Object.values(conversations));
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des conversations" });
    }
});

module.exports = router;