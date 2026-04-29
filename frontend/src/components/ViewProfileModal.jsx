import React from 'react'
import { FiX } from 'react-icons/fi'

const ViewProfileModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">User Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center space-y-4">
          <img 
            src={user.profilePic} 
            alt={user.username}
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
          />
          <h3 className="text-xl font-bold">{user.username}</h3>
          <p className="text-gray-600 text-center">{user.bio || 'No bio yet'}</p>
          <p className="text-sm text-gray-500">Email: {user.email}</p>
          <p className="text-xs text-gray-400">
            Joined: {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ViewProfileModal