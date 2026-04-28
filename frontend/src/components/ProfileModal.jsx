import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { FiX, FiCamera } from 'react-icons/fi'
import toast from 'react-hot-toast'

const ProfileModal = ({ isOpen, onClose, socket }) => {
  const { user, setUser } = useAuth()
  const [bio, setBio] = useState(user?.bio || '')
  const [profilePic, setProfilePic] = useState(user?.profilePic || '')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePic(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('bio', bio)
      if (selectedFile) {
        formData.append('profilePic', selectedFile)
      }
      
      const { data } = await axios.put('https://quickchat-backend-36zo.onrender.com/api/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // Update user in context and localStorage
      const updatedUser = { ...user, ...data }
      localStorage.setItem('userInfo', JSON.stringify(updatedUser))
      setUser(updatedUser)
      
      // ✅ EMIT SOCKET EVENT to notify other users about profile update
      if (socket) {
        socket.emit('profile-updated', updatedUser)
      }
      
      toast.success('Profile updated successfully!')
      onClose()
    } catch (error) {
      console.error('Update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-full transition"
          >
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group">
              <img 
                src={profilePic || user?.profilePic} 
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition shadow-lg"
              >
                <FiCamera size={16} />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <p className="text-xs text-gray-500">Click the camera icon to change profile picture</p>
            {selectedFile && (
              <p className="text-xs text-green-500">✓ New image selected</p>
            )}
          </div>
          
          {/* Username (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={user?.username}
              disabled
              className="w-full p-2 border rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email}
              disabled
              className="w-full p-2 border rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500 transition"
              rows="3"
              placeholder="Tell something about yourself"
              maxLength="150"
            />
            <p className="text-xs text-gray-500 text-right">{bio.length}/150</p>
          </div>
          
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
