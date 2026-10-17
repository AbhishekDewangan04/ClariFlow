# Multi-stage production Dockerfile for ClariFlow frontend SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm config set maxsockets 10 && npm ci

# Copy sources and build Vite production bundle
COPY . .
RUN npm run build

# Stage 2: Production web server serving the compiled SPA
FROM caddy:2-alpine AS runner

COPY --from=builder /app/dist /srv/dist

# Default Caddyfile for standalone frontend container
RUN printf '{$PORT:80} {\n    root * /srv/dist\n    encode gzip zstd\n    @assets path /assets/*\n    header @assets Cache-Control "public, max-age=31536000, immutable"\n    handle /api/* {\n        reverse_proxy {$BACKEND_URL:backend:5000}\n    }\n    handle /_health {\n        rewrite * /health\n        reverse_proxy {$BACKEND_URL:backend:5000}\n    }\n    handle /health {\n        reverse_proxy {$BACKEND_URL:backend:5000}\n    }\n    handle {\n        try_files {path} /index.html\n        file_server\n    }\n}\n' > /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
