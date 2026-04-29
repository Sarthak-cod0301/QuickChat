const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for local storage (temporary solution)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Send message (text or file)
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    console.log('Received message request:', req.body);
    console.log('File:', req.file);
    
    const { content, chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }
    
    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is part of the chat
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    let messageData = {
      sender: req.user._id,
      content: content || '',
      chat: chatId,
      readBy: [req.user._id]
    };
    
    // If file uploaded
    if (req.file) {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      messageData.fileUrl = fileUrl;
      messageData.fileName = req.file.originalname;
      messageData.fileSize = req.file.size;
      
      // Determine file type
      const mimeType = req.file.mimetype;
      if (mimeType.startsWith('image/')) {
        messageData.fileType = 'image';
      } else if (mimeType.startsWith('video/')) {
        messageData.fileType = 'video';
      } else {
        messageData.fileType = 'document';
      }
    }
    
    // Create message
    let message = await Message.create(messageData);
    message = await message.populate('sender', '-password');
    message = await message.populate('chat');
    
    // Update chat's latest message
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });
    
    console.log('Message sent successfully:', message._id);
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error details:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Get messages for a chat
router.get('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is part of the chat
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const messages = await Message.find({ chat: chatId })
      .populate('sender', '-password')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put('/read/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    await Message.updateMany(
      { chat: chatId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get file by ID
router.get('/file/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message || !message.fileUrl) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user is part of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.users.includes(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    res.json({ 
      fileUrl: message.fileUrl, 
      fileName: message.fileName,
      fileType: message.fileType 
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: error.message });
  }
});
// Delete single message (add this with other routes)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    await message.deleteOne();
    
    // Update chat's latest message if needed
    const chat = await Chat.findById(message.chat);
    const lastMessage = await Message.findOne({ chat: message.chat }).sort({ createdAt: -1 });
    if (lastMessage) {
      chat.latestMessage = lastMessage._id;
    } else {
      chat.latestMessage = null;
    }
    await chat.save();
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Clear all messages in a chat for specific user
router.delete('/clear/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Check if user is part of the chat
    const chat = await Chat.findById(chatId);
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Add user to clearedBy array
    if (!chat.clearedBy.includes(req.user._id)) {
      chat.clearedBy.push(req.user._id);
    }
    await chat.save();
    
    res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a chat (only show messages not cleared by user)
router.get('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is part of the chat
    if (!chat.users.includes(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // If user cleared the chat, return empty array
    if (chat.clearedBy && chat.clearedBy.includes(req.user._id)) {
      return res.json([]);
    }
    
    const messages = await Message.find({ chat: chatId })
      .populate('sender', '-password')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get last message for sidebar (respecting cleared status)
router.get('/last-message/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // If user cleared the chat, return null
    if (chat.clearedBy && chat.clearedBy.includes(req.user._id)) {
      return res.json({ lastMessage: null });
    }
    
    const lastMessage = await Message.findOne({ chat: chatId })
      .populate('sender', '-password')
      .sort({ createdAt: -1 });
    
    res.json({ lastMessage });
  } catch (error) {
    console.error('Get last message error:', error);
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;