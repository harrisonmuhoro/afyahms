# Afya HMS

Afya HMS is a modular hospital management system for Kenyan healthcare facilities. It brings patient registration, clinical workflows, queue management, laboratory and radiology services, pharmacy, inventory, billing, M-Pesa payments, reporting, and a patient portal into one platform.

The project is organized as a modular monolith: the Laravel API owns domain rules and persistence, while the React application provides staff and patient experiences.

> **Project status:** Active development. Review the relevant requirements and architecture documents before making cross-module changes.

## Features

- Multi-branch tenancy and branch-scoped operations
- Patient registration, profiles, appointments, and portal access
- Queue management for reception, triage, consultation, laboratory, pharmacy, billing, and radiology
- Electronic medical records, SOAP notes, diagnoses, prescriptions, and clinical alerts
- Laboratory and radiology ordering, result entry, verification, and reporting
- Pharmacy dispensing and inventory control with stock alerts
- Billing, receipts, payment recording, and M-Pesa Daraja STK Push integration
- Role-based access control, permissions, MFA, Google OAuth, audit logging, and data-correction workflows
- Patient portal for appointments, records, results, messages, and bills
- Reports, exports, scheduled jobs, notifications, and real-time events

## Technology

### Backend

- PHP 8.3+
- Laravel 12
- MySQL 8+
- Redis for queues, cache, sessions, and real-time infrastructure
- Laravel Sanctum for API authentication
- Laravel Reverb for WebSockets
- Pest/PHPUnit, Pint, and PHPStan for quality checks

### Frontend

- Node.js 20+
- React 18 and TypeScript
- Vite, Tailwind CSS, and PWA support
- TanStack Query, Zustand, React Context, and React Router
- Vitest and Playwright

## Repository layout

```text
hospital/
├── backend/                 # Laravel API and domain modules
│   ├── app/Modules/         # Auth, Patients, Queue, Billing, EMR, etc.
│   ├── database/            # Migrations, factories, and seeders
│   ├── routes/              # Application and API route registration
│   └── tests/               # Backend tests
├── frontend/                # React/Vite staff app and patient portal
│   ├── src/features/        # Feature-oriented UI and API clients
│   ├── src/components/      # Shared UI components
│   └── tests/               # Frontend and browser tests
├── docker/                  # Dockerfiles and service configuration
├── docs/                    # Architecture, requirements, and design docs
├── roles/                   # Role responsibilities and operating guidance
├── Makefile                 # Docker and local development shortcuts
└── dev.bat                  # Windows/WAMP development launcher
```

## Requirements

- PHP 8.3 or later with `bcmath`, `ctype`, `fileinfo`, `gd`, `intl`, `mbstring`, `openssl`, `pdo_mysql`, `xml`, and `zip`
- Composer
- Node.js 20 or later and npm
- MySQL 8 or later
- Redis when using queues, cache, sessions, or real-time features locally
- Docker Desktop, if using the containerized workflow

## Quick start with Docker

1. Copy the root environment template if you need local overrides:

   ```bash
   cp .env.example .env
   ```

2. Start the development stack:

   ```bash
   make up
   ```

   Or run `docker compose up -d`.

3. Run migrations and seed data:

   ```bash
   make migrate
   make seed
   ```

4. Open the applications:

   - Frontend: `http://localhost:5173`
   - API: `http://localhost:8080`
   - Mailpit: `http://localhost:8025`

Useful commands:

```bash
make ps                    # Show service status
make logs                  # Follow all service logs
make artisan cmd="about"   # Run an Artisan command
make test                  # Run backend tests
make lint                  # Run backend and frontend lint checks
make down                  # Stop the stack
```

`make fresh` destroys and recreates the database, then runs the seeders. Use it only when resetting local development data is intentional.

## Local Windows/WAMP setup

1. Start Apache and MySQL in WAMP.
2. Configure `backend/.env` from `backend/.env.example`.
3. Install backend dependencies and migrate:

   ```powershell
   cd backend
   composer install
   php artisan key:generate
   php artisan migrate
   ```

4. Install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

5. Start the API in a second terminal:

   ```powershell
   cd backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

The bundled `dev.bat` starts the API on port `8000` and Vite on port `5173` in separate windows. Confirm that `VITE_API_BASE_URL` points to the API port used by your environment.

## Environment configuration

Do not commit `.env` files, API credentials, M-Pesa secrets, encryption keys, or production certificates.

At minimum, configure:

```dotenv
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=afya
DB_USERNAME=root
DB_PASSWORD=
```

For M-Pesa sandbox testing, configure the Daraja credentials and callback URL in `backend/.env`:

```dotenv
MPESA_ENV=sandbox
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
MPESA_STK_CALLBACK_URL=https://your-public-callback-url/api/v1/webhooks/mpesa/stk-callback
```

If local PHP does not expose a system CA store, set a valid CA bundle path:

```dotenv
MPESA_CA_BUNDLE="D:\\wamp64\\bin\\php\\php8.3.28\\extras\\ssl\\cacert.pem"
```

After changing environment or configuration values, clear cached configuration:

```bash
php artisan config:clear
```

## Development commands

### Backend

Run from `backend/`:

```bash
php artisan serve --port=8000
php artisan migrate
php artisan db:seed
php artisan test
composer run lint
composer run stan
```

### Frontend

Run from `frontend/`:

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm test
npm run e2e
```

## Architecture guidance

- Keep domain behavior inside the relevant backend module rather than controllers.
- Use Form Requests for validation and Policies/permissions for authorization.
- Preserve branch scoping and patient-data access boundaries.
- Treat bills, payments, receipts, audit events, and M-Pesa callbacks as financial records: prefer idempotent operations and avoid destructive edits.
- Keep public identifiers separate from internal database IDs. Public UUIDs may be used by APIs, but patient-facing screens should show human-readable references.
- Use signed, idempotent webhook handling for external payment callbacks.

## Documentation

Start with the [Foundation and Canonical Decisions](docs/00-foundation.md), then consult the documents relevant to your change:

| Area | Document |
|---|---|
| Product direction | [Executive Summary](docs/01-executive-summary.md) |
| Requirements | [PRD](docs/02-prd.md), [SRS](docs/03-srs.md), [Functional Requirements](docs/04-functional-requirements.md) |
| Architecture | [System Architecture](docs/09-system-architecture.md) |
| Data model | [Database ERD](docs/10-database-erd.md), [Database Schema](docs/11-database-schema.md) |
| API | [API Specification](docs/12-api-specification.md) |
| UI | [UI/UX Design System](docs/15-uiux-design-system.md) |
| M-Pesa | [M-Pesa Integration Design](docs/21-mpesa-integration-design.md) |
| Security | [Security Architecture](docs/22-security-architecture.md) |
| Testing | [Testing Strategy](docs/24-testing-strategy.md) |

The `docs/` and `roles/` directories contain the complete documentation set.

## License

Proprietary software. All rights reserved.
