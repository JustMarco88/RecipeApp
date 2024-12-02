import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { type AppRouter } from '@/server/api/root'
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

// Create a test QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

// Create a test tRPC client
export const trpc = createTRPCReact<AppRouter>()

// Create a test tRPC client
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
  transformer: superjson,
})

// Mock tRPC hooks
const mockTrpcHooks = {
  recipe: {
    getAll: {
      useQuery: jest.fn(() => ({
        data: [],
        isLoading: false,
        error: null,
      })),
    },
    getById: {
      useQuery: jest.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
      })),
    },
    create: {
      useMutation: jest.fn(() => ({
        mutate: jest.fn(),
        isLoading: false,
      })),
    },
    update: {
      useMutation: jest.fn(() => ({
        mutate: jest.fn(),
        isLoading: false,
      })),
    },
    delete: {
      useMutation: jest.fn(() => ({
        mutate: jest.fn(),
        isLoading: false,
      })),
    },
    updateStep: {
      useMutation: jest.fn(() => ({
        mutate: jest.fn(),
        isLoading: false,
      })),
    },
    recordCooking: {
      useMutation: jest.fn(() => ({
        mutate: jest.fn(),
        isLoading: false,
      })),
    },
    getCookingHistory: {
      useQuery: jest.fn(() => ({
        data: [],
        isLoading: false,
        error: null,
      })),
    },
  },
}

// Create a wrapper component that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}

// Custom render function that includes providers
const renderWithProviders = (ui: React.ReactElement) => {
  const user = userEvent.setup()

  return {
    user,
    ...render(ui, { wrapper: AllTheProviders }),
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

// Mock tRPC hooks
jest.mock('@/utils/api', () => ({
  api: {
    ...mockTrpcHooks,
    useContext: () => ({
      client: trpcClient,
      invalidate: jest.fn(),
      refetch: jest.fn(),
    }),
  },
}))

export * from '@testing-library/react'
export { renderWithProviders }
export type { RenderResult } from '@testing-library/react'
