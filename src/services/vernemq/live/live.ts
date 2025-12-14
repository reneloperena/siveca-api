import type { DatabaseError } from '../../../errors'
import type { MqttMessageHandler } from '../service'
import { Effect, Layer } from 'effect'
import { databaseError } from '../../../errors'
import { VerneMQServiceTag } from '../service'
import { getMqttClient } from './mqtt-client'
import { PostgresLive } from '../../postgres'
import { LoggerLive } from '../../../logging'

function healthVerneMQ(): Effect.Effect<void, DatabaseError> {
  return Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: async () => {
        const client = await getMqttClient()
        if (!client.connected) {
          throw new Error('VerneMQ client not connected')
        }
      },
      catch: cause => databaseError('vernemq_health', cause),
    })
  })
}

function subscribeToTopics(
  topic: string | string[],
  handler: MqttMessageHandler,
): Effect.Effect<void, DatabaseError> {
  return Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: async () => {
        const client = await getMqttClient()
        const topics = Array.isArray(topic) ? topic : [topic]

        // Subscribe to topics
        await new Promise<void>((resolve, reject) => {
          client.subscribe(topics, { qos: 1 }, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })

        // Set up message handler
        // The handler needs PostgresLive and LoggerLive dependencies
        const handlerLayer = Layer.mergeAll(PostgresLive, LoggerLive)
        const messageListener = async (receivedTopic: string, payload: Buffer) => {
          try {
            const handlerEffect = handler(receivedTopic, payload)
            const providedEffect = handlerEffect.pipe(Effect.provide(handlerLayer)) as Effect.Effect<void, any, never>
            await Effect.runPromise(providedEffect)
          } catch (error) {
            console.error(`Error handling MQTT message on topic ${receivedTopic}:`, error)
          }
        }

        client.on('message', messageListener)
      },
      catch: cause => databaseError('mqtt_subscribe', cause),
    })
  })
}

function unsubscribeFromTopics(topic: string | string[]): Effect.Effect<void, DatabaseError> {
  return Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: async () => {
        const client = await getMqttClient()
        const topics = Array.isArray(topic) ? topic : [topic]

        await new Promise<void>((resolve, reject) => {
          client.unsubscribe(topics, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      },
      catch: cause => databaseError('mqtt_unsubscribe', cause),
    })
  })
}

/**
 * Live implementation of VerneMQService using mqtt.js internally
 */
const makeVerneMQService = Effect.gen(function* () {
  return VerneMQServiceTag.of({
    health: () => healthVerneMQ(),
    subscribe: (topic, handler) => subscribeToTopics(topic, handler),
    unsubscribe: (topic) => unsubscribeFromTopics(topic),
  })
})

/**
 * Live layer that provides VerneMQService
 */
export const VerneMQLive = Layer.effect(
  VerneMQServiceTag,
  makeVerneMQService,
)
