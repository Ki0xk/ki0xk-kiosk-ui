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
  createAppSessionMessage,
  createSubmitAppStateMessage,
  createCloseAppSessionMessage,
  createGetAppSessionsMessageV2,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  type MessageSigner,
  type RPCResponse,
  RPCMethod,
  RPCProtocolVersion,
  RPCAppStateIntent,
  type RPCAppDefinition,
  type RPCAppSessionAllocation,
} from '@erc7824/nitrolite'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { getServerConfig } from './config'
import { logger } from './logger'
import { getKioskAddress, getWalletClient } from './wallet'
import { isMainnet } from '../network'

const APP_NAME = 'ki0xk'
const APP_SCOPE = 'kiosk'

/** Yellow asset name: 'usdc' on mainnet, 'ytest.usd' on sandbox */
const YELLOW_ASSET = isMainnet() ? 'usdc' : 'ytest.usd'

export class ClearNodeClient {
  private client: Client | null = null
  private authenticated = false
  private _connectingPromise: Promise<void> | null = null
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
      allowances: [{ asset: YELLOW_ASSET, amount: '1000000000' }],
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
    if (this.authenticated) return
    // Deduplicate concurrent callers — only one connect sequence runs
    if (this._connectingPromise) return this._connectingPromise
    this._connectingPromise = (async () => {
      await this.connect()
      await this.getConfig()
      await this.authenticate()
    })()
    try {
      await this._connectingPromise
    } finally {
      this._connectingPromise = null
    }
  }

  /**
   * Force re-authentication (e.g. after WS reconnect drops session).
   */
  async forceReconnect(): Promise<void> {
    this.authenticated = false
    this._connectingPromise = null
    await this.ensureConnected()
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

  async createChannel(tokenAddress: string, chainId: number = isMainnet() ? 8453 : 84532): Promise<string> {
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

    logger.info('Ki0xk Transfer', { destination: destinationWallet, amount: `${amountUsd} ${YELLOW_ASSET}` })

    try {
      const result = await this.transfer(destinationWallet, YELLOW_ASSET, amountUsd)
      logger.info('Transfer complete!', { destination: destinationWallet, amount: amountUsd })
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      // Auto-retry on auth failure (WS reconnected but session expired)
      if (errorMsg.includes('authentication required') || errorMsg.includes('Disconnected')) {
        logger.warn('Auth lost, forcing reconnect and retrying transfer...')
        await this.forceReconnect()
        const result = await this.transfer(destinationWallet, YELLOW_ASSET, amountUsd)
        logger.info('Transfer complete after reconnect!', { destination: destinationWallet, amount: amountUsd })
        return result
      }

      if (errorMsg.includes('non-zero allocation') || errorMsg.includes('non-zero amount')) {
        logger.error('Transfer blocked by channel balance!', {
          error: errorMsg,
          hint: 'Empty all channels to zero before transferring.',
        })
      }
      throw error
    }
  }

  // ========================================================================
  // App Sessions — multi-party off-chain state channels
  // ========================================================================

  /**
   * Create an App Session between the kiosk operator and another participant.
   * Used for festival payment tracking and kiosk session accounting.
   */
  async createAppSession(
    participantAddress: string,
    initialAmount: string,
    applicationName: string = 'ki0xk-kiosk'
  ): Promise<string> {
    if (!this.authenticated) throw new Error('Not authenticated')
    const kioskAddress = getKioskAddress() as `0x${string}`

    const definition: RPCAppDefinition = {
      protocol: RPCProtocolVersion.NitroRPC_0_4,
      participants: [kioskAddress, participantAddress as `0x${string}`],
      weights: [100, 0], // Kiosk operator has full control (trusted judge pattern)
      quorum: 100,
      challenge: 0,
      nonce: Date.now(),
      application: applicationName,
    }

    const allocations: RPCAppSessionAllocation[] = [
      { participant: kioskAddress, asset: YELLOW_ASSET, amount: initialAmount },
      { participant: participantAddress as `0x${string}`, asset: YELLOW_ASSET, amount: '0' },
    ]

    logger.info('Creating App Session', {
      participant: participantAddress,
      amount: initialAmount,
      application: applicationName,
    })

    const message = await createAppSessionMessage(
      this.sessionSigner!,
      { definition, allocations }
    )
    const response = await this.client!.sendMessage(JSON.parse(message))
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'App session creation failed')
    }

    const sessionId = responseData?.params?.appSessionId || responseData?.params?.app_session_id
    logger.info('App Session created', { sessionId })
    return sessionId
  }

  /**
   * Update App Session state — redistribute allocations between participants.
   * Used to record payments within a session (operate intent).
   */
  async submitAppState(
    sessionId: string,
    allocations: RPCAppSessionAllocation[],
    version: number,
    intent: RPCAppStateIntent = RPCAppStateIntent.Operate
  ): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated')

    logger.info('Submitting app state', { sessionId, intent, version })

    const message = await createSubmitAppStateMessage<typeof RPCProtocolVersion.NitroRPC_0_4>(
      this.sessionSigner!,
      {
        app_session_id: sessionId as `0x${string}`,
        intent,
        version,
        allocations,
      }
    )
    const response = await this.client!.sendMessage(JSON.parse(message))
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'App state update failed')
    }
    return response
  }

  /**
   * Close an App Session — finalize allocations and release funds.
   */
  async closeAppSession(
    sessionId: string,
    finalAllocations: RPCAppSessionAllocation[]
  ): Promise<unknown> {
    if (!this.authenticated) throw new Error('Not authenticated')

    logger.info('Closing App Session', { sessionId })

    const message = await createCloseAppSessionMessage(
      this.sessionSigner!,
      { app_session_id: sessionId as `0x${string}`, allocations: finalAllocations }
    )
    const response = await this.client!.sendMessage(JSON.parse(message))
    const responseData = response as any
    if (responseData?.method === 'error' || responseData?.params?.error) {
      throw new Error(responseData?.params?.error || 'App session close failed')
    }

    logger.info('App Session closed', { sessionId })
    return response
  }

  /**
   * List active App Sessions for the kiosk operator.
   */
  async getAppSessions(): Promise<unknown> {
    const kioskAddress = getKioskAddress() as `0x${string}`
    const message = createGetAppSessionsMessageV2(kioskAddress, undefined, this.nextRequestId())
    const response = await this.client!.sendMessage(JSON.parse(message))
    return response
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

// Use globalThis to survive Next.js hot-reload
const globalForClearNode = globalThis as unknown as { __clearNodeClient?: ClearNodeClient }

export function getClearNode(): ClearNodeClient {
  if (!globalForClearNode.__clearNodeClient) {
    globalForClearNode.__clearNodeClient = new ClearNodeClient()
  }
  return globalForClearNode.__clearNodeClient
}
