import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect } from 'effect'
import { AuthServiceTag, PostgresServiceTag, VerneMQServiceTag } from '../services'

// Resolve path relative to this file's location, then go to project root
// Try to find package.json by going up directories
const __filename = fileURLToPath(import.meta.url)
let currentDir = dirname(__filename)
let packageJsonPath: string | null = null

// Walk up the directory tree to find package.json
while (currentDir !== dirname(currentDir)) {
  const candidate = join(currentDir, 'package.json')
  try {
    readFileSync(candidate, 'utf-8')
    packageJsonPath = candidate
    break
  }
  catch {
    // Continue searching
  }
  currentDir = dirname(currentDir)
}

if (!packageJsonPath) {
  throw new Error('Could not find package.json')
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

const startTime = Date.now()

export function liveness() {
  // Just check if process is up - no dependencies
  return Effect.succeed({ status: 'ok' })
}

export function readiness() {
  // Quick dependency checks - fail fast if anything is down
  return Effect.gen(function* () {
    const postgresService = yield* PostgresServiceTag
    const vernemqService = yield* VerneMQServiceTag
    const authService = yield* AuthServiceTag

    // Run health checks in parallel with short timeout, fail if any error
    yield* Effect.all([
      postgresService.health().pipe(Effect.timeout(500)),
      vernemqService.health().pipe(Effect.timeout(500)),
      authService.health().pipe(Effect.timeout(500)),
    ], { concurrency: 'unbounded' })

    return { status: 'ready' }
  })
}

function checkDependency(
  name: string,
  healthCheck: () => Effect.Effect<void, any, any>,
  timeoutMs: number = 1500,
) {
  return Effect.gen(function* () {
    const start = Date.now()
    const result = yield* Effect.match(
      healthCheck().pipe(Effect.timeout(timeoutMs)),
      {
        onFailure: (error: any) => {
          const latency = Date.now() - start
          return {
            status: 'error',
            latencyMs: latency,
            checkedAt: new Date().toISOString(),
            error: error._tag === 'TimeoutException'
              ? `Health check timed out (>${timeoutMs}ms)`
              : error.message || 'Health check failed',
          }
        },
        onSuccess: () => {
          const latency = Date.now() - start
          return {
            status: 'ok',
            latencyMs: latency,
            checkedAt: new Date().toISOString(),
          }
        },
      },
    )
    return result
  })
}

export function health() {
  // Deep health check with latency and details (≤2s cap)
  return Effect.gen(function* () {
    const postgresService = yield* PostgresServiceTag
    const vernemqService = yield* VerneMQServiceTag
    const authService = yield* AuthServiceTag

    // Check dependencies in parallel with timeouts
    const [timescaledb, vernemq, auth] = yield* Effect.all([
      checkDependency('timescaledb', () => postgresService.health()),
      checkDependency('vernemq', () => vernemqService.health()),
      checkDependency('auth', () => authService.health()),
    ], { concurrency: 'unbounded' })

    const dependencies: Record<string, any> = {
      timescaledb,
      vernemq,
      auth,
    }

    // Determine overall status
    const hasErrors = Object.values(dependencies).some((dep: any) => dep.status === 'error')
    const hasWarnings = Object.values(dependencies).some((dep: any) => dep.status === 'warn')
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warn' : 'ok'

    const uptimeSec = Math.floor((Date.now() - startTime) / 1000)

    return {
      service: packageJson.name || 'unknown',
      version: packageJson.version || 'unknown',
      status: overallStatus,
      uptimeSec,
      dependencies,
    }
  })
}
