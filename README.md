# Afya HMS — Hospital Management System

![Afya HMS Cover](https://via.placeholder.com/1200x300.png?text=Afya+Hospital+Management+System)

A modern, production-grade, multi-branch Hospital Management System designed for healthcare institutions in Kenya. 

Afya HMS is built as a highly scalable **Modular Monolith** engineered to handle high throughput (from 1,000+ users scaling up to 10,000+, supporting hundreds of patients daily across multiple branches). It streamlines clinical, administrative, and financial workflows into a single, unified digital experience.

## ✨ Key Features

- **Multi-Branch Operations:** Centralized management of staff, patients, and resources across multiple clinic locations.
- **Electronic Medical Records (EMR):** Comprehensive clinical documentation, vitals tracking, diagnosis, and treatment planning.
- **Smart Queue Management:** Real-time patient flow tracking from triage to consultation, lab, and pharmacy.
- **Billing & Finance (with M-Pesa Integration):** Automated invoicing, receipt generation, and seamless local payment integration.
- **Pharmacy & Inventory Management:** Real-time stock tracking, prescription fulfillment, and low-stock alerts.
- **Laboratory & Radiology:** Test ordering, results tracking, and reporting.
- **Role-Based Access Control (RBAC):** Fine-grained, modular permissions for Doctors, Nurses, Pharmacists, Lab Techs, and Admins.
- **Patient Portal:** A dedicated frontend interface for patients to view appointments, test results, and billing history.

---

## 🛠️ Technology Stack

**Backend (API & Core Logic)**
- **Framework:** Laravel 11 (PHP 8.3+)
- **Architecture:** Modular Monolith (domain-driven module boundaries)
- **Database:** MySQL 8.0+
- **Caching & Queues:** Redis
- **Authentication:** Laravel Sanctum + MFA & Google OAuth
- **Real-Time:** Laravel Reverb (WebSockets)

**Frontend (Admin & Patient Portal)**
- **Framework:** React 18 + TypeScript + Vite
- **Architecture:** Progressive Web App (PWA)
- **Styling:** Tailwind CSS + Custom Design System
- **State Management:** React Query (TanStack Query) + Context API
- **Routing:** React Router v6

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.3+
- Composer
- Node.js 18+ & npm
- MySQL 8.0+
- Redis (Optional for local dev, required for production)

### 1. Backend Setup (Laravel API)

```bash
cd backend
composer install

# Environment setup
cp .env.example .env
php artisan key:generate

# Configure your .env database settings:
# DB_DATABASE=afya
# DB_USERNAME=root
# DB_PASSWORD=

# Run migrations and seed default data (Admin & Test Patients)
php artisan migrate:fresh --seed

# Start the backend server (runs on port 8080 by default)
php artisan serve --port=8080
```

### 2. Frontend Setup (React/Vite)

```bash
cd frontend
npm install

# Start the Vite development server (runs on port 5173 by default)
npm run dev
```

### 3. Default Credentials
If you ran the seeders, you can log in with:
- **Email:** Depends on the seeder (e.g., `admin@afyahms.com` or `patient@example.com`)
- **Password:** `ChangeMe!2025`

---

## 📁 Repository Structure

```text
hospital/
├── backend/                  # Laravel 11 REST API
│   ├── app/
│   │   └── Modules/          # Domain-driven modules (Auth, Pharmacy, Billing, etc.)
│   ├── database/             # Migrations & Seeders
│   └── routes/               # API routes
├── frontend/                 # React 18 PWA
│   ├── src/
│   │   ├── features/         # Feature-based architecture (auth, portal, clinical)
│   │   ├── lib/              # Axios, Http clients, utility singletons
│   │   └── index.css         # Tailwind directives & Design system tokens
└── docs/                     # Architecture & Product Documentation
```

## 📚 Documentation Index

We maintain comprehensive documentation for developers, product managers, and stakeholders. **Please start by reading the Foundation document.**

| # | Document |
|---|---|
| 00 | [Foundation & Canonical Decisions](docs/00-foundation.md) — **read first** |
| 01 | [Executive Summary](docs/01-executive-summary.md) |
| 02 | [Product Requirements Document (PRD)](docs/02-prd.md) |
| 03 | [Software Requirements Specification (SRS)](docs/03-srs.md) |
| 04 | [Functional Requirements](docs/04-functional-requirements.md) |
| 05 | [Non-Functional Requirements](docs/05-non-functional-requirements.md) |
| 09 | [System Architecture](docs/09-system-architecture.md) |
| 10 | [Database ERD](docs/10-database-erd.md) |
| 12 | [API Specification](docs/12-api-specification.md) |
| 15 | [UI/UX Design System](docs/15-uiux-design-system.md) |

*(See the `docs/` folder for the complete set of architectural and requirement documents.)*

---

## 🛡️ License

Proprietary Software. All rights reserved.
