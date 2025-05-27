'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Wallet, TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/contexts/UserContext'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function AccountInfo() {
  const { user } = useUser()
  
  const { data: accountData, isLoading, error } = useQuery({
    queryKey: ['account', user?.walletAddress],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/account`, {
        headers: {
          'X-Wallet-Address': user?.walletAddress
        }
      })
      return response.data
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-36 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-24 bg-gray-800 rounded-lg"></div>
          <div className="h-24 bg-gray-800 rounded-lg"></div>
          <div className="h-24 bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-4 border-red-500/20">
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load account information</span>
        </div>
      </div>
    )
  }

  const totalEquity = accountData?.totalEquity || 0
  const totalPnL = accountData?.totalPnL || 0
  const totalVolume = accountData?.totalVolume || 0
  const pnlPercentage = totalEquity > 0 ? (totalPnL / totalEquity) * 100 : 0

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 gradient-primary rounded-lg">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Account Overview</h2>
            <p className="text-xs text-gray-400">
              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user.sandbox && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded-lg">
              <Shield className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-500 font-medium">Sandbox</span>
            </div>
          )}
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Equity */}
        <div className="glass rounded-lg p-3 border border-gray-800/50 hover:border-gray-700/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">Total Equity</span>
            <div className="p-1 bg-green-500/10 rounded">
              <DollarSign className="h-3 w-3 text-green-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold">
              ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">
              {user.sandbox ? 'Test USDC' : 'USDC Balance'}
            </p>
          </div>
        </div>

        {/* 24h P&L */}
        <div className="glass rounded-lg p-3 border border-gray-800/50 hover:border-gray-700/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">24h P&L</span>
            <div className={cn(
              "p-1 rounded",
              totalPnL >= 0 ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {totalPnL >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className={cn(
              "text-xl font-bold",
              totalPnL >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={cn(
              "text-xs font-medium",
              totalPnL >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="glass rounded-lg p-3 border border-gray-800/50 hover:border-gray-700/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">24h Volume</span>
            <div className="p-1 bg-blue-500/10 rounded">
              <Activity className="h-3 w-3 text-blue-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold">
              ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">Trading Volume</p>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      {accountData?.wallet && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <p className="text-gray-500 mb-0.5">Free Collateral</p>
              <p className="font-semibold">${accountData.wallet.freeCollateral?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Buying Power</p>
              <p className="font-semibold">${accountData.wallet.buyingPower?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Leverage</p>
              <p className="font-semibold">{accountData.wallet.leverage?.toFixed(1) || '0.0'}x</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Unrealized P&L</p>
              <p className={cn(
                "font-semibold",
                (accountData.wallet.unrealizedPnL || 0) >= 0 ? "text-green-500" : "text-red-500"
              )}>
                ${accountData.wallet.unrealizedPnL?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 