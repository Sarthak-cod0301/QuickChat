const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile with image upload
router.put('/profile', protect, upload.single('profilePic'), async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findById(req.user._id);
    
    if (bio !== undefined) user.bio = bio;
    
    // Handle profile picture upload
    if (req.file) {
      try {
        // Delete old image from Cloudinary if exists
        if (user.profilePicPublicId) {
          await cloudinary.uploader.destroy(user.profilePicPublicId);
        }
        
        // Upload new image to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'quickchat/profiles',
              width: 300,
              height: 300,
              crop: 'fill',
              gravity: 'face'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          // Convert buffer to stream
          const Readable = require('stream').Readable;
          const readableStream = new Readable();
          readableStream.push(req.file.buffer);
          readableStream.push(null);
          readableStream.pipe(uploadStream);
        });
        
        user.profilePic = result.secure_url;
        user.profilePicPublicId = result.public_id;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image' });
      }
    }
    
    await user.save();
    
    // Return updated user info
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single user by ID
router.get('/user/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user account (add with other routes)
router.delete('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is deleting their own account
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own account' });
    }
    
    // Delete user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all messages sent by user
    await Message.deleteMany({ sender: userId });
    
    // Remove user from all chats
    await Chat.updateMany(
      { users: userId },
      { $pull: { users: userId } }
    );
    
    // Delete empty chats
    await Chat.deleteMany({ users: { $size: 0 } });
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;