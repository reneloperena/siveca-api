import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/**
 * Migration: Add foreign key constraint from telemetry_raw.device_uuid to stations.uuid
 * 
 * This ensures referential integrity:
 * - Prevents inserting telemetry for non-existent stations
 * - Prevents database-level deletion of stations with telemetry (ON DELETE RESTRICT)
 * - Note: CRUD operations use soft-delete, so this FK is a safety net for direct DB operations
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Add foreign key constraint
  await sql`
    ALTER TABLE telemetry_raw 
    ADD CONSTRAINT telemetry_raw_device_uuid_fkey 
    FOREIGN KEY (device_uuid) 
    REFERENCES stations(uuid) 
    ON DELETE RESTRICT
  `.execute(db)
}

/**
 * Rollback: Drop the foreign key constraint
 */
export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE telemetry_raw 
    DROP CONSTRAINT IF EXISTS telemetry_raw_device_uuid_fkey
  `.execute(db)
}
