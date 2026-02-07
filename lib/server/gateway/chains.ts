export interface GatewayChainInfo {
  name: string
  domainId: number
  chainId: number
  usdcAddress: string
  explorerUrl: string
  rpcUrl: string
}

export const GATEWAY_CHAINS: Record<string, GatewayChainInfo> = {
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

export const GATEWAY_WALLET_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const
export const GATEWAY_MINTER_ADDRESS = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const
