import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  encodeFunctionData,
  pad,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { logger } from '../logger'
import { getServerConfig } from '../config'
import { GATEWAY_CHAINS, GATEWAY_WALLET_ADDRESS, GATEWAY_MINTER_ADDRESS } from './chains'

// ABI fragments
const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const gatewayWalletAbi = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const gatewayMinterAbi = [
  {
    name: 'gatewayMint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'attestation', type: 'bytes' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

// EIP-712 types for Gateway transfer
const EIP712_DOMAIN = {
  name: 'GatewayWallet',
  version: '1',
} as const

const TRANSFER_SPEC_TYPE = {
  TransferSpec: [
    { name: 'version', type: 'uint32' },
    { name: 'sourceDomain', type: 'uint32' },
    { name: 'destinationDomain', type: 'uint32' },
    { name: 'sourceContract', type: 'bytes32' },
    { name: 'destinationContract', type: 'bytes32' },
    { name: 'sourceToken', type: 'bytes32' },
    { name: 'destinationToken', type: 'bytes32' },
    { name: 'sourceDepositor', type: 'bytes32' },
    { name: 'destinationRecipient', type: 'bytes32' },
    { name: 'sourceSigner', type: 'bytes32' },
    { name: 'destinationCaller', type: 'bytes32' },
    { name: 'value', type: 'uint256' },
    { name: 'salt', type: 'bytes32' },
    { name: 'hookData', type: 'bytes' },
  ],
  BurnIntent: [
    { name: 'maxBlockHeight', type: 'uint256' },
    { name: 'maxFee', type: 'uint256' },
    { name: 'spec', type: 'TransferSpec' },
  ],
} as const

function addressToBytes32(address: string): Hex {
  return pad(address as Address, { size: 32 })
}

function randomSalt(): Hex {
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return toHex(bytes)
}

function getArcChain() {
  const arc = GATEWAY_CHAINS.arc
  return {
    id: arc.chainId,
    name: arc.name,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [arc.rpcUrl] } },
  } as const
}

function getChainDef(key: string) {
  const info = GATEWAY_CHAINS[key]
  if (!info) throw new Error(`Unknown gateway chain: ${key}`)
  return {
    id: info.chainId,
    name: info.name,
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [info.rpcUrl] } },
  } as const
}

export async function depositToGateway(amountUsdc: string): Promise<{
  success: boolean
  approveTxHash?: string
  depositTxHash?: string
  error?: string
}> {
  try {
    const config = getServerConfig()
    const account = privateKeyToAccount(config.PRIVATE_KEY as Hex)
    const arcChain = getArcChain()
    const arcUsdc = GATEWAY_CHAINS.arc.usdcAddress as Address
    const amount = parseUnits(amountUsdc, 6)

    const walletClient = createWalletClient({
      account,
      chain: arcChain,
      transport: http(GATEWAY_CHAINS.arc.rpcUrl),
    })

    const publicClient = createPublicClient({
      chain: arcChain,
      transport: http(GATEWAY_CHAINS.arc.rpcUrl),
    })

    logger.info('Gateway deposit: approving...', { amount: amountUsdc })

    // 1. Approve
    const approveHash = await walletClient.writeContract({
      address: arcUsdc,
      abi: erc20Abi,
      functionName: 'approve',
      args: [GATEWAY_WALLET_ADDRESS, amount],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })

    logger.info('Gateway deposit: depositing...', { approveHash })

    // 2. Deposit
    const depositHash = await walletClient.writeContract({
      address: GATEWAY_WALLET_ADDRESS,
      abi: gatewayWalletAbi,
      functionName: 'deposit',
      args: [arcUsdc, amount],
    })
    await publicClient.waitForTransactionReceipt({ hash: depositHash })

    logger.info('Gateway deposit complete', { depositHash })

    return { success: true, approveTxHash: approveHash, depositTxHash: depositHash }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('Gateway deposit failed', { error: msg })
    return { success: false, error: msg }
  }
}

export async function gatewayTransfer(
  recipientAddress: string,
  amountUsdc: string,
  destChainKey: string
): Promise<{
  success: boolean
  attestation?: string
  signature?: string
  error?: string
}> {
  try {
    const config = getServerConfig()
    const account = privateKeyToAccount(config.PRIVATE_KEY as Hex)
    const destChain = GATEWAY_CHAINS[destChainKey]
    if (!destChain) throw new Error(`Unknown destination chain: ${destChainKey}`)

    const amount = parseUnits(amountUsdc, 6)
    const arcInfo = GATEWAY_CHAINS.arc

    // Calculate fee: 0.005% + gas estimate (~0.01 USDC on L2)
    const feePercent = (Number(amount) * 0.00005)
    const maxFee = parseUnits(Math.max(0.01, feePercent / 1e6).toFixed(6), 6)

    const spec = {
      version: 1,
      sourceDomain: arcInfo.domainId,
      destinationDomain: destChain.domainId,
      sourceContract: addressToBytes32(GATEWAY_WALLET_ADDRESS),
      destinationContract: addressToBytes32(GATEWAY_MINTER_ADDRESS),
      sourceToken: addressToBytes32(arcInfo.usdcAddress),
      destinationToken: addressToBytes32(destChain.usdcAddress),
      sourceDepositor: addressToBytes32(account.address),
      destinationRecipient: addressToBytes32(recipientAddress),
      sourceSigner: addressToBytes32(account.address),
      destinationCaller: addressToBytes32('0x0000000000000000000000000000000000000000'),
      value: amount,
      salt: randomSalt(),
      hookData: '0x' as Hex,
    }

    const burnIntent = {
      maxBlockHeight: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
      maxFee,
      spec,
    }

    logger.info('Gateway transfer: signing EIP-712...', {
      recipient: recipientAddress,
      amount: amountUsdc,
      destChain: destChainKey,
    })

    const signature = await account.signTypedData({
      domain: EIP712_DOMAIN,
      types: TRANSFER_SPEC_TYPE,
      primaryType: 'BurnIntent',
      message: burnIntent,
    })

    // POST to Gateway API
    const apiUrl = config.GATEWAY_API_URL
    const res = await fetch(`${apiUrl}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        burnIntent: {
          maxBlockHeight: burnIntent.maxBlockHeight.toString(),
          maxFee: burnIntent.maxFee.toString(),
          spec: {
            ...spec,
            value: spec.value.toString(),
          },
        },
        signature,
      }]),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Gateway API error ${res.status}: ${errBody}`)
    }

    const result = await res.json()
    logger.info('Gateway transfer submitted', { result })

    // API returns attestation + signature for mint
    const attestation = result.attestation || result[0]?.attestation
    const mintSig = result.signature || result[0]?.signature

    return { success: true, attestation, signature: mintSig }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('Gateway transfer failed', { error: msg })
    return { success: false, error: msg }
  }
}

export async function gatewayMint(
  attestation: string,
  sig: string,
  destChainKey: string
): Promise<{
  success: boolean
  txHash?: string
  explorerUrl?: string
  error?: string
}> {
  try {
    const config = getServerConfig()
    const account = privateKeyToAccount(config.PRIVATE_KEY as Hex)
    const destChain = GATEWAY_CHAINS[destChainKey]
    if (!destChain) throw new Error(`Unknown destination chain: ${destChainKey}`)

    const chainDef = getChainDef(destChainKey)

    const walletClient = createWalletClient({
      account,
      chain: chainDef,
      transport: http(destChain.rpcUrl),
    })

    const publicClient = createPublicClient({
      chain: chainDef,
      transport: http(destChain.rpcUrl),
    })

    logger.info('Gateway mint: calling gatewayMint on destination...', { chain: destChainKey })

    const txHash = await walletClient.writeContract({
      address: GATEWAY_MINTER_ADDRESS,
      abi: gatewayMinterAbi,
      functionName: 'gatewayMint',
      args: [attestation as Hex, sig as Hex],
    })

    await publicClient.waitForTransactionReceipt({ hash: txHash })

    const explorerUrl = `${destChain.explorerUrl}/tx/${txHash}`
    logger.info('Gateway mint complete', { txHash, explorerUrl })

    return { success: true, txHash, explorerUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('Gateway mint failed', { error: msg })
    return { success: false, error: msg }
  }
}

export async function getGatewayBalance(): Promise<{
  available: string
  token: string
  error?: string
}> {
  try {
    const config = getServerConfig()
    const account = privateKeyToAccount(config.PRIVATE_KEY as Hex)

    const res = await fetch(`${config.GATEWAY_API_URL}/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'USDC',
        sources: [{ domain: GATEWAY_CHAINS.arc.domainId, depositor: account.address }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      logger.warn('Gateway balance API failed', { status: res.status, body: errText })
      return { available: '0', token: 'USDC', error: `API ${res.status}` }
    }

    const data = await res.json()
    return { available: data.available || '0', token: 'USDC' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('Gateway balance check failed', { error: msg })
    return { available: '0', token: 'USDC', error: msg }
  }
}

/**
 * Ensure the Gateway has at least `requiredUsdc` available.
 * If insufficient, deposits from Arc USDC into GatewayWallet.
 * Waits for Arc finality (~2s) after deposit.
 */
export async function ensureGatewayBalance(requiredUsdc: string): Promise<{
  success: boolean
  deposited: boolean
  depositTxHash?: string
  error?: string
}> {
  try {
    const balance = await getGatewayBalance()
    const available = parseFloat(balance.available)
    const required = parseFloat(requiredUsdc)

    if (available >= required) {
      logger.info('Gateway balance sufficient', { available: balance.available, required: requiredUsdc })
      return { success: true, deposited: false }
    }

    // Deposit the shortfall + 0.01 buffer
    const shortfall = required - available
    const depositAmount = (shortfall + 0.01).toFixed(6)

    logger.info('Gateway balance insufficient, depositing...', {
      available: balance.available,
      required: requiredUsdc,
      depositAmount,
    })

    const result = await depositToGateway(depositAmount)
    if (!result.success) {
      return { success: false, deposited: false, error: `Deposit failed: ${result.error}` }
    }

    // Wait for Arc block finality so Gateway API recognizes the deposit
    logger.info('Waiting for Arc finality after Gateway deposit...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    logger.info('Gateway funded', { depositAmount, depositTxHash: result.depositTxHash })
    return { success: true, deposited: true, depositTxHash: result.depositTxHash }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('ensureGatewayBalance failed', { error: msg })
    return { success: false, deposited: false, error: msg }
  }
}
