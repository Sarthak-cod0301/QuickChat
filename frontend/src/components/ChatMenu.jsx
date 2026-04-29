import React, { useState, useRef, useEffect } from 'react'
import { FiMoreVertical, FiTrash2, FiUser, FiUsers } from 'react-icons/fi'
import toast from 'react-hot-toast'
import axios from 'axios'

const ChatMenu = ({ chat, user, onClearChat, onShowProfile }) => {
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-gray-100 rounded-full transition"
      >
        <FiMoreVertical size={20} className="text-gray-600" />
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-20">
          {!chat.isGroupChat && otherUser && (
            <button
              onClick={() => {
                onShowProfile(otherUser)
                setShowMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
            >
              <FiUser size={16} />
              <span>View Profile</span>
            </button>
          )}
          
          {chat.isGroupChat && (
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
            >
              <FiUsers size={16} />
              <span>Group Info</span>
            </button>
          )}
          
          <div className="border-t my-1"></div>
          
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all messages?')) {
                onClearChat()
                setShowMenu(false)
              }
            }}
            className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-3"
          >
            <FiTrash2 size={16} />
            <span>Clear Chat</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ChatMenu