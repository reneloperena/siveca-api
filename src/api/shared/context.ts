/**
 * Shared authentication context type used by both HTTP and WebSocket handlers.
 * Supports different authentication types: User and Device
 */
export type AuthContext = UserAuthContext | DeviceAuthContext

/**
 * User authentication context (for human users)
 */
export type UserAuthContext = {
  type: 'user'
  userId: string
  username: string
  roles: string[]
  traceId: string
}

/**
 * Device authentication context (for IoT devices)
 */
export type DeviceAuthContext = {
  type: 'device'
  deviceId: string
  deviceName: string
  capabilities: string[]
  traceId: string
}
