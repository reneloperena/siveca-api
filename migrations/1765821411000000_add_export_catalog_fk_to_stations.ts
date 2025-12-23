import type { Kysely } from 'kysely'
import { sql } from 'kysely'

/**
 * Migration: Add foreign key constraint from export_catalog.device_uuid to stations.uuid
 * 
 * This ensures referential integrity:
 * - Prevents inserting catalog entries for non-existent stations
 * - Prevents database-level deletion of stations with catalog entries (ON DELETE RESTRICT)
 * - Note: CRUD operations use soft-delete, so this FK is a safety net for direct DB operations
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Add foreign key constraint
  const sqlStatement = `ALTER TABLE export_catalog 
ADD CONSTRAINT export_catalog_device_uuid_fkey 
FOREIGN KEY (device_uuid) 
REFERENCES stations(uuid) 
ON DELETE RESTRICT`
  console.log('SQL Statement:', sqlStatement)
  await sql.raw(sqlStatement).execute(db)
}

/**
 * Rollback: Drop the foreign key constraint
 */
export async function down(db: Kysely<any>): Promise<void> {
  const sqlStatement = `ALTER TABLE export_catalog 
DROP CONSTRAINT IF EXISTS export_catalog_device_uuid_fkey`
  console.log('SQL Statement (rollback):', sqlStatement)
  await sql.raw(sqlStatement).execute(db)
}
