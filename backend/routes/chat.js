const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Create or get one-to-one chat
router.post('/access', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check if chat already exists
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user._id, userId], $size: 2 }
    })
    .populate('users', '-password')
    .populate('latestMessage');
    
    if (!chat) {
      // Create new chat
      chat = await Chat.create({
        users: [req.user._id, userId],
        isGroupChat: false
      });
      
      chat = await Chat.findById(chat._id)
        .populate('users', '-password')
        .populate('latestMessage');
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Access chat error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all chats for user
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });
    
    res.json(chats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create group chat
router.post('/group', protect, async (req, res) => {
  try {
    const { chatName, users } = req.body;
    
    if (!chatName || !users || users.length < 2) {
      return res.status(400).json({ message: 'Group needs a name and at least 2 members' });
    }
    
    const groupChat = await Chat.create({
      chatName,
      isGroupChat: true,
      users: [req.user._id, ...users],
      groupAdmin: req.user._id
    });
    
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    res.json(fullGroupChat);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add user to group
router.put('/group/add', protect, async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (!chat.groupAdmin.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only admin can add users' });
    }
    
    if (!chat.users.includes(userId)) {
      chat.users.push(userId);
      await chat.save();
    }
    
    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    res.json(updatedChat);
  } catch (error) {
    console.error('Add to group error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;