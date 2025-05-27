'use client'

import { useState } from 'react'
import { Play, Square, TrendingUp, TrendingDown, Activity, Settings, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface BotCardProps {
  bot: {
    botId: string
    symbol: string
    status: 'running' | 'stopped' | 'error'
    config?: {
      gridLevels: number
      gridSpacing: number
      amountPerGrid: number
      upperPrice: number
      lowerPrice: number
    }
    state?: {
      position?: {
        quantity: number
        averagePrice: number
      }
      stats?: {
        totalPnL: number
        totalVolume: number
        totalTrades: number
      }
      gridLevel?: number
    }
    exists?: boolean
    stats?: {
      totalPnL: number
      totalVolume: number
      totalTrades: number
    }
  }
  onStart: () => void
  onStop: () => void
  onSelect: () => void
  isSelected?: boolean
  isStarting?: boolean
  isStopping?: boolean
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
  const [imageError, setImageError] = useState(false)
  const isRunning = bot.status === 'running'
  const hasError = bot.status === 'error'
  const stats = bot.state?.stats || bot.stats || { totalPnL: 0, totalVolume: 0, totalTrades: 0 }
  const position = bot.state?.position
  
  const coinSymbol = bot.symbol.split('-')[0].toLowerCase()
  const coinImageUrl = `/${coinSymbol}.png`

  return (
    <div
      className={cn(
        "card p-4 card-hover relative overflow-hidden",
        isSelected && "ring-2 ring-blue-500",
        hasError && "border-red-500/20"
      )}
      onClick={onSelect}
    >
      {/* Status Indicator */}
      <div className="absolute top-3 right-3">
        <div className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
          isRunning ? "bg-green-500/10 text-green-500" : 
          hasError ? "bg-red-500/10 text-red-500" : 
          "bg-gray-500/10 text-gray-500"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isRunning ? "bg-green-500 animate-pulse" : 
            hasError ? "bg-red-500" : 
            "bg-gray-500"
          )} />
          {isRunning ? 'Running' : hasError ? 'Error' : 'Stopped'}
        </div>
      </div>

      {/* Bot Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800">
          {!imageError ? (
            <Image
              src={coinImageUrl}
              alt={coinSymbol}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
              {coinSymbol.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-base font-bold">{bot.symbol}</h3>
          <p className="text-xs text-gray-500">ID: {bot.botId.slice(0, 6)}...</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* P&L */}
        <div className="glass rounded p-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-gray-400">P&L</span>
            {stats.totalPnL >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
          <p className={cn(
            "text-sm font-bold",
            stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {stats.totalPnL >= 0 ? '+' : ''}${Math.abs(stats.totalPnL).toFixed(2)}
          </p>
        </div>

        {/* Volume */}
        <div className="glass rounded p-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-gray-400">Volume</span>
            <Activity className="h-3 w-3 text-blue-500" />
          </div>
          <p className="text-sm font-bold">
            ${stats.totalVolume.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Position Info */}
      {position && position.quantity !== 0 && (
        <div className="mb-2 p-2 glass rounded text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Position</span>
            <span className={cn(
              "font-medium",
              position.quantity > 0 ? "text-green-500" : "text-red-500"
            )}>
              {position.quantity > 0 ? 'Long' : 'Short'} {Math.abs(position.quantity).toFixed(4)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-gray-400">Avg Price</span>
            <span className="font-mono">${position.averagePrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Grid Info */}
      {bot.config && (
        <div className="mb-3 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Grid Levels:</span>
            <span className="text-gray-300">{bot.config.gridLevels}</span>
          </div>
          <div className="flex justify-between">
            <span>Range:</span>
            <span className="text-gray-300">
              ${bot.config.lowerPrice} - ${bot.config.upperPrice}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        {isRunning ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStop()
            }}
            disabled={isStopping}
            className="btn-danger text-sm py-1.5 flex-1"
          >
            {isStopping ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            Stop
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (bot.exists) onStart()
            }}
            disabled={!bot.exists || isStarting}
            className="btn-success text-sm py-1.5 flex-1"
          >
            {isStarting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Start
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className="btn-secondary text-sm py-1.5 px-3"
        >
          <Settings className="h-3 w-3" />
        </button>
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="absolute inset-x-0 bottom-0 bg-red-500/10 border-t border-red-500/20 p-1.5">
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            <span>Bot encountered an error</span>
          </div>
        </div>
      )}
    </div>
  )
} 