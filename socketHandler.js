const Message = require('./models/Message'); // Updated path with capital M

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Authentication check
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.disconnect();
      return;
    }

    // Join personal room for receiving messages
    const userId = socket.user.userId;
    socket.join(userId);
    console.log(`User ${userId} connected and joined room`);

    // Handle new messages
    socket.on('message', async (data) => {
      try {
        const { receiverId, content } = data;
        
        // Create new message
        const message = new Message({
          sender: userId,
          receiver: receiverId,
          content,
          timestamp: new Date(),
          read: false
        });

        // Save to database
        const savedMessage = await message.save();
        
        // Populate sender details
        await savedMessage.populate('sender');

        // Emit to both sender and receiver
        const messageData = {
          _id: savedMessage._id,
          content: savedMessage.content,
          timestamp: savedMessage.timestamp,
          sender: {
            _id: savedMessage.sender._id
          },
          receiver: {
            _id: receiverId
          },
          read: savedMessage.read
        };

        // Send to receiver's room
        io.to(receiverId).emit('message', messageData);
        // Send to sender's room (if they're in a different tab/device)
        socket.to(userId).emit('message', messageData);
        // Send directly to sender's current connection
        socket.emit('message', messageData);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', {
          error: 'Failed to send message'
        });
      }
    });

    // Handle message deletion
    socket.on('deleteMessage', async (messageId) => {
      try {
        const message = await Message.findOne({
          _id: messageId,
          sender: userId
        });

        if (message) {
          await Message.deleteOne({ _id: messageId });
          
          // Notify both users about deletion
          io.to(message.receiver.toString()).emit('messageDeleted', { messageId });
          io.to(userId).emit('messageDeleted', { messageId });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('deleteError', {
          error: 'Failed to delete message'
        });
      }
    });

    // Mark messages as read
    socket.on('markAsRead', async ({ messageId }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { read: true },
          { new: true }
        );

        if (message) {
          // Notify sender that message was read
          io.to(message.sender.toString()).emit('messageRead', {
            messageId: message._id
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      socket.leave(userId);
    });
  });
};