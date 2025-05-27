'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Activity, Wallet, Copy, Check, ExternalLink, Menu, X, User, Settings, LogOut, Key } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function Header() {
  const [copied, setCopied] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const { user, connect, disconnect, isConnecting } = useUser()
  
  // Fetch wallet address from account info
  const { data: accountData } = useQuery({
    queryKey: ['account-header'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/account`)
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })

  const walletAddress = user?.walletAddress || accountData?.wallet?.address || ''
  
  const copyToClipboard = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-2">
              <Image
                src="/logo.png"
                alt="kumbo"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                kumbo
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">Grid Trading System</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Live Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-500">Live</span>
            </div>

            {/* User Profile / Connect Wallet */}
            {user ? (
              <div className="relative">
              <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                  <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-mono text-gray-300">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass rounded-lg border border-gray-800/50 shadow-xl">
                    <div className="p-4 border-b border-gray-800/50">
                      <p className="text-xs text-gray-400">Connected Wallet</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-mono text-gray-200">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</p>
                        <button
                          onClick={copyToClipboard}
                          className="p-1 hover:bg-gray-800/50 rounded transition-colors"
                        >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">Profile Settings</span>
                      </Link>
                      
                      {!user.apiKey && (
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Key className="h-4 w-4 text-yellow-500" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-yellow-200">Configure API Keys</p>
                            <p className="text-xs text-yellow-200/60">Required for trading</p>
                          </div>
                        </Link>
                      )}
                      
                      <button
                        onClick={() => {
                          disconnect()
                          setProfileMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 rounded-lg transition-colors text-red-400"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </span>
              </button>
            )}

            {/* Kuma Exchange Link */}
            <a
              href="https://exchange.kuma.bid"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 glass rounded-lg hover:bg-gray-800/50 transition-colors"
              title="Open Kuma Exchange"
            >
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 glass rounded-lg"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800/50">
            <div className="space-y-3">
              {/* Live Status */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-500">System Live</span>
              </div>

              {/* User Profile / Connect Wallet */}
              {user ? (
                <>
                  <div className="px-3 py-2 glass rounded-lg">
                    <p className="text-xs text-gray-400">Connected Wallet</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono text-gray-200">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</p>
                      <button
                        onClick={copyToClipboard}
                        className="p-1"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 glass rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Profile Settings</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      disconnect()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 glass rounded-lg text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Disconnect</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </span>
                </button>
              )}

              {/* Kuma Exchange Link */}
              <a
                href="https://exchange.kuma.bid"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 glass rounded-lg"
              >
                <ExternalLink className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Open Kuma Exchange</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 