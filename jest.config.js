const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.spec.[jt]s?(x)',
    '**/__tests__/**/*.perf.[jt]s?(x)',
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!superjson|@anthropic-ai|@dnd-kit|@radix-ui|class-variance-authority|clsx|tailwind-merge|date-fns)/',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': [
      'babel-jest',
      {
        presets: [
          'next/babel',
          '@babel/preset-typescript',
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
        plugins: ['@babel/plugin-syntax-jsx', '@babel/plugin-syntax-typescript'],
      },
    ],
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/types/**/*',
    '!src/pages/**/*',
    '!src/server/**/*',
    '!src/utils/api.ts',
    '!src/utils/trpc.ts',
    '!src/utils/ai.ts',
    '!src/utils/claude.ts',
    '!src/utils/openai.ts',
    '!src/utils/prompts.ts',
    '!src/utils/stability.ts',
    '!src/utils/xai.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  testTimeout: 30000,
  maxWorkers: 4,
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
      testPathIgnorePatterns: ['/node_modules/', '/__tests__/api/', '/__tests__/performance/'],
    },
    {
      displayName: 'API Tests',
      testMatch: ['**/__tests__/api/**/*.test.[jt]s?(x)'],
      testEnvironment: 'node',
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['**/__tests__/performance/**/*.test.[jt]s?(x)'],
      testEnvironment: 'node',
      maxWorkers: 1,
    },
  ],
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
}

module.exports = createJestConfig(customJestConfig)
