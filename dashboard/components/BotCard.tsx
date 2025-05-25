'use client'

import Image from 'next/image'
import { Play, Square, Trash2, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface BotStats {
  totalPnL: number;
  totalVolume: number;
  totalTrades: number;
}

interface BotCardProps {
  bot: {
    botId: string
    symbol: string
    status: 'running' | 'stopped' | 'error'
    exists: boolean
    state?: BotState
    stats?: BotStats
  }
  onStart: () => void
  onStop: () => void
  onSelect: () => void
  isSelected: boolean
  isStarting?: boolean
  isStopping?: boolean
}

const SYMBOL_LOGOS: Record<string, string> = {
  'BTC-USD': 'https://exchange.kuma.bid/static/images/coins/BTC.png',
  'ETH-USD': 'https://exchange.kuma.bid/static/images/coins/ETH.png',
  'SOL-USD': 'https://exchange.kuma.bid/static/images/coins/SOL.svg',
  'BERA-USD': 'https://exchange.kuma.bid/static/images/coins/BERA.svg',
  'XRP-USD': 'https://exchange.kuma.bid/static/images/coins/XRP.png',
}

export function BotCard({ 
  bot, 
  onStart, 
  onStop, 
  onSelect, 
  isSelected,
  isStarting,
  isStopping 
}: BotCardProps) {
  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (bot.status === 'running') {
      onStop()
    } else {
      onStart()
    }
  }

  const position = bot.state?.position || { quantity: 0, averagePrice: 0 }
  const stats = bot.state?.stats || { totalPnL: 0, totalVolume: 0, totalTrades: 0 }
  
  return (
    <div
      onClick={onSelect}
      className={cn(
        "bg-gray-900/50 backdrop-blur-sm border rounded-lg p-4 sm:p-6 cursor-pointer transition-all",
        isSelected ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-gray-800",
        "hover:border-gray-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12">
            <Image
              src={SYMBOL_LOGOS[bot.symbol] || SYMBOL_LOGOS['BTC-USD']}
              alt={bot.symbol}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <h3 className="font-semibold text-base sm:text-lg">{bot.symbol}</h3>
            <p className="text-xs sm:text-sm text-gray-400">Bot ID: {bot.botId.slice(0, 8)}...</p>
          </div>
        </div>
        
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          bot.status === 'running' ? "bg-green-500/20 text-green-500" :
          bot.status === 'error' ? "bg-red-500/20 text-red-500" :
          "bg-gray-500/20 text-gray-500"
        )}>
          {bot.status}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400">P&L</p>
          <p className={cn(
            "font-semibold text-sm sm:text-base",
            stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"
          )}>
            ${stats.totalPnL.toFixed(2)}
            {stats.totalPnL !== 0 && (
              stats.totalPnL > 0 ? 
                <TrendingUp className="inline h-3 w-3 sm:h-4 sm:w-4 ml-1" /> : 
                <TrendingDown className="inline h-3 w-3 sm:h-4 sm:w-4 ml-1" />
            )}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-gray-400">Position</p>
          <p className="font-semibold text-sm sm:text-base">
            {position.quantity.toFixed(6)}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-gray-400">Grid Level</p>
          <p className="font-semibold text-sm sm:text-base">{bot.state?.gridLevel || 0}</p>
        </div>
        
        <div>
          <p className="text-xs text-gray-400">Trades</p>
          <p className="font-semibold text-sm sm:text-base">{stats.totalTrades}</p>
        </div>
      </div>

      {/* Volume Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Volume</span>
          <span>${stats.totalVolume.toFixed(2)}</span>
        </div>
        <div className="h-1.5 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min((stats.totalVolume / 10000) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleAction}
          disabled={isStarting || isStopping}
          className={cn(
            "flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 sm:space-x-2 text-sm",
            bot.status === 'running' 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-blue-600 hover:bg-blue-700 text-white",
            (isStarting || isStopping) && "opacity-50 cursor-not-allowed"
          )}
        >
          {bot.status === 'running' ? (
            <>
              <Square className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{isStopping ? 'Stopping...' : 'Stop'}</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{isStarting ? 'Starting...' : 'Start'}</span>
            </>
          )}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            // Handle delete
          }}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Live Indicator */}
      {bot.status === 'running' && (
        <div className="mt-3 sm:mt-4 flex items-center justify-center space-x-2 text-xs text-gray-400">
          <Activity className="h-3 w-3 text-green-500 animate-pulse" />
          <span>Live Trading</span>
        </div>
      )}
    </div>
  )
} 