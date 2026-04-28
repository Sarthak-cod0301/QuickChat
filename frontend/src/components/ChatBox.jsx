import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { FiSend, FiPaperclip, FiSmile, FiArrowLeft, FiMessageCircle, FiMenu } from 'react-icons/fi'
import EmojiPicker from 'emoji-picker-react'
import Message from './Message'
import ChatHeaderMenu from './ChatHeaderMenu'
import toast from 'react-hot-toast'

const ChatBox = ({ socket, selectedChat, user, setSelectedChat, onMenuClick, isMobile }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typing, setTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (selectedChat) {
      fetchMessages()
      if (socket) {
        socket.emit('join-chat', selectedChat._id)
      }
      markMessagesAsRead()
    }
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!socket) return
    
    const handleReceiveMessage = (message) => {
      setMessages(prev => {
        const exists = prev.some(m => m._id === message._id)
        if (!exists && selectedChat && message.chat._id === selectedChat._id) {
          return [...prev, message]
        }
        return prev
      })
      scrollToBottom()
    }

    socket.on('receive-message', handleReceiveMessage)
    socket.on('user-typing', ({ username, chatId }) => {
      if (selectedChat && chatId === selectedChat._id) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 3000)
      }
    })

    return () => {
      socket.off('receive-message', handleReceiveMessage)
      socket.off('user-typing')
    }
  }, [socket, selectedChat])

  const fetchMessages = async () => {
    if (!selectedChat) return
    
    setLoading(true)
    try {
      const { data } = await axios.get(`https://quickchat-backend-36zo.onrender.com/api/message/${selectedChat._id}`)
      setMessages(data)
      
      if (data.length === 0) {
        const chat = selectedChat
        if (chat.clearedBy && chat.clearedBy.includes(user._id)) {
          toast.info('You have cleared this chat')
        }
      }
    } catch (error) {
      console.error('Fetch messages error:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    if (!selectedChat) return
    
    try {
      await axios.put(`https://quickchat-backend-36zo.onrender.com/api/message/read/${selectedChat._id}`)
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const sendMessage = async (content, file = null) => {
    if ((!content || !content.trim()) && !file) return
    if (sending) return

    setSending(true)
    
    const formData = new FormData()
    formData.append('content', content || '')
    formData.append('chatId', selectedChat._id)
    if (file) formData.append('file', file)

    try {
      const { data } = await axios.post('https://quickchat-backend-36zo.onrender.com/api/message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setMessages(prev => [...prev, data])
      setNewMessage('')
      scrollToBottom()
      
      socket?.emit('send-message', data)
      
    } catch (error) {
      console.error('Send message error:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`https://quickchat-backend-36zo.onrender.com/api/message/${messageId}`)
      setMessages(prev => prev.filter(m => m._id !== messageId))
      toast.success('Message deleted')
    } catch (error) {
      console.error('Delete message error:', error)
      toast.error('Failed to delete message')
    }
  }

  const handleClearChat = async () => {
    if (!selectedChat) return
    
    if (window.confirm('Are you sure you want to clear all messages in this chat? This will only clear messages for you, not for the other person.')) {
      try {
        await axios.delete(`https://quickchat-backend-36zo.onrender.com/api/message/clear/${selectedChat._id}`)
        setMessages([])
        toast.success('Chat cleared successfully for you')
        
        if (setSelectedChat) {
          setSelectedChat({
            ...selectedChat,
            clearedBy: [...(selectedChat.clearedBy || []), user._id],
            latestMessage: null
          })
        }
        
        window.dispatchEvent(new CustomEvent('refreshChats'))
      } catch (error) {
        console.error('Clear chat error:', error)
        toast.error('Failed to clear chat')
      }
    }
  }

  const handleDownloadFile = async (message) => {
    try {
      const { data } = await axios.get(`https://quickchat-backend-36zo.onrender.com/api/message/file/${message._id}`)
      window.open(data.fileUrl, '_blank')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to open file')
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    
    if (!typing && socket && selectedChat && e.target.value) {
      setTyping(true)
      socket.emit('typing', { 
        chatId: selectedChat._id, 
        userId: user._id, 
        username: user.username 
      })
      setTimeout(() => {
        socket.emit('stop-typing', { chatId: selectedChat._id, userId: user._id })
        setTyping(false)
      }, 2000)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB')
        return
      }
      sendMessage('', file)
    }
    fileInputRef.current.value = ''
  }

  const handleViewProfile = (otherUser) => {
    toast.info(`Profile of ${otherUser.username}`)
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-4 md:p-8">
          <FiMessageCircle className="text-4xl md:text-6xl text-gray-400 mx-auto mb-3 md:mb-4" />
          <h2 className="text-lg md:text-2xl text-gray-600">Welcome to Quick Chat</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">Select a chat or start a new conversation</p>
        </div>
      </div>
    )
  }

  const otherUser = !selectedChat.isGroupChat 
    ? selectedChat.users?.find(u => u._id !== user?._id)
    : null

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
      {/* Chat Header - Responsive */}
      <div className="bg-white p-3 md:p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          {isMobile && (
            <button 
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
            >
              <FiMenu size={20} className="text-gray-600" />
            </button>
          )}
          <button 
            onClick={() => setSelectedChat && setSelectedChat(null)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <FiArrowLeft size={18} className="md:w-5 md:h-5" />
          </button>
          <img 
            src={selectedChat.isGroupChat 
              ? 'https://cdn.pixabay.com/photo/2016/11/14/17/39/group-1824145_1280.png'
              : otherUser?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
            } 
            alt={selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.username}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm md:text-base truncate">
              {selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.username}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {selectedChat.isGroupChat ? `${selectedChat.users?.length} members` : (otherUser?.bio || 'No bio yet')}
            </p>
          </div>
        </div>
        
        {/* Three dots menu */}
        <ChatHeaderMenu 
          chat={selectedChat}
          user={user}
          onClearChat={handleClearChat}
          onViewProfile={handleViewProfile}
        />
      </div>

      {/* Messages Area - Responsive */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-4 text-sm md:text-base">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8 md:mt-16">
            <p className="text-sm md:text-base">✨ No messages yet</p>
            <p className="text-xs md:text-sm mt-1 md:mt-2">Send a message to start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message 
              key={message._id} 
              message={message} 
              isOwn={message.sender?._id === user?._id}
              onDownload={() => handleDownloadFile(message)}
              onDelete={() => handleDeleteMessage(message._id)}
            />
          ))
        )}
        {isTyping && (
          <div className="text-xs md:text-sm text-gray-500 italic animate-pulse">
            {otherUser?.username} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Responsive */}
      <div className="bg-white p-2 md:p-4 border-t">
        <div className="flex items-center space-x-1 md:space-x-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1 md:p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
            disabled={sending}
          >
            <FiPaperclip size={18} className="md:w-5 md:h-5 text-gray-600" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 md:p-2 hover:bg-gray-100 rounded-full transition relative flex-shrink-0"
          >
            <FiSmile size={18} className="md:w-5 md:h-5 text-gray-600" />
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-10">
                <EmojiPicker 
                  onEmojiClick={(emoji) => {
                    setNewMessage(prev => prev + emoji.emoji)
                    setShowEmojiPicker(false)
                  }}
                />
              </div>
            )}
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newMessage.trim() && !sending) {
                sendMessage(newMessage)
              }
            }}
            placeholder="Type a message..."
            className="flex-1 p-2 text-sm md:text-base border rounded-lg focus:outline-none focus:border-blue-500 transition min-w-0"
            disabled={sending}
          />
          <button 
            onClick={() => newMessage.trim() && sendMessage(newMessage)}
            disabled={sending || !newMessage.trim()}
            className="bg-blue-500 text-white p-2 md:p-2.5 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 flex-shrink-0"
          >
            <FiSend size={16} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBox
