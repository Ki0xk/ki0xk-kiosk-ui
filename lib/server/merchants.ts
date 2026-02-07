import { getServerConfig } from './config'

export interface Merchant {
  id: string
  name: string
  walletAddress: string
  preferredChain: string
}

const MERCHANT_DEFS = [
  { id: 'beers', name: 'Beers', envAddress: 'MERCHANT_BEERS_ADDRESS', envChain: 'MERCHANT_BEERS_CHAIN' },
  { id: 'food', name: 'Food', envAddress: 'MERCHANT_FOOD_ADDRESS', envChain: 'MERCHANT_FOOD_CHAIN' },
  { id: 'merch', name: 'Merch', envAddress: 'MERCHANT_MERCH_ADDRESS', envChain: 'MERCHANT_MERCH_CHAIN' },
] as const

export function getMerchants(): Merchant[] {
  const config = getServerConfig()
  const merchants: Merchant[] = []

  for (const def of MERCHANT_DEFS) {
    const address = (config as any)[def.envAddress]
    if (!address) continue
    const chain = (config as any)[def.envChain] || 'base_sepolia'
    merchants.push({
      id: def.id,
      name: def.name,
      walletAddress: address,
      preferredChain: chain,
    })
  }

  return merchants
}

export function getMerchantById(id: string): Merchant | undefined {
  return getMerchants().find((m) => m.id === id)
}
