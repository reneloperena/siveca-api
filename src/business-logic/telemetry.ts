import { Effect } from 'effect'
import { PostgresServiceTag, type TelemetryQueryParams } from '../services/postgres/service'
import { validationError, badRequest } from '../errors'
import { decodeCursor } from './utils/cursor'
import { createPaginatedResultWithCursor, type PaginationParams } from './utils/pagination'
import { toApi, type TelemetryPointApi } from './mappers/telemetry'
import type { TelemetryPoint } from '../services/postgres/service'

/**
 * Telemetry query request parameters (Relay-style pagination)
 */
export type TelemetryQueryRequest = {
  deviceUuid?: string
  startTime?: string // ISO 8601 timestamp (optional)
  endTime?: string // ISO 8601 timestamp (optional)
  // Forward pagination
  first?: number
  after?: string // Cursor for forward pagination
  // Backward pagination
  last?: number
  before?: string // Cursor for backward pagination
}

/**
 * Query telemetry data with filtering and Relay-style pagination
 */
export function queryTelemetry(
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
    // Parse time range, defaulting to all time if not provided
    let startTime: Date
    let endTime: Date

    if (params.startTime) {
      startTime = new Date(params.startTime)
      if (isNaN(startTime.getTime())) {
        return yield* Effect.fail(
          validationError('start_time', 'Invalid start_time format. Expected ISO 8601 timestamp.'),
        )
      }
    } else {
      // Default to beginning of time (year 1970)
      startTime = new Date(0)
    }

    if (params.endTime) {
      endTime = new Date(params.endTime)
      if (isNaN(endTime.getTime())) {
        return yield* Effect.fail(
          validationError('end_time', 'Invalid end_time format. Expected ISO 8601 timestamp.'),
        )
      }
    } else {
      // Default to far future (year 2100)
      endTime = new Date('2100-01-01T00:00:00.000Z')
    }

    if (startTime >= endTime) {
      return yield* Effect.fail(
        validationError('time_range', 'start_time must be before end_time'),
      )
    }

    // Validate Relay-style pagination parameters
    if (params.first && params.last) {
      return yield* Effect.fail(
        validationError('pagination', 'Cannot use both first and last. Use first for forward pagination, last for backward.'),
      )
    }

    if (params.after && params.before) {
      return yield* Effect.fail(
        validationError('pagination', 'Cannot use both after and before. Use after with first, before with last.'),
      )
    }

    // Determine pagination direction and limit
    const isForward = Boolean(params.first || params.after)
    const isBackward = Boolean(params.last || params.before)
    const limit = params.first ?? params.last ?? 100 // Default to 100 if neither specified

    if (limit < 1 || limit > 1000) {
      return yield* Effect.fail(
        validationError('pagination', 'first/last must be between 1 and 1000'),
      )
    }

    // Decode cursor if provided (now just a simple UUID)
    let afterCursor: string | undefined
    let beforeCursor: string | undefined

    if (params.after) {
      afterCursor = yield* decodeCursor(params.after)
    }

    if (params.before) {
      beforeCursor = yield* decodeCursor(params.before)
    }

    // Build query parameters
    const queryParams: TelemetryQueryParams = {
      deviceUuid: params.deviceUuid,
      startTime,
      endTime,
      limit,
      afterCursor,
      beforeCursor,
      isBackward,
    }

    // Query telemetry data
    const service = yield* PostgresServiceTag
    const rows = yield* service.queryTelemetry(queryParams)

    // Create paginated result with cursor_id
    const paginationParams: PaginationParams = {
      limit,
      after: params.after,
      before: params.before,
      isBackward,
    }

    return yield* createPaginatedResultWithCursor(
      rows,
      paginationParams,
      toApi,
      (row: TelemetryPoint) => row.cursorId,
    )
  })
}
