import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/**
 * Migration: Create export_catalog table
 * 
 * Creates a catalog table for virtual filesystem exports with:
 * - Deterministic path structure (YYYY/Mon/DD/HH)
 * - Support for multiple catalog types (raw, averages, etc.)
 * - Metadata about export files (row counts, time bounds, size estimates)
 * - Indexes for efficient browsing and device-time lookups
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('export_catalog')
    .addColumn('catalog_type', 'text', (col) => col.notNull())
    .addColumn('device_uuid', 'text', (col) => col.notNull())
    .addColumn('bucket_ts', 'timestamptz', (col) => col.notNull())
    .addColumn('format', 'text', (col) => col.notNull().defaultTo('csv'))

    // Deterministic path components for browsing
    .addColumn('year', 'integer', (col) => col.notNull())
    .addColumn('month', 'integer', (col) => col.notNull())
    .addColumn('day', 'integer', (col) => col.notNull())
    .addColumn('hour', 'integer')

    // Path and filename
    .addColumn('path', 'text', (col) => col.notNull())
    .addColumn('filename', 'text', (col) => col.notNull())

    // Query window represented by this virtual file
    .addColumn('from_ts', 'timestamptz', (col) => col.notNull())
    .addColumn('to_ts', 'timestamptz', (col) => col.notNull())

    // Metadata
    .addColumn('row_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('size_estimate', 'bigint', (col) => col.notNull().defaultTo(0))
    .addColumn('first_time', 'timestamptz')
    .addColumn('last_time', 'timestamptz')
    .addColumn('finalized', 'boolean', (col) => col.notNull().defaultTo(false))

    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))

    .addColumn('extras', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))

    .addPrimaryKeyConstraint('export_catalog_pkey', ['catalog_type', 'device_uuid', 'bucket_ts', 'format'])
    .execute()

  // Create index for browsing by path components
  await db.schema
    .createIndex('export_catalog_browse_idx')
    .on('export_catalog')
    .columns(['catalog_type', 'year', 'month', 'day', 'hour'])
    .execute()

  // Create index for device-time lookups
  await db.schema
    .createIndex('export_catalog_device_time_idx')
    .on('export_catalog')
    .columns(['catalog_type', 'device_uuid', 'bucket_ts'])
    .expression(sql`bucket_ts DESC`)
    .execute()
}

/**
 * Rollback: Drop the export_catalog table
 */
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('export_catalog').ifExists().execute()
}
