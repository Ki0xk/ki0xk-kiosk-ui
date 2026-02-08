export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createPublicClient, http, formatEther } from 'viem'
import { SUPPORTED_CHAINS } from '@/lib/server/arc/chains'
import { GATEWAY_CHAINS } from '@/lib/server/gateway/chains'
import { getKioskAddress } from '@/lib/server/wallet'

const MIN_GAS_THRESHOLD = 0.0001

interface GasInfo {
  name: string
  balance: string
  hasGas: boolean
}

export async function GET() {
  try {
    const address = getKioskAddress() as `0x${string}`
    const result: Record<string, GasInfo> = {}

    // Check Bridge Kit destination chains (skip "arc" — that's the source chain)
    const bridgeChecks = Object.entries(SUPPORTED_CHAINS)
      .filter(([key]) => key !== 'arc')
      .map(async ([key, chain]) => {
        try {
          const client = createPublicClient({
            transport: http(chain.rpcUrl),
          })
          const balance = await client.getBalance({ address })
          const formatted = formatEther(balance)
          result[key] = {
            name: chain.name,
            balance: formatted,
            hasGas: parseFloat(formatted) >= MIN_GAS_THRESHOLD,
          }
        } catch {
          result[key] = { name: chain.name, balance: '0', hasGas: false }
        }
      })

    // Check Gateway destination chains (skip "arc")
    const gatewayChecks = Object.entries(GATEWAY_CHAINS)
      .filter(([key]) => key !== 'arc')
      .map(async ([key, chain]) => {
        // Skip if already checked via Bridge Kit (same chain, different key format)
        if (result[key]) return
        try {
          const client = createPublicClient({
            transport: http(chain.rpcUrl),
          })
          const balance = await client.getBalance({ address })
          // Most chains use 18 decimals; formatEther works for ETH/AVAX/S/SEI/HYPE
          const formatted = formatEther(balance)
          result[`gw_${key}`] = {
            name: chain.name,
            balance: formatted,
            hasGas: parseFloat(formatted) >= MIN_GAS_THRESHOLD,
          }
        } catch {
          result[`gw_${key}`] = { name: chain.name, balance: '0', hasGas: false }
        }
      })

    await Promise.all([...bridgeChecks, ...gatewayChecks])

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to check gas' },
      { status: 500 }
    )
  }
}
