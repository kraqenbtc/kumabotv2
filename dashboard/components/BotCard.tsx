'use client'

import { Play, Square, Settings, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BotCardProps {
  bot: any
  onStart: () => void
  onStop: () => void
  onSelect: () => void
  isSelected: boolean
  isStarting: boolean
  isStopping: boolean
}

export function BotCard({
  bot,
  onStart,
  onStop,
  onSelect,
  isSelected,
  isStarting,
  isStopping,
}: BotCardProps) {
  const isRunning = bot.status === 'running'
  const pnl = parseFloat(bot.state?.totalPnL || 0)
  const position = bot.state?.positionQty || 0
  const lastPrice = bot.state?.lastPrice || 0

  return (
    <div
      className={cn(
        'bg-gray-900/50 backdrop-blur-sm border rounded-lg p-6 transition-all cursor-pointer',
        isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-800 hover:border-gray-700',
        !bot.exists && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'p-2 rounded-lg',
            isRunning ? 'bg-green-500/10' : 'bg-gray-800'
          )}>
            <Activity className={cn(
              'h-5 w-5',
              isRunning ? 'text-green-500' : 'text-gray-500'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{bot.symbol}</h3>
            <p className={cn(
              'text-sm',
              isRunning ? 'text-green-500' : 'text-gray-500'
            )}>
              {isRunning ? 'Running' : 'Stopped'}
            </p>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            isRunning ? onStop() : onStart()
          }}
          disabled={isStarting || isStopping || !bot.exists}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isRunning
              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
              : 'bg-green-500/10 hover:bg-green-500/20 text-green-500',
            (isStarting || isStopping || !bot.exists) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isRunning ? (
            <Square className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Stats */}
      {bot.exists && bot.state && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">P&L</span>
            <div className="flex items-center space-x-1">
              {pnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                'font-semibold',
                pnl >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                ${pnl.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Position</span>
            <span className="font-mono">{position.toFixed(6)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Last Price</span>
            <span className="font-mono">${lastPrice.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Grid Level</span>
            <span className="font-mono">{bot.state.gridLevel || 0}</span>
          </div>
        </div>
      )}

      {/* Create bot message */}
      {!bot.exists && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">Bot not initialized</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStart()
            }}
            disabled={isStarting}
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            Click to create and start
          </button>
        </div>
      )}
    </div>
  )
} 