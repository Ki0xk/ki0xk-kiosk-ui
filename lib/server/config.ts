import { z } from 'zod'

const envSchema = z.object({
  CHAIN_ID: z.coerce.number().default(84532),
  RPC_URL: z.string().url().default('https://sepolia.base.org'),
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key format'),
  CLEARNODE_WS_URL: z
    .string()
    .url()
    .default('wss://clearnet-sandbox.yellow.com/ws'),
  USDC_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address format')
    .default('0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
  FEE_RECIPIENT_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address format').optional())
    .optional(),
  SERIAL_PORT: z.string().default('/dev/ttyUSB0'),
  SERIAL_BAUD: z.coerce.number().default(115200),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CIRCLE_API_KEY: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().optional())
    .optional(),
  // Festival config
  FESTIVAL_ADMIN_PIN: z.string().min(4).default('1234'),
  GATEWAY_API_URL: z.string().url().default('https://gateway-api-testnet.circle.com/v1'),
  // Merchants (env-based)
  MERCHANT_BEERS_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional())
    .optional(),
  MERCHANT_BEERS_CHAIN: z.string().default('base_sepolia'),
  MERCHANT_FOOD_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional())
    .optional(),
  MERCHANT_FOOD_CHAIN: z.string().default('base_sepolia'),
  MERCHANT_MERCH_ADDRESS: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional())
    .optional(),
  MERCHANT_MERCH_CHAIN: z.string().default('base_sepolia'),
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
