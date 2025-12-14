# Dependency stage
FROM node:22-slim AS dependencies

WORKDIR /app

COPY package*.json yarn.lock ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc yarn install --frozen-lockfile

# Build stage
FROM dependencies AS builder

COPY . .

RUN yarn build:docker

# Production stage
FROM node:22-slim AS production

ENV NODE_ENV=production

WORKDIR /app

# Copy the fully bundled application (no dependencies needed!)
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

CMD ["node", "--enable-source-maps", "dist/index.js"]
