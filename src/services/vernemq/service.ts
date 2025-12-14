import type { Effect } from 'effect'
import type { DatabaseError } from '../../errors'
import { Context } from 'effect'

/**
 * MQTT message handler
 */
export type MqttMessageHandler = (topic: string, payload: Buffer) => Effect.Effect<void, any, any>

/**
 * Clean VerneMQService interface that abstracts away MQTT details
 * This makes it easy to mock and test without exposing MQTT internals
 */
export type VerneMQService = {
  /**
   * Check VerneMQ health/connectivity
   */
  readonly health: () => Effect.Effect<void, DatabaseError, never>
  /**
   * Subscribe to MQTT topics
   */
  readonly subscribe: (
    topic: string | string[],
    handler: MqttMessageHandler,
  ) => Effect.Effect<void, DatabaseError, never>
  /**
   * Unsubscribe from MQTT topics
   */
  readonly unsubscribe: (topic: string | string[]) => Effect.Effect<void, DatabaseError, never>
}

/**
 * Context tag for VerneMQService dependency injection
 */
export const VerneMQServiceTag = Context.GenericTag<VerneMQService>('VerneMQService')
