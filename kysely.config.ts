import { defineConfig } from 'kysely-ctl'
import { DatabaseServiceTag } from './src/services/postgres/live/db'
import { DatabaseServiceLive } from './src/services/postgres/live/db'
import { Effect } from 'effect'

// Note: This is a placeholder. You'll need to implement a way to get the db instance
// For now, this will need to be configured when migrations are actually needed
export default defineConfig({
  // kysely: db, // Will be set up when migrations are needed
  migrations: {
    migrationFolder: './migrations',
  },
})
