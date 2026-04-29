
import React, { useState, useRef, useEffect } from 'react'
import { FiMoreVertical, FiTrash2, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import axios from 'axios'

const UserMenu = ({ user, onDeleteUser, onViewProfile }) => {
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

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone!')) {
      const confirmDelete = window.confirm('Type "DELETE" to confirm:')
      if (confirmDelete) {
        await onDeleteUser()
      }
    }
    setShowMenu(false)
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
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-20">
          <button
            onClick={() => {
              onViewProfile()
              setShowMenu(false)
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3"
          >
            <FiUser size={16} />
            <span>My Profile</span>
          </button>
          
          <div className="border-t my-1"></div>
          
          <button
            onClick={handleDeleteAccount}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
          >
            <FiTrash2 size={16} />
            <span>Delete Account</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu