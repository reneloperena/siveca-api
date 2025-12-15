import { Effect } from 'effect'
import { encodeCursor } from './cursor'

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
 * Pagination parameters (Relay-style)
 */
export type PaginationParams = {
  limit: number
  after?: string // Forward pagination cursor
  before?: string // Backward pagination cursor
  isBackward?: boolean // Whether this is backward pagination
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

    // Determine pagination direction
    const isBackward = params.isBackward ?? false
    
    return {
      edges,
      pageInfo: {
        // For forward pagination: hasNextPage if we got limit items, hasPreviousPage if we have an after cursor
        // For backward pagination: hasPreviousPage if we got limit items, hasNextPage if we have a before cursor
        hasNextPage: isBackward ? Boolean(params.before) : edges.length === params.limit,
        hasPreviousPage: isBackward ? edges.length === params.limit : Boolean(params.after),
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

    // Determine pagination direction
    const isBackward = params.isBackward ?? false
    
    return {
      edges,
      pageInfo: {
        // For forward pagination: hasNextPage if we got limit items, hasPreviousPage if we have an after cursor
        // For backward pagination: hasPreviousPage if we got limit items, hasNextPage if we have a before cursor
        hasNextPage: isBackward ? Boolean(params.before) : edges.length === params.limit,
        hasPreviousPage: isBackward ? edges.length === params.limit : Boolean(params.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    }
  })
}

/**
 * Creates a paginated result with cursor from cursor_id field
 *
 * @param rows - Array of database rows
 * @param params - Pagination parameters
 * @param toApi - Function to convert database row to API format
 * @param getCursorId - Function to extract cursor_id from database row
 * @returns Effect that resolves to paginated result
 */
export function createPaginatedResultWithCursor<TDb, TApi, E = any, R = any>(
  rows: TDb[],
  params: PaginationParams,
  toApi: (row: TDb) => Effect.Effect<TApi, E, R>,
  getCursorId: (row: TDb) => string,
): Effect.Effect<PaginationResult<TApi>, E, R> {
  return Effect.gen(function* () {
    const edges = yield* Effect.all(
      rows.map(r =>
        Effect.gen(function* () {
          const node = yield* toApi(r)
          const cursorId = getCursorId(r)
          const cursor = yield* encodeCursor(cursorId)
          return { cursor, node }
        }),
      ),
    )

    // Determine pagination direction
    const isBackward = params.isBackward ?? false
    
    return {
      edges,
      pageInfo: {
        // For forward pagination: hasNextPage if we got limit items, hasPreviousPage if we have an after cursor
        // For backward pagination: hasPreviousPage if we got limit items, hasNextPage if we have a before cursor
        hasNextPage: isBackward ? Boolean(params.before) : edges.length === params.limit,
        hasPreviousPage: isBackward ? edges.length === params.limit : Boolean(params.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    }
  })
}
