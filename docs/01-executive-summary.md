# 01 — Executive Summary

> **Product:** Afya HMS (working title) — a Hospital Management System for a private multi-branch hospital in Kenya.
> **Audience:** Executive sponsors, clinical leadership, investors, and the delivery team.
> **Authority note:** This summary is governed by `00-foundation.md`. Where this document references stack, roles, identifiers, branch model, or compliance posture, those constants are canonical and defined there.

**Document version:** 1.0 · **Status:** MVP architecture baseline · **Date:** 2026-06-22

---

## 1. Vision

**Build the operational backbone of a modern Kenyan private hospital — one system, every branch, every patient journey, online or offline.**

Afya HMS unifies the full patient lifecycle — from the moment a patient is registered at reception, through triage, consultation, diagnostics, pharmacy, and billing, into the inpatient ward and back out the door — onto a single, secure, branch-aware platform. It is designed to make the right clinical and financial information available to the right staff member at the right moment, while remaining usable during the power and connectivity interruptions that are a daily reality in Kenyan healthcare operations.

The product is built to scale with the institution: **1,000 users today, architected for 10,000+** across a growing network of branches, without re-platforming.

---

## 2. Problem Statement

Private hospitals in Kenya operating multiple branches face a compounding set of operational, clinical, and financial problems that fragmented or legacy systems do not solve:

| Problem area | Pain today | Consequence |
|---|---|---|
| **Fragmented branches** | Each branch runs its own registers, spreadsheets, or siloed software. No shared patient record across sites. | Duplicate patient files, repeated tests, no enterprise view, leakage of revenue and clinical history. |
| **Paper & queues** | Manual queue management, paper triage cards, long unmanaged waiting times. | Patient dissatisfaction, emergency cases not prioritized, staff firefighting. |
| **Connectivity gaps** | Reception and clinical workflows stall when internet or power drops. | Hospital cannot register, bill, or treat patients during outages. |
| **Insurance friction** | SHA claims and pre-authorizations handled manually; rejections common. | Delayed reimbursement, cash-flow strain, write-offs. |
| **Payment reconciliation** | Cash, M-Pesa, and insurance reconciled by hand. | Errors, fraud exposure, slow month-end close. |
| **Clinical safety** | No systematic drug-interaction, allergy, or critical-result alerting. | Avoidable adverse events and liability. |
| **Compliance burden** | Kenya Data Protection Act 2019 and MOH record-retention obligations are hard to evidence on paper. | Regulatory and reputational risk. |
| **No data for decisions** | Leadership lacks real-time, cross-branch operational and financial reporting. | Decisions made on stale, partial information. |

**In one line:** the hospital is running a multi-branch, high-volume clinical operation on tools that cannot keep a unified patient record, cannot survive an outage, and cannot evidence compliance.

---

## 3. Target Market

| Dimension | Profile |
|---|---|
| **Customer** | Private, for-profit multi-branch hospital group in Kenya. |
| **Operating scale** | **100–300 patients/day** across branches (outpatient-heavy with inpatient wards). |
| **User base** | **~1,000 users at launch**, architected to **10,000+** as branches and staff grow. |
| **Branch model** | Multiple physical branches (e.g. Nairobi `NRB`) under one organization, single shared database with **row-level `branch_id` isolation** and a per-user branch switcher. |
| **User roles** | 10 canonical roles: Hospital Admin, Doctor, Nurse, Receptionist, Records Officer, Pharmacist, Lab Technician, Radiologist, Cashier/Accountant, and Patient. |
| **Geography & locale** | Kenya. Bilingual UI (**English + Kiswahili**), `Africa/Nairobi` timezone, **KES** currency. |
| **Connectivity reality** | Intermittent internet and power; mobile-first patients; **M-Pesa** as the dominant payment rail. |
| **Regulatory frame** | Kenya **Data Protection Act 2019**, MOH requirements, **SHA** (Social Health Authority) as the national insurer. |

---

## 4. The Opportunity & Business Value

Afya HMS converts operational friction into measurable financial and clinical value.

| Value lever | How Afya HMS delivers it | Business impact |
|---|---|---|
| **Revenue capture** | Every service, drug, lab, and admission is itemized and billed at point of care; nothing falls through paper cracks. | Reduced revenue leakage. |
| **Faster cash conversion** | M-Pesa STK Push at the counter + structured SHA claims and pre-auth tracking. | Shorter days-sales-outstanding; fewer claim rejections. |
| **Throughput** | Digital queue + triage prioritization moves more patients through the same physical capacity. | Higher daily patient volume without new buildings. |
| **Staff productivity** | One system replaces registers, spreadsheets, and re-keying across branches. | Lower admin overhead per patient. |
| **Clinical safety & trust** | Allergy, drug-interaction, and critical-result alerts reduce adverse events. | Lower liability; stronger brand. |
| **Enterprise visibility** | Real-time cross-branch operational and financial dashboards. | Faster, data-driven decisions. |
| **Compliance as an asset** | Built-in audit trail, ≥10-year retention, encryption, RBAC. | Regulatory readiness; due-diligence ready for investors/partners. |
| **Scalability** | Modular monolith architected for 10,000+ users and new branches. | Growth without re-platform cost. |

The opportunity is to become the **single operational system of record** for a hospital group that intends to grow — replacing recurring point-tool spend and manual labor with one platform that compounds in value as more branches and patients are onboarded.

---

## 5. High-Level Solution Overview

Afya HMS is a **modular monolith**: one deployable backend application, internally divided into clear bounded modules, paired with a modern web client.

### 5.1 Architecture at a glance

| Layer | Technology | Role |
|---|---|---|
| **Backend** | **Laravel 11 / PHP 8.3+**, REST API only | Business logic, security, persistence, integrations. |
| **Frontend** | **React 18 + TypeScript (strict) + Vite**, as a **PWA** | Branch-aware SPA consuming the REST API; offline-capable. |
| **Primary datastore** | **MySQL 8+** | Single shared database, row-level branch isolation. |
| **In-memory / real-time** | **Redis** | Cache, sessions, queues, broadcasting, live queue state. |
| **Deployment** | Docker + Docker Compose | Local-dev friendly, cloud-ready hybrid. |

Internally the backend is organized into bounded modules including **Auth, Tenancy (branches), Patients, Appointments, Queue, Triage, EMR, Clinical Alerts, Pharmacy, Laboratory, Radiology, Billing, Insurance (SHA), Inpatient, Inventory, Reporting, Communication, Patient Portal, Documents, Audit, and Admin.** Each follows a consistent layered flow (Controller → FormRequest → Service → Repository → Model, with DTOs, Resources, and Events) so the codebase stays uniform as the team grows.

### 5.2 End-to-end patient journey

```
Reception → Triage → Doctor → Lab → Pharmacy → Billing
```

A directed, skippable pipeline driven in real time over Redis + WebSockets, with **Manchester Triage** priority and emergency bypass honored at every station, and the inpatient pathway branching off for admissions.

### 5.3 Cross-cutting platform capabilities

- **Multi-branch tenancy** — automatic `branch_id` scoping with a controlled "view-all" override for admins and executive reporting.
- **Provider abstractions** — payments (M-Pesa Daraja, cash), insurer (SHA), storage (local/S3/R2/B2), and notifications (SMS/email) are all behind interfaces, so providers can change without touching feature code.
- **Security & audit** — Sanctum auth, MFA for privileged roles, encrypted sensitive data, immutable audit logging, and signed URLs for clinical files.

---

## 6. MVP Scope vs Future Roadmap (At a Glance)

The MVP delivers a complete, billable patient journey across branches. The roadmap deepens specialization and intelligence.

| Capability area | MVP (launch) | Future roadmap |
|---|---|---|
| **Patient registration & records** | Unified patient registry (`PAT-YYYY-NNNNNN`), demographics, search, merge guardrails. | Biometric ID, NHIF/SHA card scan, patient-uploaded history. |
| **Appointments** | Booking, scheduling, calendar views. | Smart slot optimization, automated recall campaigns. |
| **Queue & triage** | Real-time queue board, Manchester Triage, emergency bypass. | Predictive wait-time estimates, load balancing across branches. |
| **Clinical / EMR** | SOAP notes, vitals, encounter history, clinical alerts (allergy, interaction, critical results). | Specialty templates, clinical decision-support expansion, e-referrals. |
| **Pharmacy** | Prescribing, dispensing, stock-aware. | Automated reorder, full supplier integration. |
| **Laboratory** | Orders, barcoded samples, results entry, result alerts. | Analyzer (LIS) machine integration. |
| **Radiology** | Study orders, reporting workflow. | PACS / DICOM viewer integration. |
| **Billing & payments** | Invoicing, receipts, **M-Pesa STK Push**, cash. | Additional gateways, payment plans, deposits ledger. |
| **Insurance** | **SHA** claims, pre-auth, claim tracking. | Multi-insurer marketplace, automated adjudication. |
| **Inpatient** | Admissions, bed/ward management, inpatient billing. | Theatre/OT scheduling, advanced nursing care plans. |
| **Inventory** | Stock, purchase orders, goods received. | Multi-warehouse, expiry forecasting, vendor portals. |
| **Reporting** | Operational & financial dashboards, cross-branch view. | Advanced BI, predictive analytics, data warehouse export. |
| **Patient portal** | Records access, results, appointments. | Telemedicine, online pre-payment, chronic-care programs. |
| **Platform** | PWA with offline shell + background sync, EN/SW, light/dark, RBAC, audit. | Native mobile wrappers, deeper offline write coverage. |

> Scope discipline: the MVP is deliberately the **smallest complete loop** that lets the hospital register, treat, bill, and get paid across branches — with safety, offline resilience, and compliance built in from day one rather than retrofitted.

---

## 7. Key Differentiators

What sets Afya HMS apart from generic or imported HMS products in the Kenyan private-hospital context:

1. **True multi-branch by design.** One shared database with row-level `branch_id` isolation, a per-user branch switcher, and a governed enterprise "view-all" — not a set of disconnected single-site installs.
2. **Offline-first PWA.** A Progressive Web App with an offline shell, cached read data, and background sync of queued writes — reception and clinical work continue through internet and power interruptions.
3. **SHA + M-Pesa built in.** Native **SHA** claims and pre-authorization, plus **M-Pesa Daraja** STK Push/Paybill/Till at the point of care — the two payment rails that actually matter in Kenya, both behind clean abstractions for future expansion.
4. **Real-time queue management.** A live, Redis-backed queue board across the `Reception → Triage → Doctor → Lab → Pharmacy → Billing` pipeline, with Manchester Triage priority and emergency bypass at every station.
5. **Clinical alerts at the point of care.** Allergy, drug-interaction, and critical-result alerting integrated into the EMR to reduce avoidable harm.
6. **Localized and compliant.** Bilingual EN/Kiswahili, KES/Nairobi-native, and engineered around the Kenya Data Protection Act 2019, MOH requirements, and ≥10-year medical-record retention.

---

## 8. Success Metrics / KPIs

Success is measured across four lenses. Targets are directional baselines to be ratified with hospital leadership during delivery planning.

### 8.1 Operational efficiency

| KPI | Definition | Target direction |
|---|---|---|
| Average patient wait time | Time from check-in to doctor consultation | ↓ materially vs paper baseline |
| Patient throughput / day | Patients fully processed per day per branch | ↑ within existing physical capacity |
| Registration time | Time to register a new patient | < 3 minutes |
| Queue-to-consult adherence | % of triaged patients seen within Manchester Triage SLA | ≥ 90% |

### 8.2 Financial

| KPI | Definition | Target direction |
|---|---|---|
| Revenue leakage | Unbilled or unrecovered services | ↓ toward near-zero |
| SHA claim acceptance rate | % of claims accepted first-pass | ↑ vs manual baseline |
| Days to reimbursement | Avg time from service to insurer payment | ↓ |
| Payment reconciliation time | Effort to reconcile cash/M-Pesa/insurance | ↓ to same-day close |

### 8.3 Clinical & safety

| KPI | Definition | Target direction |
|---|---|---|
| Alert coverage | % of prescriptions screened for allergy/interaction | 100% |
| Critical-result turnaround | Time from critical lab result to clinician acknowledgement | ↓ |
| Record completeness | % of encounters with complete SOAP documentation | ↑ |

### 8.4 Adoption, platform & compliance

| KPI | Definition | Target direction |
|---|---|---|
| Active user adoption | % of staff using the system for their workflow | ≥ 95% |
| System availability | Uptime of core services | ≥ 99.5% |
| Offline continuity | % of reception/clinical tasks completable during outages | High (key workflows covered) |
| Audit & retention compliance | PHI-access events logged; clinical records retained ≥ 10 years | 100% |
| Test coverage | Backend + frontend automated coverage | ≥ 80% |

---

## 9. High-Level Cost & Effort Posture

> Indicative posture for executive planning — not a fixed quotation. Detailed estimates live in the delivery-planning deliverables.

| Dimension | Posture |
|---|---|
| **Build model** | Single deployable modular monolith — one codebase, one team, no microservices overhead. Lower build and operational cost than a distributed architecture at this scale. |
| **Delivery shape** | Phased: MVP (complete patient-journey loop) first, then roadmap modules incrementally. Value is realized at MVP, not deferred to a "big bang." |
| **Infrastructure** | Hybrid via Docker — local-dev and cloud-ready. Starts small (single environment) and scales horizontally as user count approaches 10,000+. |
| **Run cost drivers** | Cloud compute, MySQL + Redis, object storage (signed-URL clinical files), SMS/email providers, M-Pesa/SHA integration fees. All provider choices are abstracted, enabling cost optimization without re-engineering. |
| **Effort concentration** | Highest effort in clinical/EMR, billing+SHA, queue/real-time, and offline PWA sync. Reuse of canonical patterns across modules keeps marginal cost per module low. |
| **Cost-avoidance** | Replaces multiple point tools and manual labor; compliance and audit are built in rather than purchased separately. |

---

## 10. Risk Summary

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Connectivity/power outages** disrupt operations | High | High | Offline-first PWA: offline shell, cached reads, background sync of queued writes. |
| R2 | **SHA integration** complexity, evolving specs, claim rejections | Medium | High | `InsurerGateway` abstraction, structured claims/pre-auth, claim tracking; isolate insurer logic for rapid updates. |
| R3 | **M-Pesa Daraja** callback reliability / double-processing | Medium | High | Signed webhook routes, idempotency keyed on `CheckoutRequestID`/`mpesa_receipt`. |
| R4 | **Data protection / PHI breach** | Medium | Severe | Encryption at rest + TLS, RBAC + MFA for privileged roles, immutable audit log, signed URLs, DPA 2019 alignment. |
| R5 | **Clinical safety gap** (missed allergy/interaction) | Low–Med | Severe | Clinical Alerts module enforced at prescribing/results; 100% screening target. |
| R6 | **Multi-branch data leakage** (cross-branch access) | Low | High | Global `BranchScope` auto-filtering; "view-all" gated to specific roles only. |
| R7 | **User adoption resistance** (paper-to-digital change) | Medium | Medium | Bilingual EN/SW UI, role-tailored workflows, phased rollout, training. |
| R8 | **Scope creep** delaying MVP | Medium | Medium | Disciplined "smallest complete loop" MVP; roadmap as explicit deferral. |
| R9 | **Scaling pressure** toward 10,000+ users | Low | High | Architected for scale from day one: Redis, queues, horizontal scaling, repository abstraction. |
| R10 | **Vendor/provider lock-in** (payments, storage, comms) | Low | Medium | Interface-based provider abstractions across payments, insurer, storage, notifications. |
| R11 | **Regulatory change** (SHA, MOH, DPA) | Medium | Medium | Compliance isolated behind services; configurable; ≥10-year retention by default. |

---

## 11. Stakeholders

| Stakeholder | Interest / role in Afya HMS |
|---|---|
| **Hospital executive / ownership** | Sponsor; cares about ROI, growth, compliance, enterprise visibility. |
| **Hospital Admin (`hospital-admin`)** | System owner-operator; branch and user management, cross-branch reporting, configuration. MFA-required. |
| **Doctors (`doctor`)** | Primary clinical users; EMR, prescribing, clinical alerts. MFA-required. |
| **Nurses (`nurse`)** | Triage, vitals, inpatient care, queue. |
| **Receptionists (`receptionist`)** | Front desk: registration, appointments, queue intake. |
| **Records Officers (`records-officer`)** | Patient records integrity, retention, documents. |
| **Pharmacists (`pharmacist`)** | Dispensing, stock, drug-interaction safety. MFA-required. |
| **Lab Technicians (`lab-technician`)** | Lab orders, samples, results. |
| **Radiologists (`radiologist`)** | Imaging studies and reporting. |
| **Cashiers / Accountants (`cashier`)** | Billing, M-Pesa/cash, reconciliation, SHA claims. |
| **Patients (`patient`)** | Portal access: records, results, appointments, payments. |
| **SHA (Social Health Authority)** | National insurer; claims and pre-authorization counterpart. |
| **M-Pesa / Safaricom (Daraja)** | Payment-rail provider. |
| **Regulators (ODPC, MOH)** | Data Protection Act 2019 and ministry compliance oversight. |
| **Delivery & engineering team** | Builds and operates the platform to canonical standards. |
| **Infrastructure / DevOps & security** | Deployment, availability, encryption, backups, audit. |
| **Third-party providers** | SMS (AfricasTalking), email (Mailgun/Resend), object storage (local/S3/R2/B2). |

---

## 12. Summary Statement

Afya HMS is the single operational system of record for a growing Kenyan private hospital group: a **multi-branch, offline-resilient, SHA- and M-Pesa-native platform** that unifies the entire patient journey, embeds clinical safety and compliance from day one, and is architected to scale from 1,000 to 10,000+ users without re-platforming. The MVP delivers the smallest complete, billable patient-journey loop across branches; the roadmap deepens specialization and intelligence. The result is measurable gains in throughput, revenue capture, faster reimbursement, clinical safety, and enterprise visibility — built on a disciplined modular-monolith foundation that keeps cost and complexity proportionate to a single, growing institution.
