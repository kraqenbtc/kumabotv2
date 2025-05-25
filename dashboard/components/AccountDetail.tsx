'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Activity,
  X,
  RefreshCw 
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface Position {
  market: string;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnL: number;
  leverage: number;
}

interface AccountDetailProps {
  symbol: string
  onClose: () => void
}

export function AccountDetail({ symbol, onClose }: AccountDetailProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['account', symbol],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/account/${symbol}`)
      return response.data
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-red-500">Failed to load account details</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const { account } = data || {}

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Wallet className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold">{symbol} Account Details</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
          <span className="text-sm text-gray-400">Wallet Address: </span>
          <span className="font-mono text-sm">{account?.address}</span>
        </div>

        {/* Account Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Equity</span>
            </div>
            <p className="text-xl font-bold">${account?.equity?.toFixed(2) || '0.00'}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Shield className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Free Collateral</span>
            </div>
            <p className="text-xl font-bold">${account?.freeCollateral?.toFixed(2) || '0.00'}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Buying Power</span>
            </div>
            <p className="text-xl font-bold">${account?.buyingPower?.toFixed(2) || '0.00'}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Leverage</span>
            </div>
            <p className="text-xl font-bold">{account?.leverage?.toFixed(1) || '0.0'}x</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Unrealized P&L</span>
            </div>
            <p className={cn(
              "text-xl font-bold",
              account?.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
            )}>
              ${account?.unrealizedPnL?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Quote Balance</span>
            </div>
            <p className="text-xl font-bold">${account?.quoteBalance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-sm text-gray-400">Margin Ratio: </span>
            <span className="font-medium">{(account?.marginRatio * 100)?.toFixed(2) || '0.00'}%</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-sm text-gray-400">Available Collateral: </span>
            <span className="font-medium">${account?.availableCollateral?.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        {/* Fee Rates */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-sm text-gray-400">Maker Fee Rate: </span>
            <span className="font-medium">{(account?.makerFeeRate * 100)?.toFixed(3) || '0.000'}%</span>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <span className="text-sm text-gray-400">Taker Fee Rate: </span>
            <span className="font-medium">{(account?.takerFeeRate * 100)?.toFixed(3) || '0.000'}%</span>
          </div>
        </div>

        {/* Positions */}
        {account?.positions && account.positions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Open Positions</h3>
            <div className="space-y-2">
              {account.positions.map((position: Position, index: number) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{position.market}</span>
                    <span className={cn(
                      "text-sm font-medium",
                      position.quantity > 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                      {position.quantity > 0 ? 'LONG' : 'SHORT'} {Math.abs(position.quantity)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Entry Price: </span>
                      <span>${position.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Mark Price: </span>
                      <span>${position.markPrice}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Unrealized P&L: </span>
                      <span className={cn(
                        position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        ${position.unrealizedPnL.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Leverage: </span>
                      <span>{position.leverage}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 