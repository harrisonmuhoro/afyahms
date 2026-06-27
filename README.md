# Afya HMS — Hospital Management System

Production-grade, multi-branch Hospital Management System for a private hospital in Kenya.
Modular monolith: **Laravel 11 (PHP 8.3+) REST API** + **React 18 / TypeScript / Vite PWA**, **MySQL 8** + **Redis**.

- **Scale:** 1,000 users now → architected for 10,000+. 100–300 patients/day, multi-branch.
- **Deployment:** hybrid (local-dev friendly, cloud-ready) via Docker Compose.

## Repository layout

```
hospital/
├── backend/    # Laravel 11 modular monolith (API)
├── frontend/   # React 18 + TS + Vite PWA
└── docs/       # Architecture & product deliverables (start here)
```

## Documentation index (read in order)

| # | Document |
|---|---|
| 00 | [Foundation & Canonical Decisions](docs/00-foundation.md) — **read first** |
| 01 | [Executive Summary](docs/01-executive-summary.md) |
| 02 | [Product Requirements Document (PRD)](docs/02-prd.md) |
| 03 | [Software Requirements Specification (SRS)](docs/03-srs.md) |
| 04 | [Functional Requirements](docs/04-functional-requirements.md) |
| 05 | [Non-Functional Requirements](docs/05-non-functional-requirements.md) |
| 06 | [User Stories](docs/06-user-stories.md) |
| 07 | [Use Cases](docs/07-use-cases.md) |
| 08 | [RBAC Matrix](docs/08-rbac-matrix.md) |
| 09 | [System Architecture](docs/09-system-architecture.md) |
| 10 | [Database ERD](docs/10-database-erd.md) |
| 11 | [Database Schema](docs/11-database-schema.md) |
| 12 | [API Specification](docs/12-api-specification.md) |
| 13 | [Backend Architecture](docs/13-backend-architecture.md) |
| 14 | [Frontend Architecture](docs/14-frontend-architecture.md) |
| 15 | [UI/UX Design System](docs/15-uiux-design-system.md) |
| 16 | [Folder Structure](docs/16-folder-structure.md) |
| 17 | [Queue Management Design](docs/17-queue-management-design.md) |
| 18 | [Clinical Alerts Design](docs/18-clinical-alerts-design.md) |
| 19 | [Inventory Design](docs/19-inventory-design.md) |
| 20 | [SHA Integration Design](docs/20-sha-integration-design.md) |
| 21 | [M-Pesa Integration Design](docs/21-mpesa-integration-design.md) |
| 22 | [Security Architecture](docs/22-security-architecture.md) |
| 23 | [Audit Architecture](docs/23-audit-architecture.md) |
| 24 | [Testing Strategy](docs/24-testing-strategy.md) |
| 25 | [Deployment Strategy](docs/25-deployment-strategy.md) |
| 26 | [CI/CD Strategy](docs/26-cicd-strategy.md) |
| 27 | [Development Roadmap](docs/27-development-roadmap.md) |
