'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { BotConfigModal } from './BotConfigModal'
import { TrendingUp, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const SYMBOLS = [
  { 
    symbol: 'BTC-USD', 
    name: 'Bitcoin',
    logo: '/btc.png',
    color: 'from-orange-500 to-orange-600',
  },
  { 
    symbol: 'ETH-USD', 
    name: 'Ethereum',
    logo: '/eth.png',
    color: 'from-blue-500 to-blue-600',
  },
  { 
    symbol: 'SOL-USD', 
    name: 'Solana',
    logo: '/sol.png',
    color: 'from-purple-500 to-purple-600',
  },
  { 
    symbol: 'BERA-USD', 
    name: 'Berachain',
    logo: '/bera.png',
    color: 'from-yellow-500 to-yellow-600',
  },
  { 
    symbol: 'XRP-USD', 
    name: 'Ripple',
    logo: '/xrp.png',
    color: 'from-green-500 to-green-600',
  },
]

interface SymbolSelectorProps {
  onBotCreated: () => void
}

interface MarketData {
  symbol: string
  lastPrice: string
  priceChange24h: string
  priceChangePercent24h: string
  volume24h: string
  high24h: string
  low24h: string
}

export function SymbolSelector({ onBotCreated }: SymbolSelectorProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Fetch market data for all symbols
  const { data: marketData } = useQuery({
    queryKey: ['market-data'],
    queryFn: async () => {
      try {
        // Fetch market data from Kuma API through our backend
        const response = await axios.get(`${API_BASE_URL}/api/market/tickers`)
        return response.data
      } catch (error) {
        console.error('Failed to fetch market data:', error)
        return {}
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol)
    setShowConfig(true)
  }

  const handleConfigSuccess = () => {
    setShowConfig(false)
    setSelectedSymbol(null)
    onBotCreated()
  }

  const handleImageError = (symbol: string) => {
    setImageErrors(prev => ({ ...prev, [symbol]: true }))
  }

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (numPrice >= 1000) {
      return numPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })
    } else if (numPrice >= 1) {
      return numPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })
    } else {
      return numPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })
    }
  }

  const formatVolume = (volume: string | number) => {
    const numVolume = typeof volume === 'string' ? parseFloat(volume) : volume
    if (numVolume >= 1e9) {
      return `${(numVolume / 1e9).toFixed(1)}B`
    } else if (numVolume >= 1e6) {
      return `${(numVolume / 1e6).toFixed(1)}M`
    } else if (numVolume >= 1e3) {
      return `${(numVolume / 1e3).toFixed(1)}K`
    }
    return numVolume.toFixed(0)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {SYMBOLS.map((item) => {
          const data = marketData?.[item.symbol] || {}
          const price = data.lastPrice || '0'
          const changePercent = parseFloat(data.priceChangePercent24h || '0')
          const volume = data.volume24h || '0'
          const isPositive = changePercent >= 0
          
          return (
            <button
              key={item.symbol}
              onClick={() => handleSymbolClick(item.symbol)}
              className="group relative overflow-hidden glass rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all hover:scale-[1.02]"
            >
              {/* Background Gradient */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br",
                item.color
              )} />
              
              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
                    {!imageErrors[item.symbol] ? (
                      <Image
                        src={item.logo}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        onError={() => handleImageError(item.symbol)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        {item.symbol.split('-')[0]}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    isPositive ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
                  )}>
                    {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                  </div>
                </div>

                {/* Symbol Info */}
                <div className="text-left mb-3">
                  <h3 className="font-semibold text-sm">{item.symbol}</h3>
                  <p className="text-xs text-gray-400">{item.name}</p>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Price
                    </span>
                    <span className="font-medium">${formatPrice(price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      24h Vol
                    </span>
                    <span className="font-medium">${formatVolume(volume)}</span>
                  </div>
                </div>

                {/* Hover Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className={cn("h-full bg-gradient-to-r", item.color)} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedSymbol && (
        <BotConfigModal
          symbol={selectedSymbol}
          isOpen={showConfig}
          onClose={() => {
            setShowConfig(false)
            setSelectedSymbol(null)
          }}
          onSuccess={handleConfigSuccess}
        />
      )}
    </>
  )
} 