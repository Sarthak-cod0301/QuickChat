import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { FiMenu, FiX } from 'react-icons/fi'

const ChatPage = () => {
  const { user, setUser } = useAuth()
  const [socket, setSocket] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [chats, setChats] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile view
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768 && selectedChat) {
        setShowSidebar(false)
      } else if (window.innerWidth >= 768) {
        setShowSidebar(true)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [selectedChat])

  useEffect(() => {
    if (!user) return
    
    const newSocket = io('https://quickchat-backend-36zo.onrender.com', {
      transports: ['websocket'],
      cors: {
        origin: "http://localhost:5173"
      }
    })
    
    setSocket(newSocket)
    
    newSocket.on('connect', () => {
      console.log('Socket connected')
      newSocket.emit('user-connected', user._id)
    })
    
    newSocket.on('user-status-change', ({ userId, isOnline }) => {
      setOnlineUsers(prev => {
        if (isOnline && !prev.includes(userId)) {
          return [...prev, userId]
        } else if (!isOnline) {
          return prev.filter(id => id !== userId)
        }
        return prev
      })
    })

    newSocket.on('profile-updated', (updatedUser) => {
      if (updatedUser._id === user._id) {
        setUser(updatedUser)
        const userInfo = JSON.parse(localStorage.getItem('userInfo'))
        const updatedUserInfo = { ...userInfo, ...updatedUser }
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo))
      }
    })
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error('Connection error. Please refresh the page.')
    })
    
    return () => {
      newSocket.close()
    }
  }, [user])

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden relative">
      {/* Mobile Menu Button */}
      {isMobile && !showSidebar && selectedChat && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition z-50"
        >
          <FiMenu size={24} className="text-gray-600" />
        </button>
      )}
      
      {isMobile && showSidebar && !selectedChat && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition"
        >
          <FiX size={24} className="text-gray-600" />
        </button>
      )}
      
      {/* Sidebar */}
      <div className={`
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        ${isMobile ? 'fixed z-40 w-80 h-full shadow-xl' : 'relative w-80'}
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar 
          socket={socket} 
          selectedChat={selectedChat} 
          setSelectedChat={setSelectedChat}
          chats={chats}
          setChats={setChats}
          onlineUsers={onlineUsers}
        />
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatBox 
          socket={socket} 
          selectedChat={selectedChat} 
          user={user}
          setSelectedChat={setSelectedChat}
          onMenuClick={toggleSidebar}
          isMobile={isMobile}
        />
      </div>
      
      {/* Overlay for mobile */}
      {isMobile && showSidebar && !selectedChat && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </div>
  )
}

export default ChatPage
