'use client'

import { X, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { ActiveOrders } from './ActiveOrders'
import { RecentTrades } from './RecentTrades'
import { cn } from '@/lib/utils'

interface Bot {
  botId: string
  symbol: string
  status: 'running' | 'stopped' | 'error'
  state?: {
    stats?: {
      totalPnL: number
      totalVolume: number
      totalTrades: number
    }
    position?: {
      quantity: number
      averagePrice: number
    }
    gridLevel?: number
  }
}

interface BotDetailsProps {
  bot: Bot | undefined
  isOpen: boolean
  onClose: () => void
}

export function BotDetails({ bot, isOpen, onClose }: BotDetailsProps) {
  if (!isOpen || !bot) return null

  const stats = bot.state?.stats || { totalPnL: 0, totalVolume: 0, totalTrades: 0 }
  const position = bot.state?.position || { quantity: 0, averagePrice: 0 }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-800">
          {/* Header */}
          <div className="bg-gray-800/50 px-4 py-3 sm:px-6 flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {bot.symbol} Bot Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total P&L</p>
                <p className={cn(
                  "text-xl font-bold",
                  stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  ${stats.totalPnL.toFixed(2)}
                  {stats.totalPnL !== 0 && (
                    stats.totalPnL > 0 ? 
                      <TrendingUp className="inline h-4 w-4 ml-1" /> : 
                      <TrendingDown className="inline h-4 w-4 ml-1" />
                  )}
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Position</p>
                <p className="text-xl font-bold">{position.quantity.toFixed(6)}</p>
                {position.quantity !== 0 && (
                  <p className="text-xs text-gray-500">
                    Avg: ${position.averagePrice.toFixed(2)}
                  </p>
                )}
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Grid Level</p>
                <p className="text-xl font-bold">{bot.state?.gridLevel || 0}</p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Trades</p>
                <p className="text-xl font-bold">{stats.totalTrades}</p>
              </div>
            </div>

            {/* Active Orders and Recent Trades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bot.state && (
                <ActiveOrders botState={bot.state} />
              )}
              
              <RecentTrades botId={bot.botId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 