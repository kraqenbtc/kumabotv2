'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { BotCard } from '@/components/BotCard'
import { Header } from '@/components/Header'
import { StatsOverview } from '@/components/StatsOverview'
import { RecentTrades } from '@/components/RecentTrades'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)

  // Fetch all bots
  const { data: botsData, isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/bots`)
      return response.data
    },
  })

  // Fetch supported symbols
  const { data: symbolsData } = useQuery({
    queryKey: ['symbols'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/symbols`)
      return response.data
    },
  })

  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await axios.post(`${API_BASE_URL}/api/bots/${symbol}/start`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await axios.post(`${API_BASE_URL}/api/bots/${symbol}/stop`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
    },
  })

  const symbols = symbolsData?.symbols || []
  const bots = botsData?.bots || []

  // Create bot objects for all symbols
  const allBots = symbols.map((symbol: string) => {
    const existingBot = bots.find((bot: any) => bot.config?.symbol === symbol)
    return {
      symbol,
      exists: !!existingBot,
      ...existingBot,
    }
  })

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <StatsOverview bots={bots} />

        {/* Bot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {allBots.map((bot) => (
            <BotCard
              key={bot.symbol}
              bot={bot}
              onStart={() => startBotMutation.mutate(bot.symbol)}
              onStop={() => stopBotMutation.mutate(bot.symbol)}
              onSelect={() => setSelectedSymbol(bot.symbol)}
              isSelected={selectedSymbol === bot.symbol}
              isStarting={startBotMutation.isPending}
              isStopping={stopBotMutation.isPending}
            />
          ))}
        </div>

        {/* Recent Trades */}
        {selectedSymbol && (
          <div className="mt-8">
            <RecentTrades symbol={selectedSymbol} />
          </div>
        )}
      </main>
    </div>
  )
}
