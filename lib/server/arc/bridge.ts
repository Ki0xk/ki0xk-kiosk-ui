import { BridgeKit } from '@circle-fin/bridge-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
import { getServerConfig } from '../config'
import { logger } from '../logger'
import { calculateFee, type FeeBreakdown } from './fees'
import { SUPPORTED_CHAINS, type ChainInfo } from './chains'

let _bridgeKit: BridgeKit | null = null

function getBridgeKit(): BridgeKit {
  if (!_bridgeKit) {
    const originalDebug = process.env.DEBUG
    process.env.DEBUG = ''
    _bridgeKit = new BridgeKit()
    if (originalDebug !== undefined) {
      process.env.DEBUG = originalDebug
    }
  }
  return _bridgeKit
}

export interface BridgeResult {
  success: boolean
  txHash?: string
  txStatus?: 'success' | 'reverted' | 'pending'
  explorerUrl?: string
  sourceChain: string
  destinationChain: string
  amount: string
  fee: FeeBreakdown
  error?: string
}

export interface ArcBalance {
  usdc: string
  usdcRaw: bigint
}

export async function getArcBalance(): Promise<ArcBalance> {
  try {
    logger.debug('Checking Arc balance...')
    return { usdc: '0.00', usdcRaw: 0n }
  } catch (error) {
    logger.error('Failed to get Arc balance', { error: error as object })
    return { usdc: '0.00', usdcRaw: 0n }
  }
}

export async function bridgeToChain(
  destinationAddress: string,
  targetChainKey: string,
  amount: string,
  feeRecipient?: string
): Promise<BridgeResult> {
  const kit = getBridgeKit()
  const chainInfo = SUPPORTED_CHAINS[targetChainKey]
  if (!chainInfo) throw new Error(`Unsupported chain: ${targetChainKey}`)

  const feeBreakdown = calculateFee(parseFloat(amount))
  const config = getServerConfig()

  logger.info('Initiating Arc Bridge', {
    destination: destinationAddress,
    chain: chainInfo.name,
    grossAmount: amount,
    netAmount: feeBreakdown.netAmount,
    fee: feeBreakdown.fee,
  })

  try {
    const adapter = createViemAdapterFromPrivateKey({
      privateKey: config.PRIVATE_KEY as `0x${string}`,
    })

    const bridgeConfig: any = {
      from: { adapter, chain: 'Arc_Testnet' },
      to: {
        adapter,
        chain: chainInfo.bridgeKitName,
        recipientAddress: destinationAddress,
      },
      amount: feeBreakdown.netAmount.toString(),
    }

    if (feeRecipient && feeBreakdown.fee > 0) {
      bridgeConfig.config = {
        customFee: {
          value: feeBreakdown.fee.toString(),
          recipientAddress: feeRecipient,
        },
      }
    }

    const result = await kit.bridge(bridgeConfig)
    const steps = (result as any)?.steps || []

    const mintStep = steps.find((s: any) => s.name === 'mint' && s.state === 'success')
    const lastSuccessStep = steps.filter((s: any) => s.state === 'success').pop()
    const relevantStep = mintStep || lastSuccessStep

    const txHash =
      relevantStep?.txHash ||
      relevantStep?.data?.txHash ||
      (result as any)?.txHash ||
      null

    const explorerUrl =
      relevantStep?.data?.explorerUrl || (txHash ? `${chainInfo.explorerUrl}/tx/${txHash}` : null)

    const stepsSummary = steps.map((s: any) => `${s.name}:${s.state}`).join(' -> ')
    logger.info('Bridge steps', { flow: stepsSummary })

    if (!txHash) {
      return {
        success: true,
        txStatus: 'pending',
        sourceChain: 'Arc_Testnet',
        destinationChain: chainInfo.name,
        amount: feeBreakdown.netAmount.toString(),
        fee: feeBreakdown,
      }
    }

    const txStatus =
      relevantStep?.state === 'success'
        ? 'success'
        : relevantStep?.state === 'failed'
          ? 'reverted'
          : 'pending'

    return {
      success: txStatus === 'success' || txStatus === 'pending',
      txHash,
      txStatus: txStatus as 'success' | 'reverted' | 'pending',
      explorerUrl: explorerUrl || undefined,
      sourceChain: 'Arc_Testnet',
      destinationChain: chainInfo.name,
      amount: feeBreakdown.netAmount.toString(),
      fee: feeBreakdown,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error('Bridge failed', { error: errorMsg, chain: chainInfo.name })
    return {
      success: false,
      sourceChain: 'Arc_Testnet',
      destinationChain: chainInfo.name,
      amount: feeBreakdown.netAmount.toString(),
      fee: feeBreakdown,
      error: errorMsg,
    }
  }
}

export async function checkLiquidity(amount: string): Promise<{
  sufficient: boolean
  available: string
  required: string
}> {
  const arcBalance = await getArcBalance()
  const required = parseFloat(amount)
  const available = parseFloat(arcBalance.usdc)
  return { sufficient: available >= required, available: arcBalance.usdc, required: amount }
}
