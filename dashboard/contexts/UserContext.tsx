'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserProfile {
  walletAddress: string
  connectedAt: number
  apiKey?: string
  apiSecret?: string
  sandbox: boolean
}

interface UserContextType {
  user: UserProfile | null
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  updateProfile: (updates: Partial<UserProfile>) => void
  generateDelegateKey: () => Promise<void>
  updateApiKeys: (apiKey: string, apiSecret: string) => Promise<void>
  toggleSandboxMode: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('kumbo_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to continue')
      return
    }

    setIsConnecting(true)
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }
      
      const walletAddress = accounts[0].toLowerCase()

      // Check if user exists in localStorage
      const existingUser = localStorage.getItem(`kumbo_profile_${walletAddress}`)
      
      const userProfile: UserProfile = existingUser ? JSON.parse(existingUser) : {
        walletAddress,
        sandbox: true,
        connectedAt: Date.now()
      }

      // Update last login
      userProfile.connectedAt = Date.now()

      // Save to localStorage
      localStorage.setItem('kumbo_user', JSON.stringify(userProfile))
      localStorage.setItem(`kumbo_profile_${walletAddress}`, JSON.stringify(userProfile))
      
      setUser(userProfile)
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      if (error.code === 4001) {
        // User rejected the request
        alert('Please connect your wallet to continue')
      } else {
        alert('Failed to connect wallet. Please try again.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    localStorage.removeItem('kumbo_user')
    setUser(null)
  }

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return

    const updatedUser = { ...user, ...updates }
    
    // Save to localStorage
    localStorage.setItem('kumbo_user', JSON.stringify(updatedUser))
    localStorage.setItem(`kumbo_profile_${user.walletAddress}`, JSON.stringify(updatedUser))
    
    setUser(updatedUser)
  }

  const generateDelegateKey = async (): Promise<void> => {
    // This function is kept for compatibility but not used anymore
    // Users will enter their own API keys from Kuma Exchange
    console.log('generateDelegateKey called but not implemented - users should enter their own keys')
  }

  const updateApiKeys = async (apiKey: string, apiSecret: string) => {
    if (!user) return;
    
    try {
      // Save to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': user.walletAddress
        },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          sandbox: user.sandbox
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save API keys');
      }

      // Update local state
      const updatedUser = {
        ...user,
        apiKey: apiKey || undefined,
        apiSecret: apiSecret || undefined
      };
      
      setUser(updatedUser);
      localStorage.setItem('kumbo_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to save API keys:', error);
      throw error;
    }
  };

  const toggleSandboxMode = async () => {
    if (!user) return;
    
    const newSandboxMode = !user.sandbox;
    
    try {
      // Update in backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/mode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': user.walletAddress
        },
        body: JSON.stringify({
          sandbox: newSandboxMode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update mode');
      }

      // Update local state
      updateProfile({ sandbox: newSandboxMode });
    } catch (error) {
      console.error('Failed to update mode:', error);
      throw error;
    }
  };

  const value: UserContextType = {
    user,
    isConnecting,
    connect,
    disconnect,
    updateProfile,
    generateDelegateKey,
    updateApiKeys,
    toggleSandboxMode
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 