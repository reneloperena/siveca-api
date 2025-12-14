import type { AuthContext } from '../api/shared/context'
import { Effect } from 'effect'
import { PostgresServiceTag, type TelemetryQueryParams } from '../services/postgres/service'
import { validationError, badRequest } from '../errors'
import { decodeCompositeCursor } from './utils/cursor'
import { createPaginatedResultWithCompositeCursor, type PaginationParams } from './utils/pagination'
import { toApi, type TelemetryPointApi } from './mappers/telemetry'
import type { TelemetryPoint } from '../services/postgres/service'

/**
 * Telemetry query request parameters
 */
export type TelemetryQueryRequest = {
  deviceUuid?: string
  startTime: string // ISO 8601 timestamp
  endTime: string // ISO 8601 timestamp
  limit?: number
  after?: string // Relay-style cursor
}

/**
 * Query telemetry data with filtering and Relay-style pagination
 */
export function queryTelemetry(
  ctx: AuthContext,
  params: TelemetryQueryRequest,
): Effect.Effect<
  {
    edges: Array<{
      cursor: string
      node: TelemetryPointApi
    }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
  },
  any,
  any
> {
  return Effect.gen(function* () {
    // Validate and parse time range
    const startTime = new Date(params.startTime)
    const endTime = new Date(params.endTime)

    if (isNaN(startTime.getTime())) {
      return yield* Effect.fail(
        validationError('start_time', 'Invalid start_time format. Expected ISO 8601 timestamp.'),
      )
    }

    if (isNaN(endTime.getTime())) {
      return yield* Effect.fail(
        validationError('end_time', 'Invalid end_time format. Expected ISO 8601 timestamp.'),
      )
    }

    if (startTime >= endTime) {
      return yield* Effect.fail(
        validationError('time_range', 'start_time must be before end_time'),
      )
    }

    // Validate and set pagination limit
    const limit = params.limit ?? 100
    if (limit < 1 || limit > 1000) {
      return yield* Effect.fail(
        validationError('limit', 'limit must be between 1 and 1000'),
      )
    }

    // Decode cursor if provided
    let afterDeviceUuid: string | undefined
    let afterTime: Date | undefined

    if (params.after) {
      const decoded = yield* decodeCompositeCursor(params.after)
      afterDeviceUuid = decoded.deviceUuid
      afterTime = decoded.time
    }

    // Build query parameters
    const queryParams: TelemetryQueryParams = {
      deviceUuid: params.deviceUuid,
      startTime,
      endTime,
      limit,
      afterDeviceUuid,
      afterTime,
    }

    // Query telemetry data
    const service = yield* PostgresServiceTag
    const rows = yield* service.queryTelemetry(queryParams)

    // Create paginated result with composite cursor
    const paginationParams: PaginationParams = {
      limit,
      after: params.after,
    }

    return yield* createPaginatedResultWithCompositeCursor(
      rows,
      paginationParams,
      toApi,
      (row: TelemetryPoint) => ({
        deviceUuid: row.deviceUuid,
        time: row.time,
      }),
    )
  })
}
