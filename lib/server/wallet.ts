import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
  type Chain,
  formatEther,
  formatUnits,
  erc20Abi,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { getServerConfig } from './config'
import { logger } from './logger'

let _publicClient: PublicClient | null = null
let _walletClient: WalletClient | null = null
let _kioskAddress: string | null = null

function init() {
  if (_kioskAddress) return
  const config = getServerConfig()
  const chain: Chain = {
    ...baseSepolia,
    rpcUrls: { default: { http: [config.RPC_URL] } },
  }
  const account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`)
  _kioskAddress = account.address
  _publicClient = createPublicClient({ chain, transport: http(config.RPC_URL) })
  _walletClient = createWalletClient({ account, chain, transport: http(config.RPC_URL) })
}

export function getKioskAddress(): string {
  init()
  return _kioskAddress!
}

export function getPublicClient(): PublicClient {
  init()
  return _publicClient!
}

export function getWalletClient(): WalletClient {
  init()
  return _walletClient!
}

export async function getEthBalance(): Promise<bigint> {
  const client = getPublicClient()
  return client.getBalance({ address: getKioskAddress() as `0x${string}` })
}

export async function getUsdcBalance(): Promise<bigint> {
  const config = getServerConfig()
  const client = getPublicClient()
  return client.readContract({
    address: config.USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [getKioskAddress() as `0x${string}`],
  }) as Promise<bigint>
}

export function formatUsdc(amount: bigint): string {
  return formatUnits(amount, 6)
}

export async function getWalletInfo(): Promise<{
  address: string
  ethBalance: string
  usdcBalance: string
  chainId: number
}> {
  const config = getServerConfig()
  const [ethBal, usdcBal] = await Promise.all([getEthBalance(), getUsdcBalance()])
  return {
    address: getKioskAddress(),
    ethBalance: formatEther(ethBal),
    usdcBalance: formatUsdc(usdcBal),
    chainId: config.CHAIN_ID,
  }
}
