type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: unknown
  error?: Error
}

class Logger {
  private static instance: Logger
  private isDevelopment = process.env.NODE_ENV === 'development'

  private constructor() {
    // Private constructor to enforce singleton
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, data, error } = entry
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`

    if (data) {
      logMessage += `\nData: ${JSON.stringify(data, null, 2)}`
    }

    if (error) {
      logMessage += `\nError: ${error.message}`
      if (error.stack && this.isDevelopment) {
        logMessage += `\nStack: ${error.stack}`
      }
    }

    return logMessage
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    }
  }

  private log(entry: LogEntry): void {
    const formattedLog = this.formatLogEntry(entry)

    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedLog)
        }
        break
      case 'info':
        console.info(formattedLog)
        break
      case 'warn':
        console.warn(formattedLog)
        break
      case 'error':
        console.error(formattedLog)
        // In production, we could send this to an error tracking service
        if (!this.isDevelopment) {
          // TODO: Send to error tracking service (e.g., Sentry)
        }
        break
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(this.createLogEntry('debug', message, data))
  }

  info(message: string, data?: unknown): void {
    this.log(this.createLogEntry('info', message, data))
  }

  warn(message: string, data?: unknown, error?: Error): void {
    this.log(this.createLogEntry('warn', message, data, error))
  }

  error(message: string, error?: Error, data?: unknown): void {
    this.log(this.createLogEntry('error', message, data, error))
  }

  // Special method for API errors
  apiError(endpoint: string, error: Error, data?: Record<string, unknown>): void {
    this.error(`API Error at ${endpoint}`, error, {
      endpoint,
      ...(data || {}),
    })
  }

  // Special method for component errors
  componentError(componentName: string, error: Error, props?: Record<string, unknown>): void {
    this.error(`Error in component ${componentName}`, error, {
      component: componentName,
      ...(props || {}),
    })
  }
}

export const logger = Logger.getInstance()
