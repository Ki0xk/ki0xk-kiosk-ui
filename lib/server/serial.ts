import { logger } from './logger'
import { getServerConfig } from './config'

export interface CoinEvent {
  id: string
  type: 'coin'
  pulses: number
  value: number
  ok: boolean
  timestamp: number
}

type CoinListener = (event: CoinEvent) => void

// Use globalThis to survive Next.js hot-reload (module re-evaluation resets let vars)
const globalForSerial = globalThis as unknown as { __serialManager?: SerialManager }

export class SerialManager {
  private port: any = null
  private parser: any = null
  private listeners: Set<CoinListener> = new Set()
  private eventBuffer: CoinEvent[] = []
  private eventCounter = 0
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  async connect(): Promise<void> {
    const config = getServerConfig()

    let SerialPort: any
    let ReadlineParser: any
    try {
      const sp = await import('serialport')
      SerialPort = sp.SerialPort
      const rl = await import('@serialport/parser-readline')
      ReadlineParser = rl.ReadlineParser
    } catch {
      throw new Error('serialport not available — install with: pnpm add serialport @serialport/parser-readline')
    }

    logger.info('Opening serial port...', { port: config.SERIAL_PORT, baud: config.SERIAL_BAUD })

    this.port = new SerialPort({
      path: config.SERIAL_PORT,
      baudRate: config.SERIAL_BAUD,
    })

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }))

    this.parser.on('data', (line: string) => {
      this.handleLine(line.trim())
    })

    this.port.on('open', () => {
      this._connected = true
      logger.info('Serial port opened')
    })

    this.port.on('error', (err: Error) => {
      logger.error('Serial port error', { error: err.message })
      this._connected = false
    })

    this.port.on('close', () => {
      this._connected = false
      logger.info('Serial port closed')
    })
  }

  private handleLine(line: string): void {
    try {
      const data = JSON.parse(line)
      if (data.type === 'coin') {
        const event: CoinEvent = {
          id: `coin_${++this.eventCounter}_${Date.now()}`,
          type: 'coin',
          pulses: data.pulses,
          value: data.value,
          ok: data.ok ?? true,
          timestamp: Date.now(),
        }

        this.eventBuffer.push(event)
        if (this.eventBuffer.length > 100) {
          this.eventBuffer.shift()
        }

        logger.debug('Coin event', { event })
        for (const listener of this.listeners) {
          try {
            listener(event)
          } catch {}
        }
      }
    } catch {
      // Non-JSON line from Arduino, ignore
    }
  }

  subscribe(callback: CoinListener): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  getRecentEvents(since?: number): CoinEvent[] {
    if (!since) return [...this.eventBuffer]
    return this.eventBuffer.filter((e) => e.timestamp > since)
  }

  async disconnect(): Promise<void> {
    if (this.port && this.port.isOpen) {
      this.port.close()
    }
    this._connected = false
  }
}

export function getSerialManager(): SerialManager {
  if (!globalForSerial.__serialManager) {
    globalForSerial.__serialManager = new SerialManager()
  }
  return globalForSerial.__serialManager
}
