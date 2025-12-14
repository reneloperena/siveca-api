import type { FastifyInstance } from 'fastify'
import yaml from 'js-yaml'
import config from '../../config'

/**
 * Generate AsyncAPI specification for WebSocket endpoints
 */
export function getAsyncApiSpec() {
  return {
    asyncapi: '3.0.0',
    info: {
      title: 'Siveca API - WebSocket',
      version: '1.0.0',
      description: 'WebSocket API for real-time updates',
    },
    servers: {
      production: {
        host: `localhost:${config.PORT}`,
        protocol: 'ws',
        pathname: '/api/ws',
        description: 'Production WebSocket server',
      },
      development: {
        host: `localhost:${config.PORT}`,
        protocol: 'ws',
        pathname: '/api/ws',
        description: 'Development WebSocket server',
      },
    },
    channels: {},
    operations: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT authentication token provided via Sec-WebSocket-Protocol header.\n'
            + 'Supported formats: `bearer,<token>`, `jwt.<token>`, or just `<token>`',
        },
      },
      messages: {},
    },
  }
}

/**
 * Register AsyncAPI documentation endpoints
 */
export async function registerAsyncApiDocs(fastify: FastifyInstance) {
  // JSON endpoint
  fastify.get('/asyncapi.json', async (_req, _reply) => {
    return getAsyncApiSpec()
  })

  // YAML endpoint (most tools expect .yaml or .yml)
  fastify.get('/asyncapi.yaml', async (_req, _reply) => {
    const spec = getAsyncApiSpec()
    const yamlContent = yaml.dump(spec, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      quotingType: '"',
      forceQuotes: false,
    })
    _reply.type('application/x-yaml').send(yamlContent)
  })

  // Also support .yml extension
  fastify.get('/asyncapi.yml', async (_req, _reply) => {
    const spec = getAsyncApiSpec()
    const yamlContent = yaml.dump(spec, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      quotingType: '"',
      forceQuotes: false,
    })
    _reply.type('application/x-yaml').send(yamlContent)
  })
}
