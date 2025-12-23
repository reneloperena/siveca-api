/**
 * Test script for startup repair
 * 
 * Usage: yarn test:startup-repair
 */

import 'dotenv/config'
import { Effect, Layer } from 'effect'
import { LoggerLive } from '../src/logging'
import { PostgresLive } from '../src/services/postgres'
import { DatabaseServiceLive } from '../src/services/postgres/live/db'
import { getDeviceUuids, deleteZeroRowEntries } from '../src/services/postgres/live/export-catalog'
import { aggregateHourlyBucket } from '../src/business-logic/export-catalog'
import { sql } from 'kysely'
import { DatabaseServiceTag } from '../src/services/postgres/live/db'

const CATALOG_TYPE = 'raw'
const FORMAT = 'csv'
const TEST_HOURS = 3 // Only process last 3 hours for testing

/**
 * Generate all hours in a time range (inclusive)
 */
function generateHoursInRange(startHour: Date, endHour: Date): Date[] {
  const hours: Date[] = []
  const current = new Date(startHour)
  current.setUTCMinutes(0)
  current.setUTCSeconds(0)
  current.setUTCMilliseconds(0)
  
  const end = new Date(endHour)
  end.setUTCMinutes(0)
  end.setUTCSeconds(0)
  end.setUTCMilliseconds(0)
  
  while (current <= end) {
    hours.push(new Date(current))
    current.setUTCHours(current.getUTCHours() + 1)
  }
  
  return hours
}

async function main() {
  console.log('='.repeat(80))
  console.log('Starting Startup Repair Test Script (Last 3 hours only)')
  console.log('='.repeat(80))
  console.log('')

  // Set up service layers
  const serviceLayer = Layer.mergeAll(PostgresLive, DatabaseServiceLive, LoggerLive)

  const testEffect = Effect.gen(function* () {
    yield* Effect.logInfo('[Test] Starting test repair (last 3 hours only)')
    
    // Clean up zero-row entries
    yield* Effect.logInfo('[Test] Cleaning up catalog entries with 0 rows')
    const deletedCount = yield* deleteZeroRowEntries()
    if (deletedCount > 0) {
      yield* Effect.logInfo(`[Test] Deleted ${deletedCount} catalog entries with 0 rows`)
    } else {
      yield* Effect.logInfo('[Test] No zero-row entries found to clean up')
    }
    
    const deviceUuids = yield* getDeviceUuids()
    
    // Calculate target hour (current hour - 1, accounting for 5-minute buffer)
    const now = new Date()
    const targetHour = new Date(now)
    targetHour.setUTCMinutes(targetHour.getUTCMinutes() - 5) // 5-minute buffer
    targetHour.setUTCMinutes(0)
    targetHour.setUTCSeconds(0)
    targetHour.setUTCMilliseconds(0)
    targetHour.setUTCHours(targetHour.getUTCHours() - 1) // Exclude current hour
    
    // Calculate start hour (TEST_HOURS hours ago)
    const startHour = new Date(targetHour)
    startHour.setUTCHours(startHour.getUTCHours() - TEST_HOURS)
    
    yield* Effect.logInfo(
      `[Test] Processing last ${TEST_HOURS} hours: from ${startHour.toISOString()} to ${targetHour.toISOString()}, processing ${deviceUuids.length} devices`,
    )
    yield* Effect.logInfo(
      `[Test] Device UUIDs: ${deviceUuids.slice(0, 10).join(', ')}${deviceUuids.length > 10 ? ` ... (${deviceUuids.length} total)` : ''}`,
    )
    
    // Generate all hours in the test range
    const hoursToProcess = generateHoursInRange(startHour, targetHour)
    
    yield* Effect.logInfo(
      `[Test] Processing ${hoursToProcess.length} hours across all devices`,
    )
    
    // Process each device
    for (const deviceUuid of deviceUuids) {
      yield* Effect.gen(function* () {
        try {
          // Check if device has any data in the time range
          const { db } = yield* DatabaseServiceTag
          const hasDataResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await sql<{ count: number }>`
                SELECT COUNT(*)::int as count
                FROM telemetry_raw
                WHERE device_uuid = ${deviceUuid}
                  AND time >= ${startHour}
                  AND time <= ${targetHour}
              `.execute(db)
              
              const count = result.rows[0]?.count || 0
              console.log('[Test] Device data check result:', { deviceUuid, count, hasData: count > 0 })
              
              return count > 0
            },
            catch: (error) => {
              console.error('[Test] Error checking device data:', error)
              return false
            },
          })
          
          if (!hasDataResult) {
            yield* Effect.logInfo(
              `[Test] Device ${deviceUuid}: no data in test range, skipping`,
            )
            return
          }
          
          yield* Effect.logInfo(
            `[Test] Device ${deviceUuid}: processing ${hoursToProcess.length} hours (from ${startHour.toISOString()} to ${targetHour.toISOString()})`,
          )
          
          // Process each hour
          console.log(`[Test] Processing ${hoursToProcess.length} hours for device ${deviceUuid}`)
          for (const hour of hoursToProcess) {
            console.log(`[Test] Calling aggregateHourlyBucket for device ${deviceUuid}, hour ${hour.toISOString()}`)
            yield* aggregateHourlyBucket(CATALOG_TYPE, deviceUuid, hour, FORMAT)
          }
          console.log(`[Test] Completed processing device ${deviceUuid}`)
        } catch (error) {
          yield* Effect.logError(
            `[Test] Error processing device ${deviceUuid}`,
            error,
          )
          // Continue with next device
        }
      })
    }
    
    yield* Effect.logInfo('[Test] Completed test repair')
  }).pipe(Effect.provide(serviceLayer)) as Effect.Effect<void, any, never>

  try {
    console.log('Running test repair...\n')
    await Effect.runPromise(testEffect)
    console.log('\n' + '='.repeat(80))
    console.log('Test Repair Completed Successfully')
    console.log('='.repeat(80))
    process.exit(0)
  } catch (error) {
    console.error('\n' + '='.repeat(80))
    console.error('Test Repair Failed:')
    console.error('='.repeat(80))
    console.error(error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    process.exit(1)
  }
}

main()
