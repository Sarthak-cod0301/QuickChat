import React, { useState, useRef, useEffect } from 'react'
import { FiMoreVertical, FiTrash2, FiCopy } from 'react-icons/fi'
import toast from 'react-hot-toast'

const MessageMenu = ({ message, onDelete, isOwn }) => {
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

  const handleCopy = () => {
    const textToCopy = message.content || (message.fileName || 'File')
    navigator.clipboard.writeText(textToCopy)
    toast.success('Copied to clipboard!')
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (onDelete && typeof onDelete === 'function') {
      onDelete()
      setShowMenu(false)
    } else {
      console.error('onDelete is not a function')
    }
  }

  if (!isOwn) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 rounded-full"
      >
        <FiMoreVertical size={14} className="text-gray-600" />
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50">
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 rounded-t-lg"
          >
            <FiCopy size={14} />
            <span>Copy message</span>
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
          >
            <FiTrash2 size={14} />
            <span>Delete for me</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default MessageMenu