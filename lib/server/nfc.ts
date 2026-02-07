import { logger } from './logger'

export interface NfcTapEvent {
  id: string
  type: 'nfc_tap'
  uid: string
  data?: { walletId: string }
  timestamp: number
}

type NfcListener = (event: NfcTapEvent) => void

// Use globalThis to survive Next.js hot-reload (module re-evaluation resets let vars)
const globalForNfc = globalThis as unknown as { __nfcManager?: NfcManager }

export class NfcManager {
  private nfc: any = null
  private reader: any = null
  private listeners: Set<NfcListener> = new Set()
  private eventBuffer: NfcTapEvent[] = []
  private eventCounter = 0
  private _connected = false
  private _readerName = ''
  private currentCard: any = null

  get connected(): boolean {
    return this._connected
  }

  get readerName(): string {
    return this._readerName
  }

  async connect(): Promise<void> {
    let NFC: any
    try {
      // nfc-pcsc is CJS: { NFC, Reader, ... }
      // Dynamic import wraps it as { default: { NFC, ... } }
      const mod = await import('nfc-pcsc')
      const pkg = mod.default || mod
      NFC = pkg.NFC || pkg
      if (typeof NFC !== 'function') {
        throw new Error('Could not resolve NFC constructor from nfc-pcsc')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`nfc-pcsc not available: ${msg}`)
    }

    logger.info('Initializing NFC PC/SC...')

    this.nfc = new NFC()

    this.nfc.on('reader', (reader: any) => {
      this._readerName = reader.name
      this._connected = true
      logger.info('NFC reader attached', { name: reader.name })

      reader.on('card', async (card: any) => {
        this.currentCard = card
        const uid = card.uid || ''
        logger.debug('NFC card detected', { uid })

        // Try to read NDEF data (works on NTAG/Ultralight, fails on MIFARE Classic)
        let data: { walletId: string } | undefined
        try {
          data = await this.readNdefFromCard(reader)
        } catch {
          // No NDEF or read error — use UID as walletId fallback
        }

        // If no NDEF data, use UID directly as the walletId
        // This makes any NFC card/tag work (MIFARE Classic, NTAG, DESFire, etc.)
        if (!data && uid) {
          data = { walletId: uid }
        }

        const event: NfcTapEvent = {
          id: `nfc_${++this.eventCounter}_${Date.now()}`,
          type: 'nfc_tap',
          uid,
          data,
          timestamp: Date.now(),
        }

        this.eventBuffer.push(event)
        if (this.eventBuffer.length > 100) {
          this.eventBuffer.shift()
        }

        logger.debug('NFC tap event', { event })
        for (const listener of this.listeners) {
          try {
            listener(event)
          } catch {}
        }
      })

      reader.on('card.off', () => {
        this.currentCard = null
        logger.debug('NFC card removed')
      })

      reader.on('error', (err: Error) => {
        logger.error('NFC reader error', { error: err.message })
      })

      reader.on('end', () => {
        this._connected = false
        this._readerName = ''
        this.reader = null
        logger.info('NFC reader detached')
      })

      this.reader = reader
    })

    this.nfc.on('error', (err: Error) => {
      logger.error('NFC error', { error: err.message })
    })
  }

  private async readNdefFromCard(reader: any): Promise<{ walletId: string } | undefined> {
    // NTAG/MIFARE Ultralight: NDEF data starts at page 4 (byte 16)
    // Read 16 bytes from block 4
    try {
      const data = await reader.read(4, 16)
      // Find NDEF text record: look for payload start
      // Simple NDEF TLV parse: 0x03 = NDEF message TLV
      const buf = Buffer.from(data)
      let offset = 0

      // Skip to NDEF message TLV
      while (offset < buf.length && buf[offset] !== 0x03) offset++
      if (offset >= buf.length) return undefined

      offset++ // skip TLV type
      const len = buf[offset]
      offset++ // skip length

      if (len === 0 || offset + len > buf.length) return undefined

      // NDEF record header
      const flags = buf[offset]
      offset++
      const typeLen = buf[offset]
      offset++
      const payloadLen = buf[offset]
      offset++

      // Skip type
      offset += typeLen

      // Text record payload: first byte is language code length
      const langLen = buf[offset] & 0x3f
      offset++
      offset += langLen // skip language code

      const text = buf.slice(offset, offset + payloadLen - 1 - langLen).toString('utf-8')

      const parsed = JSON.parse(text)
      if (parsed.w) {
        return { walletId: parsed.w }
      }
    } catch {
      // Read/parse failed
    }
    return undefined
  }

  async readNdef(): Promise<{ walletId?: string } | null> {
    if (!this.reader) return null
    try {
      const data = await this.readNdefFromCard(this.reader)
      return data || null
    } catch {
      return null
    }
  }

  async writeNdef(walletId: string): Promise<boolean> {
    if (!this.reader) {
      logger.error('No NFC reader available for write')
      return false
    }

    try {
      const text = JSON.stringify({ w: walletId })
      // Build NDEF text record
      const langCode = Buffer.from('en')
      const textBuf = Buffer.from(text)
      const payloadLen = 1 + langCode.length + textBuf.length

      // NDEF record: MB=1, ME=1, SR=1, TNF=1 (well-known), type=T
      const record = Buffer.alloc(3 + 1 + payloadLen)
      record[0] = 0xd1 // flags: MB|ME|SR|TNF=well-known
      record[1] = 0x01 // type length
      record[2] = payloadLen // payload length
      record[3] = 0x54 // type: 'T' (text)
      record[4] = langCode.length // status byte (UTF-8, lang length)
      langCode.copy(record, 5)
      textBuf.copy(record, 5 + langCode.length)

      // Wrap in NDEF TLV
      const tlv = Buffer.alloc(2 + record.length + 1)
      tlv[0] = 0x03 // NDEF message TLV
      tlv[1] = record.length
      record.copy(tlv, 2)
      tlv[2 + record.length] = 0xfe // terminator TLV

      // Write to page 4 (byte 16) on NTAG/MIFARE Ultralight
      await this.reader.write(4, tlv)
      logger.info('NDEF written to card', { walletId })
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('NDEF write failed', { error: msg })
      return false
    }
  }

  subscribe(callback: NfcListener): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  getRecentEvents(since?: number): NfcTapEvent[] {
    if (!since) return [...this.eventBuffer]
    return this.eventBuffer.filter((e) => e.timestamp > since)
  }
}

export function getNfcManager(): NfcManager {
  if (!globalForNfc.__nfcManager) {
    globalForNfc.__nfcManager = new NfcManager()
  }
  return globalForNfc.__nfcManager
}
