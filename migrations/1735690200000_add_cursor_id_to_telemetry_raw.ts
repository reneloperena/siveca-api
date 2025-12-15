import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/**
 * Migration: Add cursor_id UUID column to telemetry_raw for simpler cursor-based pagination
 * 
 * Adds a UUID column that will be used as the cursor for pagination.
 * We'll order by time/ingested_at but use cursor_id for the WHERE clause.
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Add cursor_id column with default UUID generation
  await db.schema
    .alterTable('telemetry_raw')
    .addColumn('cursor_id', 'uuid', (col) => col.notNull().defaultTo(sql`gen_random_uuid()`))
    .execute()

  // Create index on cursor_id for fast cursor lookups
  await db.schema
    .createIndex('telemetry_raw_cursor_id_idx')
    .on('telemetry_raw')
    .column('cursor_id')
    .execute()

  // Backfill existing rows with UUIDs
  await sql`
    UPDATE telemetry_raw 
    SET cursor_id = gen_random_uuid() 
    WHERE cursor_id IS NULL
  `.execute(db)
}

/**
 * Rollback: Remove cursor_id column
 */
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('telemetry_raw')
    .dropColumn('cursor_id')
    .execute()
}
