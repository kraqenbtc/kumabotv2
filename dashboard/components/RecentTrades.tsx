'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface RecentTradesProps {
  botId: string
}

interface Trade {
  id: string
  side: 'buy' | 'sell'
  price: number
  quantity: number
  cost: number
  pnl: number | null
  timestamp: number
  gridLevel: number
}

export function RecentTrades({ botId }: RecentTradesProps) {
  const { data: tradesData, isLoading, error } = useQuery({
    queryKey: ['trades', botId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/bots/${botId}/trades?limit=10`)
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Recent Trades</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (error || !tradesData) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Recent Trades</h3>
        <p className="text-gray-500 text-center py-8 text-sm">Failed to load trades</p>
      </div>
    )
  }

  const { trades = [], symbol } = tradesData

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Recent Trades - {symbol}</h3>
        <span className="text-xs sm:text-sm text-gray-400">{trades.length} trades</span>
      </div>

      {trades.length === 0 ? (
        <p className="text-gray-500 text-center py-8 text-sm">No trades yet</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-800">
                <thead>
                  <tr className="text-left text-xs sm:text-sm text-gray-400">
                    <th className="px-4 sm:px-0 pb-2">Type</th>
                    <th className="px-2 pb-2">Price</th>
                    <th className="px-2 pb-2 hidden sm:table-cell">Quantity</th>
                    <th className="px-2 pb-2">Cost</th>
                    <th className="px-2 pb-2">P&L</th>
                    <th className="px-2 pb-2 hidden sm:table-cell">Grid</th>
                    <th className="px-4 sm:px-0 pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {trades.map((trade: Trade) => (
                    <tr key={trade.id} className="text-sm">
                      <td className="px-4 sm:px-0 py-3">
                        <div className="flex items-center space-x-1">
                          {trade.side === 'buy' ? (
                            <ArrowDownLeft className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                          )}
                          <span className={cn(
                            "font-medium uppercase text-xs sm:text-sm",
                            trade.side === 'buy' ? 'text-green-500' : 'text-red-500'
                          )}>
                            {trade.side}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 font-mono text-xs sm:text-sm">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className="px-2 py-3 hidden sm:table-cell text-xs sm:text-sm">
                        {trade.quantity.toFixed(6)}
                      </td>
                      <td className="px-2 py-3 text-xs sm:text-sm">
                        ${trade.cost.toFixed(2)}
                      </td>
                      <td className={cn(
                        "px-2 py-3 font-medium text-xs sm:text-sm",
                        trade.pnl === null ? 'text-gray-500' :
                        trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {trade.pnl === null ? '-' : `$${trade.pnl.toFixed(2)}`}
                      </td>
                      <td className="px-2 py-3 hidden sm:table-cell text-xs sm:text-sm">
                        {trade.gridLevel}
                      </td>
                      <td className="px-4 sm:px-0 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3 hidden sm:inline" />
                          <span>{new Date(trade.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 