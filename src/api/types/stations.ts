import { Type, Static } from '@sinclair/typebox'

/**
 * Location point schema
 */
export const LocationSchema = Type.Object({
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
})

/**
 * Station API schema
 */
export const StationSchema = Type.Object({
  uuid: Type.String({ description: 'Station UUID (matches device_uuid)' }),
  name: Type.Union([Type.String(), Type.Null()], { description: 'Display name' }),
  model: Type.Union([Type.String(), Type.Null()], { description: 'Device model' }),
  fwVer: Type.Union([Type.String(), Type.Null()], { description: 'Firmware version' }),
  location: Type.Union([LocationSchema, Type.Null()], { description: 'Geolocation' }),
  description: Type.Union([Type.String(), Type.Null()], { description: 'Description' }),
  status: Type.String({ description: 'Status: pending, active, inactive, maintenance' }),
  autoCreated: Type.Boolean({ description: 'Whether station was auto-created from telemetry' }),
  deletedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
    description: 'Soft delete timestamp',
  }),
  createdAt: Type.String({ format: 'date-time', description: 'Creation timestamp' }),
  updatedAt: Type.String({ format: 'date-time', description: 'Last update timestamp' }),
})

export type Station = Static<typeof StationSchema>

/**
 * Create station request schema
 */
export const CreateStationRequestSchema = Type.Object({
  uuid: Type.String({ description: 'Station UUID (must match device_uuid from telemetry)' }),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  model: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  fwVer: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  location: Type.Optional(Type.Union([LocationSchema, Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  status: Type.Optional(Type.String({ default: 'pending' })),
  autoCreated: Type.Optional(Type.Boolean({ default: false })),
})

export type CreateStationRequest = Static<typeof CreateStationRequestSchema>

/**
 * Update station request schema
 */
export const UpdateStationRequestSchema = Type.Object({
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  model: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  fwVer: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  location: Type.Optional(Type.Union([LocationSchema, Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  status: Type.Optional(Type.String()),
})

export type UpdateStationRequest = Static<typeof UpdateStationRequestSchema>

/**
 * Station list query parameters
 */
export const StationListParamsSchema = Type.Object({
  status: Type.Optional(Type.String({ description: 'Filter by status' })),
})

export type StationListParams = Static<typeof StationListParamsSchema>
