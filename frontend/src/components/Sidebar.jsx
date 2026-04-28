import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FiUsers, FiUserPlus, FiLogOut, FiEdit2, FiMessageCircle } from 'react-icons/fi'
import ProfileModal from './ProfileModal'
import GroupModal from './GroupModal'
import UserMenu from './UserMenu'
import toast from 'react-hot-toast'

const Sidebar = ({ socket, selectedChat, setSelectedChat, chats, setChats, onlineUsers }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showUsersList, setShowUsersList] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})

  // Debug: Log online users when they change
  useEffect(() => {
    console.log('🟢 Sidebar received online users:', onlineUsers)
    console.log('📊 Total online users count:', onlineUsers?.length || 0)
    
    if (onlineUsers && onlineUsers.length > 0) {
      onlineUsers.forEach(userId => {
        console.log(`   - User ID online: ${userId}`)
      })
    }
  }, [onlineUsers])

  // Debug: Log unread counts
  useEffect(() => {
    console.log('📬 Unread counts in sidebar:', unreadCounts)
  }, [unreadCounts])

  // Fetch chats function
  const fetchChats = async () => {
    try {
      const { data } = await axios.get('https://quickchat-backend-36zo.onrender.com/api/chat')
      
      // For each chat, get the appropriate last message (respecting cleared status)
      const updatedChats = await Promise.all(data.map(async (chat) => {
        try {
          const { data: lastMsgData } = await axios.get(`https://quickchat-backend-36zo.onrender.com/api/message/last-message/${chat._id}`)
          return {
            ...chat,
            latestMessage: lastMsgData.lastMessage,
            clearedBy: chat.clearedBy || []
          }
        } catch (error) {
          return {
            ...chat,
            latestMessage: chat.latestMessage,
            clearedBy: chat.clearedBy || []
          }
        }
      }))
      
      setChats(updatedChats)
    } catch (error) {
      toast.error('Failed to load chats')
    }
  }

  // Fetch unread counts
  const fetchUnreadCounts = async () => {
    try {
      const { data } = await axios.get('https://quickchat-backend-36zo.onrender.com/api/message/unread/count')
      console.log('Fetched unread counts:', data.unreadCounts)
      setUnreadCounts(data.unreadCounts || {})
    } catch (error) {
      console.error('Failed to fetch unread counts:', error)
    }
  }

  // Get unread count for a chat
  const getUnreadCount = (chatId) => {
    const count = unreadCounts[chatId] || 0
    if (count > 0) {
      console.log(`Chat ${chatId} has ${count} unread messages`)
    }
    return count
  }

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('https://quickchat-backend-36zo.onrender.com/api/auth/users')
      setUsers(data)
    } catch (error) {
      console.error(error)
    }
  }

  const accessChat = async (userId) => {
    try {
      const { data } = await axios.post('https://quickchat-backend-36zo.onrender.com/api/chat/access', { userId })
      
      const chatExists = chats.find(c => c._id === data._id)
      if (!chatExists) {
        setChats([data, ...chats])
      }
      
      setSelectedChat(data)
      if (socket) {
        socket.emit('join-chat', data._id)
      }
      setShowUsersList(false)
      
      // Mark as read when opening chat
      await markAsRead(data._id)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start chat')
    }
  }

  const markAsRead = async (chatId) => {
    try {
      await axios.put(`https://quickchat-backend-36zo.onrender.com/api/message/read/${chatId}`)
      // Update local unread count
      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }))
      // Refresh chats to update UI
      fetchChats()
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const handleChatSelect = async (chat) => {
    setSelectedChat(chat)
    if (socket) {
      socket.emit('join-chat', chat._id)
    }
    await markAsRead(chat._id)
  }

  const handleDeleteUser = async () => {
    try {
      await axios.delete(`https://quickchat-backend-36zo.onrender.com/api/auth/user/${user._id}`)
      localStorage.removeItem('userInfo')
      logout()
      navigate('/login')
      toast.success('Account deleted successfully')
    } catch (error) {
      console.error('Delete user error:', error)
      toast.error('Failed to delete account')
    }
  }

  // Get last message text (respecting cleared status)
  const getLastMessageText = (chat) => {
    // Check if user cleared this chat
    if (chat.clearedBy && chat.clearedBy.includes(user?._id)) {
      return 'No messages yet'
    }
    
    if (!chat.latestMessage) return 'No messages yet'
    
    const message = chat.latestMessage
    const isOwnMessage = message.sender?._id === user?._id
    
    if (message.fileUrl) {
      if (message.fileType === 'image') return isOwnMessage ? '📷 You sent an image' : `📷 ${message.sender?.username} sent an image`
      if (message.fileType === 'video') return isOwnMessage ? '🎥 You sent a video' : `🎥 ${message.sender?.username} sent a video`
      return isOwnMessage ? '📎 You sent a file' : `📎 ${message.sender?.username} sent a file`
    }
    
    if (message.content) {
      if (isOwnMessage) return `You: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`
      return message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
    }
    
    return 'No messages yet'
  }

  // Refresh chats event listener
  useEffect(() => {
    const handleRefreshChats = () => {
      fetchChats()
      fetchUnreadCounts()
    }
    
    window.addEventListener('refreshChats', handleRefreshChats)
    
    return () => {
      window.removeEventListener('refreshChats', handleRefreshChats)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchChats()
    fetchUsers()
    fetchUnreadCounts()
  }, [])

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return

    socket.on('receive-message', (message) => {
      console.log('New message received:', message)
      fetchChats()
      
      // Increment unread count if message is not from current chat
      if (!selectedChat || selectedChat._id !== message.chat._id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.chat._id]: (prev[message.chat._id] || 0) + 1
        }))
      }
    })

    socket.on('message-read-update', ({ chatId }) => {
      console.log('Message read update for chat:', chatId)
      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }))
      fetchChats()
    })

    return () => {
      socket.off('receive-message')
      socket.off('message-read-update')
    }
  }, [socket, selectedChat])

  // Profile update event listener
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchChats()
    }
    
    window.addEventListener('profileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [])

  return (
    <div className="w-full bg-white border-r flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="p-3 md:p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={user?.profilePic} 
            alt={user?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h2 className="font-semibold text-sm md:text-base">{user?.username}</h2>
            <p className="text-xs text-gray-500 truncate w-32">{user?.bio}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <UserMenu 
            user={user}
            onDeleteUser={handleDeleteUser}
            onViewProfile={() => setShowProfileModal(true)}
          />
          <button 
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Logout"
          >
            <FiLogOut className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Action Buttons - Responsive */}
      <div className="p-3 md:p-4 border-b flex space-x-2">
        <button 
          onClick={() => setShowGroupModal(true)}
          className="flex-1 bg-blue-500 text-white py-2 md:py-2.5 rounded-lg hover:bg-blue-600 transition flex items-center justify-center space-x-2 text-sm md:text-base"
        >
          <FiUsers size={16} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">New Group</span>
          <span className="sm:hidden">Group</span>
        </button>
        <button 
          onClick={() => setShowUsersList(!showUsersList)}
          className="flex-1 bg-green-500 text-white py-2 md:py-2.5 rounded-lg hover:bg-green-600 transition flex items-center justify-center space-x-2 text-sm md:text-base"
        >
          <FiMessageCircle size={16} className="md:w-5 md:h-5" />
          <span className="hidden sm:inline">New Chat</span>
          <span className="sm:hidden">Chat</span>
        </button>
      </div>

      {/* Users List for New Chat */}
      {showUsersList && (
        <div className="border-b max-h-80 overflow-y-auto">
          <div className="p-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700 text-sm md:text-base">Select a user to chat with</h3>
          </div>
          {users.map((otherUser) => {
            const isOnline = onlineUsers && Array.isArray(onlineUsers) && onlineUsers.includes(otherUser._id)
            return (
              <div
                key={otherUser._id}
                onClick={() => accessChat(otherUser._id)}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer transition border-b"
              >
                <div className="relative">
                  <img 
                    src={otherUser.profilePic} 
                    alt={otherUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm md:text-base">{otherUser.username}</p>
                  <p className="text-xs text-gray-500">{otherUser.email}</p>
                </div>
                <button className="text-blue-500 text-xs md:text-sm">Chat</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm md:text-base">No chats yet</p>
            <p className="text-xs md:text-sm mt-2">Click "New Chat" to start messaging</p>
          </div>
        ) : (
          chats.map((chat) => {
            const otherUser = !chat.isGroupChat 
              ? chat.users?.find(u => u._id !== user?._id)
              : null
            const isOnline = otherUser && onlineUsers && Array.isArray(onlineUsers) && onlineUsers.includes(otherUser._id)
            const unreadCount = getUnreadCount(chat._id)
            
            return (
              <div
                key={chat._id}
                onClick={() => handleChatSelect(chat)}
                className={`p-3 md:p-4 hover:bg-gray-50 cursor-pointer transition ${
                  selectedChat?._id === chat._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                } ${unreadCount > 0 ? 'bg-yellow-50' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={chat.isGroupChat 
                        ? 'https://cdn.pixabay.com/photo/2016/11/14/17/39/group-1824145_1280.png'
                        : otherUser?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                      } 
                      alt={chat.isGroupChat ? chat.chatName : otherUser?.username}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                    />
                    {isOnline && !chat.isGroupChat && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className={`font-semibold truncate text-sm md:text-base ${unreadCount > 0 ? 'text-black font-bold' : 'text-gray-700'}`}>
                        {chat.isGroupChat ? chat.chatName : otherUser?.username}
                      </h3>
                      {chat.latestMessage && (
                        <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {new Date(chat.latestMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                    <p className={`text-xs md:text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {getLastMessageText(chat)}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        socket={socket}
      />
      <GroupModal 
        isOpen={showGroupModal} 
        onClose={() => {
          setShowGroupModal(false)
          fetchChats()
          fetchUnreadCounts()
        }}
        users={users}
      />
    </div>
  )
}

export default Sidebar
