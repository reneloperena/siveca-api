import mqtt from 'mqtt'
import { config } from '../../../config'

let client: mqtt.MqttClient | null = null

export async function getMqttClient(): Promise<mqtt.MqttClient> {
  if (client && client.connected) {
    return client
  }

  const options: mqtt.IClientOptions = {
    host: config.VERNEMQ_HOST,
    port: config.VERNEMQ_PORT,
    reconnectPeriod: 1000,
    connectTimeout: 5000,
    keepalive: 60,
  }

  if (config.VERNEMQ_USERNAME && config.VERNEMQ_PASSWORD) {
    options.username = config.VERNEMQ_USERNAME
    options.password = config.VERNEMQ_PASSWORD
  }

  // If client exists but not connected, try to reconnect
  if (client && !client.connected) {
    client.reconnect()
  } else if (!client) {
    client = mqtt.connect(options)
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MQTT connection timeout'))
    }, 5000)

    if (client!.connected) {
      clearTimeout(timeout)
      resolve(client!)
      return
    }

    client!.once('connect', () => {
      clearTimeout(timeout)
      resolve(client!)
    })

    client!.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}
