'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { FiCopy, FiCheck, FiAlertCircle, FiExternalLink } from 'react-icons/fi'
import { ArrowLeft, Key, Shield, Wallet, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const { user, updateApiKeys, toggleSandboxMode, disconnect } = useUser()
  const [copied, setCopied] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSaveApiKeys = async () => {
    if (!apiKey || !apiSecret) {
      alert('Please enter both API Key and API Secret')
      return
    }

    setSaving(true)
    try {
      await updateApiKeys(apiKey, apiSecret)
      alert('API keys saved successfully!')
      setApiKey('')
      setApiSecret('')
    } catch (error) {
      alert('Failed to save API keys')
    } finally {
      setSaving(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 glass rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        {/* Wallet Info */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold">Wallet Information</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Address:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{formatAddress(user.walletAddress)}</span>
                <button
                  onClick={() => copyToClipboard(user.walletAddress, 'address')}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {copied === 'address' ? <FiCheck className="h-4 w-4 text-green-500" /> : <FiCopy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Connected Since:</span>
              <span className="text-sm">{new Date(user.connectedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Trading Wallet Info */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-indigo-500" />
            </div>
            <h2 className="text-lg font-semibold">Secure Trading Setup</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
              <h3 className="font-medium text-indigo-200 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                How We Keep Your Funds Safe
              </h3>
              <ul className="space-y-2 text-sm text-indigo-200/80">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Your main wallet's private key is <strong>never</strong> shared or stored</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>We create a separate trading wallet for each user</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>This trading wallet can only execute trades with your API keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>All trading wallets are encrypted with AES-256 encryption</span>
                </li>
              </ul>
            </div>
            
            <div className="text-xs text-gray-400 italic">
              This delegated wallet approach ensures maximum security while enabling 24/7 automated trading.
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Key className="h-5 w-5 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold">API Configuration</h2>
          </div>
          
          {/* Security Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-yellow-500 mt-1 flex-shrink-0" size={20} />
              <div className="text-sm">
                <p className="font-semibold text-yellow-200 mb-2">Important Security Information:</p>
                <ul className="space-y-1 text-yellow-200/80">
                  <li>• Your API key must have <strong>trading permissions</strong> enabled</li>
                  <li>• It is strongly recommended to <strong>disable withdrawal permissions</strong> for security</li>
                  <li>• Never share your API keys with anyone</li>
                  <li>• API keys are stored encrypted on our secure servers</li>
                  <li>• Your private key is <strong>never</strong> shared or stored</li>
                  <li>• All trades are executed through Kuma's secure API</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-200 mb-2">How API Authentication Works:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-200/80">
              <li>Create an API key on Kuma Exchange with trading permissions</li>
              <li>Enter your API key and secret here (stored encrypted)</li>
              <li>The bot uses these credentials to execute trades on your behalf</li>
              <li>Your wallet's private key remains secure and is never exposed</li>
            </ol>
          </div>

          {user.apiKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400">✓ API keys configured</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to remove your API keys?')) {
                    updateApiKeys('', '')
                  }
                }}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Remove API Keys
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Kuma Exchange API Key"
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your Kuma Exchange API Secret"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveApiKeys}
                  disabled={saving || !apiKey || !apiSecret}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save API Keys'}
                </button>
                
                <a
                  href="https://exchange.kuma.bid/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Get API Keys from Kuma Exchange
                  <FiExternalLink />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Trading Mode */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold">Trading Mode</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.sandbox ? 'Sandbox Mode' : 'Production Mode'}</p>
              <p className="text-sm text-gray-400">
                {user.sandbox 
                  ? 'Trading with test funds (no real money)' 
                  : 'Trading with real funds'}
              </p>
            </div>
            <button
              onClick={toggleSandboxMode}
              className={`px-4 py-2 rounded-lg transition-colors ${
                user.sandbox 
                  ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20' 
                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
              }`}
            >
              Switch to {user.sandbox ? 'Production' : 'Sandbox'}
            </button>
          </div>
        </div>

        {/* Disconnect */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold">Disconnect Wallet</h2>
          </div>
          
          <p className="text-gray-400 mb-4">
            This will disconnect your wallet and clear all stored data.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to disconnect?')) {
                disconnect()
                router.push('/')
              }
            }}
            className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  )
} 