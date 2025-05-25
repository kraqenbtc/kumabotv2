'use client'

import { Bot, Activity } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold">Kumbo</h1>
              <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">Grid Trading System</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 animate-pulse" />
            <span className="text-xs sm:text-sm text-gray-400">System Active</span>
          </div>
        </div>
      </div>
    </header>
  )
} 