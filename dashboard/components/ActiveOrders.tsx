'use client'

import { ArrowDown, ArrowUp, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderInfo {
  side: 'buy' | 'sell'
  quantity: number
  price: number
  type: 'initial' | 'grid' | 'closing'
  time: number
}

interface BotState {
  activeOrders?: Map<string, OrderInfo>
  [key: string]: unknown  // Allow other properties
}

interface ActiveOrdersProps {
  botState: BotState
}

export function ActiveOrders({ botState }: ActiveOrdersProps) {
  const activeOrdersList = botState.activeOrders 
    ? Array.from(botState.activeOrders.entries()).map(([id, order]) => ({
        id,
        ...order
      }))
    : []

  if (activeOrdersList.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-400">
        <p className="text-sm">No active orders</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-yellow-500" />
        Active Orders ({activeOrdersList.length})
      </h3>
      <div className="space-y-2">
        {activeOrdersList.map((order) => (
          <div
            key={order.id}
            className={cn(
              "flex items-center justify-between p-2 rounded border",
              order.side === 'buy' 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-red-500/10 border-red-500/30"
            )}
          >
            <div className="flex items-center gap-2">
              {order.side === 'buy' ? (
                <ArrowUp className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500" />
              )}
              <div>
                <span className={cn(
                  "font-medium text-sm",
                  order.side === 'buy' ? "text-green-500" : "text-red-500"
                )}>
                  {order.side.toUpperCase()}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  {order.type.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                ${Number(order.price).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                Qty: {order.quantity.toFixed(6)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 