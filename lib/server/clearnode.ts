import { Client } from 'yellow-ts'
import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createGetConfigMessageV2,
  createGetLedgerBalancesMessage,
  createGetChannelsMessageV2,
  createGetAssetsMessageV2,
  createCreateChannelMessage,
  createResizeChannelMessage,
  createCloseChannelMessage,
  createTransferMessage,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  type MessageSigner,
  type RPCResponse,
  RPCMethod,
} from '@erc7824/nitrolite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { getServerConfig } from './config'
import { logger } from './logger'
import { getKioskAddress, getWalletClient } from './wallet'

const APP_NAME = 'ki0xk'
const APP_SCOPE = 'kiosk'

export class ClearNodeClient {
  private client: Client | null = null
  private authenticated = false
  private requestId = 0
  private networkConfig: unknown = null
  private mainSigner: MessageSigner | null = null
  private sessionSigner: MessageSigner | null = null
  private sessionAddress: string | null = null

  private initSigners() {
    if (this.mainSigner) return
    const config = getServerConfig()
    this.mainSigner = createECDSAMessageSigner(config.PRIVATE_KEY as `0x${string}`)
    const sessionPrivateKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionPrivateKey)
    this.sessionSigner = createECDSAMessageSigner(sessionPrivateKey)
    this.sessionAddress = sessionAccount.address
  }

  private nextRequestId(): number {
    return ++this.requestId
  }

  async connect(): Promise<void> {
    const config = getServerConfig()
    this.initSigners()
    logger.info('Connecting to ClearNode...', { url: config.CLEARNODE_WS_URL })
    this.client = new Client({ url: config.CLEARNODE_WS_URL })
    await this.client.connect()
    logger.info('Connected to ClearNode')

    this.client.listen(async (message: RPCResponse) => {
      this.handlePushMessage(message)
    })
  }

  private handlePushMessage(message: RPCResponse): void {
    switch (message.method) {
      case RPCMethod.BalanceUpdate:
        logger.debug('Balance update (push)')
        break
      case RPCMethod.ChannelsUpdate:
        logger.debug('Channels update (push)')
        break
      case RPCMethod.Error:
        logger.error('ClearNode error (push)', { params: message.params as object })
        break
    }
  }

  async getConfig(): Promise<unknown> {
    logger.info('Fetching ClearNode config...')
    const message = createGetConfigMessageV2(this.nextRequestId())
    const response = await this.client!.sendMessage(JSON.parse(message))
    this.networkConfig = response
    logger.info('Config received')
    return response
  }

  async getAssets(chainId?: number): Promise<unknown> {
    logger.info('Fetching supported assets...', { chainId })
    const message = createGetAssetsMessageV2(chainId, this.nextRequestId())
    const response = await this.client!.sendMessage(JSON.parse(message))
    return response
  }

  async authenticate(): Promise<void> {
    this.initSigners()
    const kioskAddress = getKioskAddress()
    logger.info('Starting authentication...', {
      address: kioskAddress,
      sessionKey: this.sessionAddress,
    })

    const authParams = {
      address: kioskAddress as `0x${string}`,
      session_key: this.sessionAddress as `0x${string}`,
      application: APP_NAME,
      allowances: [{ asset: 'ytest.usd', amount: '1000000000' }],
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 86400),
      scope: APP_SCOPE,
    }

    const authRequestMsg = await createAuthRequestMessage(authParams, this.nextRequestId())
    const challengeResponse = await this.client!.sendMessage(JSON.parse(authRequestMsg))

    const responseData = challengeResponse as any
    const challenge =
      responseData?.params?.challengeMessage ||
      responseData?.params?.challenge_message ||
      responseData?.res?.[2]?.challenge_message

    if (!challenge) {
      logger.error('No challenge in response', { challengeResponse: responseData })
      throw new Error('Auth challenge not received')
    }

    const walletClient = getWalletClient()
    const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, {
      name: APP_NAME,
    })

    const authVerifyMsg = await createAuthVerifyMessageFromChallenge(
      eip712Signer,
      challenge,
      this.nextRequestId()
    )

    const verifyResponse = await this.client!.sendMessage(JSON.parse(authVerifyMsg))
    const verifyData = verifyResponse as any
    if (verifyData?.method === 'error' || verifyData?.params?.error) {
      const errorMsg = verifyData?.params?.error || 'Authentication failed'
      logger.error('Auth verification failed', { error: errorMsg })
      throw new Error(errorMsg)
    }

    this.authenticated = true
    logger.info('Authentication successful!', { sessionKey: this.sessionAddress })
  }

  async ensureConnected(): Promise<void> {
    if (!this.authenticated) {
      await this.connect()
      await this.getConfig()
      await this.authenticate()
    }
  }

  async getLedgerBalances(): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated')
    logger.info('Fetching ledger balances...')
    const message = await createGetLedgerBalancesMessage(
      this.sessionSigner!,
      getKioskAddress() as `0x${string}`,
      this.nextRequestId()
    )
    const response = await this.client!.sendMessage(JSON.parse(message))
    logger.info('Ledger balances', { response: response as object })
    return response
  }

  async getChannels(): Promise<unknown> {
    logger.debug('Fetching channels...')
    const message = createGetChannelsMessageV2(
      getKioskAddress() as `0x${string}`,
      undefined,
      this.nextRequestId()
    )
    const response = await this.client!.sendMessage(JSON.parse(message))
    logger.debug('Channels response received')
    return response
  }

  async channelExists(channelId: string): Promise<boolean> {
    try {
      const channels = await this.getChannels()
      const channelList = (channels as any)?.params?.channels || []
      return channelList.some(
        (ch: any) =>
          (ch.channelId === channelId || ch.channel_id === channelId) &&
          (ch.status === 'open' || ch.status === 'resizing' || ch.status === 'ACTIVE')
      )
    } catch {
      return false
    }
  }

  async createChannel(tokenAddress: string, chainId: number = 84532): Promise<string> {
    if (!this.authenticated) throw new Error('Not authenticated')
    logger.debug('Creating channel...', { chainId })

    const message = await createCreateChannelMessage(
      this.sessionSigner!,
      { chain_id: chainId, token: tokenAddress as `0x${string}` },
      this.nextRequestId()
    )

    const response = await this.client!.sendMessage(message)
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'Channel creation failed')
    }
    return responseData?.params?.channelId || responseData?.params?.channel_id
  }

  async resizeChannel(
    channelId: string,
    allocateAmount: bigint,
    fundsDestination: string
  ): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated')
    logger.info('Resizing channel...', { channelId, allocateAmount: allocateAmount.toString() })

    const message = await createResizeChannelMessage(
      this.sessionSigner!,
      {
        channel_id: channelId as `0x${string}`,
        allocate_amount: allocateAmount,
        funds_destination: fundsDestination as `0x${string}`,
      },
      this.nextRequestId()
    )

    const response = await this.client!.sendMessage(message)
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'Resize failed')
    }
    return response
  }

  async closeChannel(channelId: string, fundsDestination: string): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated')
    logger.debug('Sending close channel request...')

    const message = await createCloseChannelMessage(
      this.sessionSigner!,
      channelId as `0x${string}`,
      fundsDestination as `0x${string}`,
      this.nextRequestId()
    )

    const response = await this.client!.sendMessage(message)
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'Close channel failed')
    }
    return response
  }

  async transfer(destination: string, asset: string, amount: string): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated')
    logger.info('Initiating transfer...', { destination, asset, amount })

    const message = await createTransferMessage(
      this.sessionSigner!,
      {
        destination: destination as `0x${string}`,
        allocations: [{ asset, amount }],
      },
      this.nextRequestId()
    )

    const response = await this.client!.sendMessage(message)
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'Transfer failed')
    }
    return response
  }

  async sendToWallet(destinationWallet: string, amountUsd: string): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated - call ensureConnected() first')

    const numAmount = parseFloat(amountUsd)
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Invalid amount: ${amountUsd}`)
    }

    logger.info('Ki0xk Transfer', { destination: destinationWallet, amount: `${amountUsd} ytest.usd` })

    try {
      const result = await this.transfer(destinationWallet, 'ytest.usd', amountUsd)
      logger.info('Transfer complete!', { destination: destinationWallet, amount: amountUsd })
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes('non-zero allocation') || errorMsg.includes('non-zero amount')) {
        logger.error('Transfer blocked by channel balance!', {
          error: errorMsg,
          hint: 'Empty all channels to zero before transferring.',
        })
      }
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
    }
    this.authenticated = false
    logger.info('Disconnected from ClearNode')
  }

  get isAuthenticated(): boolean {
    return this.authenticated
  }

  get config(): unknown {
    return this.networkConfig
  }
}

let _instance: ClearNodeClient | null = null

export function getClearNode(): ClearNodeClient {
  if (!_instance) {
    _instance = new ClearNodeClient()
  }
  return _instance
}
