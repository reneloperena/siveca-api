import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { hostname } from 'node:os'
import process from 'node:process'
import logger from '@vuhio/logging'
import * as Logger from 'effect/Logger'

// Get container ID if running in Docker, otherwise use hostname
function getInstanceId(): string {
  try {
    // Try to get container ID from /proc/self/cgroup (more reliable in Docker)
    const cgroup = readFileSync('/proc/self/cgroup', 'utf-8')
    // Docker cgroup format: .../docker/[container-id]...
    const dockerMatch = cgroup.match(/\/docker\/([a-f0-9]{64}|[a-f0-9]{12})/)
    if (dockerMatch) {
      // Return first 12 chars (short container ID)
      return dockerMatch[1].substring(0, 12)
    }

    // Fallback: check if hostname is a container ID
    const hostname = readFileSync('/etc/hostname', 'utf-8').trim()
    if (/^[a-f0-9]{12}$/i.test(hostname)) {
      return hostname
    }
    // Use hostname if it's not a container ID
    if (hostname) {
      return hostname
    }
  }
  catch {
    // Fall through to try process hostname
  }

  // Final fallback: use process hostname or UUID
  try {
    const systemHostname = process.env.HOSTNAME || hostname()
    if (systemHostname) {
      return systemHostname
    }
  }
  catch {
    // Ignore
  }

  // Last resort: generate UUID
  return randomUUID()
}

const instanceId = getInstanceId()

const levelMap = {
  fatal: 'fatal',
  error: 'error',
  warning: 'warn',
  info: 'info',
  debug: 'debug',
  trace: 'trace',
} as const

// Helper to clean up Effect internal fields
function cleanObject(obj: any): any {
  if (obj === null || obj === undefined)
    return obj

  if (typeof obj !== 'object')
    return obj

  if (Array.isArray(obj))
    return obj.map(cleanObject)

  // Skip Effect internal objects with _id and _tag
  if (obj._id && obj._tag && Object.keys(obj).length <= 3) {
    // Extract useful fields if they exist
    const cleaned: any = {}
    if (obj.id !== undefined)
      cleaned.id = obj.id
    if (obj.startTimeMillis !== undefined)
      cleaned.startTimeMillis = obj.startTimeMillis
    if (obj.values && Array.isArray(obj.values) && obj.values.length > 0)
      cleaned.values = cleanObject(obj.values)
    if (Object.keys(cleaned).length > 0)
      return cleaned
    return undefined
  }

  // Recursively clean object properties
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip Effect internal fields
    if (key === '_id' || key === '_tag')
      continue

    const cleanedValue = cleanObject(value)
    if (cleanedValue !== undefined)
      cleaned[key] = cleanedValue
  }

  return cleaned
}

// Logger that formats logs and outputs to pino
const pinoLogger = Logger.make((options) => {
  const { logLevel, message, annotations, spans, fiberId, date, cause } = options
  const normalizedLevel = logLevel.label.toLowerCase() as keyof typeof levelMap

  // Extract fiberId number instead of stringifying the whole object
  let fiberIdNumber: number | undefined
  try {
    const fiberIdObj = fiberId as any
    if (typeof fiberIdObj === 'object' && fiberIdObj.id !== undefined)
      fiberIdNumber = fiberIdObj.id
    else if (typeof fiberId === 'string')
      fiberIdNumber = Number.parseInt(fiberId, 10)
  }
  catch {
    // Ignore if we can't extract
  }

  const payload: Record<string, unknown> = {
    level: levelMap[normalizedLevel] ?? 'info',
    levelLabel: logLevel.label,
    timestamp: date.toISOString(),
    instanceId,
  }

  if (fiberIdNumber !== undefined)
    payload.fiberId = fiberIdNumber

  // Clean and include annotations if they have useful data
  if (annotations) {
    const cleanedAnnotations = cleanObject(annotations)
    if (cleanedAnnotations && typeof cleanedAnnotations === 'object' && Object.keys(cleanedAnnotations).length > 0)
      payload.annotations = cleanedAnnotations
  }

  const values = Array.isArray(message) ? message : message == null ? [] : [message]

  // Keep values as objects, don't stringify
  if (values.length > 1) {
    payload.values = values.map((v) => {
      // Keep objects as objects, only stringify for the message text
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null)
        return v
      if (v instanceof Error)
        return { error: v.message, stack: v.stack }
      return cleanObject(v)
    })
  }

  const spanEntries = Array.from(spans).map(span => ({
    label: span.label,
    startTime: span.startTime,
    durationMs: date.getTime() - span.startTime,
  }))
  if (spanEntries.length > 0)
    payload.spans = spanEntries

  // Only include cause if it has useful information
  if (cause) {
    const cleanedCause = cleanObject(cause)
    if (cleanedCause && typeof cleanedCause === 'object' && Object.keys(cleanedCause).length > 0)
      payload.cause = cleanedCause
  }

  // Format message text for display
  const msg = values
    .map((value) => {
      if (typeof value === 'string')
        return value
      if (value instanceof Error)
        return value.stack ?? value.message
      if (typeof value === 'object' && value !== null) {
        // For message text, stringify objects but keep the structured data in payload
        try {
          return JSON.stringify(cleanObject(value))
        }
        catch {
          return String(value)
        }
      }
      return String(value)
    })
    .join(' ')

  if (msg)
    payload.msg = msg

  const pinoLevel = levelMap[normalizedLevel] ?? 'info'
  const logFn = ((logger as any)[pinoLevel] ?? logger.info).bind(logger)

  logFn(payload)
})

// Replace the default logger with our pino logger
export const LoggerLive = Logger.replace(Logger.defaultLogger, pinoLogger)
