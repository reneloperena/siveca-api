import type { TelemetryPayload } from './mappers/senml'
import { Effect } from 'effect'
import { PostgresServiceTag } from '../services/postgres/service'
import { parsingError } from '../errors'
import { senmlToDbNew } from './mappers/senml'

/**
 * Process and ingest a telemetry payload from MQTT
 */
export function ingestTelemetry(
  topic: string,
  payload: Buffer,
): Effect.Effect<void, any, any> {
  return Effect.gen(function* () {
    // Parse JSON payload
    let parsed: TelemetryPayload
    try {
      parsed = JSON.parse(payload.toString('utf8'))
    } catch (error) {
      return yield* Effect.fail(
        parsingError('parse_mqtt_payload', error, 400, 'INVALID_JSON'),
      )
    }

    // Validate payload structure
    if (!parsed.device_info || !parsed.measures || !Array.isArray(parsed.measures)) {
      return yield* Effect.fail(
        parsingError(
          'validate_mqtt_payload',
          new Error('Invalid payload structure: missing device_info or measures'),
          400,
          'INVALID_PAYLOAD',
        ),
      )
    }

    // Ensure station exists (auto-create or re-activate if soft-deleted)
    const service = yield* PostgresServiceTag
    const deviceUuid = parsed.device_info.uuid

    // Upsert station: create if not exists, or re-activate if soft-deleted
    yield* service.upsertStationForTelemetry({
      uuid: deviceUuid,
      name: null,
      model: parsed.device_info.model ?? null,
      fwVer: parsed.device_info.fw_ver ?? null,
      location: null,
      description: null,
      status: 'pending',
      autoCreated: true,
    })

    // Convert SenML to database format
    const ingestionTime = new Date()
    const dbNew = yield* senmlToDbNew(parsed, ingestionTime)

    // Insert into database
    yield* service.insertTelemetry(dbNew)

    yield* Effect.logInfo('Telemetry ingested', {
      deviceUuid: dbNew.deviceUuid,
      time: dbNew.time.toISOString(),
      topic,
    })
  })
}
