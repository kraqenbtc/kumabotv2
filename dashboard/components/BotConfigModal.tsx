'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { X, Save, AlertCircle } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface BotConfigModalProps {
  symbol: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BotConfig {
  initialQuantity: number
  baseIncrement: number
  incrementStep: number
  initialSpread: number
  spreadIncrement: number
  closingSpread: number
  maxPosition: number
  stopLoss?: number
  takeProfit?: number
  maxGridLevel?: number
}

export function BotConfigModal({ symbol, isOpen, onClose, onSuccess }: BotConfigModalProps) {
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch current config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['bot-config', symbol],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/bots/config/${symbol}`)
      return response.data
    },
    enabled: isOpen
  })

  // Start bot mutation
  const startBotMutation = useMutation({
    mutationFn: async (config: BotConfig) => {
      const response = await axios.post(`${API_BASE_URL}/api/bots/create`, {
        symbol,
        config,
        autoStart: true
      })
      return response.data
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    }
  })

  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config)
    }
  }, [configData])

  const handleInputChange = (field: keyof BotConfig, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      setConfig(prev => prev ? { ...prev, [field]: numValue } : null)
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!config) return false

    if (config.initialQuantity <= 0) newErrors.initialQuantity = 'Must be greater than 0'
    if (config.baseIncrement <= 0) newErrors.baseIncrement = 'Must be greater than 0'
    if (config.incrementStep <= 0) newErrors.incrementStep = 'Must be greater than 0'
    if (config.initialSpread <= 0) newErrors.initialSpread = 'Must be greater than 0'
    if (config.spreadIncrement <= 0) newErrors.spreadIncrement = 'Must be greater than 0'
    if (config.closingSpread <= 0) newErrors.closingSpread = 'Must be greater than 0'
    if (config.maxPosition <= 0) newErrors.maxPosition = 'Must be greater than 0'
    if (config.closingSpread >= config.initialSpread) {
      newErrors.closingSpread = 'Must be less than initial spread'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateConfig() && config) {
      startBotMutation.mutate(config)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold">Configure {symbol} Bot</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : config ? (
          <>
            {/* Grid Parameters */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Grid Parameters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    value={config.initialQuantity}
                    onChange={(e) => handleInputChange('initialQuantity', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.initialQuantity && (
                    <p className="text-red-500 text-xs mt-1">{errors.initialQuantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Base Increment
                  </label>
                  <input
                    type="number"
                    value={config.baseIncrement}
                    onChange={(e) => handleInputChange('baseIncrement', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.baseIncrement && (
                    <p className="text-red-500 text-xs mt-1">{errors.baseIncrement}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Increment Step
                  </label>
                  <input
                    type="number"
                    value={config.incrementStep}
                    onChange={(e) => handleInputChange('incrementStep', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.incrementStep && (
                    <p className="text-red-500 text-xs mt-1">{errors.incrementStep}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Max Position
                  </label>
                  <input
                    type="number"
                    value={config.maxPosition}
                    onChange={(e) => handleInputChange('maxPosition', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.maxPosition && (
                    <p className="text-red-500 text-xs mt-1">{errors.maxPosition}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Spread Parameters */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Spread Parameters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Initial Spread
                  </label>
                  <input
                    type="number"
                    value={config.initialSpread}
                    onChange={(e) => handleInputChange('initialSpread', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.initialSpread && (
                    <p className="text-red-500 text-xs mt-1">{errors.initialSpread}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Spread Increment
                  </label>
                  <input
                    type="number"
                    value={config.spreadIncrement}
                    onChange={(e) => handleInputChange('spreadIncrement', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.spreadIncrement && (
                    <p className="text-red-500 text-xs mt-1">{errors.spreadIncrement}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Closing Spread
                  </label>
                  <input
                    type="number"
                    value={config.closingSpread}
                    onChange={(e) => handleInputChange('closingSpread', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.01"
                  />
                  {errors.closingSpread && (
                    <p className="text-red-500 text-xs mt-1">{errors.closingSpread}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Management (Optional) */}
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Risk Management (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Stop Loss (%)
                  </label>
                  <input
                    type="number"
                    value={(config.stopLoss || 0) * 100}
                    onChange={(e) => handleInputChange('stopLoss', (parseFloat(e.target.value) / 100).toString())}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.1"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Take Profit (%)
                  </label>
                  <input
                    type="number"
                    value={(config.takeProfit || 0) * 100}
                    onChange={(e) => handleInputChange('takeProfit', (parseFloat(e.target.value) / 100).toString())}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="0.1"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">
                    Max Grid Level
                  </label>
                  <input
                    type="number"
                    value={config.maxGridLevel || 10}
                    onChange={(e) => handleInputChange('maxGridLevel', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                    step="1"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            {/* API Configuration Status */}
            {!configData?.apiConfigured && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-500">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">
                    API credentials not configured for {symbol}. Using default KUMA credentials.
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 sm:space-x-4">
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={startBotMutation.isPending}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-1.5 sm:space-x-2 disabled:opacity-50 text-sm"
              >
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{startBotMutation.isPending ? 'Starting...' : 'Start Bot'}</span>
              </button>
            </div>

            {/* Error Message */}
            {startBotMutation.isError && (
              <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-500 text-xs sm:text-sm">
                  {(startBotMutation.error as Error)?.message || 'Failed to start bot'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            Failed to load configuration
          </div>
        )}
      </div>
    </div>
  )
} 