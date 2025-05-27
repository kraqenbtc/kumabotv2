'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Wallet, Key, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface WalletSetupProps {
  onComplete: () => void
}

export function WalletSetup({ onComplete }: WalletSetupProps) {
  const [step, setStep] = useState<'connect' | 'generate' | 'sign' | 'api' | 'complete'>('connect')
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [delegatedKey, setDelegatedKey] = useState<{ address: string; privateKey: string } | null>(null)
  const [signature, setSignature] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [apiSecret, setApiSecret] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // Connect wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError('Please install MetaMask to continue')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setStep('generate')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  // Generate delegated key
  const generateDelegatedKey = () => {
    const wallet = ethers.Wallet.createRandom()
    setDelegatedKey({
      address: wallet.address,
      privateKey: wallet.privateKey
    })
    setStep('sign')
  }

  // Sign delegated key with main wallet
  const signDelegatedKey = async () => {
    if (!delegatedKey) return

    try {
      setLoading(true)
      setError('')

      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()

      // Create message to sign
      const message = `I authorize kumbo to use delegated key ${delegatedKey.address} for trading on my behalf.\n\nThis key can only trade, not withdraw funds.\n\nTimestamp: ${new Date().toISOString()}`

      // Sign the message
      const signature = await signer.signMessage(message)
      setSignature(signature)
      setStep('api')
    } catch (err: any) {
      setError(err.message || 'Failed to sign message')
    } finally {
      setLoading(false)
    }
  }

  // Save configuration
  const saveConfiguration = async () => {
    if (!delegatedKey || !signature) return

    try {
      setLoading(true)
      setError('')

      // Save to backend
      await axios.post(`${API_BASE_URL}/api/wallet/setup`, {
        walletAddress,
        delegatedAddress: delegatedKey.address,
        delegatedPrivateKey: delegatedKey.privateKey,
        signature,
        apiKey,
        apiSecret
      })

      setStep('complete')
      setTimeout(onComplete, 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-3xl font-bold text-center mb-8">Secure Trading Setup</h2>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {['connect', 'generate', 'sign', 'api', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all",
                step === s ? "gradient-primary text-white scale-110" : 
                ['connect', 'generate', 'sign', 'api', 'complete'].indexOf(step) > i ? "bg-green-500 text-white" : "glass text-gray-400"
              )}>
                {['connect', 'generate', 'sign', 'api', 'complete'].indexOf(step) > i ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 4 && (
                <div className={cn(
                  "w-full h-1 mx-2",
                  ['connect', 'generate', 'sign', 'api', 'complete'].indexOf(step) > i ? "bg-green-500" : "bg-gray-800"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-8">
          {step === 'connect' && (
            <>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <Wallet className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold">Connect Your Wallet</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Connect your MetaMask wallet to begin the secure setup process for automated trading.
                </p>
              </div>
              
              <button
                onClick={connectWallet}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
                Connect MetaMask
              </button>
            </>
          )}

          {step === 'generate' && (
            <>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto">
                  <Key className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold">Generate Trading Key</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  We'll create a secure trading key that can only execute trades, not withdraw funds.
                </p>
                <div className="glass rounded-xl p-4">
                  <p className="text-sm text-gray-300">
                    <span className="text-green-400">✓</span> Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={generateDelegatedKey}
                className="btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full py-3"
              >
                <Key className="h-5 w-5" />
                Generate Trading Key
              </button>
            </>
          )}

          {step === 'sign' && delegatedKey && (
            <>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 gradient-success rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold">Authorize Trading Key</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Sign a message to authorize this key for trading only. Your funds remain secure.
                </p>
                <div className="glass rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trading Key Address</p>
                    <p className="text-sm font-mono text-gray-300">{delegatedKey.address}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-800">
                    <p className="text-sm text-green-400">✓ Can execute trades</p>
                    <p className="text-sm text-green-400">✓ Cannot withdraw funds</p>
                    <p className="text-sm text-green-400">✓ Revocable anytime</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={signDelegatedKey}
                disabled={loading}
                className="btn-success w-full py-3"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
                Sign Authorization
              </button>
            </>
          )}

          {step === 'api' && (
            <>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 gradient-warning rounded-full flex items-center justify-center mx-auto">
                  <Key className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold">Kuma API Credentials</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Enter your API credentials from Kuma Exchange to enable trading.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="input"
                    placeholder="Enter your Kuma API key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">API Secret</label>
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="input"
                    placeholder="Enter your Kuma API secret"
                  />
                </div>
              </div>
              
              <button
                onClick={saveConfiguration}
                disabled={loading || !apiKey || !apiSecret}
                className="btn bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white w-full py-3 disabled:from-gray-700 disabled:to-gray-700"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Complete Setup
              </button>
            </>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 gradient-success rounded-full flex items-center justify-center mx-auto animate-float">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-semibold">Setup Complete!</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Your secure trading environment is ready. You can now create and manage your trading bots.
              </p>
              <div className="glass rounded-xl p-6 space-y-2">
                <p className="text-green-400 font-medium">✓ Wallet connected</p>
                <p className="text-green-400 font-medium">✓ Trading key authorized</p>
                <p className="text-green-400 font-medium">✓ API credentials saved</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 