import { Effect } from 'effect'
import { encodeCursor, encodeCompositeCursor } from './cursor'

/**
 * Generic pagination result structure (Relay-style)
 */
export type PaginationResult<T> = {
  edges: Array<{
    cursor: string
    node: T
  }>
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
  }
}

/**
 * Pagination parameters
 */
export type PaginationParams = {
  limit: number
  after?: string
}

/**
 * Creates a paginated result from database rows
 *
 * @param rows - Array of database rows
 * @param params - Pagination parameters
 * @param toApi - Function to convert database row to API format
 * @returns Effect that resolves to paginated result
 */
export function createPaginatedResult<TDb, TApi, E = any, R = any>(
  rows: TDb[],
  params: PaginationParams,
  toApi: (row: TDb) => Effect.Effect<TApi, E, R>,
): Effect.Effect<PaginationResult<TApi>, E, R> {
  return Effect.gen(function* () {
    const edges = yield* Effect.all(
      rows.map(r =>
        Effect.gen(function* () {
          const node = yield* toApi(r)
          const cursor = yield* encodeCursor((r as any).id) // Type assertion for id field
          return { cursor, node }
        }),
      ),
    )

    return {
      edges,
      pageInfo: {
        hasNextPage: edges.length === params.limit,
        hasPreviousPage: Boolean(params.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    }
  })
}

/**
 * Creates a paginated result from database rows with a custom ID field
 *
 * @param rows - Array of database rows
 * @param params - Pagination parameters
 * @param toApi - Function to convert database row to API format
 * @param getId - Function to extract ID from database row
 * @returns Effect that resolves to paginated result
 */
export function createPaginatedResultWithId<TDb, TApi, E = any, R = any>(
  rows: TDb[],
  params: PaginationParams,
  toApi: (row: TDb) => Effect.Effect<TApi, E, R>,
  getId: (row: TDb) => string,
): Effect.Effect<PaginationResult<TApi>, E, R> {
  return Effect.gen(function* () {
    const edges = yield* Effect.all(
      rows.map(r =>
        Effect.gen(function* () {
          const node = yield* toApi(r)
          const cursor = yield* encodeCursor(getId(r))
          return { cursor, node }
        }),
      ),
    )

    return {
      edges,
      pageInfo: {
        hasNextPage: edges.length === params.limit,
        hasPreviousPage: Boolean(params.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    }
  })
}

/**
 * Creates a paginated result with composite cursor (for composite primary keys)
 *
 * @param rows - Array of database rows
 * @param params - Pagination parameters
 * @param toApi - Function to convert database row to API format
 * @param getCompositeId - Function to extract composite ID (deviceUuid, time) from database row
 * @returns Effect that resolves to paginated result
 */
export function createPaginatedResultWithCompositeCursor<TDb, TApi, E = any, R = any>(
  rows: TDb[],
  params: PaginationParams,
  toApi: (row: TDb) => Effect.Effect<TApi, E, R>,
  getCompositeId: (row: TDb) => { deviceUuid: string; time: Date },
): Effect.Effect<PaginationResult<TApi>, E, R> {
  return Effect.gen(function* () {
    const edges = yield* Effect.all(
      rows.map(r =>
        Effect.gen(function* () {
          const node = yield* toApi(r)
          const compositeId = getCompositeId(r)
          const cursor = yield* encodeCompositeCursor(compositeId.deviceUuid, compositeId.time)
          return { cursor, node }
        }),
      ),
    )

    return {
      edges,
      pageInfo: {
        hasNextPage: edges.length === params.limit,
        hasPreviousPage: Boolean(params.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    }
  })
}
