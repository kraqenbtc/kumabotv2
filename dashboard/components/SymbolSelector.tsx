'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BotConfigModal } from './BotConfigModal'

const SYMBOLS = [
  { 
    symbol: 'BTC-USD', 
    name: 'Bitcoin',
    logo: 'https://exchange.kuma.bid/static/images/coins/BTC.png',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20'
  },
  { 
    symbol: 'ETH-USD', 
    name: 'Ethereum',
    logo: 'https://exchange.kuma.bid/static/images/coins/ETH.png',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20'
  },
  { 
    symbol: 'SOL-USD', 
    name: 'Solana',
    logo: 'https://exchange.kuma.bid/static/images/coins/SOL.svg',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20'
  },
  { 
    symbol: 'BERA-USD', 
    name: 'Berachain',
    logo: 'https://exchange.kuma.bid/static/images/coins/BERA.svg',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20'
  },
  { 
    symbol: 'XRP-USD', 
    name: 'Ripple',
    logo: 'https://exchange.kuma.bid/static/images/coins/XRP.png',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20'
  },
]

interface SymbolSelectorProps {
  onBotCreated: () => void
}

export function SymbolSelector({ onBotCreated }: SymbolSelectorProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol)
    setShowConfig(true)
  }

  const handleConfigSuccess = () => {
    setShowConfig(false)
    setSelectedSymbol(null)
    onBotCreated()
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {SYMBOLS.map((item) => {
          return (
            <button
              key={item.symbol}
              onClick={() => handleSymbolClick(item.symbol)}
              className={`relative p-4 sm:p-6 rounded-lg border ${item.bgColor} transition-all cursor-pointer group`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 group-hover:scale-110 transition-transform">
                  <Image
                    src={item.logo}
                    alt={item.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">{item.symbol}</p>
                  <p className="text-xs sm:text-sm text-gray-400">{item.name}</p>
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