'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Plus } from 'lucide-react'
import { BotCard } from '@/components/BotCard'
import { Header } from '@/components/Header'
import { StatsOverview } from '@/components/StatsOverview'
import { RecentTrades } from '@/components/RecentTrades'
import { AccountInfo } from '@/components/AccountInfo'
import { SymbolSelector } from '@/components/SymbolSelector'

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
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const [showSymbolSelector, setShowSymbolSelector] = useState(false)

  // Fetch all bots
  const { data: botsData } = useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/bots`)
      return response.data
    },
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

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Account Info */}
        <AccountInfo />

        {/* Stats Overview */}
        <StatsOverview bots={bots} />

        {/* Create New Bot Section */}
        {showSymbolSelector ? (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold">Select Symbol for New Bot</h2>
              <button
                onClick={() => setShowSymbolSelector(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
            <SymbolSelector onBotCreated={handleBotCreated} />
          </div>
        ) : (
          <div className="mt-6 sm:mt-8">
            {/* Bot Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
                  onSelect={() => setSelectedBotId(bot.botId)}
                  isSelected={selectedBotId === bot.botId}
                  isStarting={false}
                  isStopping={stopBotMutation.isPending}
                />
              ))}
              
              {/* Add New Bot Card */}
              <button
                onClick={() => setShowSymbolSelector(true)}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 border-dashed rounded-lg p-6 sm:p-8 cursor-pointer hover:border-gray-700 transition-all flex flex-col items-center justify-center space-y-2 group min-h-[200px]"
              >
                <Plus className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 group-hover:text-gray-400 transition-colors" />
                <p className="text-gray-400 font-medium text-sm sm:text-base">Create New Bot</p>
                <p className="text-xs sm:text-sm text-gray-500">Click to configure and start</p>
              </button>
            </div>
          </div>
        )}

        {/* Recent Trades for Selected Bot */}
        {selectedBotId && !showSymbolSelector && (
          <div className="mt-6 sm:mt-8">
            <RecentTrades botId={selectedBotId} />
          </div>
        )}
      </main>
    </div>
  )
}
