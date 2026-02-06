'use client'

import { useEffect, useState } from 'react'
import { getModeFeatures } from '@/lib/mode'

interface SerialStatus {
  connected: boolean
  loading: boolean
}

export function useSerialStatus(pollIntervalMs = 10000): SerialStatus {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const features = getModeFeatures()

  useEffect(() => {
    if (!features.serialEnabled) {
      setLoading(false)
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        if (!cancelled) {
          setConnected(data.serial?.connected ?? false)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setConnected(false)
          setLoading(false)
        }
      }
    }

    poll()
    const interval = setInterval(poll, pollIntervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [features.serialEnabled, pollIntervalMs])

  return { connected, loading }
}
