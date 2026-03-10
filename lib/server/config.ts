import { z } from 'zod'
import { isMainnet } from '../network'

const _mainnet = isMainnet()

const envSchema = z.object({
  CHAIN_ID: z.coerce.number().default(_mainnet ? 8453 : 84532),
  RPC_URL: z.string().url().default(_mainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org'),
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key format'),
  CLEARNODE_WS_URL: z
    .string()
    .url()
    .default(_mainnet ? 'wss://clearnet.yellow.com/ws' : 'wss://clearnet-sandbox.yellow.com/ws'),
  USDC_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address format')
    .default(_mainnet ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
  FEE_RECIPIENT_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address format').optional())
    .optional(),
  SERIAL_PORT: z.string().default('/dev/ttyUSB0'),
  SERIAL_BAUD: z.coerce.number().default(115200),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Festival config
  FESTIVAL_ADMIN_PIN: z.string().min(4).default('1234'),
  // Merchants (env-based)
  MERCHANT_BEERS_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional())
    .optional(),
  MERCHANT_BEERS_CHAIN: z.string().default(_mainnet ? 'base' : 'base_sepolia'),
  MERCHANT_FOOD_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional())
    .optional(),
  MERCHANT_FOOD_CHAIN: z.string().default(_mainnet ? 'base' : 'base_sepolia'),
  MERCHANT_MERCH_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional())
    .optional(),
  MERCHANT_MERCH_CHAIN: z.string().default(_mainnet ? 'base' : 'base_sepolia'),
})

export type ServerConfig = z.infer<typeof envSchema>

let _config: ServerConfig | null = null

export function getServerConfig(): ServerConfig {
  if (!_config) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      console.error('Invalid server config:', result.error.format())
      throw new Error('Invalid server configuration')
    }
    _config = result.data
  }
  return _config
}
