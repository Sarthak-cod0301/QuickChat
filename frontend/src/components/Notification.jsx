import React, { useEffect, useState } from 'react'
import { FiMessageCircle, FiX } from 'react-icons/fi'

const Notification = ({ message, onClose, onClick }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!isVisible) return null

  return (
    <div 
      onClick={onClick}
      className="fixed top-4 right-4 bg-white rounded-lg shadow-xl border-l-4 border-blue-500 p-4 max-w-sm cursor-pointer transform transition-all duration-300 hover:scale-105 z-50 animate-slideIn"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <FiMessageCircle className="text-blue-500" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            New message from {message.sender?.username}
          </p>
          <p className="text-sm text-gray-600 truncate">
            {message.content || 'Sent a file'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(message.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <FiX />
        </button>
      </div>
    </div>
  )
}

export default Notification