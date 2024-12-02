import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { type AppRouter } from '@/server/api/root'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

// Create a test tRPC client
export const trpc = createTRPCReact<AppRouter>()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
  },
})

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
})

export function renderWithProviders(ui: ReactElement) {
  const user = userEvent.setup()

  const utils = render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </trpc.Provider>
  )

  return {
    ...utils,
    user,
    trpcClient,
    findByTextWithWait: async (text: string) => {
      return await screen.findByText(text)
    },
    expectToBeInDocument: async (text: string) => {
      await waitFor(() => {
        expect(screen.getByText(text)).toBeInTheDocument()
      })
    },
    expectNotToBeInDocument: async (text: string) => {
      await waitFor(() => {
        expect(screen.queryByText(text)).not.toBeInTheDocument()
      })
    },
  }
}
