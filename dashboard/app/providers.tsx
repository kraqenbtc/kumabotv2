'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { UserProvider } from '@/contexts/UserContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchInterval: 10 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
      {children}
      </UserProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
} 