import type { DatabaseError } from '../../../errors'
import type { DB } from './types'
import { Context, Effect, Layer } from 'effect'
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'
import { config } from '../../../config'
import { databaseError } from '../../../errors'

export type DatabaseService = {
  readonly db: Kysely<DB>
}

export const DatabaseServiceTag
  = Context.GenericTag<DatabaseService>('DatabaseService')

const makeDatabaseService = Effect.gen(function* () {
  const pool = new Pool({
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME,
  })

  const db = new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  })

  return DatabaseServiceTag.of({ db })
})

export const DatabaseServiceLive = Layer.effect(
  DatabaseServiceTag,
  makeDatabaseService,
)

export function withDatabase<A>(
  operation: (db: Kysely<DB>) => Promise<A>,
): Effect.Effect<A, DatabaseError, DatabaseService> {
  return Effect.gen(function* () {
    const { db } = yield* DatabaseServiceTag
    return yield* Effect.tryPromise({
      try: () => operation(db),
      catch: (cause) => {
        return databaseError('database_operation', cause)
      },
    })
  })
}

export function healthPostgres(): Effect.Effect<void, DatabaseError, DatabaseService> {
  return withDatabase(async (db) => {
    // Check TimescaleDB by querying a system table using raw SQL
    await sql`
      SELECT 1 as one
      FROM pg_extension
      WHERE extname = 'timescaledb'
      LIMIT 1
    `.execute(db)
  })
}
