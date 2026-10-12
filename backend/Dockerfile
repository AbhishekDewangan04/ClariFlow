# Multi-stage production Dockerfile for ClariFlow backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy sources and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled files and server runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY server.js ./
COPY seed.js ./

# Switch to non-root node user for security
USER node

EXPOSE 5000

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

CMD ["node", "server.js"]
