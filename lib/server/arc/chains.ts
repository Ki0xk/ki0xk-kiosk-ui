import { isMainnet } from '../../network'

export interface ChainInfo {
  name: string
  bridgeKitName: string
  chainId: number
  isTestnet: boolean
  explorerUrl: string
  rpcUrl: string
}

// ============================================================================
// Testnet chains (Arc Testnet as source)
// ============================================================================
const TESTNET_CHAINS: Record<string, ChainInfo> = {
  arc: {
    name: 'Arc Testnet',
    bridgeKitName: 'Arc_Testnet',
    chainId: 5042002,
    isTestnet: true,
    explorerUrl: 'https://testnet.arcscan.app',
    rpcUrl: 'https://rpc.testnet.arc.network',
  },
  base: {
    name: 'Base Sepolia',
    bridgeKitName: 'Base_Sepolia',
    chainId: 84532,
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
  },
  ethereum: {
    name: 'Ethereum Sepolia',
    bridgeKitName: 'Ethereum_Sepolia',
    chainId: 11155111,
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.sepolia.org',
  },
  arbitrum: {
    name: 'Arbitrum Sepolia',
    bridgeKitName: 'Arbitrum_Sepolia',
    chainId: 421614,
    isTestnet: true,
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  },
  polygon: {
    name: 'Polygon Amoy',
    bridgeKitName: 'Polygon_Amoy_Testnet',
    chainId: 80002,
    isTestnet: true,
    explorerUrl: 'https://amoy.polygonscan.com',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
  },
  optimism: {
    name: 'Optimism Sepolia',
    bridgeKitName: 'OP_Sepolia',
    chainId: 11155420,
    isTestnet: true,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: 'https://sepolia.optimism.io',
  },
  avalanche: {
    name: 'Avalanche Fuji',
    bridgeKitName: 'Avalanche_Fuji',
    chainId: 43113,
    isTestnet: true,
    explorerUrl: 'https://testnet.snowtrace.io',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  },
  linea: {
    name: 'Linea Sepolia',
    bridgeKitName: 'Linea_Sepolia',
    chainId: 59141,
    isTestnet: true,
    explorerUrl: 'https://sepolia.lineascan.build',
    rpcUrl: 'https://rpc.sepolia.linea.build',
  },
}

// ============================================================================
// Mainnet chains (Base as source — cheapest L2, no Arc mainnet exists)
// ============================================================================
const MAINNET_CHAINS: Record<string, ChainInfo> = {
  base: {
    name: 'Base',
    bridgeKitName: 'Base',
    chainId: 8453,
    isTestnet: false,
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
  },
  ethereum: {
    name: 'Ethereum',
    bridgeKitName: 'Ethereum',
    chainId: 1,
    isTestnet: false,
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://eth.drpc.org',
  },
  arbitrum: {
    name: 'Arbitrum',
    bridgeKitName: 'Arbitrum',
    chainId: 42161,
    isTestnet: false,
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  polygon: {
    name: 'Polygon',
    bridgeKitName: 'Polygon',
    chainId: 137,
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com',
  },
  optimism: {
    name: 'Optimism',
    bridgeKitName: 'Optimism',
    chainId: 10,
    isTestnet: false,
    explorerUrl: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://mainnet.optimism.io',
  },
  avalanche: {
    name: 'Avalanche',
    bridgeKitName: 'Avalanche',
    chainId: 43114,
    isTestnet: false,
    explorerUrl: 'https://snowtrace.io',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  },
  linea: {
    name: 'Linea',
    bridgeKitName: 'Linea',
    chainId: 59144,
    isTestnet: false,
    explorerUrl: 'https://lineascan.build',
    rpcUrl: 'https://rpc.linea.build',
  },
}

export const SUPPORTED_CHAINS: Record<string, ChainInfo> = isMainnet() ? MAINNET_CHAINS : TESTNET_CHAINS

/**
 * Source chain key for bridge operations.
 * Testnet: 'arc' (Arc Testnet) — Mainnet: 'base' (Base, cheapest L2)
 */
export const SOURCE_CHAIN_KEY = isMainnet() ? 'base' : 'arc'

/**
 * User-selectable destination chains (excludes the source chain).
 */
export const CHAIN_OPTIONS = Object.keys(SUPPORTED_CHAINS).filter((k) => k !== SOURCE_CHAIN_KEY)

export function getChainByKey(key: string): ChainInfo | undefined {
  return SUPPORTED_CHAINS[key.toLowerCase()]
}
