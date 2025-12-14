# Siveca API

API service for the Siveca platform.

## Architecture

This project follows clean architecture principles with strict separation of concerns:

- **API Layer** (`src/api/`) - Super lean, only route registration and schema definitions
- **Business Logic** (`src/business-logic/`) - All business logic, mappers, validations
- **Services** (`src/services/`) - Infrastructure integrations only

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Run the development server:
```bash
yarn dev
```

## Health Checks

The API provides three health check endpoints:

- `/v1/live` - Liveness probe (no dependencies)
- `/v1/ready` - Readiness probe (checks all dependencies)
- `/v1/health` - Detailed health check with dependency status

Health checks verify:
- TimescaleDB (PostgreSQL with TimescaleDB extension)
- VerneMQ (MQTT broker)
- Auth service

## API Documentation

- OpenAPI/Swagger: http://localhost:3333/docs
- AsyncAPI: http://localhost:3333/api/ws/asyncapi.json

## Development

```bash
# Run tests
yarn test

# Run linter
yarn lint

# Build
yarn build
```
