# 25 — Deployment Strategy

> **Authority:** Subordinate to `00-foundation.md`. Where this document and the foundation
> disagree, the foundation wins. This document operationalises the hybrid (local-dev friendly,
> cloud-ready) deployment model declared in §1 of the foundation for **Afya HMS** — a production,
> multi-branch HMS for a private hospital group in Kenya (1,000 users now, architected for 10,000+).
>
> **Stack recap (from foundation):** Laravel 11 / PHP 8.3+ modular monolith, REST API only;
> React 18 + TypeScript + Vite SPA/PWA; MySQL 8+; Redis (cache, sessions, queues, broadcasting);
> Laravel Reverb WebSockets; queue workers + scheduler; storage driver abstraction
> (`local` → `s3` / `r2` / `b2`); Docker + Docker Compose deployment.
>
> **Document version:** 1.0 · **Status:** Deployment baseline

---

## Table of contents

1. [Goals, principles & non-negotiables](#1-goals-principles--non-negotiables)
2. [Environments & configuration / secrets management](#2-environments--configuration--secrets-management)
3. [Containerization & image build](#3-containerization--image-build)
4. [Local development with Docker Compose](#4-local-development-with-docker-compose)
5. [Production topology](#5-production-topology)
6. [Cloud-ready options without lock-in](#6-cloud-ready-options-without-lock-in)
7. [Zero-downtime deploys](#7-zero-downtime-deploys)
8. [Database migrations, seeding & rollback](#8-database-migrations-seeding--rollback)
9. [Storage driver switch per environment](#9-storage-driver-switch-per-environment)
10. [Backups & disaster recovery](#10-backups--disaster-recovery)
11. [Observability stack](#11-observability-stack)
12. [TLS, domains, Nginx & reverse proxy](#12-tls-domains-nginx--reverse-proxy)
13. [Scaling runbook & capacity planning](#13-scaling-runbook--capacity-planning)
14. [Local-to-production parity](#14-local-to-production-parity)
15. [Appendix: file inventory & checklists](#15-appendix-file-inventory--checklists)

---

## 1. Goals, principles & non-negotiables

### 1.1 Deployment goals

| Goal | Target |
|---|---|
| Zero-downtime releases | No 5xx during deploy; rolling with health gates |
| Local == prod parity | Same images, same MySQL 8 / Redis / S3 semantics locally |
| Cloud portability | No hard dependency on a single cloud's proprietary primitive |
| Scale envelope | 1k users → 10k users without re-architecture |
| RPO / RTO | RPO ≤ 5 min (DB), RTO ≤ 60 min (full region restore) |
| Data residency | PHI honours Kenya DPA 2019; preferred region near East Africa |

### 1.2 Principles

- **Stateless app containers.** App containers hold no durable state. Sessions, cache, queues,
  broadcasting → Redis. Files → object storage. Uploads never land on a container's local disk
  in production.
- **Build once, promote the same artifact.** A git SHA produces immutable images; the *same*
  image digest moves local-test → staging → production. No per-environment rebuilds.
- **Config is injected, never baked.** Twelve-factor: code is identical across environments;
  only environment variables and mounted secrets differ. **Secrets never live in code or images.**
- **Everything reproducible.** Compose for local, declarative IaC (Terraform) + a thin shell/Ansible
  layer for cloud. No click-ops in production.
- **Driver abstraction is honoured at the infra layer too.** Storage, cache, queue, mail, and
  broadcast all swap by env var, mirroring the foundation's `StorageManager` / channel managers.

### 1.3 Non-negotiables (hard gates)

1. No PHI in logs, error trackers, or backups stored unencrypted.
2. No public object-storage buckets — all clinical files via time-limited signed URLs (foundation §7).
3. Exactly **one** scheduler instance cluster-wide (cron uniqueness).
4. Migrations are forward-safe and **expand/contract** style (no destructive change in a single deploy).
5. Production secrets are readable only by the deploy role and the running task role.

---

## 2. Environments & configuration / secrets management

### 2.1 Environment matrix

| Env | Purpose | Hosting | Data | Scale | TLS domain |
|---|---|---|---|---|---|
| **local** | Developer workstation | Docker Compose | Synthetic seed data only | 1 of each service | `*.afya.test` (mkcert) |
| **staging** | Pre-prod, QA, UAT, migration rehearsal | Same cloud as prod, smaller | **Anonymised** copy of prod schema; synthetic PHI | 2 app replicas | `staging.afyahms.co.ke` |
| **production** | Live hospital operations | Cloud, multi-AZ | Real PHI | autoscaled 2→N | `app.afyahms.co.ke`, `api.afyahms.co.ke`, `ws.afyahms.co.ke` |

> A **demo/sandbox** environment may be cloned from staging for sales/training; it must use
> 100% synthetic data and a separate domain.

### 2.2 Configuration layering

Laravel reads config from env vars (12-factor). The precedence, lowest → highest:

1. `config/*.php` defaults (committed; safe non-secret defaults only).
2. `.env.example` (committed; documents every key, **placeholder values only**).
3. `.env.<environment>` (NOT committed; per-environment).
4. Real runtime env vars / mounted secrets (override everything — used in cloud).

```
.env.example        # committed — the contract: every key documented, no real values
.env                # local only, gitignored
# staging/production NEVER use a committed .env; values come from the secret store
```

`.gitignore` must contain: `.env`, `.env.*`, `!.env.example`.

### 2.3 Secrets management

**Rule: secrets never enter git, never enter an image layer, never appear in `docker history`.**

| Environment | Secret source | Injection mechanism |
|---|---|---|
| local | `.env` (gitignored), `mkcert` local CA | Compose `env_file` |
| staging / production | Cloud secret manager | Mounted at task start as env vars |

Recommended secret stores (pick per cloud; all are first-class, none locks you in):

- **AWS:** SSM Parameter Store (SecureString) or Secrets Manager.
- **DigitalOcean:** App Platform encrypted env vars, or HashiCorp Vault on a droplet.
- **Cloudflare:** Workers/Pages secrets for edge; Vault/Doppler for the origin.
- **Cloud-agnostic:** **Doppler** or **HashiCorp Vault** — recommended default to avoid lock-in;
  Doppler syncs into any of the above and into GitHub Actions.

**Required secret keys (subset):**

```
APP_KEY                      # php artisan key:generate --show, stored in secret manager
DB_PASSWORD                  # managed-DB app user (NOT root)
DB_PASSWORD_READ             # read-replica user (read-only grant)
REDIS_PASSWORD
REVERB_APP_KEY / REVERB_APP_SECRET / REVERB_APP_ID
MAIL_PASSWORD                # Mailgun/Resend API key (foundation §8)
AT_API_KEY / AT_USERNAME     # Africa's Talking SMS
MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET / MPESA_PASSKEY   # Daraja (foundation §9)
SHA_API_KEY / SHA_CLIENT_SECRET
STORAGE_KEY / STORAGE_SECRET # S3/R2/B2 access keys
SENTRY_LARAVEL_DSN / SENTRY_VITE_DSN
BACKUP_ENCRYPTION_PASSPHRASE
```

**Rotation:** quarterly minimum; immediately on suspected compromise or staff offboarding.
Rotation is a config-store update + rolling restart — no rebuild. `APP_KEY` rotation requires
re-encrypting `encrypted` cast columns (use Laravel's key-rotation command path) and is a planned
maintenance task, not routine.

### 2.4 The `APP_KEY` caveat

Because the foundation uses Laravel encrypted casts for sensitive columns (§11), `APP_KEY` is
**stateful** — losing it makes encrypted PHI unrecoverable. It is backed up in the secret manager
*and* in the offline break-glass vault (§10.6). It is never regenerated casually.

---

## 3. Containerization & image build

### 3.1 Image set

Afya HMS ships **one application image** plus a thin web image. The app image runs in several
*roles* selected by command/entrypoint — this keeps PHP code identical across FPM, queue, scheduler,
and Reverb processes (parity), and means one build → many roles.

| Image | Base | Role | Process |
|---|---|---|---|
| `afya-app` | `php:8.3-fpm-alpine` | PHP-FPM API, queue worker, scheduler, Reverb | role chosen by entrypoint arg |
| `afya-web` | `nginx:1.27-alpine` | Reverse proxy / static asset serving / TLS termination (or behind LB) | nginx |
| *(build-only)* | `node:20-alpine` | Vite build stage producing `public/build` assets | discarded after build |

The Node stage is a **multi-stage build artifact only** — there is no long-running Node container
in production. The compiled SPA assets are copied into the app image (and pushed to CDN, §12).

### 3.2 App Dockerfile (multi-stage, PHP-FPM 8.3)

`docker/app/Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1.7

############################
# Stage 1 — Composer deps  #
############################
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
# No-scripts: artisan isn't present yet; install prod deps only.
RUN composer install \
        --no-dev --no-scripts --no-autoloader \
        --prefer-dist --no-interaction

############################
# Stage 2 — Frontend build #
############################
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts ./
COPY public ./public
# Produces public/build (manifest + hashed assets)
RUN npm run build

############################
# Stage 3 — Runtime base   #
############################
FROM php:8.3-fpm-alpine AS runtime
WORKDIR /var/www/html

# System libs + PHP extensions required by the foundation stack.
RUN apk add --no-cache \
        bash icu-dev oniguruma-dev libzip-dev libpng-dev \
        freetype-dev libjpeg-turbo-dev \
        nginx supervisor tzdata fcgi \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql mysqli bcmath intl zip gd opcache pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del --purge icu-dev oniguruma-dev libzip-dev libpng-dev freetype-dev libjpeg-turbo-dev \
    && rm -rf /var/cache/apk/* /tmp/pear

# Timezone: store UTC, render Africa/Nairobi (foundation §3) — container is UTC.
ENV TZ=UTC

# Production PHP / OPcache / FPM tuning.
COPY docker/app/php.ini        /usr/local/etc/php/conf.d/zz-afya.ini
COPY docker/app/opcache.ini    /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/app/www.conf       /usr/local/etc/php-fpm.d/zz-www.conf

# Application code.
COPY . .
# Vendored deps from stage 1, built assets from stage 2.
COPY --from=vendor   /app/vendor      ./vendor
COPY --from=frontend /app/public/build ./public/build

# Finalise autoloader + Laravel optimisation caches (config NOT cached here —
# config:cache happens at release time so env vars resolve correctly).
RUN composer dump-autoload --optimize --classmap-authoritative \
    && php artisan package:discover --ansi \
    && mkdir -p storage/framework/{cache,sessions,views} bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Run as non-root.
USER www-data

COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]
# Default role = php-fpm; overridden for worker/scheduler/reverb.
CMD ["php-fpm"]
```

> **Why config is not cached in the image:** `php artisan config:cache` freezes env values. Caching
> at build time would bake build-host env vars into the artifact, breaking "build once, promote
> everywhere." Caching is therefore deferred to the release entrypoint (§7.3).

### 3.3 Role entrypoint

`docker/app/entrypoint.sh` — one image, many roles:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Cache config/routes/events at container start (env is fully resolved now).
# Guarded so workers/scheduler share the same warm caches.
if [ "${AFYA_OPTIMIZE:-1}" = "1" ]; then
  php artisan config:cache
  php artisan route:cache
  php artisan event:cache
fi

role="${1:-php-fpm}"
case "$role" in
  php-fpm)
    exec php-fpm -F
    ;;
  worker)
    # Queue worker pool member. Concurrency via replicas, not --threads.
    exec php artisan queue:work redis \
        --queue=alerts,notifications,claims,pdf,payments,default,reporting \
        --sleep=1 --tries=3 --max-time=3600 --max-jobs=1000 \
        --backoff=5 --timeout=90
    ;;
  scheduler)
    # Single instance cluster-wide. Loop replaces system cron in containers.
    exec php artisan schedule:work
    ;;
  reverb)
    exec php artisan reverb:start --host=0.0.0.0 --port=8080
    ;;
  migrate)
    exec php artisan migrate --force
    ;;
  *)
    exec "$@"
    ;;
esac
```

> `queue:work` (not `queue:listen`) for performance; `--max-jobs` / `--max-time` force periodic
> graceful recycling so a long-lived worker never accumulates a leaked connection or stale code.

### 3.4 Web (Nginx) Dockerfile

`docker/web/Dockerfile`:

```dockerfile
FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/web/nginx.conf       /etc/nginx/nginx.conf
COPY docker/web/app.conf.template /etc/nginx/templates/app.conf.template
# Static assets are copied so nginx can serve them directly without hitting FPM.
COPY --from=afya-app:latest /var/www/html/public /var/www/html/public
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
EXPOSE 80
```

> In production the static assets are primarily served from the **CDN** (§12); the web image's
> copy is the fallback/origin. Nginx `templates/` lets us inject `FPM_HOST` etc. via env at start.

### 3.5 Multi-stage benefits & image optimisation

- **Small runtime.** Composer + Node toolchains live only in build stages; the runtime image
  carries no `node_modules`, no dev dependencies, no build caches. Target app image < 250 MB.
- **Alpine base** + extension cleanup (`apk del` build-only `-dev` packages after compiling).
- **Layer ordering:** dependency manifests copied before source so Docker caches `composer install`
  and `npm ci` across code-only changes.
- **BuildKit cache mounts** for composer/npm in CI to speed rebuilds.
- **`.dockerignore`** excludes `node_modules`, `vendor`, `.git`, `tests`, `storage/*`, `.env*`,
  `*.md`, `.github` — smaller context, faster builds, no secret leakage.
- **OPcache** enabled with `validate_timestamps=0` in prod (code is immutable in the image).
- **Non-root runtime** (`USER www-data`) for least privilege.
- **Image scanning** (Trivy) on every build; fail the pipeline on HIGH/CRITICAL CVEs.

`.dockerignore`:

```
.git
.github
node_modules
vendor
storage/logs/*
storage/framework/cache/*
storage/framework/sessions/*
storage/framework/views/*
.env
.env.*
!.env.example
tests
*.md
docker-compose*.yml
```

---

## 4. Local development with Docker Compose

Local dev favours **fast feedback and parity**, not the immutable-image discipline of prod. The
app source is bind-mounted; the Vite dev server runs hot-reload; MySQL 8, Redis, MinIO (S3-compatible),
and Mailpit reproduce the production data plane locally.

### 4.1 `docker-compose.yml` (local)

```yaml
name: afya-local

services:
  app:                                   # PHP-FPM + Laravel (bind-mounted source)
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: runtime
    environment:
      AFYA_OPTIMIZE: "0"                  # never cache config in local dev
    env_file: .env
    volumes:
      - ./:/var/www/html:cached          # live code
      - app-storage:/var/www/html/storage
    depends_on:
      mysql:   { condition: service_healthy }
      redis:   { condition: service_healthy }
      minio:   { condition: service_started }
    networks: [afya]
    healthcheck:
      test: ["CMD", "php", "artisan", "inspire"]
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:                                 # reverse proxy → app:9000
    build:
      context: .
      dockerfile: docker/web/Dockerfile
    ports:
      - "8000:80"
    environment:
      FPM_HOST: app:9000
    volumes:
      - ./public:/var/www/html/public:ro
    depends_on:
      app: { condition: service_started }
    networks: [afya]

  mysql:                                 # MySQL 8 — same major as prod
    image: mysql:8.0
    command: --default-authentication-plugin=caching_sha2_password
    environment:
      MYSQL_DATABASE: afya
      MYSQL_USER: afya
      MYSQL_PASSWORD: secret
      MYSQL_ROOT_PASSWORD: rootsecret
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-prootsecret"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks: [afya]

  redis:                                 # cache / sessions / queues / broadcast
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks: [afya]

  worker:                                # queue worker (same image, worker role)
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: runtime
    command: ["worker"]
    env_file: .env
    volumes:
      - ./:/var/www/html:cached
    depends_on:
      redis: { condition: service_healthy }
      mysql: { condition: service_healthy }
    networks: [afya]

  scheduler:                             # single scheduler (schedule:work loop)
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: runtime
    command: ["scheduler"]
    env_file: .env
    volumes:
      - ./:/var/www/html:cached
    depends_on:
      app: { condition: service_started }
    networks: [afya]

  reverb:                                # WebSocket server (Laravel Reverb)
    build:
      context: .
      dockerfile: docker/app/Dockerfile
      target: runtime
    command: ["reverb"]
    env_file: .env
    ports:
      - "8080:8080"
    depends_on:
      redis: { condition: service_healthy }
    networks: [afya]

  vite:                                  # frontend dev server (HMR)
    image: node:20-alpine
    working_dir: /app
    command: sh -c "npm ci && npm run dev -- --host 0.0.0.0"
    environment:
      VITE_API_URL: http://localhost:8000
      VITE_REVERB_HOST: localhost
      VITE_REVERB_PORT: "8080"
    ports:
      - "5173:5173"
    volumes:
      - ./:/app
      - /app/node_modules                # keep container's node_modules
    networks: [afya]

  mailpit:                               # local SMTP capture (replaces Mailgun)
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"                      # SMTP
      - "8025:8025"                      # web UI
    networks: [afya]

  minio:                                 # S3-compatible local object storage
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: afya
      MINIO_ROOT_PASSWORD: afyasecret
    ports:
      - "9000:9000"                      # S3 API
      - "9001:9001"                      # console
    volumes:
      - minio-data:/data
    networks: [afya]

  minio-init:                            # create the 'afya-documents' bucket once
    image: minio/mc:latest
    depends_on:
      minio: { condition: service_started }
    entrypoint: >
      sh -c "
      until mc alias set local http://minio:9000 afya afyasecret; do sleep 2; done &&
      mc mb --ignore-existing local/afya-documents &&
      mc anonymous set none local/afya-documents
      "
    networks: [afya]

volumes:
  mysql-data:
  redis-data:
  minio-data:
  app-storage:

networks:
  afya:
    driver: bridge
```

### 4.2 Service notes

- **`AFYA_OPTIMIZE=0`** locally so config is never cached (avoids "I changed `.env` and nothing
  happened" friction). Production sets `=1`.
- **MinIO** gives byte-for-byte S3 API semantics locally — the same `s3` driver code path the
  foundation §7 abstraction uses in prod, just pointed at MinIO. The `minio-init` job creates a
  **private** bucket (`anonymous set none`) honouring the "no public buckets" rule.
- **Mailpit** captures all mail; no real Mailgun/Resend calls in dev.
- **Healthchecks** + `condition: service_healthy` give deterministic boot order.
- **Volumes** persist MySQL, Redis (AOF), and MinIO across `docker compose down`. Source is
  bind-mounted for live editing; storage is a named volume so it survives rebuilds.
- A single **bridge network** (`afya`) isolates the stack; services address each other by name.

### 4.3 Bootstrap commands

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed   # synthetic seed data only
mkcert -install && mkcert "*.afya.test"              # optional local TLS
# App:   http://localhost:8000     Vite HMR: http://localhost:5173
# Mailpit UI: http://localhost:8025   MinIO console: http://localhost:9001
```

---

## 5. Production topology

### 5.1 Diagram (logical)

```
                          ┌────────────────────────────┐
              Internet ──▶│   CDN (Cloudflare / CF R2)  │  static SPA assets, edge cache, WAF
                          └──────────────┬─────────────┘
                                         │ dynamic (api., app., ws.)
                          ┌──────────────▼─────────────┐
                          │     Load Balancer (TLS)     │  health-gated, sticky NOT required
                          └───┬───────────────┬─────────┘
                              │               │ wss://ws.
            ┌─────────────────▼──┐      ┌──────▼──────────────┐
            │  app pool (FPM)    │      │  Reverb pool (WS)    │  scales independently
            │  nginx+php-fpm     │      │  reverb:start        │
            │  N stateless pods  │      │  M pods              │
            └──┬───────┬─────────┘      └──────────┬──────────┘
               │       │                           │
               │       └───────────┬───────────────┘
        ┌──────▼──────┐     ┌───────▼────────┐   ┌────────────────┐
        │ Managed Redis│    │  Managed MySQL │   │ Object storage │
        │ (cache/queue │    │  primary +     │   │ S3 / R2 / B2   │
        │  /broadcast) │    │  read replica  │   │ (signed URLs)  │
        └──────▲──────┘     └───────▲────────┘   └────────────────┘
               │                    │
        ┌──────┴───────┐    ┌───────┴────────┐
        │ Queue worker │    │   Scheduler     │  exactly ONE
        │ pool (K pods)│    │   (1 pod)       │
        └──────────────┘    └────────────────┘
```

### 5.2 Component decisions

| Concern | Production choice | Rationale |
|---|---|---|
| App tier | Stateless containers behind LB, autoscaled | Horizontal scale; any pod serves any request |
| Sessions | Redis (`SESSION_DRIVER=redis`) | Stateless app → no sticky sessions needed |
| Cache | Redis | Shared across pods |
| Queue | Redis driver, dedicated worker pool | Decouples slow work (SMS, SHA claims, PDF, notifications) |
| Scheduler | **Single** dedicated pod (`schedule:work`) | Cron uniqueness; sequence/report jobs must not double-fire |
| WebSockets | **Reverb** pool, separate `ws.` subdomain | Long-lived conns scale separately from request traffic |
| Database | Managed MySQL 8, primary + ≥1 read replica | Offload reads/reporting; failover handled by provider |
| Object storage | S3 / R2 / B2 via driver | PHI files off the app disk; signed URLs only |
| Frontend | Built SPA on CDN | Edge cache, low latency, offload origin |
| TLS | Terminated at LB/CDN edge | Centralised cert management |

### 5.3 Read/write DB split

Configure Laravel's read/write connections so reporting and read-heavy endpoints hit the replica
while writes (and anything inside a transaction) hit the primary:

```php
// config/database.php → 'mysql'
'read'  => ['host' => [env('DB_HOST_READ', env('DB_HOST'))]],
'write' => ['host' => [env('DB_HOST')]],
'sticky' => true,   // after a write in a request, subsequent reads hit primary (read-after-write)
```

> The foundation's `Reporting` module and read-mostly queue boards are the primary replica beneficiaries.
> `sticky=true` prevents the "I just saved a patient but the list doesn't show them" replica-lag bug.

### 5.4 Process roles in production (orchestrator)

| Deployment/Service | Image role | Replicas (1k → 10k) | Autoscale signal |
|---|---|---|---|
| `afya-web` + `afya-app:php-fpm` | `php-fpm` | 2 → 12 | CPU 65% / p95 latency |
| `afya-app:worker` | `worker` | 2 → 8 | Redis queue depth |
| `afya-app:scheduler` | `scheduler` | **1 (fixed)** | none — never scales |
| `afya-app:reverb` | `reverb` | 2 → 6 | active WS connections |

> The scheduler is pinned to a single replica with `maxSurge: 0, maxUnavailable: 1` (or
> orchestrator equivalent) so a rolling deploy never momentarily runs two schedulers.

---

## 6. Cloud-ready options without lock-in

The design depends only on **portable primitives**: an OCI container registry, a container
orchestrator/runner, managed MySQL 8, managed Redis, an S3-API object store, and an HTTP load
balancer. Every cloud below provides all of these. Swapping is a Terraform + env change, not a
code change.

| Capability | AWS | DigitalOcean | Cloudflare | Cloud-agnostic fallback |
|---|---|---|---|---|
| Container runtime | ECS Fargate / EKS | App Platform / DOKS (k8s) | (origin elsewhere) | Plain Docker on VMs + Swarm/k3s |
| Registry | ECR | DOCR | — | GHCR / Harbor |
| MySQL 8 | RDS / Aurora MySQL | Managed MySQL | — | Self-managed Percona + replica |
| Redis | ElastiCache | Managed Redis (Valkey) | — | Self-managed Redis Sentinel |
| Object storage | S3 (`s3` driver) | Spaces (`s3` driver) | **R2 (`r2` driver)** | Backblaze **B2 (`b2` driver)**, MinIO |
| CDN / WAF | CloudFront | DO CDN | **Cloudflare** | Cloudflare in front of any origin |
| Secrets | SSM / Secrets Mgr | App Platform secrets | Workers secrets | **Doppler / Vault** |
| Load balancer | ALB | DO LB | Cloudflare LB | Nginx/Traefik on VMs |
| DNS | Route 53 | DO DNS | **Cloudflare DNS** | any registrar |

**Recommended pragmatic stack for Afya (cost + DPA + portability):**
DigitalOcean (compute, managed MySQL + Redis) **or** AWS af-south-1/eu regions for compute and RDS,
**Cloudflare R2** for object storage (zero egress fees — important for serving clinical images/PDFs),
**Cloudflare** for CDN/DNS/WAF/TLS in front of the origin. R2's S3-compatible API plugs directly
into the foundation's `r2` driver. No proprietary SDK is referenced in app code (foundation §7),
so the storage decision is reversible at any time.

**Anti-lock-in guardrails:**

- App code only ever talks S3 API (via Flysystem), SMTP/HTTP mail APIs, and standard MySQL/Redis
  protocols — no managed-only features (no DynamoDB, no SQS-as-sole-queue, no Lambda business logic).
- IaC in Terraform with provider modules isolated behind a thin interface so the compute provider
  can change without touching app modules.
- Queue is Redis (portable). If SQS is ever desired it's an env-only switch (`QUEUE_CONNECTION=sqs`),
  not a rewrite.

---

## 7. Zero-downtime deploys

### 7.1 Strategy: rolling deploy with health gates

Rolling update of the stateless app pool: new pods start, pass health checks, receive traffic, then
old pods drain and terminate. The LB only routes to pods reporting healthy. No 5xx is served because
old pods keep serving until new pods are ready.

`maxSurge: 25%`, `maxUnavailable: 0` for the app pool. Blue/green is available for high-risk releases
(schema changes) — full parallel stack, switch LB target, keep old stack warm for instant rollback.

### 7.2 Deploy pipeline (CI/CD)

```
push to main / tag
   │
   ├─ CI: Pint, PHPStan, Pest (≥80% cov), ESLint, tsc, Vitest, Playwright   (foundation §14)
   ├─ Build afya-app + afya-web images, tag = git SHA
   ├─ Trivy scan (fail on HIGH/CRITICAL)
   ├─ Push to registry (immutable digest)
   │
   ├─ Deploy to STAGING (auto)
   │    ├─ run migration job against staging DB
   │    ├─ smoke tests + Playwright E2E against staging
   │    └─ migration rehearsal recorded
   │
   └─ Deploy to PRODUCTION (manual approval gate)
        ├─ 1. pre-deploy backup snapshot (DB)
        ├─ 2. run migrate job (expand phase only — see §8)
        ├─ 3. rolling update app pool (same image digest from staging)
        ├─ 4. rolling update worker pool (after app healthy)
        ├─ 5. restart scheduler (single)
        ├─ 6. restart reverb pool
        └─ 7. post-deploy smoke + synthetic checks; auto-rollback on failure
```

> **Promote the same digest.** Production deploys the exact image digest that passed staging — never
> a fresh build. This is the core parity guarantee.

### 7.3 Release-time cache warming

The entrypoint (§3.3) runs `config:cache`, `route:cache`, `event:cache` at container start with the
real injected env. Additionally the release job runs `php artisan optimize` and warms OPcache by
hitting `/healthz` before the pod is marked ready.

### 7.4 Maintenance mode — used rarely, not as the default

`php artisan down` / `up` is the **fallback**, not the normal path. Rolling deploys avoid it entirely
for additive changes. Reserve `down` for destructive/contract-phase migrations that cannot be made
online-safe.

```bash
# Allow the deploy pipeline + ops IPs through during maintenance.
php artisan down --render="errors::503" \
  --retry=60 \
  --secret="$MAINTENANCE_BYPASS_SECRET"
# ...run destructive migration...
php artisan up
```

`down` writes a flag to shared storage (Redis cache store recommended in prod so all pods honour it
simultaneously: `php artisan down` with the cache-based maintenance driver). Health endpoint returns
503 while down so the LB shows the maintenance page consistently.

### 7.5 Queue draining on deploy

Workers must finish in-flight jobs and not be killed mid-job:

1. New deploy signals existing workers with `php artisan queue:restart` (graceful — finishes the
   current job, then exits at the next loop).
2. Orchestrator `terminationGracePeriodSeconds` ≥ the longest expected job (`--timeout=90` → grace 120s).
3. New worker pods come up on the new image and resume consuming.
4. Jobs are idempotent (foundation §9 payments are idempotent by `CheckoutRequestID`/`mpesa_receipt`)
   so a redelivered job after a hard kill is safe.

### 7.6 Reverb (WebSocket) deploy

WebSocket connections are stateless w.r.t. app data (state lives in Redis). On reverb pod rollout,
clients are disconnected and the SPA auto-reconnects (Echo reconnection + exponential backoff). Roll
reverb pods one at a time; the SPA's reconnect masks the brief drop. Broadcasting state in Redis means
no message loss for events fired after reconnect.

---

## 8. Database migrations, seeding & rollback

### 8.1 Expand / contract (no destructive change in one deploy)

Because the app pool runs old + new code simultaneously during a rolling deploy, every schema change
must be backward-compatible for one release. Use the **expand → migrate → contract** pattern:

| Phase | Deploy | Action |
|---|---|---|
| **Expand** | Release N | Add new column/table/index (nullable, with default). Old code ignores it. |
| **Migrate data** | Release N (job) | Backfill via queued/batched job; dual-write in app code if needed. |
| **Switch** | Release N+1 | New code reads/writes the new shape; old column still present. |
| **Contract** | Release N+2 | Drop the old column/table once no code references it. |

Concrete example — renaming `patients.phone` → `patients.phone_e164`:

1. N: add `phone_e164` (nullable). 2. N: backfill job normalises numbers. 3. N+1: code uses
`phone_e164`; keeps writing `phone` too. 4. N+2: stop writing `phone`. 5. N+3: drop `phone`.

### 8.2 Online-safe migration rules

- All migrations idempotent and forward-only in production (`migrate --force`).
- Large tables: add indexes with care; MySQL 8 supports online DDL for many ALTERs — prefer
  `ALGORITHM=INPLACE, LOCK=NONE`. For very large clinical tables, use `gh-ost`/`pt-online-schema-change`
  for true zero-lock changes.
- Never `dropColumn` / `renameColumn` in the same release the column stops being used — see §8.1.
- Migrations run as a **separate job** before the app rollout (expand) so the new app pool finds the
  schema ready. Contract migrations run *after* the previous release is fully retired.

### 8.3 Seeding policy

| Seed type | local | staging | production |
|---|---|---|---|
| Reference data (ICD-10, drug catalog master, roles/permissions, branches) | yes | yes | **yes (idempotent seeders)** |
| Synthetic patients / clinical data | yes | yes (anonymised) | **never** |

Production "seeding" is limited to **idempotent reference/lookup seeders** run via `db:seed --class=ReferenceDataSeeder`
in the deploy pipeline. These use `updateOrCreate` so re-running is safe. No PHI is ever seeded in prod.

### 8.4 Rollback strategy

**Code rollback** is the primary lever (fast, safe): redeploy the previous image digest — instant
because images are immutable and config is external.

**Schema rollback** is avoided by design (expand/contract makes the new schema compatible with the
previous code, so rolling *back* code does not require rolling back schema). When a true DB rollback
is unavoidable:

1. Prefer **forward fix** (new migration that corrects) over `migrate:rollback`.
2. `migrate:rollback` only for the most recent, reversible, non-destructive batch and only if no
   production traffic has written to the new structure.
3. **Last resort:** restore from the pre-deploy snapshot (§7.2 step 1) + point-in-time recovery (§10),
   accepting the RPO window. This is a declared incident, not a routine rollback.

Every migration has a tested `down()` in CI; staging runs `migrate` then `migrate:rollback` then
`migrate` again to prove reversibility before production.

---

## 9. Storage driver switch per environment

The foundation §7 `StorageManager` selects the disk via `config('storage.default')`, which reads an
env var. Switching providers is therefore **env-only**, no code change.

| Environment | `STORAGE_DRIVER` | Backing | Bucket | URLs |
|---|---|---|---|---|
| local | `s3` → MinIO | MinIO container | `afya-documents` (private) | signed, 5–15 min TTL |
| staging | `s3` or `r2` | Spaces / R2 (separate bucket) | `afya-staging-documents` | signed |
| production | `r2` (recommended) / `s3` / `b2` | R2 / S3 / B2 | `afya-prod-documents` | signed only |

`config/filesystems.php` disks (illustrative):

```php
's3' => [  // also used for MinIO + DO Spaces (S3-compatible)
    'driver'   => 's3',
    'key'      => env('STORAGE_KEY'),
    'secret'   => env('STORAGE_SECRET'),
    'region'   => env('STORAGE_REGION', 'us-east-1'),
    'bucket'   => env('STORAGE_BUCKET'),
    'endpoint' => env('STORAGE_ENDPOINT'),         // MinIO/R2/Spaces custom endpoint
    'use_path_style_endpoint' => env('STORAGE_PATH_STYLE', false), // true for MinIO
    'visibility' => 'private',                      // NEVER public
    'throw' => true,
],
'r2' => [
    'driver'   => 's3',
    'endpoint' => env('R2_ENDPOINT'),               // https://<acct>.r2.cloudflarestorage.com
    'region'   => 'auto',
    // ...key/secret/bucket from secrets
    'visibility' => 'private',
],
'b2' => [ /* s3-compatible endpoint for Backblaze */ ],
```

**Rules carried from foundation:**

- `visibility` is always `private`; clinical files are never publicly readable.
- Access is always via `Storage::disk(...)->temporaryUrl($path, now()->addMinutes(10))`.
- Local MinIO uses `use_path_style_endpoint=true`; cloud R2/S3 do not.
- **Cross-provider migration** (e.g. S3 → R2): run `php artisan storage:migrate` (custom command)
  that streams objects disk→disk, then flip `STORAGE_DRIVER`. Keep both configured during cutover.

---

## 10. Backups & disaster recovery

### 10.1 Objectives

| Metric | Target | Meaning |
|---|---|---|
| **RPO** | ≤ 5 minutes | Max acceptable data loss (covered by binlog PITR) |
| **RTO** | ≤ 60 minutes | Max time to restore service in a new region |
| Backup retention (DB) | 7 daily, 4 weekly, 12 monthly | Plus 10-year clinical archive (foundation §11) |
| Restore drill cadence | Quarterly | Proven, timed restore into a scratch environment |

### 10.2 Database backups

- **Managed-DB automated backups** + **point-in-time recovery** (binlog) enabled → RPO ≤ 5 min.
- **Independent logical dumps**: nightly `mysqldump --single-transaction --routines --triggers`
  (or `xtrabackup` for large DBs), **encrypted** (`age`/GPG with `BACKUP_ENCRYPTION_PASSPHRASE`),
  uploaded to a **separate** object-storage bucket in a **different account/region** from the live
  data (defends against account compromise and accidental deletion).
- Backups are themselves PHI — encrypted at rest (envelope encryption) and in transit. Access logged.

### 10.3 Object storage (documents) backups

- Enable **bucket versioning** + lifecycle (defends against overwrite/delete).
- **Cross-region / cross-provider replication** of the documents bucket (e.g. R2 → B2) for
  geo-redundancy without depending on one provider.
- Object Lock / immutability for the 10-year clinical retention class (write-once-read-many for
  archived records — foundation §11 "never hard-delete clinical data").

### 10.4 Redis

Redis is treated as **rebuildable** (cache/sessions/queues). Queues use durable Redis (AOF) so
in-flight jobs survive a restart, but Redis is not part of the DR-critical backup set — a lost Redis
means re-login and a cold cache, not data loss. Broadcasting state is ephemeral by design.

### 10.5 Configuration & secrets

Secret store has its own provider-native backup; the **break-glass** copy (§10.6) covers total loss.
IaC (Terraform state) is stored in a versioned, locked remote backend (e.g. encrypted S3 + DynamoDB
lock or Terraform Cloud).

### 10.6 Break-glass vault

An **offline, encrypted** copy of: `APP_KEY`, root DB credentials, backup-encryption passphrase, and
secret-store master credentials. Stored in a sealed secrets manager / hardware token held by two
named custodians (two-person rule). Required because losing `APP_KEY` makes encrypted PHI columns
unrecoverable (§2.4).

### 10.7 DR runbook (region loss)

1. Declare incident; communicate via status page.
2. Provision standby infra from Terraform in the secondary region (`terraform apply -var region=...`).
3. Restore managed MySQL from latest automated backup + replay binlog to last consistent point (PITR).
4. Point app env at restored DB + replicated documents bucket + fresh Redis.
5. Run `php artisan migrate --force` (no-op if backup is current schema) and reference seeders.
6. Update DNS (Cloudflare) to the new LB; low TTL (60s) makes cutover fast.
7. Smoke test (login, patient lookup, queue board, billing) before announcing recovery.
8. Post-incident review; record actual RTO/RPO vs target.

### 10.8 Restore drills

Quarterly: restore the latest encrypted dump into an isolated scratch DB, run integrity checks
(row counts, checksum of key tables, app boot + smoke), record the timing. A backup that has never
been restored is not a backup.

---

## 11. Observability stack

### 11.1 Pillars

| Pillar | Tool (recommended) | Notes |
|---|---|---|
| **Error tracking** | **Sentry** (Laravel + React SDKs) | Releases tagged by git SHA; source maps uploaded for the SPA |
| **Logs** | Structured JSON to stdout → Loki / CloudWatch / Better Stack | 12-factor: containers log to stdout, collector ships them |
| **Metrics** | Prometheus + Grafana (or provider metrics) | App, queue depth, FPM, DB, Redis, Reverb |
| **Uptime / synthetic** | Better Uptime / Pingdom / Cloudflare health checks | External probes of `/healthz` + a login synthetic |
| **Tracing (optional)** | OpenTelemetry → Tempo/Honeycomb | For latency hotspots as scale grows |
| **DB / slow query** | Managed-DB performance insights + slow query log | Index regressions |

### 11.2 Logging rules (PHI-safe)

- Log as **structured JSON** (`LOG_CHANNEL=stderr` with JSON formatter) to stdout/stderr only —
  never to a file inside a container.
- **Scrub PHI**: a log processor redacts patient names, national IDs, phone numbers, and `encrypted`
  fields before shipping. Sentry `before_send` strips PII; `send_default_pii=false`.
- Correlation: include `request_id`, `branch_id`, `user_id` (not name) on every line for tracing
  across the modular monolith.
- The immutable `audit_logs` (foundation §11) are application data in MySQL — **separate** from ops
  logs and never shipped to third-party log SaaS in raw PHI form.

### 11.3 Health endpoints

Provide three distinct probes (used by LB and orchestrator):

| Endpoint | Type | Checks | Used by |
|---|---|---|---|
| `/healthz` | **liveness** | process up, returns 200 fast (no deps) | orchestrator restart decisions |
| `/readyz` | **readiness** | DB ping, Redis ping, storage reachable, migrations applied | LB traffic gating |
| `/up` | Laravel default health | framework boot | smoke checks |

Use **`spatie/laravel-health`** to compose readiness checks (DB, Redis, queue heartbeat, storage,
scheduler heartbeat, disk). The scheduler publishes a heartbeat so monitoring can alert if the single
scheduler dies.

### 11.4 Key alerts

- p95 API latency > 800 ms (5 min) · 5xx rate > 1% · readiness failing on > 1 pod.
- Redis queue depth > threshold or oldest job age > 5 min (workers falling behind).
- Scheduler heartbeat missing > 2 min (single scheduler down → cron not running).
- DB replica lag > 30 s · DB connections > 80% · disk > 80%.
- Reverb connection error rate / pod crashloop.
- Failed backup job, or backup age > 26 h.
- Sentry new-issue spike on a fresh release SHA → candidate for auto-rollback.

---

## 12. TLS, domains, Nginx & reverse proxy

### 12.1 Domains

| Host | Serves | TLS |
|---|---|---|
| `app.afyahms.co.ke` | SPA (static, via CDN) | Edge cert |
| `api.afyahms.co.ke` | REST API (origin app pool) | LB/edge cert |
| `ws.afyahms.co.ke` | Reverb WebSockets (`wss://`) | LB/edge cert |
| `staging.afyahms.co.ke` | full staging stack | Edge cert |

### 12.2 TLS

- **Production:** TLS terminated at Cloudflare edge and/or the cloud LB; certs via Cloudflare
  Universal SSL or ACME (Let's Encrypt) with auto-renew. HSTS, TLS 1.2+ only, modern ciphers.
- Origin protected: only the LB/CDN may reach origin (security group / Cloudflare authenticated
  origin pulls / mTLS to origin).
- **Local:** `mkcert` self-signed for `*.afya.test` so dev mirrors HTTPS behaviour.

### 12.3 Nginx config (production-style)

`docker/web/nginx.conf` (excerpt) and `docker/web/app.conf.template`:

```nginx
# app.conf.template  (envsubst fills FPM_HOST at container start)
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    client_max_body_size 25m;            # clinical image / document uploads
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # HSTS added at edge; avoid double-setting.

    # Liveness — no app boot, instant 200.
    location = /healthz { access_log off; return 200 "ok\n"; }

    # Readiness — proxied to app (checks deps).
    location = /readyz {
        include fastcgi_params;
        fastcgi_pass ${FPM_HOST};
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
    }

    # Hashed SPA assets — long cache (served by CDN in prod; this is origin fallback).
    location /build/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass ${FPM_HOST};                 # e.g. app:9000
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_param HTTPS on;                   # behind TLS-terminating LB
        fastcgi_param HTTP_X_FORWARDED_PROTO https;
        fastcgi_read_timeout 90s;
    }

    location ~ /\.(?!well-known).* { deny all; }  # block dotfiles incl. .env
}
```

WebSocket reverse-proxy block (Reverb), used when not behind a separate WS-aware LB:

```nginx
# ws.afyahms.co.ke → reverb pool :8080
server {
    listen 80;
    server_name ws.afyahms.co.ke;
    location / {
        proxy_pass http://reverb_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 3600s;                 # long-lived connections
    }
}
```

**Trusted proxies:** Laravel `TrustProxies` middleware set to the LB/CDN CIDR so `https`, client IP
(for login history / device tracking, foundation §11), and rate limiting work correctly behind the
proxy.

---

## 13. Scaling runbook & capacity planning

### 13.1 Capacity model

Foundation: 100–300 patients/day, 1,000 users now → 10,000+ later. Concurrency drives sizing more
than registered-user count.

| Stage | Concurrent active users (est.) | App pods | Workers | Reverb | MySQL | Redis |
|---|---|---|---|---|---|---|
| Launch (1k users) | ~150 peak | 2 | 2 | 2 | 2 vCPU / 8 GB + 1 replica | 1 GB |
| Growth (3–4k) | ~600 | 4–6 | 3–4 | 3 | 4 vCPU / 16 GB + 1–2 replicas | 2–4 GB |
| Target (10k) | ~1,500 | 8–12 | 6–8 | 4–6 | 8 vCPU / 32 GB + 2 replicas | 4–8 GB cluster |

### 13.2 Autoscaling rules

- **App pool:** scale on CPU > 65% **or** p95 latency > 500 ms; scale-in slowly (cooldown 5 min) to
  avoid flapping. Min 2 (HA), max per stage above.
- **Worker pool:** scale on **Redis queue depth** (e.g. > 500 pending) and oldest-job age; this is the
  right signal because slow downstreams (SMS, SHA, M-Pesa callbacks, PDF) back up the queue, not CPU.
- **Reverb:** scale on active WebSocket connection count per pod.
- **Scheduler:** never scales (fixed 1).
- **DB:** vertical scale of primary + add read replicas; **never** autoscale writes horizontally
  (single primary). Push reads to replicas (§5.3) before upsizing the primary.

### 13.3 Scaling runbook (load event)

1. Confirm the bottleneck via Grafana: app CPU? queue depth? DB CPU/connections? replica lag? Reverb?
2. **App-bound:** raise app max replicas; verify LB spreads load; watch DB connections don't saturate.
3. **Queue-bound:** raise worker replicas; if a single downstream is the cause (e.g. SHA API slow),
   isolate it on a dedicated queue + worker pool so it can't starve clinical notifications.
4. **DB read-bound:** add a read replica; confirm reporting/read endpoints route to it.
5. **DB write-bound:** vertical scale primary in a maintenance window; longer term, archive old
   clinical rows to the 10-year archive store to keep hot tables small.
6. **Connection exhaustion:** introduce a DB proxy (RDS Proxy / ProxySQL / PgBouncer-equivalent) to
   pool connections; FPM `pm.max_children` × pods must stay under DB `max_connections`.
7. **Reverb-bound:** add reverb pods; ensure the WS LB supports the new pods; clients reconnect.
8. Record the event; feed numbers back into the capacity model.

### 13.4 Connection math (guardrail)

`FPM pm.max_children` per pod × app pods + worker count + scheduler + reverb < MySQL `max_connections`
(minus headroom for replica/admin). Tune `pm.max_children` from memory: `(pod_mem − overhead) /
avg_php_process_mem`. With a DB proxy this constraint relaxes considerably and is the preferred fix
at the 10k stage.

---

## 14. Local-to-production parity

| Dimension | Local | Production | Parity mechanism |
|---|---|---|---|
| App image | same Dockerfile, `runtime` target, bind-mounted code | same image, immutable | Identical Dockerfile; only mount + `AFYA_OPTIMIZE` differ |
| PHP | 8.3 FPM Alpine | 8.3 FPM Alpine | Same base image |
| Database | MySQL 8.0 container | Managed MySQL 8 | Same major version & auth plugin |
| Cache/queue/broadcast | Redis 7 container | Managed Redis 7 | Same protocol & drivers |
| Object storage | MinIO (`s3` driver, path-style) | R2/S3/B2 (`s3`/`r2`/`b2`) | Same Flysystem S3 code path; env-only switch |
| Mail | Mailpit (SMTP capture) | Mailgun/Resend | Same Laravel mailer abstraction |
| WebSockets | Reverb container | Reverb pool | Same `reverb:start` role |
| Queue worker / scheduler | Compose services | Orchestrated pods | Same image roles via entrypoint |
| TLS | mkcert `*.afya.test` | Edge/LB ACME certs | HTTPS exercised in both |
| Config/secrets | `.env` (gitignored) | secret manager → env | Same env keys (`.env.example` is the contract) |

**Parity guarantees:**

- The *only* differences are managed-vs-self-hosted infra and `AFYA_OPTIMIZE`/mount strategy — never
  the application code, PHP version, or data-plane semantics.
- "Works on my machine" failures are minimised because MySQL 8, Redis, and S3 semantics are real
  locally (MinIO, not a fake), and mail/storage/queue all go through the same abstractions the
  foundation mandates.
- Staging is production's twin (same cloud, same images, smaller scale, anonymised data) and is the
  rehearsal stage for every migration before it touches PHI.

---

## 15. Appendix: file inventory & checklists

### 15.1 Deployment file inventory

```
.
├── docker/
│   ├── app/
│   │   ├── Dockerfile            # multi-stage PHP-FPM 8.3 app image (all roles)
│   │   ├── entrypoint.sh         # role selector: php-fpm|worker|scheduler|reverb|migrate
│   │   ├── php.ini               # prod PHP settings
│   │   ├── opcache.ini           # OPcache (validate_timestamps=0 in prod)
│   │   └── www.conf              # PHP-FPM pool tuning (pm.max_children, etc.)
│   └── web/
│       ├── Dockerfile            # Nginx image
│       ├── nginx.conf            # global nginx config
│       └── app.conf.template     # server block (envsubst FPM_HOST)
├── docker-compose.yml            # LOCAL dev stack (§4)
├── .dockerignore
├── .env.example                  # committed contract; no real values
├── infra/                        # Terraform (compute, MySQL, Redis, buckets, LB, DNS)
└── .github/workflows/deploy.yml  # CI/CD pipeline (§7.2)
```

### 15.2 Pre-production go-live checklist

- [ ] `APP_KEY` generated, stored in secret manager + break-glass vault.
- [ ] `.env` not present in any image (`docker history` clean); `.dockerignore` excludes `.env*`.
- [ ] Managed MySQL 8 with read replica; automated backups + PITR enabled; app user (not root).
- [ ] Managed Redis with auth + TLS; sessions/cache/queue/broadcast pointed at it.
- [ ] Object storage bucket **private**, versioning + lifecycle + cross-region replication on.
- [ ] `STORAGE_DRIVER` set per env; signed-URL TTL configured; no public bucket.
- [ ] Single scheduler pod (fixed replica 1, no autoscale).
- [ ] Worker pool with graceful `queue:restart` on deploy; idempotent jobs verified.
- [ ] `/healthz`, `/readyz`, `/up` wired to LB + orchestrator; scheduler heartbeat monitored.
- [ ] Sentry DSNs set; PII scrubbing on; source maps uploaded; release tagged by SHA.
- [ ] TLS at edge/LB; HSTS; trusted proxies configured; origin locked to LB/CDN.
- [ ] Migrations follow expand/contract; `down()` proven in CI; rollback = redeploy prior digest.
- [ ] Restore drill performed and timed within RTO; RPO verified via PITR.
- [ ] CDN serving hashed SPA assets; cache-busting via Vite manifest.
- [ ] Trivy image scan green; non-root runtime confirmed.
- [ ] Load test to target concurrency; autoscaling thresholds validated.

### 15.3 Per-deploy checklist

- [ ] CI green (lint, types, Pest ≥80%, Vitest, Playwright).
- [ ] Image built, scanned, pushed; digest recorded.
- [ ] Deployed + smoke-tested on staging; migration rehearsed.
- [ ] Pre-deploy DB snapshot taken.
- [ ] Expand migrations applied before app rollout.
- [ ] Rolling update: app → workers → scheduler → reverb, each health-gated.
- [ ] Post-deploy synthetic checks pass; Sentry quiet on new SHA.
- [ ] Contract migrations scheduled for N+2 (not this release).

---

> **End of 25 — Deployment Strategy.** Consistent with `00-foundation.md` (modular monolith,
> MySQL 8 + Redis, storage driver abstraction, Reverb broadcasting, queue/scheduler, hybrid
> local-dev-friendly + cloud-ready). Subordinate to the foundation on any conflict.
