'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Image from 'next/image'
import { Wallet, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const SYMBOL_LOGOS: Record<string, string> = {
  'BTC': 'https://exchange.kuma.bid/static/images/coins/BTC.png',
  'ETH': 'https://exchange.kuma.bid/static/images/coins/ETH.png',
  'SOL': 'https://exchange.kuma.bid/static/images/coins/SOL.svg',
  'BERA': 'https://exchange.kuma.bid/static/images/coins/BERA.svg',
  'XRP': 'https://exchange.kuma.bid/static/images/coins/XRP.png',
  'USD': 'https://exchange.kuma.bid/static/images/coins/USDT.png',
}

interface Balance {
  asset: string
  free: string
  locked: string
  total: string
}

export function AccountInfo() {
  const { data: accountData, isLoading, error } = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/account`)
      return response.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load account information</span>
        </div>
      </div>
    )
  }

  const balances = accountData?.balances || []
  const totalUSDValue = accountData?.totalUSDValue || 0

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center space-x-2">
          <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          <h2 className="text-lg sm:text-xl font-semibold">Account Overview</h2>
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-sm text-gray-400">Total Value</p>
          <p className="text-lg sm:text-2xl font-bold text-green-500">
            ${totalUSDValue.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {balances.map((balance: Balance) => (
          <div
            key={balance.asset}
            className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center space-x-2 mb-2">
              <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                <Image
                  src={SYMBOL_LOGOS[balance.asset] || SYMBOL_LOGOS['USD']}
                  alt={balance.asset}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="font-medium text-sm sm:text-base">{balance.asset}</span>
            </div>
            <div className="space-y-1">
              <div>
                <p className="text-xs text-gray-400">Available</p>
                <p className="font-medium text-sm">{parseFloat(balance.free).toFixed(6)}</p>
              </div>
              {parseFloat(balance.locked) > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Locked</p>
                  <p className="font-medium text-sm text-yellow-500">
                    {parseFloat(balance.locked).toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-center">
          <div>
            <p className="text-xs sm:text-sm text-gray-400">Active Bots</p>
            <p className="text-lg sm:text-2xl font-bold">{accountData?.activeBots || 0}</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400">Total Trades</p>
            <p className="text-lg sm:text-2xl font-bold">{accountData?.totalTrades || 0}</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400">24h Volume</p>
            <p className="text-lg sm:text-2xl font-bold">
              ${(accountData?.volume24h || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400">24h P&L</p>
            <p className={cn(
              "text-lg sm:text-2xl font-bold",
              (accountData?.pnl24h || 0) >= 0 ? "text-green-500" : "text-red-500"
            )}>
              ${(accountData?.pnl24h || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 