'use client'

import { Activity, Bot, LineChart } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KumaBot v2</h1>
              <p className="text-sm text-gray-400">Grid Trading Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-400">System Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-400">Live Trading</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 