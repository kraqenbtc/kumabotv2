'use client'

import { Bot, TrendingUp, Activity, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Bot {
  botId: string
  symbol: string
  status: 'running' | 'stopped'
  state?: {
    stats?: {
      totalPnL: number
      totalVolume: number
      totalTrades: number
    }
  }
}

interface StatsOverviewProps {
  bots: Bot[]
}

export function StatsOverview({ bots }: StatsOverviewProps) {
  const activeBots = bots.filter(bot => bot.status === 'running').length
  const totalBots = bots.length
  const totalPnL = bots.reduce((sum, bot) => sum + (bot.state?.stats?.totalPnL || 0), 0)
  const totalVolume = bots.reduce((sum, bot) => sum + (bot.state?.stats?.totalVolume || 0), 0)
  const totalTrades = bots.reduce((sum, bot) => sum + (bot.state?.stats?.totalTrades || 0), 0)

  const stats = [
    {
      label: 'Active Bots',
      value: `${activeBots} / ${totalBots}`,
      icon: Bot,
      color: 'blue',
      gradient: 'gradient-primary'
    },
    {
      label: 'Total P&L',
      value: `${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toFixed(2)}`,
      icon: TrendingUp,
      color: totalPnL >= 0 ? 'green' : 'red',
      gradient: totalPnL >= 0 ? 'gradient-success' : 'gradient-danger',
      valueColor: totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
    },
    {
      label: 'Total Volume',
      value: `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'purple',
      gradient: 'bg-gradient-to-br from-purple-600 to-pink-600'
    },
    {
      label: 'Total Trades',
      value: totalTrades.toLocaleString(),
      icon: Activity,
      color: 'orange',
      gradient: 'gradient-warning'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="card p-3 card-hover group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn(
                "p-2 rounded-lg",
                stat.gradient
              )}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-xs text-gray-500">
                {index === 0 && activeBots > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Live
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{stat.label}</p>
              <p className={cn(
                "text-lg font-bold",
                stat.valueColor || "text-white"
              )}>
                {stat.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
} 