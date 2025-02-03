const express = require('express');
const router = express.Router();
const Message = require('../models/Message');  // Updated path with capital M
const verifyToken = require('../middleware/auth');

// Récupérer l'historique des messages
router.get('/:otherUserId', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.userId, receiver: req.params.otherUserId },
        { sender: req.params.otherUserId, receiver: req.user.userId }
      ]
    }).sort('timestamp');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un message
router.delete('/:messageId', verifyToken, async (req, res) => {
  try {
    await Message.deleteOne({ 
      _id: req.params.messageId, 
      sender: req.user.userId 
    });
    res.json({ message: 'Message supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

module.exports = router;