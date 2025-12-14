import { promises as fs } from 'node:fs'
import path, { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { FileMigrationProvider, Migrator } from 'kysely'
import { db } from '../src/services/postgres/live/simple-db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function migrate() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../migrations'),
    }),
  })

  const direction = process.argv[2] ?? 'up'

  let results, error

  if (direction === 'up') {
    ({ results, error } = await migrator.migrateToLatest())
  }
  else if (direction === 'down') {
    ({ results, error } = await migrator.migrateDown())
  }
  else if (direction === 'status') {
    const pending = await migrator.getMigrations()
    console.log(pending)
    await db.destroy()
    return
  }
  else {
    console.error(`Unknown direction "${direction}". Use "up", "down", or "status".`)
    process.exit(1)
  }

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`✅ Migration "${it.migrationName}" executed successfully`)
    }
    else if (it.status === 'Error') {
      console.error(`❌ Migration "${it.migrationName}" failed`)
    }
    else {
      console.log(`↔️ Migration "${it.migrationName}" skipped`)
    }
  })

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  await db.destroy()
}

migrate()
