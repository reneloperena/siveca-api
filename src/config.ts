import process from 'node:process'
import { z } from 'zod'
import 'dotenv/config'

const ConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_NAME: z.string().optional().default('siveca'),
  DATABASE_USER: z.string().optional().default('postgres'),
  DATABASE_PASSWORD: z.string().optional().default('password'),
  DATABASE_HOST: z.string().optional().default('localhost'),
  DATABASE_PORT: z.coerce.number().optional().default(5432),
  DATABASE_SCHEMA: z.string().optional().default('public'),
  DATABASE_PROVIDER: z.enum(['postgresql', 'sqlite']).default('postgresql'),
  DATABASE_URL: z.string().optional(),
  HOST: z.ipv4().optional().default('0.0.0.0'),
  JWT_SECRET: z
    .string()
    .optional()
    .default('your-secret-key-change-this-in-production'),
  JWT_SECRETS: z.string().optional().default(''),
  JWT_EXPIRES_IN: z.coerce.number().optional().default(86400),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional().default('localhost'),
  REDIS_PORT: z.coerce.number().optional().default(6379),
  VERNEMQ_HOST: z.string().optional().default('localhost'),
  VERNEMQ_PORT: z.coerce.number().optional().default(1883),
  VERNEMQ_USERNAME: z.string().optional().default(''),
  VERNEMQ_PASSWORD: z.string().optional().default(''),
  EXPORT_TIMEZONE: z.string().optional().default('America/Los_Angeles'), // PST/PDT
})

const parsed = ConfigSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  )
  process.exit(1)
}

export const config = parsed.data
export const env = parsed.data

export default config
