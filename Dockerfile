# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (production only)
COPY package*.json ./
RUN npm ci --omit=dev

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy installed modules from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# Fly.io handles TLS termination — app runs plain HTTP internally
CMD ["node", "src/server.js"]
