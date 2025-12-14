import { Effect } from 'effect'
import { VerneMQServiceTag } from '../services/vernemq/service'
import { ingestTelemetry } from './telemetry-ingestion'

/**
 * Start listening to MQTT telemetry messages and ingest them
 */
export function startTelemetryListener(): Effect.Effect<void, any, any> {
  return Effect.gen(function* () {
    const mqttService = yield* VerneMQServiceTag

    // Subscribe to all device telemetry topics
    // Pattern: devices/{device_uuid}/telemetry
    const topicPattern = 'devices/+/telemetry'

    yield* Effect.logInfo(`Subscribing to MQTT topic: ${topicPattern}`)

    yield* mqttService.subscribe(topicPattern, (topic, payload) => {
      return Effect.gen(function* () {
        yield* ingestTelemetry(topic, payload)
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError('Failed to ingest telemetry', { topic }, error)
          }),
        ),
      )
    })

    yield* Effect.logInfo('Telemetry listener started and subscribed to MQTT topics')
  })
}
