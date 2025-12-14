export type StandardErrorResponse = {
  readonly error: {
    readonly code: number
    readonly message: string
    readonly status: string
    readonly details?: Array<{
      readonly field?: string
      readonly reason: string
      readonly message: string
    }>
  }
}

export type AppError
  = | NotFoundError
    | ValidationError
    | DatabaseError
    | UnauthorizedError
    | ForbiddenError
    | SpatialError
    | ConfigurationError
    | ParsingError
    | CursorError

export type NotFoundError = {
  readonly _tag: 'NotFoundError'
  readonly resource: string
  readonly id: string
  readonly statusCode: number
  readonly errorCode: string
}

export type ValidationError = {
  readonly _tag: 'ValidationError'
  readonly field: string
  readonly message: string
  readonly statusCode: number
  readonly errorCode: string
}

export type DatabaseError = {
  readonly _tag: 'DatabaseError'
  readonly operation: string
  readonly cause: unknown
  readonly statusCode: number
  readonly errorCode: string
}

export type UnauthorizedError = {
  readonly _tag: 'UnauthorizedError'
  readonly message: string
  readonly statusCode: number
  readonly errorCode: string
}

export type ForbiddenError = {
  readonly _tag: 'ForbiddenError'
  readonly resource: string
  readonly action: string
  readonly statusCode: number
  readonly errorCode: string
}

export type SpatialError = {
  readonly _tag: 'SpatialError'
  readonly operation: string
  readonly cause: unknown
  readonly statusCode: number
  readonly errorCode: string
}

export type ConfigurationError = {
  readonly _tag: 'ConfigurationError'
  readonly key: string
  readonly message: string
  readonly statusCode: number
  readonly errorCode: string
}

export type ParsingError = {
  readonly _tag: 'ParsingError'
  readonly operation: string
  readonly cause: unknown
  readonly statusCode: number
  readonly errorCode: string
}

export type CursorError = {
  readonly _tag: 'CursorError'
  readonly message: string
  readonly cause?: unknown
  readonly statusCode: number
  readonly errorCode: string
}

export function notFound(
  resource: string,
  id: string,
  statusCode = 404,
  errorCode = 'NOT_FOUND',
): NotFoundError {
  return {
    _tag: 'NotFoundError',
    resource,
    id,
    statusCode,
    errorCode,
  }
}

export function notFoundError(
  message: string,
  statusCode = 404,
  errorCode = 'NOT_FOUND',
): NotFoundError {
  return {
    _tag: 'NotFoundError',
    resource: 'Resource',
    id: '',
    statusCode,
    errorCode,
    message,
  } as NotFoundError & { message: string }
}

export function validationError(
  field: string,
  message: string,
  statusCode = 400,
  errorCode = 'INVALID_ARGUMENT',
): ValidationError {
  return {
    _tag: 'ValidationError',
    field,
    message,
    statusCode,
    errorCode,
  }
}

export function databaseError(
  operation: string,
  cause: unknown,
  statusCode = 500,
  errorCode = 'INTERNAL_ERROR',
): DatabaseError {
  return {
    _tag: 'DatabaseError',
    operation,
    cause,
    statusCode,
    errorCode,
  }
}

export function unauthorizedError(
  message: string,
  statusCode = 401,
  errorCode = 'UNAUTHENTICATED',
): UnauthorizedError {
  return {
    _tag: 'UnauthorizedError',
    message,
    statusCode,
    errorCode,
  }
}

export function forbiddenError(
  resource: string,
  action: string,
  statusCode = 403,
  errorCode = 'PERMISSION_DENIED',
): ForbiddenError {
  return {
    _tag: 'ForbiddenError',
    resource,
    action,
    statusCode,
    errorCode,
  }
}

export function spatialError(
  operation: string,
  cause: unknown,
  statusCode = 500,
  errorCode = 'INTERNAL_ERROR',
): SpatialError {
  return {
    _tag: 'SpatialError',
    operation,
    cause,
    statusCode,
    errorCode,
  }
}

export function configurationError(
  key: string,
  message: string,
  statusCode = 500,
  errorCode = 'INTERNAL_ERROR',
): ConfigurationError {
  return {
    _tag: 'ConfigurationError',
    key,
    message,
    statusCode,
    errorCode,
  }
}

export function parsingError(
  operation: string,
  cause: unknown,
  statusCode = 400,
  errorCode = 'INVALID_ARGUMENT',
): ParsingError {
  return {
    _tag: 'ParsingError',
    operation,
    cause,
    statusCode,
    errorCode,
  }
}

export function cursorError(
  message: string,
  cause?: unknown,
  statusCode = 400,
  errorCode = 'INVALID_ARGUMENT',
): CursorError {
  return {
    _tag: 'CursorError',
    message,
    cause,
    statusCode,
    errorCode,
  }
}

// Helper functions for common HTTP errors
export function conflict(
  message: string,
  details?: Record<string, unknown>,
  statusCode = 409,
  errorCode = 'CONFLICT',
): ValidationError {
  return {
    _tag: 'ValidationError',
    field: 'general',
    message: details ? `${message}: ${JSON.stringify(details)}` : message,
    statusCode,
    errorCode,
  }
}

export function badRequest(
  message: string,
  statusCode = 400,
  errorCode = 'BAD_REQUEST',
): ValidationError {
  return {
    _tag: 'ValidationError',
    field: 'general',
    message,
    statusCode,
    errorCode,
  }
}

export function gone(
  message: string,
  statusCode = 410,
  errorCode = 'GONE',
): NotFoundError {
  return {
    _tag: 'NotFoundError',
    resource: 'Resource',
    id: '',
    statusCode,
    errorCode,
    message,
  } as NotFoundError & { message: string }
}
