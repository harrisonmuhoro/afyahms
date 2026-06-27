# 10 — Database ERD & Entity Catalog

> **Scope:** Conceptual / logical data model for Afya HMS. This document defines every major
> entity, its purpose, its relationships, and its cardinality. The **physical DDL** (exact column
> types, indexes, constraints, partitions) lives in `11-database-ddl.md` and MUST stay consistent
> with the model here.
> **Authority:** Subordinate to `00-foundation.md`. All identifiers, the `branch_id` rule, the 10
> roles, sequence generation, and money/timestamp conventions are inherited from Foundation §3–§6.

**Document version:** 1.0 · **Status:** MVP architecture baseline
**Conventions inherited from Foundation:**
- PKs are `BIGINT UNSIGNED AUTO_INCREMENT` internally; externally-exposed resources also carry a `public_id` `CHAR(36)` UUID (patients, documents, etc.).
- Money = `DECIMAL(12,2)`, currency `KES`. Timestamps stored UTC.
- `created_at`, `updated_at`, `deleted_at` (soft delete) on all domain tables unless noted.
- Every **operational** table carries `branch_id` FK → `branches.id`. **Global reference data does not** (drug catalog master, ICD-10, roles/permissions, settings, suppliers shared catalog).

---

## 1. Reading the diagrams

- `PK` = primary key, `FK` = foreign key, `UK` = unique key.
- Cardinality (crow's foot): `||--o{` = one-to-many (optional many), `||--|{` = one-to-many (mandatory many), `}o--o{` = many-to-many (resolved via a join entity), `||--||` = one-to-one.
- Columns shown are **identifying / relational** columns plus a few business-critical attributes — not the full physical column list (see doc 11).
- Polymorphic relations (e.g. `documents`, `attachments`, `notifications`) are drawn with their `*_type` / `*_id` pair and explained in §4.

---

## 2. Domain ERDs (Mermaid)

### 2.1 Tenancy & Auth

```mermaid
erDiagram
    branches ||--o{ users : "home branch"
    branches ||--o{ branch_user : "grants"
    users ||--o{ branch_user : "multi-branch access"
    users }o--o{ roles : "model_has_roles"
    roles }o--o{ permissions : "role_has_permissions"
    users }o--o{ permissions : "model_has_permissions (direct)"
    users ||--o{ user_sessions : "logs in via"
    users ||--o{ login_histories : "tracked by"
    users ||--o| mfa_secrets : "secured by"
    users ||--o{ password_histories : "rotates"

    branches {
        bigint id PK
        string code UK "e.g. NRB"
        string name
        string address
        string phone
        string timezone "Africa/Nairobi"
        boolean is_active
        datetime deleted_at
    }
    users {
        bigint id PK
        char public_id UK "uuid"
        bigint home_branch_id FK
        string staff_no UK "null for patients"
        string name
        string email UK
        string phone
        string password
        boolean mfa_enabled
        boolean is_active
        datetime password_changed_at
        datetime last_login_at
        datetime deleted_at
    }
    branch_user {
        bigint id PK
        bigint branch_id FK
        bigint user_id FK
        boolean is_default
    }
    roles {
        bigint id PK
        string name UK "slug e.g. doctor"
        string guard_name
    }
    permissions {
        bigint id PK
        string name UK "module.action"
        string guard_name
    }
    user_sessions {
        bigint id PK
        bigint user_id FK
        string token_id
        string ip_address
        string device
        datetime last_activity_at
        datetime expires_at
    }
    login_histories {
        bigint id PK
        bigint user_id FK
        string ip_address
        string user_agent
        boolean success
        string failure_reason
        datetime created_at
    }
    mfa_secrets {
        bigint id PK
        bigint user_id FK UK
        text secret_encrypted
        json recovery_codes
        datetime confirmed_at
    }
    password_histories {
        bigint id PK
        bigint user_id FK
        string password_hash
        datetime created_at
    }
```

### 2.2 Patients & Clinical Profile

```mermaid
erDiagram
    branches ||--o{ patients : "registered at"
    users ||--o| patients : "portal account"
    patients ||--o{ patient_next_of_kin : "has"
    patients ||--o{ patient_insurances : "covered by"
    patients ||--o{ patient_allergies : "flagged with"
    patients ||--o{ patient_chronic_conditions : "diagnosed with"
    patients ||--o{ patient_vaccinations : "received"
    patients ||--o{ documents : "polymorphic owner"

    patients {
        bigint id PK
        char public_id UK "uuid"
        bigint branch_id FK "registering branch"
        bigint user_id FK "nullable portal login"
        string patient_no UK "PAT-YYYY-000001"
        string national_id "encrypted, not PK"
        string first_name
        string last_name
        date date_of_birth
        string sex
        string blood_group
        string phone
        string email
        string photo_path
        datetime deleted_at
    }
    patient_next_of_kin {
        bigint id PK
        bigint patient_id FK
        string name
        string relationship
        string phone
        boolean is_primary
    }
    patient_insurances {
        bigint id PK
        bigint patient_id FK
        string scheme "SHA / private"
        string member_no
        string payer_name
        date valid_to
        boolean is_active
    }
    patient_allergies {
        bigint id PK
        bigint patient_id FK
        string allergen
        string reaction
        string severity "mild/moderate/severe"
        boolean is_active
    }
    patient_chronic_conditions {
        bigint id PK
        bigint patient_id FK
        string icd10_code FK
        string condition_name
        date onset_date
        string status
    }
    patient_vaccinations {
        bigint id PK
        bigint patient_id FK
        string vaccine_name
        string dose
        date administered_on
        bigint administered_by FK "users.id"
    }
```

### 2.3 Appointments, Queue & Triage

```mermaid
erDiagram
    branches ||--o{ appointments : "scheduled at"
    patients ||--o{ appointments : "books"
    users ||--o{ appointments : "with provider"
    appointments ||--o| queue_tickets : "may generate"
    branches ||--o{ queue_tickets : "issued at"
    patients ||--o{ queue_tickets : "for"
    queue_stations ||--o{ queue_tickets : "currently at"
    queue_tickets ||--o{ queue_ticket_events : "moves through"
    queue_tickets ||--o| triage_assessments : "screened by"
    patients ||--o{ triage_assessments : "of"
    users ||--o{ triage_assessments : "performed by nurse"
    encounters ||--o| triage_assessments : "feeds"

    appointments {
        bigint id PK
        bigint branch_id FK
        bigint patient_id FK
        bigint provider_id FK "users.id doctor"
        datetime scheduled_at
        string type "consult/follow-up"
        string status "booked/checked-in/done/cancelled"
        string reason
        datetime deleted_at
    }
    queue_stations {
        bigint id PK
        bigint branch_id FK
        string dept_code "TRI/DOC/LAB/PHA/BILL"
        string name
        boolean is_active
    }
    queue_tickets {
        bigint id PK
        bigint branch_id FK
        bigint patient_id FK
        bigint appointment_id FK "nullable"
        bigint current_station_id FK
        string ticket_no "DEPT-NNN daily reset"
        int priority "MTS-derived"
        boolean emergency_bypass
        string status "waiting/serving/done/skipped"
        datetime issued_at
    }
    queue_ticket_events {
        bigint id PK
        bigint ticket_id FK
        bigint station_id FK
        bigint actor_id FK "users.id"
        string event "called/served/transferred/skipped"
        datetime created_at
    }
    triage_assessments {
        bigint id PK
        bigint branch_id FK
        bigint patient_id FK
        bigint ticket_id FK "nullable"
        bigint nurse_id FK "users.id"
        string mts_category "red/orange/yellow/green/blue"
        int priority
        decimal temperature
        int pulse
        int resp_rate
        string blood_pressure
        decimal spo2
        decimal weight_kg
        decimal height_cm
        string complaint
        datetime assessed_at
    }
```

### 2.4 EMR — Encounters, SOAP, Diagnoses, Prescriptions

```mermaid
erDiagram
    branches ||--o{ encounters : "occurs at"
    patients ||--o{ encounters : "for"
    users ||--o{ encounters : "attended by"
    appointments ||--o| encounters : "originates from"
    encounters ||--o{ soap_notes : "documented in"
    encounters ||--o{ diagnoses : "yields"
    encounters ||--o{ prescriptions : "issues"
    encounters ||--o{ lab_orders : "requests"
    encounters ||--o{ radiology_orders : "requests"
    encounters ||--o{ documents : "polymorphic owner"
    icd10_codes ||--o{ diagnoses : "classifies"
    prescriptions ||--o{ prescription_items : "lines"
    drug_catalog ||--o{ prescription_items : "prescribed as"

    encounters {
        bigint id PK
        char public_id UK
        bigint branch_id FK
        bigint patient_id FK
        bigint provider_id FK "users.id"
        bigint appointment_id FK "nullable"
        string type "OPD/IPD/emergency"
        string status "open/closed"
        datetime started_at
        datetime closed_at
        datetime deleted_at
    }
    soap_notes {
        bigint id PK
        bigint encounter_id FK
        bigint author_id FK "users.id"
        text subjective
        text objective
        text assessment
        text plan
        datetime deleted_at
    }
    diagnoses {
        bigint id PK
        bigint encounter_id FK
        string icd10_code FK
        string description
        string type "provisional/final"
        boolean is_primary
    }
    icd10_codes {
        string code PK "global reference, no branch_id"
        string title
        string category
        boolean is_billable
    }
    prescriptions {
        bigint id PK
        bigint branch_id FK
        bigint encounter_id FK
        bigint prescriber_id FK "users.id"
        string rx_no UK "RX-BR-YYYY-000001"
        string status "issued/dispensed/partial/cancelled"
        datetime deleted_at
    }
    prescription_items {
        bigint id PK
        bigint prescription_id FK
        bigint drug_id FK "drug_catalog.id"
        string dose
        string frequency
        string route
        int duration_days
        decimal quantity
        text instructions
    }
```

### 2.5 Pharmacy

```mermaid
erDiagram
    drug_catalog ||--o{ drug_batches : "stocked as"
    branches ||--o{ drug_batches : "held at"
    drug_catalog ||--o{ prescription_items : "prescribed as"
    prescriptions ||--o{ dispenses : "fulfilled by"
    branches ||--o{ dispenses : "at"
    users ||--o{ dispenses : "by pharmacist"
    dispenses ||--o{ dispense_items : "lines"
    drug_batches ||--o{ dispense_items : "drawn from"
    prescription_items ||--o{ dispense_items : "fulfils"

    drug_catalog {
        bigint id PK "global, no branch_id"
        string code UK
        string generic_name
        string brand_name
        string form "tablet/syrup"
        string strength
        string atc_code
        boolean is_controlled
        boolean is_active
    }
    drug_batches {
        bigint id PK
        bigint branch_id FK
        bigint drug_id FK
        string batch_no
        date expiry_date
        decimal qty_on_hand
        decimal unit_cost
        decimal sell_price
        datetime deleted_at
    }
    dispenses {
        bigint id PK
        bigint branch_id FK
        bigint prescription_id FK
        bigint pharmacist_id FK "users.id"
        string status "completed/partial"
        datetime dispensed_at
        datetime deleted_at
    }
    dispense_items {
        bigint id PK
        bigint dispense_id FK
        bigint prescription_item_id FK
        bigint drug_batch_id FK
        decimal quantity
        decimal unit_price
    }
```

### 2.6 Laboratory & Radiology

```mermaid
erDiagram
    branches ||--o{ lab_orders : "placed at"
    encounters ||--o{ lab_orders : "from"
    patients ||--o{ lab_orders : "for"
    users ||--o{ lab_orders : "ordered by"
    lab_orders ||--o{ lab_order_items : "lines"
    lab_tests ||--o{ lab_order_items : "tests"
    lab_order_items ||--o{ lab_samples : "collected as"
    lab_samples ||--o{ lab_results : "produces"
    lab_tests ||--o{ lab_results : "interpreted via"
    users ||--o{ lab_results : "verified by"

    branches ||--o{ radiology_orders : "placed at"
    encounters ||--o{ radiology_orders : "from"
    patients ||--o{ radiology_orders : "for"
    radiology_orders ||--o{ radiology_studies : "produces"
    users ||--o{ radiology_studies : "reported by radiologist"
    radiology_studies ||--o{ documents : "images/report (polymorphic)"

    lab_tests {
        bigint id PK "global catalog, no branch_id"
        string code UK
        string name
        string specimen_type
        string unit
        string reference_range
        decimal price
        boolean is_active
    }
    lab_orders {
        bigint id PK
        bigint branch_id FK
        bigint encounter_id FK
        bigint patient_id FK
        bigint ordered_by FK "users.id"
        string priority "routine/urgent"
        string status "ordered/collected/resulted"
        datetime deleted_at
    }
    lab_order_items {
        bigint id PK
        bigint lab_order_id FK
        bigint lab_test_id FK
        string status
    }
    lab_samples {
        bigint id PK
        bigint branch_id FK
        bigint lab_order_item_id FK
        string sample_id UK "LAB-BR-YYMMDD-0001 barcoded"
        string specimen_type
        bigint collected_by FK "users.id"
        datetime collected_at
        string status "received/rejected"
    }
    lab_results {
        bigint id PK
        bigint lab_sample_id FK
        bigint lab_test_id FK
        string value
        string unit
        string flag "H/L/critical"
        bigint verified_by FK "users.id"
        datetime resulted_at
        datetime deleted_at
    }
    radiology_orders {
        bigint id PK
        bigint branch_id FK
        bigint encounter_id FK
        bigint patient_id FK
        bigint ordered_by FK "users.id"
        string modality "X-ray/CT/US/MRI"
        string status
        datetime deleted_at
    }
    radiology_studies {
        bigint id PK
        bigint branch_id FK
        bigint radiology_order_id FK
        bigint radiologist_id FK "users.id"
        string study_no UK "RAD-BR-YYMMDD-0001"
        text findings
        text impression
        datetime reported_at
        datetime deleted_at
    }
```

### 2.7 Billing, Payments, Receipts

```mermaid
erDiagram
    branches ||--o{ invoices : "raised at"
    patients ||--o{ invoices : "billed to"
    encounters ||--o| invoices : "for"
    invoices ||--o{ invoice_items : "lines"
    invoices ||--o{ payments : "settled by"
    payments ||--o| receipts : "acknowledged by"
    invoices ||--o| sha_claims : "may be claimed"
    invoice_items ||--o| service_catalog : "priced from"

    service_catalog {
        bigint id PK "global, no branch_id"
        string code UK
        string name
        string category "consult/lab/rad/procedure/pharmacy"
        decimal default_price
        boolean is_active
    }
    invoices {
        bigint id PK
        char public_id UK
        bigint branch_id FK
        bigint patient_id FK
        bigint encounter_id FK "nullable"
        string invoice_no UK "INV-BR-YYYY-000001"
        decimal subtotal
        decimal discount
        decimal tax
        decimal total
        decimal amount_paid
        decimal balance
        string status "draft/issued/paid/partial/void"
        string payer_type "cash/insurance/sha"
        datetime deleted_at
    }
    invoice_items {
        bigint id PK
        bigint invoice_id FK
        bigint service_id FK "nullable"
        string source_type "polymorphic origin"
        bigint source_id "lab_order/prescription/etc"
        string description
        decimal qty
        decimal unit_price
        decimal line_total
    }
    payments {
        bigint id PK
        bigint branch_id FK
        bigint invoice_id FK
        bigint received_by FK "users.id cashier"
        string method "cash/mpesa/card/insurance"
        decimal amount
        string mpesa_receipt "idempotency key"
        string checkout_request_id
        string status "pending/confirmed/failed"
        datetime paid_at
        datetime deleted_at
    }
    receipts {
        bigint id PK
        bigint branch_id FK
        bigint payment_id FK
        string receipt_no UK "RCP-BR-YYYY-000001"
        decimal amount
        datetime issued_at
    }
```

### 2.8 SHA Insurance Claims

```mermaid
erDiagram
    branches ||--o{ sha_claims : "filed at"
    patients ||--o{ sha_claims : "for"
    invoices ||--o| sha_claims : "claims against"
    patient_insurances ||--o{ sha_claims : "under scheme"
    sha_claims ||--o{ sha_claim_items : "lines"
    sha_claims ||--o{ sha_claim_events : "tracked by"
    users ||--o{ sha_claims : "submitted by"

    sha_claims {
        bigint id PK
        bigint branch_id FK
        bigint patient_id FK
        bigint invoice_id FK
        bigint patient_insurance_id FK
        bigint submitted_by FK "users.id"
        string claim_no UK "CLM-BR-YYYY-00001"
        string preauth_no
        decimal claimed_amount
        decimal approved_amount
        string status "draft/submitted/approved/rejected/paid"
        datetime submitted_at
        datetime deleted_at
    }
    sha_claim_items {
        bigint id PK
        bigint sha_claim_id FK
        bigint invoice_item_id FK
        string benefit_code
        decimal claimed_amount
        decimal approved_amount
    }
    sha_claim_events {
        bigint id PK
        bigint sha_claim_id FK
        string status
        string note
        datetime created_at
    }
```

### 2.9 Inpatient — Wards, Beds, Admissions, Nursing

```mermaid
erDiagram
    branches ||--o{ wards : "located at"
    wards ||--o{ beds : "contains"
    branches ||--o{ admissions : "admitted at"
    patients ||--o{ admissions : "of"
    encounters ||--o| admissions : "IPD encounter"
    beds ||--o{ admissions : "occupied by"
    users ||--o{ admissions : "admitting doctor"
    admissions ||--o{ bed_assignments : "transfers"
    beds ||--o{ bed_assignments : "history"
    admissions ||--o{ nursing_charts : "monitored by"
    users ||--o{ nursing_charts : "charted by nurse"

    wards {
        bigint id PK
        bigint branch_id FK
        string name
        string type "general/ICU/maternity"
        int capacity
        boolean is_active
    }
    beds {
        bigint id PK
        bigint branch_id FK
        bigint ward_id FK
        string bed_no
        string status "free/occupied/maintenance"
        decimal daily_rate
    }
    admissions {
        bigint id PK
        bigint branch_id FK
        bigint patient_id FK
        bigint encounter_id FK
        bigint bed_id FK "current"
        bigint admitting_doctor_id FK "users.id"
        string admission_no UK "ADM-BR-YYYY-00001"
        datetime admitted_at
        datetime discharged_at
        string status "admitted/discharged/transferred"
        datetime deleted_at
    }
    bed_assignments {
        bigint id PK
        bigint admission_id FK
        bigint bed_id FK
        datetime from_at
        datetime to_at
    }
    nursing_charts {
        bigint id PK
        bigint admission_id FK
        bigint nurse_id FK "users.id"
        string chart_type "vitals/intake-output/medication"
        json readings
        datetime recorded_at
    }
```

### 2.10 Inventory & Procurement

```mermaid
erDiagram
    suppliers ||--o{ purchase_orders : "supplies via"
    branches ||--o{ purchase_orders : "ordered by"
    users ||--o{ purchase_orders : "raised by"
    purchase_orders ||--o{ purchase_order_items : "lines"
    inventory_items ||--o{ purchase_order_items : "ordered"
    purchase_orders ||--o{ goods_received_notes : "received via"
    goods_received_notes ||--o{ grn_items : "lines"
    purchase_order_items ||--o{ grn_items : "fulfils"
    inventory_items ||--o{ stock_levels : "tracked as"
    branches ||--o{ stock_levels : "held at"
    inventory_items ||--o{ stock_movements : "moves"
    branches ||--o{ stock_movements : "at"

    suppliers {
        bigint id PK "global catalog, no branch_id"
        string name
        string contact_person
        string phone
        string email
        boolean is_active
    }
    inventory_items {
        bigint id PK "global, no branch_id"
        string code UK
        string name
        string category "consumable/equipment/drug"
        string unit
        decimal reorder_level
        boolean is_active
    }
    purchase_orders {
        bigint id PK
        bigint branch_id FK
        bigint supplier_id FK
        bigint raised_by FK "users.id"
        string po_no UK "PO-BR-YYYY-0001"
        decimal total
        string status "draft/sent/received/closed"
        datetime deleted_at
    }
    purchase_order_items {
        bigint id PK
        bigint purchase_order_id FK
        bigint inventory_item_id FK
        decimal qty
        decimal unit_cost
    }
    goods_received_notes {
        bigint id PK
        bigint branch_id FK
        bigint purchase_order_id FK
        bigint received_by FK "users.id"
        string grn_no UK
        datetime received_at
    }
    grn_items {
        bigint id PK
        bigint grn_id FK
        bigint purchase_order_item_id FK
        decimal qty_received
        string batch_no
        date expiry_date
    }
    stock_levels {
        bigint id PK
        bigint branch_id FK
        bigint inventory_item_id FK
        decimal qty_on_hand
        decimal qty_reserved
    }
    stock_movements {
        bigint id PK
        bigint branch_id FK
        bigint inventory_item_id FK
        string type "in/out/adjust/transfer"
        decimal qty
        string source_type "polymorphic ref"
        bigint source_id
        bigint actor_id FK "users.id"
        datetime created_at
    }
```

### 2.11 Communication, Documents, Audit & System

```mermaid
erDiagram
    users ||--o{ notifications : "delivered to"
    branches ||--o{ notifications : "scoped to"
    notifications ||--o| notification_templates : "rendered from"
    users ||--o{ activity_log : "causer of"
    users ||--o{ audit_logs : "actor of"
    branches ||--o{ audit_logs : "scoped to"

    documents {
        bigint id PK
        char public_id UK "uuid"
        bigint branch_id FK
        string documentable_type "POLYMORPHIC"
        bigint documentable_id "POLYMORPHIC"
        string category "lab-report/scan/consent/id"
        string disk
        string path
        string mime_type
        bigint size_bytes
        bigint uploaded_by FK "users.id"
        datetime deleted_at
    }
    notification_templates {
        bigint id PK "global, no branch_id"
        string key UK
        string channel "sms/email"
        string locale "en/sw"
        text body
        boolean is_active
    }
    notifications {
        bigint id PK
        char uuid UK "Laravel notifications"
        bigint branch_id FK
        bigint user_id FK "notifiable"
        string type
        string channel
        json data
        string status "queued/sent/failed"
        datetime read_at
        datetime created_at
    }
    activity_log {
        bigint id PK "Spatie activity log"
        string log_name
        string description
        string subject_type "POLYMORPHIC"
        bigint subject_id "POLYMORPHIC"
        string causer_type "POLYMORPHIC"
        bigint causer_id
        json properties
        datetime created_at
    }
    audit_logs {
        bigint id PK "immutable, no deleted_at"
        bigint branch_id FK
        bigint actor_id FK "users.id"
        string event "PHI access/login/export"
        string auditable_type "POLYMORPHIC"
        bigint auditable_id
        string ip_address
        json context
        datetime created_at
    }
    sequences {
        bigint id PK "global, no branch_id"
        string scope UK "patient:2026 / invoice:NRB:2026"
        bigint value
        datetime updated_at
    }
    settings {
        bigint id PK "global, no branch_id"
        string key UK
        json value
        string group
        boolean is_public
    }
```

---

## 3. Entity Catalog

Each entity below states **why it exists** (its reason for being in the model, not just its columns)
and its **key relationships**.

### Tenancy & Auth

| Entity | Purpose (why it exists) | Key relationships |
|---|---|---|
| `branches` | The tenancy anchor. Row-level isolation in a single shared DB requires a concrete branch record every operational row points at; also holds per-site code/timezone used in document numbering (`INV-NRB-…`). | 1→M `users` (home), M↔M `users` via `branch_user`, parent of nearly every operational table. |
| `users` | Single account table for all 10 roles including `patient` portal logins. Patients optionally link here so a person can both be a clinical record and authenticate. | M↔M `roles`, M↔M `branches` (branch_user), 1→0..1 `patients`, 1→M sessions/logins. |
| `branch_user` | Resolves the many-to-many "a user may work at several branches" requirement and stores which branch is default for the branch-switcher. | join of `users` × `branches`. |
| `roles` / `permissions` | RBAC backbone (Spatie). Global reference data — no `branch_id`. The 10 canonical role slugs live here; permissions are `module.action`. | M↔M with `users` and each other (pivot tables `model_has_roles`, `role_has_permissions`, `model_has_permissions`). |
| `user_sessions` | Supports idle-timeout, device + IP tracking, and remote session revocation required by the security baseline. | M→1 `users`. |
| `login_histories` | Immutable login audit (success/failure, IP, agent) for intrusion detection and DPA compliance. | M→1 `users`. |
| `mfa_secrets` | Stores the encrypted TOTP secret + recovery codes for the MFA-required privileged roles. | 1↔1 `users`. |
| `password_histories` | Enforces password-reuse prevention and rotation policy. | M→1 `users`. |

### Patients

| Entity | Purpose | Key relationships |
|---|---|---|
| `patients` | Master clinical identity. Carries the `PAT-YYYY-000001` number and a UUID `public_id`; National ID is stored encrypted and is never a key. The hub of the entire clinical graph. | M→1 `branches`, 0..1→1 `users`, 1→M kin/insurance/allergies/chronic/vaccinations, 1→M encounters/orders/invoices, polymorphic owner of `documents`. |
| `patient_next_of_kin` | Emergency contacts and consent-giver records, separated so a patient can have several with one primary. | M→1 `patients`. |
| `patient_insurances` | Holds payer/scheme membership (SHA or private) so billing can route claims and verify coverage validity. | M→1 `patients`, 1→M `sha_claims`. |
| `patient_allergies` | Drives clinical safety alerts at prescribing/dispensing time; kept as discrete rows so each allergen has severity/status. | M→1 `patients`. |
| `patient_chronic_conditions` | Longitudinal problem list (e.g. diabetes, HTN) linked to ICD-10 for continuity of care across encounters. | M→1 `patients`, M→1 `icd10_codes`. |
| `patient_vaccinations` | Immunization history for recall scheduling and MOH reporting. | M→1 `patients`, M→1 `users` (administrator). |

### Appointments, Queue, Triage

| Entity | Purpose | Key relationships |
|---|---|---|
| `appointments` | Scheduled future visits with a provider; the planned counterpart to walk-in queue flow. | M→1 `branches`/`patients`/`users`, 1→0..1 `queue_tickets`, 1→0..1 `encounters`. |
| `queue_stations` | Named service points per branch (TRI/DOC/LAB/PHA/BILL) the queue pipeline routes tickets through. | M→1 `branches`, 1→M `queue_tickets`. |
| `queue_tickets` | The real-time token a patient holds while moving through the canonical pipeline; carries MTS-derived priority and emergency-bypass flag. Ticket number resets daily per department. | M→1 `branches`/`patients`/`stations`, 0..1 `appointments`, 1→M `queue_ticket_events`. |
| `queue_ticket_events` | Append-only movement log (called/served/transferred/skipped) for queue analytics and wait-time SLAs. | M→1 `queue_tickets`, `queue_stations`, `users`. |
| `triage_assessments` | Manchester Triage screening + vitals captured by a nurse; sets queue priority and feeds the doctor's encounter. | M→1 `branches`/`patients`/`users`, 0..1 `queue_tickets`, feeds `encounters`. |

### EMR

| Entity | Purpose | Key relationships |
|---|---|---|
| `encounters` | The clinical visit unit (OPD/IPD/emergency) that groups all documentation, orders, and billing for one episode of care. | M→1 `branches`/`patients`/`users`, 0..1 `appointments`, 1→M soap_notes/diagnoses/prescriptions/lab_orders/radiology_orders, 0..1 `invoices`, 0..1 `admissions`. |
| `soap_notes` | Structured Subjective/Objective/Assessment/Plan clinical narrative, separated from the encounter so multiple authored notes can exist. | M→1 `encounters`, M→1 `users`. |
| `diagnoses` | ICD-10-coded assessment results (provisional/final, primary flag) needed for billing, claims, and statistics. | M→1 `encounters`, M→1 `icd10_codes`. |
| `icd10_codes` | Global reference dictionary of diagnosis codes (no `branch_id`); shared by chronic conditions and diagnoses. | 1→M `diagnoses`, `patient_chronic_conditions`. |
| `prescriptions` | The `RX-…` order header a prescriber issues; QR-coded and dispensed by pharmacy. | M→1 `branches`/`encounters`/`users`, 1→M `prescription_items`, 1→M `dispenses`. |
| `prescription_items` | Per-drug order lines (dose/frequency/route/duration) referencing the global drug catalog. | M→1 `prescriptions`, M→1 `drug_catalog`, 1→M `dispense_items`. |

### Pharmacy

| Entity | Purpose | Key relationships |
|---|---|---|
| `drug_catalog` | Global formulary master (generic/brand/form/strength, controlled flag) shared across all branches; no `branch_id`. | 1→M `drug_batches`, `prescription_items`. |
| `drug_batches` | Per-branch physical stock with batch/expiry/cost/price — the unit FEFO dispensing draws from and expiry alerts watch. | M→1 `branches`/`drug_catalog`, 1→M `dispense_items`. |
| `dispenses` | Pharmacist fulfilment event against a prescription (full/partial), the record reconciling clinical order with stock movement. | M→1 `branches`/`prescriptions`/`users`, 1→M `dispense_items`. |
| `dispense_items` | Lines linking a dispensed quantity to the specific batch and the prescription line it fulfils (for traceability and recall). | M→1 `dispenses`, `prescription_items`, `drug_batches`. |

### Laboratory & Radiology

| Entity | Purpose | Key relationships |
|---|---|---|
| `lab_tests` | Global test catalog (specimen type, unit, reference range, price); no `branch_id`. | 1→M `lab_order_items`, `lab_results`. |
| `lab_orders` | Provider request header for one or more tests during an encounter. | M→1 `branches`/`encounters`/`patients`/`users`, 1→M `lab_order_items`. |
| `lab_order_items` | Individual ordered tests with per-test status. | M→1 `lab_orders`, `lab_tests`, 1→M `lab_samples`. |
| `lab_samples` | Barcoded specimen (`LAB-…`) tying collection to an ordered test, enabling chain-of-custody and rejection tracking. | M→1 `lab_order_items`, `branches`, `users` (collector), 1→M `lab_results`. |
| `lab_results` | Result values with H/L/critical flags and verifier; the clinically actionable output, soft-deletable but retained ≥10 yrs. | M→1 `lab_samples`, `lab_tests`, `users` (verifier). |
| `radiology_orders` | Imaging request (modality) raised in an encounter. | M→1 `branches`/`encounters`/`patients`/`users`, 1→M `radiology_studies`. |
| `radiology_studies` | The performed study (`RAD-…`) with findings/impression; DICOM/report files attach polymorphically via `documents`. | M→1 `radiology_orders`, `branches`, `users` (radiologist), 1→M `documents`. |

### Billing, Payments, SHA

| Entity | Purpose | Key relationships |
|---|---|---|
| `service_catalog` | Global price list of billable services (consult/lab/rad/procedure/pharmacy) so invoice lines reference a canonical price. | 1→M `invoice_items`. |
| `invoices` | The `INV-…` financial document per encounter/patient, tracking totals, payments, balance and payer type. | M→1 `branches`/`patients`, 0..1 `encounters`, 1→M `invoice_items`/`payments`, 0..1 `sha_claims`. |
| `invoice_items` | Billed lines; `source_type`/`source_id` polymorphically reference the clinical origin (lab order, prescription, bed-day, etc.). | M→1 `invoices`, 0..1 `service_catalog`, polymorphic source. |
| `payments` | Money received against an invoice (cash/M-Pesa/card/insurance); `mpesa_receipt`/`checkout_request_id` provide webhook idempotency. | M→1 `branches`/`invoices`/`users`, 1→0..1 `receipts`. |
| `receipts` | The `RCP-…` acknowledgement issued for a confirmed payment. | M→1 `branches`, 1→1 `payments`. |
| `sha_claims` | SHA insurance claim header (`CLM-…`) against an invoice, tracking pre-auth, claimed vs approved amounts and lifecycle. | M→1 `branches`/`patients`/`invoices`/`patient_insurances`/`users`, 1→M `sha_claim_items`/`sha_claim_events`. |
| `sha_claim_items` | Per-benefit claim lines mapping invoice items to SHA benefit codes with claimed/approved amounts. | M→1 `sha_claims`, `invoice_items`. |
| `sha_claim_events` | Append-only status trail for claim adjudication tracking. | M→1 `sha_claims`. |

### Inpatient

| Entity | Purpose | Key relationships |
|---|---|---|
| `wards` | Physical nursing units per branch (general/ICU/maternity) with capacity. | M→1 `branches`, 1→M `beds`. |
| `beds` | Individual chargeable beds with status and daily rate; the resource admissions occupy. | M→1 `branches`/`wards`, 1→M `admissions`, `bed_assignments`. |
| `admissions` | The IPD stay (`ADM-…`) linking a patient + encounter to a bed and admitting doctor across admit→discharge. | M→1 `branches`/`patients`/`encounters`/`beds`/`users`, 1→M `bed_assignments`/`nursing_charts`. |
| `bed_assignments` | History of bed occupancy within an admission so transfers and billing per bed are auditable. | M→1 `admissions`, `beds`. |
| `nursing_charts` | Time-series nursing observations (vitals, intake/output, med administration) recorded against an admission. | M→1 `admissions`, `users` (nurse). |

### Inventory & Procurement

| Entity | Purpose | Key relationships |
|---|---|---|
| `suppliers` | Vendor master for procurement; global catalog, no `branch_id`. | 1→M `purchase_orders`. |
| `inventory_items` | Global catalog of stockable non-formulary goods (consumables/equipment); no `branch_id`. | 1→M PO items, `stock_levels`, `stock_movements`. |
| `purchase_orders` | The `PO-…` procurement header to a supplier raised by a branch. | M→1 `branches`/`suppliers`/`users`, 1→M `purchase_order_items`/`goods_received_notes`. |
| `purchase_order_items` | Ordered lines (qty, unit cost) per inventory item. | M→1 `purchase_orders`, `inventory_items`, 1→M `grn_items`. |
| `goods_received_notes` | The GRN recording physical receipt against a PO, the trigger for stock increase. | M→1 `branches`/`purchase_orders`/`users`, 1→M `grn_items`. |
| `grn_items` | Received lines with batch/expiry, reconciling delivered vs ordered quantities. | M→1 `goods_received_notes`, `purchase_order_items`. |
| `stock_levels` | Current on-hand/reserved quantity per item per branch for reorder alerts. | M→1 `branches`, `inventory_items`. |
| `stock_movements` | Append-only ledger of every stock in/out/adjust/transfer; `source_type`/`source_id` polymorphically links the cause (GRN, dispense, adjustment). | M→1 `branches`, `inventory_items`, `users`, polymorphic source. |

### Communication, Documents, Audit, System

| Entity | Purpose | Key relationships |
|---|---|---|
| `documents` | Centralized polymorphic file store (lab reports, scans, consents, ID photos). `documentable_type`/`documentable_id` let any entity own files; served via signed URLs. | M→1 `branches`, `users` (uploader); polymorphic owner = patients/encounters/radiology_studies/etc. |
| `notification_templates` | Versioned SMS/email message bodies per locale (en/sw); global reference, no `branch_id`. | 1→M `notifications`. |
| `notifications` | Outbound message records (queued/sent/failed) per recipient, supporting the abstracted notification channel manager. | M→1 `branches`, `users`, 0..1 `notification_templates`. |
| `activity_log` | Spatie model-change audit (subject/causer polymorphic) for general change history. | polymorphic subject + causer (`users`). |
| `audit_logs` | Dedicated **immutable** security/PHI-access log (login, export, record view). No `deleted_at` — never deleted. | M→1 `branches`, `users` (actor), polymorphic `auditable`. |
| `sequences` | The single source for gap-tolerant numbered identifiers (`patient:2026`, `invoice:NRB:2026`); written only by `SequenceService` under `SELECT … FOR UPDATE`. Global, no `branch_id`. | standalone. |
| `settings` | Key/value (JSON) system & feature configuration, grouped, optionally public. Global, no `branch_id`. | standalone. |

---

## 4. Cross-cutting modelling notes

### 4.1 `branch_id` presence

- **Present** on every operational table (it appears in the diagrams): patients, appointments, queue_tickets, triage, encounters, prescriptions, dispenses, drug_batches, lab/radiology orders+results+studies, invoices, payments, receipts, sha_claims, wards, beds, admissions, purchase_orders, GRNs, stock_levels, stock_movements, documents, notifications, audit_logs, branch_user.
- **Absent** on global reference / master data (per Foundation §4): `roles`, `permissions`, `icd10_codes`, `drug_catalog`, `lab_tests`, `service_catalog`, `suppliers`, `inventory_items`, `notification_templates`, `sequences`, `settings`. Child line tables (`invoice_items`, `lab_order_items`, `prescription_items`, etc.) inherit branch context through their parent and omit a redundant `branch_id` unless a query path needs it.
- Enforcement is the Eloquent `BranchScope` global scope; bypass only for roles holding `branch.view-all` (Hospital Admin, executive reporting). Models therefore carry the scope, and `branch_id` is set automatically on create from the user's `active_branch_id`.

### 4.2 Soft deletes

- `deleted_at` is present on all **domain** tables (shown in the diagrams) to satisfy the ≥10-year medical-record retention rule — clinical data is **never hard-deleted**.
- **Exceptions (no soft delete):** append-only / immutable logs — `audit_logs`, `login_histories`, `queue_ticket_events`, `sha_claim_events`, `stock_movements`, `activity_log` — and infrastructure tables `sequences`, pivot tables (`branch_user`, Spatie `model_has_*`). These are either write-once ledgers or pure join rows.

### 4.3 Polymorphic relations

- `documents` — `documentable_type` + `documentable_id`: any entity (patient, encounter, radiology_study, admission, sha_claim) can own files without per-owner FK columns. Indexed on the pair.
- `invoice_items.source_type` + `source_id` — links a billed line back to its clinical origin (lab order, prescription item, bed-day, procedure) so billing is derivable and auditable.
- `stock_movements.source_type` + `source_id` — records what caused each movement (GRN, dispense, manual adjustment, transfer).
- `audit_logs.auditable_type` + `auditable_id` and `activity_log.subject_*` / `causer_*` — generic auditing across all models.
- `notifications` (Laravel) uses a `notifiable` morph in the framework default; here normalized to `user_id` since all recipients are users.

### 4.4 Indexing intent (logical — physical in doc 11)

- **Tenancy:** composite index leading with `branch_id` on every operational table (`(branch_id, …)`) so the global scope filter is index-served.
- **Lookups by business number:** unique indexes on `patient_no`, `invoice_no`, `receipt_no`, `rx_no`, `sample_id`, `study_no`, `admission_no`, `po_no`, `claim_no`, and `public_id` UUIDs.
- **Foreign keys:** every FK column indexed (MySQL InnoDB requirement) — `patient_id`, `encounter_id`, `branch_id`, `user_id` derivatives.
- **Hot query paths:** `queue_tickets (branch_id, current_station_id, status, priority)` for the live board; `appointments (branch_id, provider_id, scheduled_at)` for calendars; `drug_batches (branch_id, drug_id, expiry_date)` for FEFO/expiry alerts; `invoices (branch_id, status, patient_id)` for AR; `audit_logs (branch_id, auditable_type, auditable_id, created_at)` for record-access review.
- **Polymorphic pairs:** composite index on each `(*_type, *_id)`.
- **Time-series:** `nursing_charts (admission_id, recorded_at)`, `stock_movements (branch_id, inventory_item_id, created_at)`.
- **Sequence integrity:** unique index on `sequences.scope`; row-locked, never indexed for range scans.

### 4.5 Consistency with doc 11 (DDL)

This is the **logical** model: it fixes entities, relationships, cardinality, and intent. Doc 11
must realize it physically with: exact `BIGINT UNSIGNED` / `CHAR(36)` / `DECIMAL(12,2)` types, the
inherited timestamp/soft-delete columns, FK constraints with `ON DELETE RESTRICT` for clinical data,
the indexes named above, and Spatie's standard permission/activity-log table shapes. No entity here
may be dropped or renamed in doc 11 without updating this document first (Foundation precedence rule).
