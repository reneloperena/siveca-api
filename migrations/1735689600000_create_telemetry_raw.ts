import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/**
 * Migration: Create telemetry_raw table with TimescaleDB hypertable
 * 
 * Creates a wide telemetry table (one row per device + timestamp) with:
 * - All telemetry metrics as columns
 * - JSONB extras field for unknown/future fields
 * - Composite primary key (device_uuid, time)
 * - TimescaleDB hypertable for time-series optimization
 * - Index on (device_uuid, time DESC) for efficient queries
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Create the telemetry_raw table
  await db.schema
    .createTable('telemetry_raw')
    .addColumn('time', 'timestamptz', (col) => col.notNull())
    .addColumn('device_uuid', 'text', (col) => col.notNull())
    .addColumn('fw_ver', 'text')
    .addColumn('model', 'text')
    .addColumn('ingested_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))

    // Known metrics (canonical units)
    .addColumn('temp', 'double precision')
    .addColumn('hum', 'double precision')
    .addColumn('pres', 'double precision')

    .addColumn('pm1', 'double precision')
    .addColumn('pm25', 'double precision')
    .addColumn('pm10', 'double precision')

    .addColumn('no', 'double precision')
    .addColumn('no2', 'double precision')
    .addColumn('o3', 'double precision')
    .addColumn('so2', 'double precision')
    .addColumn('co', 'double precision')
    .addColumn('h2s', 'double precision')
    .addColumn('nh3', 'double precision')
    .addColumn('co2', 'double precision')
    .addColumn('voc', 'double precision')

    .addColumn('noise', 'double precision')

    .addColumn('solar_rad', 'double precision')
    .addColumn('rain_rate', 'double precision')
    .addColumn('wind_dir', 'double precision')
    .addColumn('wind_spd', 'double precision')
    .addColumn('lux', 'double precision')

    // Unknown / future / customer-specific fields
    .addColumn('extras', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))

    .addPrimaryKeyConstraint('telemetry_raw_pkey', ['device_uuid', 'time'])
    .execute()

  // Create TimescaleDB hypertable
  await sql`
    SELECT create_hypertable('telemetry_raw', 'time', if_not_exists => true)
  `.execute(db)

  // Create index on (device_uuid, time DESC) for efficient queries
  await db.schema
    .createIndex('telemetry_raw_device_time_idx')
    .on('telemetry_raw')
    .columns(['device_uuid', 'time'])
    .expression(sql`time DESC`)
    .execute()
}

/**
 * Rollback: Drop the telemetry_raw table
 */
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('telemetry_raw').ifExists().execute()
}
