import type { AppError, StandardErrorResponse } from '../../errors'

export function mapErrorToStandardResponse(
  error: AppError | any,
): StandardErrorResponse {
  // Try to parse if error is a stringified JSON (sometimes Effect stringifies errors)
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error)
      if (parsed?._tag) {
        error = parsed
      }
    }
    catch {
      // Not JSON, continue with string error
    }
  }

  // Also check if error.message contains stringified JSON (Effect may stringify in message)
  if (error?.message && typeof error.message === 'string' && error.message.startsWith('{') && error.message.includes('"_tag"')) {
    try {
      const parsed = JSON.parse(error.message)
      if (parsed?._tag) {
        // Replace error with the parsed object
        error = parsed
      }
    }
    catch {
      // Not JSON, continue
    }
  }

  // Check if error has _tag property (AppError structure)
  if (!error || typeof error !== 'object' || !error._tag) {
    // Not an AppError - try to extract from Effect error structure
    // Effect may wrap errors, check common properties
    const actualError = error?.cause || error?._originalError || error
    // If it's still not an AppError, return generic error with more details
    if (!actualError?._tag) {
      return {
        error: {
          code: 500,
          message: 'Internal server error',
          status: 'INTERNAL_ERROR',
          details: [
            {
              reason: 'UNKNOWN_ERROR',
              message: actualError?.message || error?.message || 'An unexpected error occurred',
            },
          ],
        },
      }
    }

    // If we extracted an AppError from the cause, use it
    error = actualError
  }

  switch (error._tag) {
    case 'NotFoundError':
      return {
        error: {
          code: error.statusCode,
          message: `${error.resource} with id '${error.id}' not found`,
          status: error.errorCode,
          details: [
            {
              field: 'id',
              reason: 'RESOURCE_NOT_FOUND',
              message: `The requested ${error.resource} does not exist`,
            },
          ],
        },
      }

    case 'ValidationError':
      return {
        error: {
          code: error.statusCode,
          message: `Invalid argument: ${error.field}`,
          status: error.errorCode,
          details: [
            {
              field: error.field,
              reason: 'INVALID_ARGUMENT',
              message: error.message,
            },
          ],
        },
      }

    case 'DatabaseError':
      return {
        error: {
          code: 500,
          message: 'Internal server error',
          status: 'INTERNAL_ERROR',
          details: [
            {
              reason: 'INTERNAL_ERROR',
              message: 'An internal error occurred',
            },
          ],
        },
      }

    case 'UnauthorizedError':
      return {
        error: {
          code: error.statusCode,
          message: 'Authentication required',
          status: error.errorCode,
          details: [
            {
              reason: 'UNAUTHENTICATED',
              message: error.message,
            },
          ],
        },
      }

    case 'ForbiddenError':
      return {
        error: {
          code: error.statusCode,
          message: 'Permission denied',
          status: error.errorCode,
          details: [
            {
              reason: 'PERMISSION_DENIED',
              message: `Access denied for action '${error.action}' on resource '${error.resource}'`,
            },
          ],
        },
      }

    case 'SpatialError':
      return {
        error: {
          code: error.statusCode,
          message: 'Spatial operation failed',
          status: error.errorCode,
          details: [
            {
              reason: 'SPATIAL_ERROR',
              message: `Spatial operation '${error.operation}' failed`,
            },
          ],
        },
      }

    case 'ConfigurationError':
      return {
        error: {
          code: 500,
          message: 'Internal server error',
          status: 'INTERNAL_ERROR',
          details: [
            {
              reason: 'INTERNAL_ERROR',
              message: 'An internal error occurred',
            },
          ],
        },
      }

    case 'ParsingError':
      return {
        error: {
          code: error.statusCode,
          message: `Parsing failed: ${error.operation}`,
          status: error.errorCode,
          details: [
            {
              reason: 'PARSE_ERROR',
              message: `Failed to parse data for operation '${error.operation}'`,
            },
          ],
        },
      }

    case 'CursorError':
      return {
        error: {
          code: error.statusCode,
          message: error.message,
          status: error.errorCode,
          details: [
            {
              reason: 'INVALID_CURSOR',
              message: error.message,
            },
          ],
        },
      }

    default:
      return {
        error: {
          code: 500,
          message: 'Internal server error',
          status: 'INTERNAL_ERROR',
          details: [
            {
              reason: 'UNKNOWN_ERROR',
              message: 'An unexpected error occurred',
            },
          ],
        },
      }
  }
}
