import { logger } from '@/utils/logger'

describe('Logger', () => {
  const originalConsole = { ...console }
  const mockConsole = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  let envSpy: jest.SpyInstance

  beforeAll(() => {
    // Mock console methods
    Object.assign(console, mockConsole)

    // Mock NODE_ENV
    envSpy = jest.spyOn(process, 'env', 'get')
  })

  afterAll(() => {
    // Restore original console methods
    Object.assign(console, originalConsole)

    // Restore NODE_ENV spy
    envSpy.mockRestore()
  })

  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks()
  })

  it('logs debug messages in development', () => {
    envSpy.mockReturnValue('development')
    logger.debug('Test debug message')
    expect(mockConsole.log).toHaveBeenCalled()
  })

  it('does not log debug messages in production', () => {
    envSpy.mockReturnValue('production')
    logger.debug('Test debug message')
    expect(mockConsole.log).not.toHaveBeenCalled()
  })

  it('logs info messages', () => {
    logger.info('Test info message')
    expect(mockConsole.info).toHaveBeenCalled()
  })

  it('logs warning messages', () => {
    logger.warn('Test warning message')
    expect(mockConsole.warn).toHaveBeenCalled()
  })

  it('logs error messages', () => {
    const error = new Error('Test error')
    logger.error('Test error message', error)
    expect(mockConsole.error).toHaveBeenCalled()
  })

  it('includes data in log messages', () => {
    const testData = { key: 'value' }
    logger.info('Test message with data', testData)
    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify(testData, null, 2))
    )
  })

  it('formats API errors correctly', () => {
    const error = new Error('API Error')
    const data = { requestBody: { test: true } }
    logger.apiError('/api/test', error, data)
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('API Error at /api/test')
    )
  })

  it('formats component errors correctly', () => {
    const error = new Error('Component Error')
    const props = { id: '123' }
    logger.componentError('TestComponent', error, props)
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in component TestComponent')
    )
  })
})
