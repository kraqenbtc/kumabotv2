'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Plus, Wallet, TrendingUp, Shield, Zap, BarChart3, ArrowRight, Key, ExternalLink } from 'lucide-react'
import { BotCard } from '@/components/BotCard'
import { Header } from '@/components/Header'
import { StatsOverview } from '@/components/StatsOverview'
import { AccountInfo } from '@/components/AccountInfo'
import { SymbolSelector } from '@/components/SymbolSelector'
import { BotDetails } from '@/components/BotDetails'
import { WalletSetup } from '@/components/WalletSetup'
import { useUser } from '@/contexts/UserContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface Trade {
  id: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: number;
}

interface BotState {
  position?: {
    quantity: number;
    averagePrice: number;
  };
  stats?: {
    totalPnL: number;
    totalVolume: number;
    totalTrades: number;
  };
  gridLevel?: number;
  totalPnL?: number;
  totalVolume?: number;
  trades?: Trade[];
}

interface Bot {
  botId: string;
  symbol: string;
  status: 'running' | 'stopped' | 'error';
  state?: BotState;
  uptime: number;
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { user, connect, isConnecting } = useUser()
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [showSymbolSelector, setShowSymbolSelector] = useState(false)
  const [showBotDetails, setShowBotDetails] = useState(false)
  const [walletConfigured, setWalletConfigured] = useState<boolean | null>(null)
  const router = useRouter()

  // Check wallet configuration status only if user is connected
  useEffect(() => {
    if (user) {
    checkWalletStatus()
    }
  }, [user])

  const checkWalletStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/wallet/status`)
      setWalletConfigured(response.data.configured)
    } catch (error) {
      console.error('Error checking wallet status:', error)
      setWalletConfigured(false)
    }
  }

  // Fetch all bots - only if user is connected
  const { data: botsData } = useQuery({
    queryKey: ['bots', user?.walletAddress],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/bots`, {
        headers: {
          'X-Wallet-Address': user?.walletAddress
        }
      })
      return response.data
    },
    enabled: !!user,
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async (botId: string) => {
      const response = await axios.post(`${API_BASE_URL}/api/bots/${botId}/stop`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })

  const bots = botsData?.bots || []

  const handleBotCreated = () => {
    setShowSymbolSelector(false)
    queryClient.invalidateQueries({ queryKey: ['bots'] })
  }

  const selectedBot = bots.find((bot: Bot) => bot.botId === selectedBotId)

  const handleBotSelect = (botId: string) => {
    setSelectedBotId(botId)
    setShowBotDetails(true)
  }

  // Show landing page if not connected
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-6">
          {/* Hero Section */}
          <div className="max-w-6xl mx-auto mt-16">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="gradient-primary bg-clip-text text-transparent">Automated Grid Trading</span>
                <br />
                <span className="text-gray-300">on Kuma Exchange</span>
              </h1>
              <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
                Deploy intelligent trading bots that work 24/7. Capture profits from market volatility with advanced grid strategies.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-lg font-medium inline-flex items-center gap-3"
              >
                <Wallet className="h-5 w-5" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet to Start'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="glass rounded-xl p-6 border border-gray-800">
                <div className="p-3 bg-blue-500/10 rounded-lg w-fit mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Grid Strategy</h3>
                <p className="text-gray-400">
                  Automatically place buy and sell orders at preset intervals. Profit from market fluctuations without constant monitoring.
                </p>
              </div>

              <div className="glass rounded-xl p-6 border border-gray-800">
                <div className="p-3 bg-green-500/10 rounded-lg w-fit mb-4">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Risk Management</h3>
                <p className="text-gray-400">
                  Built-in stop loss and take profit features. Control your exposure with position limits and customizable parameters.
                </p>
              </div>

              <div className="glass rounded-xl p-6 border border-gray-800">
                <div className="p-3 bg-purple-500/10 rounded-lg w-fit mb-4">
                  <Zap className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-400">
                  Direct WebSocket connection to Kuma Exchange. Execute trades with minimal latency and real-time market data.
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className="glass rounded-xl p-8 border border-gray-800 text-center">
              <h2 className="text-2xl font-semibold mb-6">Start Trading in 3 Simple Steps</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">1</div>
                  <h3 className="font-semibold mb-1">Connect Wallet</h3>
                  <p className="text-sm text-gray-400">Link your MetaMask wallet securely</p>
                </div>
                <div>
                  <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">2</div>
                  <h3 className="font-semibold mb-1">Generate API Keys</h3>
                  <p className="text-sm text-gray-400">Create delegate keys for trading</p>
                </div>
                <div>
                  <div className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">3</div>
                  <h3 className="font-semibold mb-1">Deploy Bots</h3>
                  <p className="text-sm text-gray-400">Configure and launch your trading bots</p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center mt-12">
              <p className="text-gray-400 mb-4">
                Ready to automate your trading strategy?
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="px-6 py-3 glass border border-gray-700 rounded-lg hover:bg-gray-800/50 transition-colors inline-flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                View Live Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Show API key setup if user doesn't have API keys
  if (user && !user.apiKey) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-6">
          {/* API Key Setup Section */}
          <div className="max-w-4xl mx-auto">
            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg flex-shrink-0">
                  <Key className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-200 mb-2">API Keys Required</h3>
                  <p className="text-yellow-200/80 mb-4">
                    To start trading, you need to configure your Kuma Exchange API keys. 
                    This allows the bot to execute trades on your behalf while keeping your private keys secure.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Key className="h-4 w-4" />
                      Configure API Keys
                    </Link>
                    <a
                      href="https://exchange.kuma.bid/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 glass border border-gray-700 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                      Get API Keys from Kuma
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps Guide */}
            <div className="glass rounded-xl p-8 mb-8">
              <h2 className="text-xl font-semibold mb-6 text-center">Quick Setup Guide</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold text-blue-400">1</span>
                  </div>
                  <h3 className="font-medium mb-2">Create API Key</h3>
                  <p className="text-sm text-gray-400">
                    Go to Kuma Exchange and create a new API key with trading permissions
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold text-purple-400">2</span>
                  </div>
                  <h3 className="font-medium mb-2">Configure Keys</h3>
                  <p className="text-sm text-gray-400">
                    Enter your API key and secret in the profile settings
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold text-green-400">3</span>
                  </div>
                  <h3 className="font-medium mb-2">Start Trading</h3>
                  <p className="text-sm text-gray-400">
                    Create your first bot and let it trade automatically 24/7
                  </p>
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="glass rounded-xl p-8 text-center">
              <div className="p-4 bg-gray-800/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Bots Yet</h3>
              <p className="text-gray-400 mb-1">Configure your API keys to start creating trading bots</p>
              <p className="text-sm text-gray-500">Your bots will appear here once you've set up your API credentials</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Show wallet setup if not configured (legacy support)
  if (walletConfigured === false) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <WalletSetup onComplete={() => {
            setWalletConfigured(true)
            queryClient.invalidateQueries()
          }} />
        </main>
      </div>
    )
  }

  // Show loading while checking wallet status
  if (walletConfigured === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Account Info */}
        <AccountInfo />

        {/* Stats Overview */}
        <StatsOverview bots={bots} />

        {/* Create New Bot Section */}
        {showSymbolSelector ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Select Symbol for New Bot</h2>
              <button
                onClick={() => setShowSymbolSelector(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
            <SymbolSelector onBotCreated={handleBotCreated} />
          </div>
        ) : (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-4">Trading Bots</h2>
            
            {/* Bot Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bots.map((bot: Bot) => (
                <BotCard
                  key={bot.botId}
                  bot={{
                    ...bot,
                    exists: true,
                    stats: bot.state?.stats || {
                      totalPnL: 0,
                      totalVolume: 0,
                      totalTrades: 0
                    }
                  }}
                  onStart={() => {}} // Not needed for existing bots
                  onStop={() => stopBotMutation.mutate(bot.botId)}
                  onSelect={() => handleBotSelect(bot.botId)}
                  isSelected={selectedBotId === bot.botId}
                  isStarting={false}
                  isStopping={stopBotMutation.isPending}
            />
              ))}
              
              {/* Add New Bot Card */}
              <button
                onClick={() => {
                  if (!user?.apiKey) {
                    alert('Please configure your API keys first');
                    router.push('/profile');
                    return;
                  }
                  setShowSymbolSelector(true);
                }}
                className="card p-4 card-hover border-2 border-dashed border-gray-700 flex flex-col items-center justify-center min-h-[200px] group"
              >
                <Plus className="h-10 w-10 text-gray-600 group-hover:text-gray-400 transition-colors mb-2" />
                <p className="text-gray-400 font-semibold text-sm">Create New Bot</p>
                <p className="text-xs text-gray-500 mt-0.5">Click to configure</p>
              </button>
            </div>
        </div>
        )}

        {/* Bot Details Modal */}
        <BotDetails 
          bot={selectedBot}
          isOpen={showBotDetails}
          onClose={() => setShowBotDetails(false)}
        />
      </main>
    </div>
  )
}
