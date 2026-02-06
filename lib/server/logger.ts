type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getLogLevel(): number {
  const raw = (process.env.LOG_LEVEL || 'info') as LogLevel
  return levels[raw] ?? levels.info
}

function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value
}

function formatMessage(level: LogLevel, message: string, data?: object): string {
  const timestamp = new Date().toISOString()
  const dataStr = data ? ` ${JSON.stringify(data, bigIntReplacer)}` : ''
  return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${dataStr}`
}

export const logger = {
  debug(message: string, data?: object) {
    if (levels.debug >= getLogLevel()) {
      console.log(formatMessage('debug', message, data))
    }
  },
  info(message: string, data?: object) {
    if (levels.info >= getLogLevel()) {
      console.log(formatMessage('info', message, data))
    }
  },
  warn(message: string, data?: object) {
    if (levels.warn >= getLogLevel()) {
      console.warn(formatMessage('warn', message, data))
    }
  },
  error(message: string, data?: object) {
    if (levels.error >= getLogLevel()) {
      console.error(formatMessage('error', message, data))
    }
  },
}
