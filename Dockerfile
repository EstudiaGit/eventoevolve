# Dockerfile
# (Contenido idéntico al que proporcionaste)
# Imagen base: Node.js 20 (LTS) en Alpine Linux (super ligera)
FROM node:20-alpine AS base

# Instalar dependencias del sistema necesarias para compilar módulos nativos
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# ────────────────────────────────────────────────
# STAGE 1: Instalación de dependencias
# ────────────────────────────────────────────────
FROM base AS deps

# Instalar TODAS las dependencias (incluyendo devDependencies)
RUN npm ci

# ────────────────────────────────────────────────
# STAGE 2: Builder (solo para producción, opcional para más adelante)
# ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# RUN npm run build

# ────────────────────────────────────────────────
# STAGE 3: Desarrollo (Hot reload)
# ────────────────────────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ────────────────────────────────────────────────
# STAGE 4: Producción (opcional, para después)
# ────────────────────────────────────────────────
FROM base AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/dist ./dist
EXPOSE 4321
# CMD ["node", "./dist/server/entry.mjs"]