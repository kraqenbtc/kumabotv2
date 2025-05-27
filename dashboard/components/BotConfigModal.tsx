'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { X, Save, AlertCircle, Info, TrendingUp, Shield, Grid3X3, Zap, Settings, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useUser } from '@/contexts/UserContext'

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

const PRESET_CONFIGS = {
  conservative: {
    name: 'Conservative',
    description: 'Low risk, steady returns',
    icon: Shield,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    config: {
      initialQuantity: 0.01,
      baseIncrement: 0.01,
      incrementStep: 0.005,
      initialSpread: 50,
      spreadIncrement: 10,
      closingSpread: 20,
      maxPosition: 0.5,
      stopLoss: 0.05,
      takeProfit: 0.05,
      maxGridLevel: 5
    }
  },
  balanced: {
    name: 'Balanced',
    description: 'Moderate risk and returns',
    icon: Grid3X3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    config: {
      initialQuantity: 0.02,
      baseIncrement: 0.02,
      incrementStep: 0.01,
      initialSpread: 30,
      spreadIncrement: 15,
      closingSpread: 15,
      maxPosition: 1.0,
      stopLoss: 0.1,
      takeProfit: 0.1,
      maxGridLevel: 10
    }
  },
  aggressive: {
    name: 'Aggressive',
    description: 'High risk, high returns',
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    config: {
      initialQuantity: 0.05,
      baseIncrement: 0.05,
      incrementStep: 0.02,
      initialSpread: 20,
      spreadIncrement: 20,
      closingSpread: 10,
      maxPosition: 2.0,
      stopLoss: 0.15,
      takeProfit: 0.15,
      maxGridLevel: 15
    }
  }
}

export function BotConfigModal({ symbol, isOpen, onClose, onSuccess }: BotConfigModalProps) {
  const { user } = useUser()
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const coinSymbol = symbol.split('-')[0].toLowerCase()
  const coinImageUrl = `/${coinSymbol}.png`

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
      if (!user || !user.apiKey || !user.apiSecret) {
        throw new Error('API keys not configured. Please generate API keys in your profile.')
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/bots/create`, {
        symbol,
        config,
        autoStart: true,
        apiKey: user.apiKey,
        apiSecret: user.apiSecret,
        sandbox: user.sandbox
      }, {
        headers: {
          'X-Wallet-Address': user.walletAddress
        }
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

  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESET_CONFIGS[presetKey as keyof typeof PRESET_CONFIGS]
    if (preset) {
      setConfig(preset.config)
      setSelectedPreset(presetKey)
      setErrors({})
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
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800">
              <Image
                src={coinImageUrl}
                alt={coinSymbol}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configure {symbol} Bot</h2>
              <p className="text-sm text-gray-400">Set up your grid trading parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg glass hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : config ? (
          <>
            {/* Preset Strategies */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Quick Start Strategies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PRESET_CONFIGS).map(([key, preset]) => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left",
                        selectedPreset === key
                          ? `${preset.bgColor} border-current ${preset.color}`
                          : "glass hover:bg-gray-800/50 border-gray-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          preset.bgColor
                        )}>
                          <Icon className={cn("h-5 w-5", preset.color)} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{preset.name}</h4>
                          <p className="text-xs text-gray-400">{preset.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Main Parameters */}
            <div className="space-y-6">
              {/* Grid Settings */}
              <div className="glass rounded-xl p-5">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-purple-500" />
                  Grid Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Initial Order Size
                      <span className="ml-1 text-xs text-gray-500">(Base asset)</span>
                    </label>
                    <input
                      type="number"
                      value={config.initialQuantity}
                      onChange={(e) => handleInputChange('initialQuantity', e.target.value)}
                      className={cn(
                        "input",
                        errors.initialQuantity && "border-red-500"
                      )}
                      step="0.01"
                    />
                    {errors.initialQuantity && (
                      <p className="text-red-500 text-xs mt-1">{errors.initialQuantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Order Size Increment
                      <span className="ml-1 text-xs text-gray-500">(Per level)</span>
                    </label>
                    <input
                      type="number"
                      value={config.baseIncrement}
                      onChange={(e) => handleInputChange('baseIncrement', e.target.value)}
                      className={cn(
                        "input",
                        errors.baseIncrement && "border-red-500"
                      )}
                      step="0.01"
                    />
                    {errors.baseIncrement && (
                      <p className="text-red-500 text-xs mt-1">{errors.baseIncrement}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Grid Spacing
                      <span className="ml-1 text-xs text-gray-500">(Price difference)</span>
                    </label>
                    <input
                      type="number"
                      value={config.initialSpread}
                      onChange={(e) => handleInputChange('initialSpread', e.target.value)}
                      className={cn(
                        "input",
                        errors.initialSpread && "border-red-500"
                      )}
                      step="1"
                    />
                    {errors.initialSpread && (
                      <p className="text-red-500 text-xs mt-1">{errors.initialSpread}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Max Position Size
                      <span className="ml-1 text-xs text-gray-500">(Total exposure)</span>
                    </label>
                    <input
                      type="number"
                      value={config.maxPosition}
                      onChange={(e) => handleInputChange('maxPosition', e.target.value)}
                      className={cn(
                        "input",
                        errors.maxPosition && "border-red-500"
                      )}
                      step="0.1"
                    />
                    {errors.maxPosition && (
                      <p className="text-red-500 text-xs mt-1">{errors.maxPosition}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="glass rounded-xl p-5">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4 text-orange-500" />
                    Advanced Settings
                  </h3>
                  <ChevronDown className={cn(
                    "h-5 w-5 transition-transform",
                    showAdvanced && "rotate-180"
                  )} />
                </button>
                
                {showAdvanced && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Increment Step
                        </label>
                        <input
                          type="number"
                          value={config.incrementStep}
                          onChange={(e) => handleInputChange('incrementStep', e.target.value)}
                          className="input"
                          step="0.001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Spread Increment
                        </label>
                        <input
                          type="number"
                          value={config.spreadIncrement}
                          onChange={(e) => handleInputChange('spreadIncrement', e.target.value)}
                          className="input"
                          step="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Closing Spread
                        </label>
                        <input
                          type="number"
                          value={config.closingSpread}
                          onChange={(e) => handleInputChange('closingSpread', e.target.value)}
                          className={cn(
                            "input",
                            errors.closingSpread && "border-red-500"
                          )}
                          step="1"
                        />
                        {errors.closingSpread && (
                          <p className="text-red-500 text-xs mt-1">{errors.closingSpread}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Max Grid Levels
                        </label>
                        <input
                          type="number"
                          value={config.maxGridLevel || 10}
                          onChange={(e) => handleInputChange('maxGridLevel', e.target.value)}
                          className="input"
                          step="1"
                        />
                      </div>
                    </div>

                    {/* Risk Management */}
                    <div className="pt-4 border-t border-gray-800">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        Risk Management
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Stop Loss (%)
                          </label>
                          <input
                            type="number"
                            value={(config.stopLoss || 0) * 100}
                            onChange={(e) => handleInputChange('stopLoss', (parseFloat(e.target.value) / 100).toString())}
                            className="input"
                            step="0.1"
                            placeholder="5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Take Profit (%)
                          </label>
                          <input
                            type="number"
                            value={(config.takeProfit || 0) * 100}
                            onChange={(e) => handleInputChange('takeProfit', (parseFloat(e.target.value) / 100).toString())}
                            className="input"
                            step="0.1"
                            placeholder="10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium mb-1">Grid Trading Strategy</p>
                  <p className="text-xs text-gray-400">
                    The bot will place buy orders below the current price and sell orders above it. 
                    As the market moves, it captures profits from price fluctuations within your defined range.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="btn-secondary px-6"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={startBotMutation.isPending}
                className="btn-primary px-6"
              >
                <Save className="h-4 w-4" />
                {startBotMutation.isPending ? 'Starting...' : 'Start Bot'}
              </button>
            </div>

            {/* Error Message */}
            {startBotMutation.isError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-500 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {(startBotMutation.error as Error)?.message || 'Failed to start bot'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Failed to load configuration</p>
          </div>
        )}
      </div>
    </div>
  )
} 