// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock next/router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: props => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />
  },
}))

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {}
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-uuid'
}

// Mock superjson
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    parse: jest.fn(str => JSON.parse(str)),
    stringify: jest.fn(obj => JSON.stringify(obj)),
    serialize: jest.fn(obj => ({ json: obj })),
    deserialize: jest.fn(obj => obj.json),
  },
}))

// Mock tRPC
jest.mock('@trpc/client', () => ({
  createTRPCNext: jest.fn(() => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
  })),
  httpBatchLink: jest.fn(),
}))

jest.mock('@trpc/react-query', () => ({
  createTRPCReact: jest.fn(() => ({
    createClient: jest.fn(() => ({
      query: jest.fn(),
      mutation: jest.fn(),
    })),
    useQuery: jest.fn(),
    useMutation: jest.fn(),
  })),
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '5 minutes ago'),
  format: jest.fn(() => '2021-01-01'),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Suppress console.error and console.warn in tests
global.console.error = jest.fn()
global.console.warn = jest.fn()
