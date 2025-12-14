import type { DB } from './types'
import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { config } from '../../../config'

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: config.DATABASE_HOST,
      port: config.DATABASE_PORT,
      user: config.DATABASE_USER,
      password: config.DATABASE_PASSWORD,
      database: config.DATABASE_NAME,
    }),
  }),
  plugins: [new CamelCasePlugin()],
})
