const User = require('../models/User');

const users = {};

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('user-connected', async (userId) => {
      users[userId] = socket.id;
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: Date.now() });
      io.emit('user-status-change', { userId, isOnline: true });
      console.log(`User ${userId} connected`);
    });

    socket.on('join-chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    socket.on('send-message', (message) => {
      const chatId = message.chat._id;
      io.to(chatId).emit('receive-message', message);
      console.log(`Message sent to chat ${chatId}`);
    });

    socket.on('message-read', ({ chatId }) => {
      socket.to(chatId).emit('message-read-update', { chatId });
    });

    socket.on('typing', ({ chatId, userId, username }) => {
      socket.to(chatId).emit('user-typing', { username, chatId });
    });

    socket.on('stop-typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('user-stop-typing', { chatId });
    });
    socket.on('update-profile', async (userId) => {
  const user = await User.findById(userId).select('-password');
  io.emit('profile-updated', user);
});

    socket.on('disconnect', async () => {
      const userId = Object.keys(users).find(key => users[key] === socket.id);
      if (userId) {
        delete users[userId];
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: Date.now() });
        io.emit('user-status-change', { userId, isOnline: false });
        console.log(`User ${userId} disconnected`);
      }
    });
  });
};

module.exports = setupSocket;