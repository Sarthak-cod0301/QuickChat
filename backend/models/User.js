const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  profilePic: {
    type: String,
    default: 'https://res.cloudinary.com/demo/image/upload/v1312461206/default_profile.png'
  },
  profilePicPublicId: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: 'Hey there! I am using Quick Chat'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);