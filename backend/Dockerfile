# ───────────────────────────────────────────────────────────
# FixDesk Backend Dockerfile
# ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Run migrations and start API server
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]
