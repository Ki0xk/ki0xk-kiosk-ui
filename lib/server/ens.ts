import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import { logger } from './logger'

let _mainnetClient: ReturnType<typeof createPublicClient> | null = null

function getMainnetClient() {
  if (!_mainnetClient) {
    _mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http('https://eth.drpc.org'),
    })
  }
  return _mainnetClient
}

/**
 * Resolve an ENS name to a hex address, or return the input if it's already a hex address.
 */
export async function resolveAddress(input: string): Promise<string> {
  // Already a hex address
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
    return input
  }

  // ENS name (ends with .eth)
  if (input.endsWith('.eth')) {
    logger.info('Resolving ENS name...', { name: input })
    try {
      const client = getMainnetClient()
      const address = await client.getEnsAddress({
        name: normalize(input),
      })
      if (!address) {
        throw new Error(`ENS name "${input}" did not resolve to an address`)
      }
      logger.info('ENS resolved', { name: input, address })
      return address
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to resolve ENS "${input}": ${msg}`)
    }
  }

  // Unknown format — return as-is (Bridge Kit may handle it)
  return input
}
