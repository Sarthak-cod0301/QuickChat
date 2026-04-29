import React, { useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'

const GroupModal = ({ isOpen, onClose, users }) => {
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const handleCreateGroup = async () => {
    if (!groupName || selectedUsers.length < 2) {
      toast.error('Group needs a name and at least 2 members')
      return
    }

    try {
      await axios.post('http://localhost:5000/api/chat/group', {
        chatName: groupName,
        users: selectedUsers.map(u => u._id)
      })
      toast.success('Group created successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to create group')
    }
  }

  const addUser = (user) => {
    if (!selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId))
  }

  const filteredUsers = users?.filter(u => 
    u._id !== user?._id && 
    !selectedUsers.find(selected => selected._id === u._id) &&
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Create Group Chat</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <FiX />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
          
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
          
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(user => (
              <div key={user._id} className="bg-blue-100 px-2 py-1 rounded-full flex items-center space-x-1">
                <span className="text-sm">{user.username}</span>
                <button onClick={() => removeUser(user._id)} className="text-blue-600">×</button>
              </div>
            ))}
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredUsers.map(user => (
              <div
                key={user._id}
                onClick={() => addUser(user)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 cursor-pointer rounded"
              >
                <img src={user.profilePic} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleCreateGroup}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  )
}

export default GroupModal