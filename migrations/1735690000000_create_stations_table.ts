import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/**
 * Migration: Create stations table with PostGIS geography point
 * 
 * Creates a stations table to store device/station metadata with:
 * - uuid as primary key (matches device_uuid from telemetry)
 * - PostGIS geography point for geolocation
 * - Soft delete support (deleted_at)
 * - Indexes for efficient queries
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Check if PostGIS extension is available
  // Note: PostGIS must be installed on the PostgreSQL server before running this migration
  // For local development with Docker: The postgres image needs postgis extension installed
  // For example: Use postgis/postgis image or install postgis in your postgres container
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db)
  } catch (error: any) {
    if (error?.code === '0A000' || error?.message?.includes('postgis')) {
      throw new Error(
        'PostGIS extension is not available. Please install PostGIS on your PostgreSQL server.\n' +
        'For Docker: Use postgis/postgis image or add postgis to your postgres container.\n' +
        'For local PostgreSQL: Install postgresql-postgis package.\n' +
        `Original error: ${error.message}`,
      )
    }
    throw error
  }

  // Create the stations table
  await db.schema
    .createTable('stations')
    .addColumn('uuid', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text')
    .addColumn('model', 'text')
    .addColumn('fw_ver', 'text')
    .addColumn('location', sql`geography(point, 4326)`)
    .addColumn('description', 'text')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('auto_created', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  // Create GIST index on location for efficient spatial queries
  await sql`
    CREATE INDEX stations_location_idx ON stations USING GIST (location)
  `.execute(db)

  // Create index on status for filtering
  await db.schema
    .createIndex('stations_status_idx')
    .on('stations')
    .column('status')
    .execute()

  // Create partial index on deleted_at for efficient queries of active stations
  await sql`
    CREATE INDEX stations_deleted_at_idx ON stations (deleted_at) WHERE deleted_at IS NULL
  `.execute(db)
}

/**
 * Rollback: Drop the stations table
 */
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('stations').ifExists().execute()
}
