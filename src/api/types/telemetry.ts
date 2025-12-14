import { Type, Static } from '@sinclair/typebox'

/**
 * Telemetry point API type
 */
export const TelemetryPointSchema = Type.Object({
  time: Type.String({ format: 'date-time', description: 'ISO 8601 timestamp' }),
  deviceUuid: Type.String({ description: 'Device UUID' }),
  fwVer: Type.Union([Type.String(), Type.Null()], { description: 'Firmware version' }),
  model: Type.Union([Type.String(), Type.Null()], { description: 'Device model' }),
  ingestedAt: Type.String({ format: 'date-time', description: 'Ingestion timestamp' }),
  temp: Type.Union([Type.Number(), Type.Null()], { description: 'Temperature' }),
  hum: Type.Union([Type.Number(), Type.Null()], { description: 'Humidity' }),
  pres: Type.Union([Type.Number(), Type.Null()], { description: 'Pressure' }),
  pm1: Type.Union([Type.Number(), Type.Null()], { description: 'PM1' }),
  pm25: Type.Union([Type.Number(), Type.Null()], { description: 'PM2.5' }),
  pm10: Type.Union([Type.Number(), Type.Null()], { description: 'PM10' }),
  no: Type.Union([Type.Number(), Type.Null()], { description: 'NO' }),
  no2: Type.Union([Type.Number(), Type.Null()], { description: 'NO2' }),
  o3: Type.Union([Type.Number(), Type.Null()], { description: 'O3' }),
  so2: Type.Union([Type.Number(), Type.Null()], { description: 'SO2' }),
  co: Type.Union([Type.Number(), Type.Null()], { description: 'CO' }),
  h2s: Type.Union([Type.Number(), Type.Null()], { description: 'H2S' }),
  nh3: Type.Union([Type.Number(), Type.Null()], { description: 'NH3' }),
  co2: Type.Union([Type.Number(), Type.Null()], { description: 'CO2' }),
  voc: Type.Union([Type.Number(), Type.Null()], { description: 'VOC' }),
  noise: Type.Union([Type.Number(), Type.Null()], { description: 'Noise' }),
  solarRad: Type.Union([Type.Number(), Type.Null()], { description: 'Solar radiation' }),
  rainRate: Type.Union([Type.Number(), Type.Null()], { description: 'Rain rate' }),
  windDir: Type.Union([Type.Number(), Type.Null()], { description: 'Wind direction' }),
  windSpd: Type.Union([Type.Number(), Type.Null()], { description: 'Wind speed' }),
  lux: Type.Union([Type.Number(), Type.Null()], { description: 'Lux' }),
  extras: Type.Record(Type.String(), Type.Any(), { description: 'Additional fields' }),
})

export type TelemetryPoint = Static<typeof TelemetryPointSchema>

/**
 * Telemetry edge (Relay-style)
 */
export const TelemetryEdgeSchema = Type.Object({
  cursor: Type.String({ description: 'Cursor for pagination' }),
  node: TelemetryPointSchema,
})

export type TelemetryEdge = Static<typeof TelemetryEdgeSchema>

/**
 * Page info (Relay-style)
 */
export const TelemetryPageInfoSchema = Type.Object({
  hasNextPage: Type.Boolean({ description: 'Whether there are more pages' }),
  hasPreviousPage: Type.Boolean({ description: 'Whether there are previous pages' }),
  startCursor: Type.Optional(Type.String({ description: 'Cursor of first item' })),
  endCursor: Type.Optional(Type.String({ description: 'Cursor of last item' })),
})

export type TelemetryPageInfo = Static<typeof TelemetryPageInfoSchema>

/**
 * Paginated telemetry response (Relay-style)
 */
export const TelemetryPaginationResultSchema = Type.Object({
  edges: Type.Array(TelemetryEdgeSchema, { description: 'Telemetry edges' }),
  pageInfo: TelemetryPageInfoSchema,
})

export type TelemetryPaginationResult = Static<typeof TelemetryPaginationResultSchema>

/**
 * Telemetry query request
 */
export const TelemetryQueryRequestSchema = Type.Object({
  device_uuid: Type.Optional(Type.String({ description: 'Filter by device UUID' })),
  start_time: Type.String({ format: 'date-time', description: 'Start time (ISO 8601)' }),
  end_time: Type.String({ format: 'date-time', description: 'End time (ISO 8601)' }),
  limit: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 1000, default: 100, description: 'Page size' }),
  ),
  after: Type.Optional(Type.String({ description: 'Cursor for pagination' })),
})

export type TelemetryQueryRequest = Static<typeof TelemetryQueryRequestSchema>
