import React, { useState, useRef, useEffect } from 'react'
import { FiMoreVertical, FiTrash2, FiUser, FiUsers, FiInfo } from 'react-icons/fi'
import toast from 'react-hot-toast'
import axios from 'axios'

const ChatHeaderMenu = ({ chat, user, onClearChat, onViewProfile }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const otherUser = !chat.isGroupChat 
    ? chat.users?.find(u => u._id !== user?._id)
    : null

const handleClearChat = () => {
  if (window.confirm('Clear all messages?\n\nThis will clear messages only for you. The other person will still see their messages.')) {
    onClearChat()
    setShowMenu(false)
  }
}

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-gray-100 rounded-full transition"
      >
        <FiMoreVertical size={20} className="text-gray-600" />
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50">
          {!chat.isGroupChat && otherUser && (
            <button
              onClick={() => {
                onViewProfile(otherUser)
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3 rounded-t-lg"
            >
              <FiUser size={16} />
              <span>View Profile</span>
            </button>
          )}
          
          {chat.isGroupChat && (
            <button
              onClick={() => {
                toast.info('Group info coming soon')
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3 rounded-t-lg"
            >
              <FiUsers size={16} />
              <span>Group Info</span>
            </button>
          )}
          
          <div className="border-t my-1"></div>
          
          <button
            onClick={handleClearChat}
            className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-3 rounded-b-lg"
          >
            <FiTrash2 size={16} />
            <span>Clear Chat</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ChatHeaderMenu