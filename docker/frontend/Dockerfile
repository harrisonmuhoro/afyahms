# syntax=docker/dockerfile:1.7
# =============================================================================
# Afya HMS — Frontend Dockerfile (Vite + React 18)
# =============================================================================
ARG NODE_VERSION=20

# -----------------------------------------------------------------------------
# base: node + deps
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app

# -----------------------------------------------------------------------------
# dev: source mount, hot reload
# -----------------------------------------------------------------------------
FROM base AS dev

ENV NODE_ENV=development

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY frontend .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# -----------------------------------------------------------------------------
# prod: build static assets, served via nginx or backend public/build
# -----------------------------------------------------------------------------
FROM base AS prod

ENV NODE_ENV=production

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY frontend .
RUN npm run build

# Output is in /app/dist — production compose mounts this or ships via nginx.