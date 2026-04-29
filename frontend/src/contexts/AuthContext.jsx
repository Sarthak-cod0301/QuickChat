import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo)
        setUser(parsedUser)
        axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`
      } catch (error) {
        console.error('Error parsing user info:', error)
        localStorage.removeItem('userInfo')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      })
      localStorage.setItem('userInfo', JSON.stringify(data))
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      setUser(data)
      toast.success('Login successful!')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
      return false
    }
  }

  const register = async (username, email, password) => {
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password
      })
      localStorage.setItem('userInfo', JSON.stringify(data))
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      setUser(data)
      toast.success('Account created successfully!')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('userInfo')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateProfile = async (updates) => {
    try {
      const { data } = await axios.put('http://localhost:5000/api/auth/profile', updates)
      const updatedUser = { ...user, ...data }
      localStorage.setItem('userInfo', JSON.stringify(updatedUser))
      setUser(updatedUser)
      toast.success('Profile updated!')
      return true
    } catch (error) {
      toast.error('Update failed')
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}