'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface RecentTradesProps {
  symbol: string
}

export function RecentTrades({ symbol }: RecentTradesProps) {
  const { data: tradesData, isLoading } = useQuery({
    queryKey: ['trades', symbol],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/bots/${symbol}/trades?limit=20`)
      return response.data
    },
    enabled: !!symbol,
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Trades - {symbol}</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  const trades = tradesData?.trades || []

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Trades - {symbol}</h2>
      
      {trades.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No trades yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="pb-3">Time</th>
                <th className="pb-3">Side</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Fee</th>
                <th className="pb-3">P&L</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade: any, index: number) => (
                <tr key={index} className="border-b border-gray-800/50 text-sm">
                  <td className="py-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-400">
                        {new Date(trade.time).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={cn(
                      'font-semibold',
                      trade.side === 'buy' ? 'text-green-500' : 'text-red-500'
                    )}>
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 font-mono">${trade.price.toFixed(2)}</td>
                  <td className="py-3 font-mono">{trade.quantity.toFixed(6)}</td>
                  <td className="py-3">
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={cn(
                      'text-sm',
                      trade.fee > 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                      ${Math.abs(trade.fee).toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3">
                    {trade.pnl !== null && (
                      <div className="flex items-center space-x-1">
                        {trade.pnl >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={cn(
                          'font-semibold',
                          trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          ${Math.abs(trade.pnl).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 