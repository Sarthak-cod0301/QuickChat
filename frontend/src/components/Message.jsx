import React, { useState } from 'react'
import { format } from 'date-fns'
import { FiDownload, FiFile, FiImage, FiVideo } from 'react-icons/fi'
import MessageMenu from './MessageMenu'

const Message = ({ message, isOwn, onDownload, onDelete }) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <FiImage className="text-blue-500" size={20} />
      case 'video':
        return <FiVideo className="text-purple-500" size={20} />
      default:
        return <FiFile className="text-gray-500" size={20} />
    }
  }

  const renderContent = () => {
    if (message.fileUrl) {
      if (message.fileType === 'image') {
        return (
          <div className="relative group">
            {!imageLoaded && (
              <div className="w-full max-w-[200px] sm:max-w-[250px] md:max-w-[300px] h-32 sm:h-40 md:h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="animate-pulse text-xs sm:text-sm">Loading...</div>
              </div>
            )}
            <img 
              src={message.fileUrl} 
              alt={message.fileName || 'Shared image'}
              className={`max-w-full max-h-48 sm:max-h-56 md:max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition ${!imageLoaded ? 'hidden' : ''}`}
              onClick={() => window.open(message.fileUrl, '_blank')}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        )
      } else if (message.fileType === 'video') {
        return (
          <video controls className="max-w-full max-h-48 sm:max-h-56 md:max-h-64 rounded-lg">
            <source src={message.fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )
      } else {
        // Document file card
        return (
          <div className="flex items-center space-x-2 md:space-x-3 bg-gray-50 rounded-lg p-2 md:p-3 min-w-[160px] sm:min-w-[180px] md:min-w-[200px]">
            {getFileIcon(message.fileType)}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                {message.fileName || 'Download File'}
              </p>
              <p className="text-xs text-gray-500">{formatFileSize(message.fileSize)}</p>
            </div>
            <button
              onClick={onDownload}
              className="p-1 md:p-2 hover:bg-gray-200 rounded-full transition flex-shrink-0"
              title="Download file"
            >
              <FiDownload size={14} className="md:w-4 md:h-4 text-blue-500" />
            </button>
          </div>
        )
      }
    }
    return <p className="break-words whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fadeIn group relative mb-2 md:mb-4`}>
      <div className={`max-w-[85%] sm:max-w-xs md:max-w-md ${isOwn ? 'bg-blue-500' : 'bg-white'} rounded-lg p-2 md:p-3 shadow`}>
        {!isOwn && message.sender && (
          <p className="text-xs font-semibold mb-1 text-blue-600">{message.sender.username}</p>
        )}
        {renderContent()}
        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
          {format(new Date(message.createdAt), 'h:mm a')}
        </p>
      </div>
      {isOwn && (
        <div className="absolute -top-2 -right-2">
          <MessageMenu message={message} onDelete={onDelete} isOwn={isOwn} />
        </div>
      )}
    </div>
  )
}

export default Message