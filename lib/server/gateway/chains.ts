import { isMainnet } from '../../network'

export interface GatewayChainInfo {
  name: string
  domainId: number
  chainId: number
  usdcAddress: string
  explorerUrl: string
  rpcUrl: string
}

// ============================================================================
// Testnet gateway chains
// ============================================================================
const TESTNET_GATEWAY_CHAINS: Record<string, GatewayChainInfo> = {
  arc: {
    name: 'Arc Testnet',
    domainId: 26,
    chainId: 5042002,
    usdcAddress: '0x3600000000000000000000000000000000000000',
    explorerUrl: 'https://testnet.arcscan.app',
    rpcUrl: 'https://rpc.testnet.arc.network',
  },
  base_sepolia: {
    name: 'Base Sepolia',
    domainId: 6,
    chainId: 84532,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorerUrl: 'https://sepolia.basescan.org',
    rpcUrl: 'https://sepolia.base.org',
  },
  ethereum_sepolia: {
    name: 'Ethereum Sepolia',
    domainId: 0,
    chainId: 11155111,
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.sepolia.org',
  },
  avalanche_fuji: {
    name: 'Avalanche Fuji',
    domainId: 1,
    chainId: 43113,
    usdcAddress: '0x5425890298aed601595a70ab815c96711a31bc65',
    explorerUrl: 'https://testnet.snowtrace.io',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  },
  sonic_testnet: {
    name: 'Sonic Testnet',
    domainId: 13,
    chainId: 64165,
    usdcAddress: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    explorerUrl: 'https://testnet.sonicscan.org',
    rpcUrl: 'https://rpc.testnet.soniclabs.com',
  },
  sei_atlantic: {
    name: 'Sei Atlantic',
    domainId: 16,
    chainId: 1328,
    usdcAddress: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    explorerUrl: 'https://seistream.app',
    rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
  },
  hyperevm_testnet: {
    name: 'HyperEVM Testnet',
    domainId: 19,
    chainId: 998,
    usdcAddress: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    explorerUrl: 'https://testnet.purrsec.com',
    rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
  },
}

// ============================================================================
// Mainnet gateway chains
// CCTP domain IDs are protocol-level and shared between testnet/mainnet.
// ============================================================================
const MAINNET_GATEWAY_CHAINS: Record<string, GatewayChainInfo> = {
  base: {
    name: 'Base',
    domainId: 6,
    chainId: 8453,
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
  },
  ethereum: {
    name: 'Ethereum',
    domainId: 0,
    chainId: 1,
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://eth.drpc.org',
  },
  arbitrum: {
    name: 'Arbitrum',
    domainId: 3,
    chainId: 42161,
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  polygon: {
    name: 'Polygon',
    domainId: 7,
    chainId: 137,
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com',
  },
  optimism: {
    name: 'Optimism',
    domainId: 2,
    chainId: 10,
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    explorerUrl: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://mainnet.optimism.io',
  },
  avalanche: {
    name: 'Avalanche',
    domainId: 1,
    chainId: 43114,
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    explorerUrl: 'https://snowtrace.io',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  },
  sonic: {
    name: 'Sonic',
    domainId: 13,
    chainId: 146,
    usdcAddress: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    explorerUrl: 'https://sonicscan.org',
    rpcUrl: 'https://rpc.soniclabs.com',
  },
}

export const GATEWAY_CHAINS: Record<string, GatewayChainInfo> = isMainnet()
  ? MAINNET_GATEWAY_CHAINS
  : TESTNET_GATEWAY_CHAINS

// Gateway contract addresses — same on all chains (testnet and mainnet)
export const GATEWAY_WALLET_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const
export const GATEWAY_MINTER_ADDRESS = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const

/**
 * Source chain key for Gateway operations.
 * Testnet: 'arc' — Mainnet: 'base'
 */
export const GATEWAY_SOURCE_KEY = isMainnet() ? 'base' : 'arc'
