'use client'

import { DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react'

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

interface StatsOverviewProps {
  bots: Bot[]
}

export function StatsOverview({ bots }: StatsOverviewProps) {
  // Calculate stats from all bots
  const stats = bots.reduce(
    (acc, bot) => {
      if (bot.state) {
        acc.totalPnL += parseFloat((bot.state.totalPnL || 0).toString())
        acc.totalVolume += parseFloat((bot.state.totalVolume || 0).toString())
        acc.totalTrades += bot.state.trades?.length || 0
        if (bot.status === 'running') acc.activeBots++
      }
      return acc
    },
    { totalPnL: 0, totalVolume: 0, totalTrades: 0, activeBots: 0 }
  )

  const statCards = [
    {
      title: 'Total P&L',
      value: `$${stats.totalPnL.toFixed(2)}`,
      icon: DollarSign,
      color: stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: stats.totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Total Volume',
      value: `$${(stats.totalVolume / 1000).toFixed(1)}K`,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Bots',
      value: `${stats.activeBots} / ${bots.length}`,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Trades',
      value: stats.totalTrades.toString(),
      icon: BarChart3,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-3 sm:p-4 lg:p-6 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-400">{stat.title}</p>
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 ${stat.color}`}>
                {stat.value}
              </p>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 