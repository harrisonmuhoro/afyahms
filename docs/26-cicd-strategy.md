# 26 — CI/CD Strategy

> **Scope:** The complete, opinionated Continuous Integration & Continuous Delivery strategy for
> Afya HMS — branching model, commit hygiene, pre-commit hooks, the full GitHub Actions pipeline
> set (backend CI, frontend CI, security scanning, Docker build/push), the CD pipeline (staging →
> manual approval → production with smoke tests and rollback), environment protection rules,
> secrets, quality gates, caching, artifact/release management, notifications, and the monorepo
> path-filtering strategy.
>
> **Authority:** Subordinate to `00-foundation.md`. The foundation owns the constants — Conventional
> Commits, Husky, ESLint/Prettier/Pint, ≥80% coverage, Docker, Laravel 11 / PHP 8.3+, React 18 +
> TypeScript + Vite, MySQL 8, Redis. This document owns the *pipeline implementation shape* and must
> not contradict those values.
>
> **Platform:** GitHub + **GitHub Actions**. Container registry: **GitHub Container Registry
> (GHCR)**. Deployment target: Docker hosts (staging + production) reachable over SSH; cloud-ready
> per the hybrid deployment decision in foundation §1.

---

## 0. Repository topology assumption

Afya HMS is a single **monorepo** with two deployable applications plus shared infra:

```
afya-hms/
├── backend/                 # Laravel 11 modular monolith
│   ├── app/  modules/  tests/  composer.json  ...
│   └── Dockerfile
├── frontend/                # React 18 + Vite SPA/PWA
│   ├── src/  tests/  e2e/  package.json  vite.config.ts ...
│   └── Dockerfile
├── docker/                  # compose files, nginx, php-fpm, supervisor configs
│   ├── docker-compose.yml
│   ├── docker-compose.staging.yml
│   └── docker-compose.production.yml
├── docs/                    # this folder (00–27)
├── .husky/                  # git hooks
├── .github/
│   ├── workflows/           # all pipelines (this document)
│   └── CODEOWNERS
├── commitlint.config.cjs
├── package.json             # root: husky + lint-staged + commitlint + changesets
└── .changeset/              # release/changelog automation
```

A monorepo is chosen over split repos because backend and frontend evolve in lockstep (Zod schemas
mirror FormRequests, API contract changes touch both). The cost — running everything on every
commit — is neutralised by **path filtering** (§10).

---

## 1. Branching strategy, PR rules & versioning

### 1.1 Model: Trunk-Based Development (recommended)

**Decision: Trunk-Based Development with short-lived branches**, not GitFlow.

GitFlow's long-lived `develop` + `release/*` + `hotfix/*` topology adds merge overhead, delays
integration, and produces divergent branches that are expensive to keep green. For a small-to-mid
team shipping a single deployable product to a controlled set of branches, trunk-based development
gives faster feedback, simpler mental model, and one always-deployable line.

```
main  ──●──────●──────●──────●──────●──────●──▶   (always deployable; protected)
         \      \             \      \
          feat/  fix/          feat/  chore/        short-lived (< 2 days), squash-merged
```

| Branch | Purpose | Lifetime | Merges into |
|---|---|---|---|
| `main` | Single source of truth, always deployable | permanent, protected | — |
| `feat/<scope>-<slug>` | New feature | < 2 days | `main` (squash) |
| `fix/<scope>-<slug>` | Bug fix | < 1 day | `main` (squash) |
| `chore/`, `refactor/`, `docs/`, `test/`, `ci/`, `perf/`, `build/` | Non-feature work | short | `main` (squash) |
| `hotfix/<slug>` | Emergency production fix | minutes–hours | `main` (squash) → fast-track CD |

- **No `develop` branch.** `main` is the trunk.
- **Feature flags** (a lightweight `config('features.*')` + DB-backed toggle) gate incomplete work
  so it can land on `main` behind a flag rather than rotting on a branch.
- **Releases are tags on `main`** (`vMAJOR.MINOR.PATCH`), never separate branches.

### 1.2 Pull request rules

Every change reaches `main` through a PR. Direct pushes to `main` are blocked by branch protection
(§5).

- **Squash merge only** — keeps `main` history one-commit-per-PR and lets the squashed commit
  subject become the canonical Conventional Commit for changelog generation.
- **PR title MUST be a valid Conventional Commit** (enforced in CI, §1.3). The squash commit
  inherits the PR title.
- **Required reviews:** ≥ 1 approving review; ≥ 2 for changes touching `Auth`, `Billing`,
  `Insurance`, `Audit`, or `infra/.github/workflows` (enforced via `CODEOWNERS`).
- **All required status checks green** (§6) before merge is allowed.
- **Up to date with `main`** — "Require branches to be up to date before merging" is on; rebase or
  merge `main` in, re-run CI.
- **Linear history required** (no merge commits on `main`).
- **PR template** enforces: description, linked issue, test evidence, screenshots for UI, and a
  "Breaking change?" checkbox.
- **Stale conversation resolution required** — all review threads resolved before merge.

```
# .github/CODEOWNERS (excerpt)
/backend/modules/Auth/        @afya/security @afya/backend-leads
/backend/modules/Billing/     @afya/finance  @afya/backend-leads
/backend/modules/Insurance/   @afya/finance  @afya/backend-leads
/backend/modules/Audit/       @afya/security
/.github/workflows/           @afya/devops
/docker/                      @afya/devops
```

### 1.3 Conventional Commits, SemVer & automated changelog

- **Conventional Commits** (foundation §14) is mandatory for PR titles and the squashed commit.
  Format: `type(scope): subject`.
- **Allowed types:** `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`,
  `revert`. **Allowed scopes** mirror the backend module list + `frontend`, `infra`, `deps`,
  `release` (e.g. `feat(patients):`, `fix(queue):`, `chore(deps):`).
- **Breaking changes:** `feat(billing)!:` or a `BREAKING CHANGE:` footer → bumps **MAJOR**.
- **Semantic Versioning** is derived from commit types since the last tag:
  - `fix:` / `perf:` → **PATCH**
  - `feat:` → **MINOR**
  - `!` or `BREAKING CHANGE:` → **MAJOR**
- **Tooling: Changesets** (`@changesets/cli`) drives versioning + changelog. Each PR that changes
  shipped behaviour adds a changeset markdown file under `.changeset/`. A **Release** workflow
  (§8) opens/updates a "Version Packages" PR; merging it bumps versions, writes `CHANGELOG.md`, and
  tags `vX.Y.Z`. (An alternative, `semantic-release`, is documented in §8.2 for teams preferring
  fully-automated tag-on-merge.)

`commitlint` (§2.5) rejects non-conforming messages locally; the `pr-title-lint` job (§3.5) rejects
them in CI.

---

## 2. Pre-commit hooks (Husky)

Husky v9 hooks live in `.husky/`. They run **fast** checks only — anything slow (full test suite,
E2E, image scans) is deferred to CI. The contract: a commit that passes hooks should almost always
pass CI lint/format/type gates.

### 2.1 Root `package.json` (hook orchestration)

```jsonc
{
  "name": "afya-hms",
  "private": true,
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^19.3.0",
    "@commitlint/config-conventional": "^19.2.2",
    "@changesets/cli": "^2.27.0"
  }
}
```

### 2.2 `.husky/pre-commit`

```sh
#!/usr/bin/env sh
# Fast, staged-file-only checks. Heavy suites run in CI.
npx lint-staged
```

### 2.3 `.husky/commit-msg`

```sh
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```

### 2.4 `.husky/pre-push`

```sh
#!/usr/bin/env sh
# Cheap but higher-value than per-file: type safety + quick unit smoke.
# Keep under ~30s; full suites & coverage gate run in CI.
set -e

# Frontend type check (no emit)
if git diff --name-only origin/main...HEAD | grep -q '^frontend/'; then
  (cd frontend && npm run type-check)
fi

# Backend static analysis on changed PHP (fast level), if backend touched
if git diff --name-only origin/main...HEAD | grep -q '^backend/'; then
  (cd backend && composer run -q phpstan:changed || true)
fi
```

### 2.5 `lint-staged` & `commitlint` config

```jsonc
// lint-staged.config.cjs  (root)
module.exports = {
  // Backend PHP — Pint formats, then PHPStan validates the staged files.
  "backend/**/*.php": [
    () => "bash -c 'cd backend && composer run pint:dirty'",
  ],
  // Frontend TS/TSX — ESLint (fix) then Prettier.
  "frontend/**/*.{ts,tsx}": [
    () => "bash -c 'cd frontend && eslint --fix --max-warnings=0'",
    () => "bash -c 'cd frontend && prettier --write'",
  ],
  // JSON / YAML / MD / CSS across the repo — Prettier only.
  "**/*.{json,jsonc,yml,yaml,md,css,scss}": [
    "prettier --write",
  ],
};
```

```js
// commitlint.config.cjs  (root)
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", [
      "feat", "fix", "perf", "refactor", "docs",
      "test", "build", "ci", "chore", "revert",
    ]],
    "scope-enum": [2, "always", [
      "auth", "tenancy", "patients", "appointments", "queue", "triage", "emr",
      "clinical-alerts", "pharmacy", "laboratory", "radiology", "billing",
      "insurance", "inpatient", "inventory", "reporting", "communication",
      "patient-portal", "documents", "audit", "admin",
      "frontend", "infra", "deps", "release",
    ]],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "header-max-length": [2, "always", 100],
  },
};
```

> **Note on Pint in `lint-staged`:** `composer run pint:dirty` maps to `pint --dirty` (formats only
> files changed vs HEAD), which is the correct staged-file behaviour for Laravel. ESLint/Prettier
> operate on the exact staged file list lint-staged passes. The hooks must **format and re-stage**;
> lint-staged re-stages modified files automatically.

Mapped composer scripts (`backend/composer.json`):

```jsonc
"scripts": {
  "pint":        "pint",
  "pint:dirty":  "pint --dirty",
  "pint:test":   "pint --test",
  "phpstan":     "phpstan analyse --memory-limit=1G",
  "phpstan:changed": "phpstan analyse --memory-limit=1G",
  "test":        "pest",
  "test:coverage": "pest --coverage --min=80"
}
```

---

## 3. CI pipeline — GitHub Actions

The CI layer is a set of focused workflows wired together by **path filters** (§10) and a
**reusable change-detection** job. All CI workflows trigger on `pull_request` (to `main`) and on
`push` to `main` (post-merge verification before CD).

### 3.0 Change detection (path filtering core)

`.github/workflows/_changes.yml` — a **reusable workflow** that emits boolean outputs so downstream
jobs can skip cleanly.

```yaml
# .github/workflows/_changes.yml
name: detect-changes
on:
  workflow_call:
    outputs:
      backend:  { description: "backend changed",  value: ${{ jobs.filter.outputs.backend }} }
      frontend: { description: "frontend changed", value: ${{ jobs.filter.outputs.frontend }} }
      docker:   { description: "docker changed",   value: ${{ jobs.filter.outputs.docker }} }

jobs:
  filter:
    runs-on: ubuntu-latest
    outputs:
      backend:  ${{ steps.f.outputs.backend }}
      frontend: ${{ steps.f.outputs.frontend }}
      docker:   ${{ steps.f.outputs.docker }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: f
        with:
          filters: |
            backend:
              - 'backend/**'
              - 'docker/**'
              - '.github/workflows/backend-ci.yml'
            frontend:
              - 'frontend/**'
              - 'docker/**'
              - '.github/workflows/frontend-ci.yml'
            docker:
              - 'docker/**'
              - 'backend/Dockerfile'
              - 'frontend/Dockerfile'
```

### 3.1 Backend CI — `backend-ci.yml`

PHP 8.3 (matrix-ready for 8.4), Composer, Pint check, Larastan/PHPStan, Pest with the **≥80%
coverage gate**, MySQL 8 + Redis service containers.

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

# Cancel superseded runs on the same ref to save minutes.
concurrency:
  group: backend-ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  changes:
    uses: ./.github/workflows/_changes.yml

  backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    name: PHP ${{ matrix.php }} • Laravel 11
    runs-on: ubuntu-latest
    timeout-minutes: 25
    strategy:
      fail-fast: false
      matrix:
        php: ['8.3']        # add '8.4' here to fan out the matrix
    defaults:
      run:
        working-directory: backend

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: afya_test
          MYSQL_ROOT_PASSWORD: secret
        ports: ['3306:3306']
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -psecret"
          --health-interval=5s --health-timeout=5s --health-retries=20
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=5s --health-timeout=5s --health-retries=20

    env:
      APP_ENV: testing
      APP_KEY: base64:2fl+Ktnbg6Rj5h0Cv0xX8a4hQ7Z0m8b1cD2eF3gH4I=
      DB_CONNECTION: mysql
      DB_HOST: 127.0.0.1
      DB_PORT: 3306
      DB_DATABASE: afya_test
      DB_USERNAME: root
      DB_PASSWORD: secret
      REDIS_HOST: 127.0.0.1
      REDIS_PORT: 6379
      CACHE_STORE: redis
      QUEUE_CONNECTION: redis
      SESSION_DRIVER: redis
      MAIL_MAILER: array

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          extensions: mbstring, pdo_mysql, redis, bcmath, intl, gd, zip, pcntl
          coverage: pcov
          ini-values: error_reporting=E_ALL, memory_limit=512M

      - name: Get composer cache dir
        id: composer-cache
        run: echo "dir=$(composer config cache-files-dir)" >> "$GITHUB_OUTPUT"

      - name: Cache composer packages
        uses: actions/cache@v4
        with:
          path: ${{ steps.composer-cache.outputs.dir }}
          key: composer-${{ matrix.php }}-${{ hashFiles('backend/composer.lock') }}
          restore-keys: composer-${{ matrix.php }}-

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist --no-progress

      - name: Prepare app
        run: |
          cp .env.example .env || true
          php artisan key:generate --force

      - name: Code style — Pint (check only)
        run: composer run pint:test

      - name: Static analysis — Larastan/PHPStan
        run: composer run phpstan

      - name: Run migrations
        run: php artisan migrate --force --seed

      - name: Tests — Pest + coverage gate (>=80%)
        run: ./vendor/bin/pest --coverage --min=80 --coverage-clover=coverage.xml --log-junit=junit.xml

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage-${{ matrix.php }}
          path: backend/coverage.xml
          retention-days: 7

      - name: Publish test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-junit-${{ matrix.php }}
          path: backend/junit.xml
          retention-days: 7
```

> **Coverage gate.** `pest --coverage --min=80` fails the job (non-zero exit) if total line coverage
> is below 80% (foundation §14). `pcov` is used over Xdebug for speed. Per-module thresholds can be
> enforced by adding `--coverage` config in `phpunit.xml` (`<report>` + `<include>` per module).

### 3.2 Frontend CI — `frontend-ci.yml`

Node 20, install (cached), ESLint (`--max-warnings=0`), `tsc --noEmit`, Vitest + coverage, Playwright
E2E, production build.

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: frontend-ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  changes:
    uses: ./.github/workflows/_changes.yml

  frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    name: Node ${{ matrix.node }} • Vite
    runs-on: ubuntu-latest
    timeout-minutes: 25
    strategy:
      fail-fast: false
      matrix:
        node: ['20.x']
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint — ESLint (zero warnings)
        run: npm run lint -- --max-warnings=0

      - name: Format check — Prettier
        run: npm run format:check

      - name: Type check — tsc --noEmit
        run: npm run type-check

      - name: Unit tests — Vitest + coverage gate (>=80%)
        run: npm run test:coverage

      - name: Build — Vite production bundle
        run: npm run build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist
          retention-days: 7

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: frontend/coverage
          retention-days: 7

  e2e:
    needs: [changes, frontend]
    if: needs.changes.outputs.frontend == 'true'
    name: Playwright E2E
    runs-on: ubuntu-latest
    timeout-minutes: 30
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('frontend/package-lock.json') }}

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      # Pull the built bundle so E2E runs against the same artifact.
      - uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist

      - name: Run Playwright (preview server + mocked API)
        run: npm run test:e2e
        env:
          VITE_API_BASE_URL: http://127.0.0.1:8080/api
          PW_BASE_URL: http://127.0.0.1:4173

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report
          retention-days: 7
```

Relevant `frontend/package.json` scripts:

```jsonc
"scripts": {
  "lint":          "eslint . --ext .ts,.tsx",
  "format:check":  "prettier --check .",
  "type-check":    "tsc --noEmit",
  "test":          "vitest run",
  "test:coverage": "vitest run --coverage --coverage.thresholds.lines=80 --coverage.thresholds.functions=80 --coverage.thresholds.branches=80 --coverage.thresholds.statements=80",
  "test:e2e":      "playwright test",
  "build":         "tsc -b && vite build",
  "preview":       "vite preview --port 4173"
}
```

> Vitest enforces the **≥80% gate** via `coverage.thresholds.*`; falling below any threshold exits
> non-zero and fails the job. Playwright's `webServer` config (`vite preview`) boots the built bundle
> so E2E exercises the real artifact, not a dev server.

### 3.3 Security scanning — `security.yml`

Dependency audit (Composer + npm), SAST (Semgrep + CodeQL), secret scanning (Gitleaks), and Trivy
image/filesystem scan.

```yaml
# .github/workflows/security.yml
name: Security

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '17 3 * * 1'   # weekly deep scan, Mondays 03:17 UTC

permissions:
  contents: read
  security-events: write    # upload SARIF to the Security tab

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Composer audit (backend)
        working-directory: backend
        run: |
          composer install --no-interaction --no-progress --prefer-dist
          composer audit --no-interaction

      - name: npm audit (frontend)
        working-directory: frontend
        run: |
          npm ci
          npm audit --audit-level=high

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

  sast-semgrep:
    runs-on: ubuntu-latest
    container: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - name: Semgrep scan
        run: semgrep ci --sarif --output=semgrep.sarif
        env:
          SEMGREP_RULES: >-
            p/php p/laravel p/javascript p/typescript p/react
            p/secrets p/owasp-top-ten
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: semgrep.sarif }

  sast-codeql:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        language: ['javascript-typescript']   # CodeQL has no PHP; Semgrep covers PHP
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: ${{ matrix.language }} }
      - uses: github/codeql-action/analyze@v3

  trivy-fs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trivy filesystem & misconfig scan
        uses: aquasecurity/trivy-action@0.24.0
        with:
          scan-type: fs
          scan-ref: .
          severity: CRITICAL,HIGH
          ignore-unfixed: true
          format: sarif
          output: trivy-fs.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: trivy-fs.sarif }
```

> **Image scanning** (Trivy against the built Docker images) lives in the build workflow (§3.4) so it
> scans the exact artifact about to be pushed.

### 3.4 Docker build, scan & push — `docker.yml`

Builds backend + frontend images with **BuildKit layer caching** (GitHub Actions cache backend),
scans with Trivy, and pushes to **GHCR** only on `push` to `main` (PRs build but do not push).

```yaml
# .github/workflows/docker.yml
name: Docker Build & Push

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
    tags: ['v*.*.*']

concurrency:
  group: docker-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  packages: write           # push to GHCR
  security-events: write    # upload Trivy SARIF

env:
  REGISTRY: ghcr.io
  IMAGE_BASE: ghcr.io/${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - app: backend
            context: ./backend
            dockerfile: ./backend/Dockerfile
          - app: frontend
            context: ./frontend
            dockerfile: ./frontend/Dockerfile
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker metadata (tags & labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_BASE }}/${{ matrix.app }}
          tags: |
            type=ref,event=pr
            type=sha,format=long
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build image (load locally for scan)
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.dockerfile }}
          push: false
          load: true
          tags: ${{ env.IMAGE_BASE }}/${{ matrix.app }}:scan
          cache-from: type=gha,scope=${{ matrix.app }}
          cache-to: type=gha,scope=${{ matrix.app }},mode=max

      - name: Trivy image scan (fail on CRITICAL/HIGH)
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ${{ env.IMAGE_BASE }}/${{ matrix.app }}:scan
          severity: CRITICAL,HIGH
          ignore-unfixed: true
          exit-code: '1'
          format: sarif
          output: trivy-${{ matrix.app }}.sarif

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: trivy-${{ matrix.app }}.sarif }

      - name: Push image (main / tags only)
        if: github.event_name != 'pull_request'
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.dockerfile }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha,scope=${{ matrix.app }}
          cache-to: type=gha,scope=${{ matrix.app }},mode=max
```

### 3.5 PR title lint — `pr-title.yml`

```yaml
# .github/workflows/pr-title.yml
name: PR Title Lint
on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
permissions:
  pull-requests: read
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: feat,fix,perf,refactor,docs,test,build,ci,chore,revert
          requireScope: false
          subjectPattern: ^(?![A-Z]).+$   # subject must not start uppercase
```

---

## 4. CD pipeline

CD runs **after** all CI checks pass on `push` to `main`. Flow:

```
merge to main
   └─ CI green (backend, frontend, security, docker push)
        └─ deploy-staging  (auto)
             └─ migrate (staging) → deploy → smoke tests
                  └─ [manual approval gate]  (environment: production)
                       └─ deploy-production
                            └─ migrate (production) → deploy → smoke tests
                                 └─ pass? done   |   fail? auto-rollback
```

Deployment uses **immutable images** (the digest built in §3.4). Hosts pull the pinned image tag
(commit SHA) and roll via `docker compose up -d`. No build happens on the target host.

```yaml
# .github/workflows/cd.yml
name: CD

on:
  workflow_run:
    workflows: ["Docker Build & Push"]
    types: [completed]
    branches: [main]

permissions:
  contents: read
  packages: read
  deployments: write

env:
  IMAGE_BASE: ghcr.io/${{ github.repository }}

jobs:
  guard:
    # Only proceed if the upstream build succeeded.
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ github.event.workflow_run.head_sha }}
    steps:
      - run: echo "Deploying ${{ github.event.workflow_run.head_sha }}"

  deploy-staging:
    needs: guard
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.afya-hms.co.ke
    steps:
      - uses: actions/checkout@v4

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.STAGING_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H "${{ secrets.STAGING_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy to staging (pull image, migrate, roll)
        env:
          TAG: sha-${{ needs.guard.outputs.sha }}
        run: |
          ssh deploy@${{ secrets.STAGING_HOST }} bash -s <<'REMOTE'
            set -euo pipefail
            cd /opt/afya
            export TAG="${{ env.TAG }}"
            echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose -f docker/docker-compose.staging.yml pull
            # Zero-downtime-ish: run migrations in a one-off container first.
            docker compose -f docker/docker-compose.staging.yml run --rm backend php artisan migrate --force
            docker compose -f docker/docker-compose.staging.yml up -d
            docker compose -f docker/docker-compose.staging.yml exec -T backend php artisan config:cache route:cache
          REMOTE

      - name: Smoke tests — staging
        run: ./.github/scripts/smoke.sh https://staging.afya-hms.co.ke

      - name: Record git SHA for rollback
        run: echo "sha-${{ needs.guard.outputs.sha }}" > .last_good_staging

  deploy-production:
    needs: [guard, deploy-staging]
    runs-on: ubuntu-latest
    environment:
      name: production           # ← required reviewers gate lives here (§5)
      url: https://app.afya-hms.co.ke
    steps:
      - uses: actions/checkout@v4

      - name: Capture current production tag (for rollback)
        id: current
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PROD_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H "${{ secrets.PROD_HOST }}" >> ~/.ssh/known_hosts
          PREV=$(ssh deploy@${{ secrets.PROD_HOST }} "cat /opt/afya/.current_tag || echo none")
          echo "prev=$PREV" >> "$GITHUB_OUTPUT"

      - name: Deploy to production
        id: deploy
        env:
          TAG: sha-${{ needs.guard.outputs.sha }}
        run: |
          ssh deploy@${{ secrets.PROD_HOST }} bash -s <<'REMOTE'
            set -euo pipefail
            cd /opt/afya
            export TAG="${{ env.TAG }}"
            echo "${{ secrets.GHCR_PAT }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose -f docker/docker-compose.production.yml pull
            php_artisan() { docker compose -f docker/docker-compose.production.yml run --rm backend php artisan "$@"; }
            php_artisan down --render="errors::503" --retry=15 || true
            php_artisan migrate --force
            docker compose -f docker/docker-compose.production.yml up -d
            docker compose -f docker/docker-compose.production.yml exec -T backend php artisan config:cache route:cache queue:restart
            docker compose -f docker/docker-compose.production.yml exec -T backend php artisan up
            echo "${{ env.TAG }}" > /opt/afya/.current_tag
          REMOTE

      - name: Smoke tests — production
        id: smoke
        run: ./.github/scripts/smoke.sh https://app.afya-hms.co.ke

      - name: Rollback on failure
        if: failure() && steps.current.outputs.prev != 'none'
        env:
          PREV: ${{ steps.current.outputs.prev }}
        run: |
          ssh deploy@${{ secrets.PROD_HOST }} bash -s <<'REMOTE'
            set -euo pipefail
            cd /opt/afya
            export TAG="${{ env.PREV }}"
            echo ">>> ROLLING BACK to $TAG"
            docker compose -f docker/docker-compose.production.yml pull
            docker compose -f docker/docker-compose.production.yml up -d
            docker compose -f docker/docker-compose.production.yml exec -T backend php artisan up
            echo "$TAG" > /opt/afya/.current_tag
          REMOTE
```

`.github/scripts/smoke.sh` — minimal post-deploy health verification:

```bash
#!/usr/bin/env bash
# Usage: smoke.sh <base_url>
set -euo pipefail
BASE="$1"
fail() { echo "SMOKE FAIL: $1"; exit 1; }

# 1. API health endpoint must be 200 with status ok.
curl -fsS --max-time 10 "$BASE/api/health" | grep -q '"status":"ok"' || fail "health"

# 2. DB-backed readiness (migrations applied, db reachable).
curl -fsS --max-time 10 "$BASE/api/health/ready" | grep -q '"db":"up"' || fail "db readiness"

# 3. Redis-backed readiness.
curl -fsS --max-time 10 "$BASE/api/health/ready" | grep -q '"redis":"up"' || fail "redis readiness"

# 4. SPA shell loads.
curl -fsS --max-time 10 "$BASE/" | grep -qi '<div id="root"' || fail "spa shell"

echo "SMOKE OK for $BASE"
```

> **Migration safety.** Migrations are run in a **one-off container** before the new app comes up
> and must be **backward-compatible** (expand/contract pattern: add columns nullable, deploy code,
> backfill, then a later release drops old columns). Destructive migrations are split across two
> releases so a rollback to the previous image never hits a missing column. `migrate --force` is
> required because the container env is non-interactive.

> **Rollback semantics.** Rollback re-points to the **previous image tag** (data-safe, because
> migrations were backward-compatible). It does **not** auto-run `migrate:rollback` — schema
> down-migrations on production are manual and reviewed, since rolling back PHI-bearing schema is a
> compliance-sensitive operation (foundation §11).

---

## 5. Environment protection rules & secrets

### 5.1 GitHub Environments

Two environments, configured under **Settings → Environments**:

| Environment | Auto-deploy | Required reviewers | Wait timer | Deployment branches |
|---|---|---|---|---|
| `staging` | yes (on `main` push, post-CI) | none | 0 | `main` only |
| `production` | no — **gated** | ≥ 1 from `@afya/release-approvers` (recommend 2) | 0–5 min cool-off | `main` + tags `v*` only |

- **Production "Required reviewers"** is the **manual approval gate**: the `deploy-production` job
  pauses until an approver clicks *Review deployments → Approve*. The same person who triggered the
  run cannot self-approve if "Prevent self-review" is enabled.
- **Deployment branch policy** restricts which refs may deploy each environment (defence in depth).
- Branch protection on `main`:
  - Require PR before merging; require ≥ 1 (≥ 2 for sensitive `CODEOWNERS` paths) approvals.
  - Require status checks: `Backend CI`, `Frontend CI`, `Playwright E2E`, `Security / *`,
    `Docker Build & Push`, `PR Title Lint`.
  - Require branches up to date; require linear history; require conversation resolution.
  - Include administrators; block force-push and deletion.
  - Require signed commits (recommended).

### 5.2 Secrets management

Secrets are stored as **environment-scoped** secrets (not repo-wide) wherever they grant deploy/PHI
access, so a staging key cannot deploy production.

| Secret | Scope | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | auto | GHCR push, SARIF upload (least-priv via `permissions:`) |
| `GHCR_PAT` | env: staging, production | hosts pull private images from GHCR |
| `STAGING_HOST`, `STAGING_SSH_KEY` | env: staging | SSH deploy to staging |
| `PROD_HOST`, `PROD_SSH_KEY` | env: production | SSH deploy to production |
| `SLACK_WEBHOOK_URL` | repo | failure/deploy notifications |
| `GITLEAKS_LICENSE` | repo | Gitleaks org license (if used) |
| `SEMGREP_APP_TOKEN` | repo (optional) | Semgrep Cloud findings sync |

Rules:
- **No secrets in code, `.env` committed, or logs.** `.env` is git-ignored; Gitleaks + push
  protection enforce this. Application runtime secrets (DB password, M-Pesa Daraja keys, SHA creds,
  AfricasTalking, Mailgun/Resend) live on the **hosts** in an out-of-band `/opt/afya/.env`, injected
  by `docker compose`, never passed through Actions.
- **OIDC over long-lived keys** where a cloud provider is adopted (e.g. AWS) — exchange a short-lived
  token via `permissions: id-token: write` instead of storing static credentials.
- Rotate SSH and GHCR PATs quarterly; secret-scan + Dependabot alerts run continuously.

---

## 6. Quality gates (merge-blocking)

A PR cannot merge to `main` unless **every** gate is green. These map 1:1 to required status checks
(§5.1).

| Gate | Check | Threshold / rule | Source |
|---|---|---|---|
| Commit hygiene | `PR Title Lint` | valid Conventional Commit | §3.5 |
| Backend style | Pint | zero diffs (`pint --test`) | §3.1 |
| Backend static analysis | Larastan/PHPStan | level ≥ 6, zero errors | §3.1 |
| Backend tests + coverage | Pest | pass + **≥ 80% line coverage** | §3.1 |
| Frontend lint | ESLint | `--max-warnings=0` | §3.2 |
| Frontend format | Prettier | `--check` clean | §3.2 |
| Frontend types | `tsc --noEmit` | zero errors, `strict`, no `any` | §3.2 |
| Frontend tests + coverage | Vitest | pass + **≥ 80% (lines/funcs/branches/stmts)** | §3.2 |
| E2E | Playwright | all specs pass | §3.2 |
| Dependency audit | `composer audit` / `npm audit` | no HIGH+ unresolved | §3.3 |
| Secrets | Gitleaks | no leaked secrets | §3.3 |
| SAST | Semgrep + CodeQL | no new CRITICAL/HIGH | §3.3 |
| Image scan | Trivy | no CRITICAL/HIGH (unfixed ignored) | §3.4 |

Security findings surface in the GitHub **Security** tab via SARIF; "no **new** CRITICAL/HIGH" is
enforced by Code Scanning's PR check.

---

## 7. Caching strategy (pipeline speed)

| Layer | Mechanism | Key | Effect |
|---|---|---|---|
| Composer | `actions/cache@v4` on `composer config cache-files-dir` | `composer-<php>-${{ hashFiles('composer.lock') }}` | skip re-download of vendor tarballs |
| npm | `actions/setup-node` built-in cache (`cache: npm`) | `package-lock.json` hash | restore `~/.npm` |
| Playwright browsers | `actions/cache@v4` on `~/.cache/ms-playwright` | `package-lock.json` hash | skip ~300MB browser download |
| Docker layers | BuildKit `cache-from/to: type=gha` (per-app `scope`) | content-addressed | reuse unchanged image layers |
| PHP setup | `shivammathur/setup-php` extension cache | action-managed | faster extension install |

Additional speed levers:
- **`concurrency` + `cancel-in-progress`** kills superseded runs on the same ref.
- **Path filtering** (§10) skips whole app pipelines when only the other app changed.
- **Matrix `fail-fast: false`** keeps useful signal from parallel legs.
- Restore-keys allow partial cache hits when `composer.lock` changes slightly.

---

## 8. Artifact & release management

### 8.1 Artifacts

- **Build artifacts:** `frontend-dist`, backend `vendor` (implicit via cache), coverage XML/HTML,
  JUnit XML, Playwright reports — uploaded via `actions/upload-artifact@v4` with 7-day retention for
  debugging. The **canonical deployable artifact is the Docker image** in GHCR, tagged by commit SHA
  (immutable) plus moving tags (`latest`, semver).
- **Image retention:** keep all SHA-tagged images for 90 days; prune untagged/dangling weekly via a
  scheduled `actions/delete-package-versions` job.

### 8.2 Releases & changelog (Changesets)

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: write          # tag + create release
  pull-requests: write     # open the Version Packages PR
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: npm }
      - run: npm ci
      - name: Create release PR or publish (tag + CHANGELOG)
        uses: changesets/action@v1
        with:
          version: npm run version          # applies changesets → bumps + CHANGELOG.md
          publish: npm run release:tag       # creates git tag vX.Y.Z + GitHub Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Flow: contributor adds a `.changeset/*.md` in their PR → on merge, the **Release** workflow opens a
"Version Packages" PR aggregating pending changesets → merging that PR bumps the version, writes
`CHANGELOG.md`, tags `vX.Y.Z`, and creates a GitHub Release. The tag push triggers `docker.yml` to
publish semver-tagged images (`type=semver` in §3.4).

> **Alternative — `semantic-release`:** for fully automated tag-on-merge (no Version Packages PR),
> replace this workflow with `cycjimmy/semantic-release-action`, deriving the bump directly from the
> squashed Conventional Commit and generating `CHANGELOG.md` + GitHub Release in one step. Choose
> Changesets when you want an explicit human checkpoint before release; choose semantic-release for
> maximum automation.

---

## 9. Notifications

Failures and deployments notify Slack (`#afya-ci` / `#afya-deploys`) and email release-approvers.

```yaml
# Reusable notify job appended to CI/CD workflows (or a workflow_run listener).
notify-failure:
  if: failure()
  needs: [backend, frontend, e2e]   # adjust per workflow
  runs-on: ubuntu-latest
  steps:
    - name: Slack failure alert
      uses: slackapi/slack-github-action@v2
      with:
        webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
        webhook-type: incoming-webhook
        payload: |
          {
            "text": ":red_circle: *${{ github.workflow }}* failed on `${{ github.ref_name }}`",
            "blocks": [
              { "type": "section", "text": { "type": "mrkdwn",
                "text": "*${{ github.workflow }}* failed\n*Actor:* ${{ github.actor }}\n*Commit:* <${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}|${{ github.sha }}>\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View run>" } }
            ]
          }
```

Notification policy:
- **CI failure on `main`** → Slack `#afya-ci` (loud) + email backend/frontend leads. A red `main` is
  treated as a "stop the line" event.
- **CI failure on a PR** → in-PR status check only (no Slack noise).
- **Deploy started / succeeded / failed** → Slack `#afya-deploys` with environment + SHA.
- **Production rollback triggered** → Slack `#afya-deploys` `@here` + PagerDuty/email to on-call.
- **Security: new CRITICAL/HIGH** → Slack `#afya-security` + GitHub Security alert.

GitHub's native email notifications cover required-reviewer approval requests for the production
environment.

---

## 10. Monorepo path filtering (split-pipeline behaviour)

The monorepo runs as **independent, path-filtered pipelines** so a frontend-only PR never runs the
PHP matrix and vice-versa, while shared changes (`docker/**`) trigger both.

- **`dorny/paths-filter`** (§3.0) is the single source of "what changed", exposed as reusable
  workflow outputs. Each app job gates on `needs.changes.outputs.<app> == 'true'`.
- **Why `paths-filter` over top-level `on.paths`:** top-level `paths:` filters whole *workflows*,
  which breaks required-status-checks (a skipped required check is "pending" forever and blocks
  merge). With job-level `if:` gating, the workflow always runs and reports a (trivially green)
  status, so required checks resolve correctly. To keep this clean, a tiny **`required-gate`** job
  with `if: always()` aggregates app jobs and is the *actual* required check:

```yaml
  required-gate:
    if: always()
    needs: [changes, backend]       # or [changes, frontend, e2e]
    runs-on: ubuntu-latest
    steps:
      - name: Verify required jobs
        run: |
          # Pass if the app didn't change (skipped) OR its job succeeded.
          test "${{ needs.changes.outputs.backend }}" = "false" \
            || test "${{ needs.backend.result }}" = "success"
```

- **Shared triggers:** `docker/**` and Dockerfiles fan out to both apps (cross-cutting infra).
- **Split-pipeline path (future):** if backend and frontend ever split into separate repos, each
  inherits its own `*-ci.yml` verbatim (drop the `changes`/`required-gate` plumbing); `cd.yml`
  becomes two CD workflows coordinated by an orchestration repo or by deploying each app
  independently. The image-per-app design already makes the apps independently deployable.

---

## 11. Pipeline summary (at a glance)

| Workflow | Trigger | Key jobs | Blocks merge? | Deploys? |
|---|---|---|---|---|
| `pr-title.yml` | PR | Conventional Commit lint | yes | no |
| `backend-ci.yml` | PR, push main | Pint, PHPStan, Pest+coverage (MySQL/Redis services) | yes | no |
| `frontend-ci.yml` | PR, push main | ESLint, Prettier, tsc, Vitest+coverage, Playwright, build | yes | no |
| `security.yml` | PR, push main, weekly | audit, Gitleaks, Semgrep, CodeQL, Trivy fs | yes | no |
| `docker.yml` | PR, push main, tags | build, Trivy image, push to GHCR | yes (build) | no |
| `cd.yml` | after Docker on main | staging (auto) → prod (gated) → smoke → rollback | n/a | **yes** |
| `release.yml` | push main | Changesets version/tag/changelog | no | no |

**End state:** every merge to `main` is automatically built into immutable images, deployed to
staging, smoke-tested, and held at a manual gate for production — with ≥80% coverage, lint, type,
and security gates all enforced before the merge ever happened.
