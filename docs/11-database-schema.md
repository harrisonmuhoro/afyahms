# 11 — Database Schema (Physical, MySQL 8 DDL)

> **Authority:** This document derives from `00-foundation.md` and the conceptual ERD in `10-data-model.md`.
> If anything here contradicts `00-foundation.md`, the foundation wins.
> **Engine:** All tables `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
> **Document version:** 1.0 · **Status:** MVP physical schema baseline

---

## 0. Conventions applied throughout

These rules are applied to every table below. They are stated once here and not repeated per-table.

- **Primary keys:** `id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY` (internal). Externally-exposed
  resources (patients, documents) additionally carry `public_id CHAR(36)` (UUID v4), `UNIQUE`.
- **Money:** `DECIMAL(12,2) NOT NULL DEFAULT 0.00`, currency is implicitly **KES**. Never float.
- **Timestamps:** stored UTC. Every domain table has `created_at TIMESTAMP NULL`, `updated_at TIMESTAMP NULL`,
  and soft-delete `deleted_at TIMESTAMP NULL` (clinical data is **never** hard-deleted — 10-year retention).
- **Tenancy:** every operational table carries `branch_id BIGINT UNSIGNED NOT NULL` FK → `branches.id`.
  Global reference data (drug catalog master, ICD-10 diagnoses catalog, settings, Spatie roles/permissions)
  is **branch-agnostic** and omits `branch_id`.
- **FK ON DELETE behavior (canonical policy):**
  - `branch_id` → `RESTRICT` (a branch with data can never be deleted; deactivate via `is_active`).
  - Owning clinical parent (e.g. `encounter_id` on `soap_notes`) → `CASCADE` only for tightly-owned child
    rows that have no independent meaning; otherwise `RESTRICT`. Soft-delete is the real deletion path; hard
    `CASCADE` exists only as a referential safety net and is documented per-FK below.
  - Lookups / catalog references → `RESTRICT`.
  - Optional actor references (e.g. `created_by`, `verified_by`) → `SET NULL`.
- **Money/status enums** use MySQL `ENUM` for closed, slow-changing domains and lookup tables for open ones.
- **Auditing:** Spatie Activity Log (`activity_log`) for model changes; dedicated immutable `audit_logs`
  for PHI access / security events.
- `utf8mb4` everywhere; identifiers `snake_case` plural.

---

## 1. Tenancy & reference

### `branches`
Global tenant anchor. Branch-agnostic (it *is* the branch).

```sql
CREATE TABLE branches (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code            VARCHAR(8)      NOT NULL,            -- e.g. 'NRB'
    name            VARCHAR(150)    NOT NULL,
    address         VARCHAR(255)    NULL,
    city            VARCHAR(100)    NULL,
    phone           VARCHAR(30)     NULL,
    email           VARCHAR(150)    NULL,
    timezone        VARCHAR(64)     NOT NULL DEFAULT 'Africa/Nairobi',
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_branches_code (code),
    KEY idx_branches_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `settings`
Global system settings (key/value, JSON-typed). Branch-agnostic master; per-branch overrides allowed via nullable `branch_id`.

```sql
CREATE TABLE settings (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,                -- NULL = global default
    `group`         VARCHAR(64)     NOT NULL DEFAULT 'general',
    `key`           VARCHAR(120)    NOT NULL,
    value           JSON            NULL,
    type            VARCHAR(32)     NOT NULL DEFAULT 'string',
    is_encrypted    TINYINT(1)      NOT NULL DEFAULT 0,
    is_public       TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_settings_branch_key (branch_id, `group`, `key`),
    KEY idx_settings_group (`group`),
    CONSTRAINT fk_settings_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `sequences`
Gap-tolerant atomic counters. Written only by `SequenceService` under `SELECT ... FOR UPDATE`. Branch-agnostic (scope encodes branch).

```sql
CREATE TABLE sequences (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope           VARCHAR(120)    NOT NULL,            -- 'patient:2026', 'invoice:NRB:2026', 'queue:TRI:NRB:2026-06-22'
    value           BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_sequences_scope (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. Auth, identity & security

### `users`

```sql
CREATE TABLE users (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    home_branch_id      BIGINT UNSIGNED NOT NULL,
    employee_no         VARCHAR(40)     NULL,
    first_name          VARCHAR(80)     NOT NULL,
    last_name           VARCHAR(80)     NOT NULL,
    email               VARCHAR(150)    NOT NULL,
    phone               VARCHAR(30)     NULL,
    national_id         VARCHAR(40)     NULL,            -- encrypted cast at app layer
    password            VARCHAR(255)    NOT NULL,
    password_changed_at TIMESTAMP       NULL,
    password_expires_at TIMESTAMP       NULL,
    mfa_enabled         TINYINT(1)      NOT NULL DEFAULT 0,
    mfa_secret          VARCHAR(255)    NULL,            -- encrypted
    mfa_confirmed_at    TIMESTAMP       NULL,
    email_verified_at   TIMESTAMP       NULL,
    is_active           TINYINT(1)      NOT NULL DEFAULT 1,
    last_login_at       TIMESTAMP       NULL,
    last_login_ip       VARCHAR(45)     NULL,
    locale              VARCHAR(8)       NOT NULL DEFAULT 'en',
    remember_token      VARCHAR(100)    NULL,
    created_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_public_id (public_id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_employee_no (employee_no),
    KEY idx_users_home_branch (home_branch_id),
    KEY idx_users_active (is_active),
    KEY idx_users_name (last_name, first_name),
    CONSTRAINT fk_users_home_branch FOREIGN KEY (home_branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `branch_user` (multi-branch access pivot)
A user has one home branch but may be granted access to several.

```sql
CREATE TABLE branch_user (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    branch_id       BIGINT UNSIGNED NOT NULL,
    is_default      TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_branch_user (user_id, branch_id),
    KEY idx_branch_user_branch (branch_id),
    CONSTRAINT fk_branch_user_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_branch_user_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `password_histories`
Prevents password reuse.

```sql
CREATE TABLE password_histories (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    created_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_pwhist_user (user_id, created_at),
    CONSTRAINT fk_pwhist_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `login_histories`

```sql
CREATE TABLE login_histories (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NULL,
    email_attempted VARCHAR(150)    NULL,
    branch_id       BIGINT UNSIGNED NULL,
    status          ENUM('success','failed','locked','mfa_challenge','mfa_failed') NOT NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      VARCHAR(512)    NULL,
    device_id       BIGINT UNSIGNED NULL,
    location        VARCHAR(150)    NULL,
    failure_reason  VARCHAR(150)    NULL,
    created_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_loginhist_user (user_id, created_at),
    KEY idx_loginhist_status (status, created_at),
    KEY idx_loginhist_ip (ip_address),
    CONSTRAINT fk_loginhist_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `devices`
Known/trusted devices per user.

```sql
CREATE TABLE devices (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED NOT NULL,
    device_uuid     CHAR(36)        NOT NULL,
    name            VARCHAR(150)    NULL,
    platform        VARCHAR(60)     NULL,
    browser         VARCHAR(60)     NULL,
    last_ip         VARCHAR(45)     NULL,
    is_trusted      TINYINT(1)      NOT NULL DEFAULT 0,
    trusted_at      TIMESTAMP       NULL,
    last_seen_at    TIMESTAMP       NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_devices_user_uuid (user_id, device_uuid),
    KEY idx_devices_user (user_id),
    CONSTRAINT fk_devices_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `sessions`
Laravel database session driver shape (Redis is primary in prod; this table is the fallback/audit store).

```sql
CREATE TABLE sessions (
    id              VARCHAR(255)    NOT NULL,
    user_id         BIGINT UNSIGNED NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      TEXT            NULL,
    payload         LONGTEXT        NOT NULL,
    last_activity   INT             NOT NULL,
    PRIMARY KEY (id),
    KEY idx_sessions_user (user_id),
    KEY idx_sessions_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> Sanctum's `personal_access_tokens` table is provided by the package migration (standard shape) and is not redefined here.

---

## 3. RBAC (Spatie Laravel Permission)

> These tables are created by `spatie/laravel-permission` migrations. They are **branch-agnostic** (global guard).
> Reproduced here for completeness; `model_morph_key` is `BIGINT UNSIGNED` to match `users.id`.

```sql
CREATE TABLE roles (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(125)    NOT NULL,                -- slug e.g. 'doctor'
    guard_name  VARCHAR(125)    NOT NULL DEFAULT 'web',
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name_guard (name, guard_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(125)    NOT NULL,                -- '{module}.{action}'
    guard_name  VARCHAR(125)    NOT NULL DEFAULT 'web',
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_name_guard (name, guard_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_has_permissions (
    permission_id   BIGINT UNSIGNED NOT NULL,
    role_id         BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (permission_id, role_id),
    KEY idx_rhp_role (role_id),
    CONSTRAINT fk_rhp_permission FOREIGN KEY (permission_id)
        REFERENCES permissions (id) ON DELETE CASCADE,
    CONSTRAINT fk_rhp_role FOREIGN KEY (role_id)
        REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE model_has_roles (
    role_id     BIGINT UNSIGNED NOT NULL,
    model_type  VARCHAR(255)    NOT NULL,
    model_id    BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, model_id, model_type),
    KEY idx_mhr_model (model_id, model_type),
    CONSTRAINT fk_mhr_role FOREIGN KEY (role_id)
        REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE model_has_permissions (
    permission_id   BIGINT UNSIGNED NOT NULL,
    model_type      VARCHAR(255)    NOT NULL,
    model_id        BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (permission_id, model_id, model_type),
    KEY idx_mhp_model (model_id, model_type),
    CONSTRAINT fk_mhp_permission FOREIGN KEY (permission_id)
        REFERENCES permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Patients & demographics

### `patients`

```sql
CREATE TABLE patients (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    patient_number      VARCHAR(20)     NOT NULL,        -- PAT-YYYY-000001 (global, per-year)
    branch_id           BIGINT UNSIGNED NOT NULL,        -- registering branch
    first_name          VARCHAR(80)     NOT NULL,
    middle_name         VARCHAR(80)     NULL,
    last_name           VARCHAR(80)     NOT NULL,
    national_id         VARCHAR(40)     NULL,            -- encrypted; NEVER a PK
    sha_number          VARCHAR(40)     NULL,
    date_of_birth       DATE            NULL,
    gender              ENUM('male','female','other','unknown') NOT NULL DEFAULT 'unknown',
    marital_status      ENUM('single','married','divorced','widowed','unknown') NOT NULL DEFAULT 'unknown',
    blood_group         ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') NOT NULL DEFAULT 'unknown',
    phone               VARCHAR(30)     NULL,
    email               VARCHAR(150)    NULL,
    county              VARCHAR(80)     NULL,
    sub_county          VARCHAR(80)     NULL,
    address             VARCHAR(255)    NULL,
    occupation          VARCHAR(120)    NULL,
    photo_path          VARCHAR(512)    NULL,
    deceased            TINYINT(1)      NOT NULL DEFAULT 0,
    deceased_at         DATE            NULL,
    portal_user_id      BIGINT UNSIGNED NULL,            -- link to users for patient portal
    is_active           TINYINT(1)      NOT NULL DEFAULT 1,
    registered_by       BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,            -- soft delete only (10yr retention)
    PRIMARY KEY (id),
    UNIQUE KEY uq_patients_public_id (public_id),
    UNIQUE KEY uq_patients_number (patient_number),
    KEY idx_patients_branch (branch_id),
    KEY idx_patients_name (last_name, first_name),
    KEY idx_patients_phone (phone),
    KEY idx_patients_national_id (national_id),
    KEY idx_patients_sha (sha_number),
    KEY idx_patients_branch_active (branch_id, is_active),
    KEY idx_patients_portal_user (portal_user_id),
    CONSTRAINT fk_patients_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_patients_portal_user FOREIGN KEY (portal_user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_patients_registered_by FOREIGN KEY (registered_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Note:** `FULLTEXT KEY ft_patients_name (first_name, middle_name, last_name)` may be added for fuzzy name
> search; default search uses the `(last_name, first_name)` B-tree plus normalized `phone`/`national_id`.

### `patient_next_of_kin`

```sql
CREATE TABLE patient_next_of_kin (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id      BIGINT UNSIGNED NOT NULL,
    branch_id       BIGINT UNSIGNED NOT NULL,
    full_name       VARCHAR(160)    NOT NULL,
    relationship    VARCHAR(60)     NOT NULL,
    phone           VARCHAR(30)     NULL,
    alt_phone       VARCHAR(30)     NULL,
    email           VARCHAR(150)    NULL,
    address         VARCHAR(255)    NULL,
    is_primary      TINYINT(1)      NOT NULL DEFAULT 0,
    is_emergency    TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_nok_patient (patient_id),
    KEY idx_nok_branch (branch_id),
    CONSTRAINT fk_nok_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nok_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `patient_relationships`
Links one patient to another (e.g. mother↔child, dependant).

```sql
CREATE TABLE patient_relationships (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id          BIGINT UNSIGNED NOT NULL,
    related_patient_id  BIGINT UNSIGNED NOT NULL,
    relationship_type   VARCHAR(60)     NOT NULL,        -- 'mother','father','child','spouse','guardian','dependant'
    is_guardian         TINYINT(1)      NOT NULL DEFAULT 0,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_patient_rel (patient_id, related_patient_id, relationship_type),
    KEY idx_patient_rel_related (related_patient_id),
    CONSTRAINT fk_patient_rel_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_patient_rel_related FOREIGN KEY (related_patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `patient_insurance`

```sql
CREATE TABLE patient_insurance (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id      BIGINT UNSIGNED NOT NULL,
    branch_id       BIGINT UNSIGNED NOT NULL,
    scheme_type     ENUM('sha','private','corporate','cash') NOT NULL DEFAULT 'sha',
    insurer_name    VARCHAR(150)    NULL,
    member_number   VARCHAR(80)     NULL,
    policy_number   VARCHAR(80)     NULL,
    principal_name  VARCHAR(160)    NULL,
    relationship    VARCHAR(60)     NULL,                -- to principal
    coverage_limit  DECIMAL(12,2)   NULL,
    valid_from      DATE            NULL,
    valid_to        DATE            NULL,
    is_primary      TINYINT(1)      NOT NULL DEFAULT 1,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_pins_patient (patient_id),
    KEY idx_pins_branch (branch_id),
    KEY idx_pins_member (member_number),
    KEY idx_pins_patient_active (patient_id, is_active),
    CONSTRAINT fk_pins_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pins_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `allergies`

```sql
CREATE TABLE allergies (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id      BIGINT UNSIGNED NOT NULL,
    branch_id       BIGINT UNSIGNED NOT NULL,
    allergen        VARCHAR(160)    NOT NULL,
    allergen_type   ENUM('drug','food','environmental','other') NOT NULL DEFAULT 'drug',
    reaction        VARCHAR(255)    NULL,
    severity        ENUM('mild','moderate','severe','life_threatening') NOT NULL DEFAULT 'moderate',
    onset_date      DATE            NULL,
    recorded_by     BIGINT UNSIGNED NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_allergies_patient (patient_id, is_active),
    KEY idx_allergies_branch (branch_id),
    CONSTRAINT fk_allergies_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_allergies_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_allergies_recorder FOREIGN KEY (recorded_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `chronic_illnesses`

```sql
CREATE TABLE chronic_illnesses (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id      BIGINT UNSIGNED NOT NULL,
    branch_id       BIGINT UNSIGNED NOT NULL,
    condition_name  VARCHAR(160)    NOT NULL,
    icd10_code      VARCHAR(10)     NULL,                -- references diagnoses_catalog.code (loose)
    diagnosed_on    DATE            NULL,
    status          ENUM('active','controlled','resolved','in_remission') NOT NULL DEFAULT 'active',
    notes           TEXT            NULL,
    recorded_by     BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_chronic_patient (patient_id, status),
    KEY idx_chronic_branch (branch_id),
    KEY idx_chronic_icd10 (icd10_code),
    CONSTRAINT fk_chronic_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_chronic_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_chronic_recorder FOREIGN KEY (recorded_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `vaccinations`

```sql
CREATE TABLE vaccinations (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id      BIGINT UNSIGNED NOT NULL,
    branch_id       BIGINT UNSIGNED NOT NULL,
    vaccine_name    VARCHAR(160)    NOT NULL,
    dose_number     SMALLINT UNSIGNED NULL,
    batch_number    VARCHAR(80)     NULL,
    administered_on DATE            NULL,
    next_due_on     DATE            NULL,
    site            VARCHAR(60)     NULL,
    administered_by BIGINT UNSIGNED NULL,
    notes           VARCHAR(255)    NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_vacc_patient (patient_id),
    KEY idx_vacc_branch (branch_id),
    KEY idx_vacc_due (next_due_on),
    CONSTRAINT fk_vacc_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vacc_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_vacc_admin FOREIGN KEY (administered_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `documents` (polymorphic, Documents module)
Stored via `StorageManager`; served via signed URLs only.

```sql
CREATE TABLE documents (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    documentable_type   VARCHAR(255)    NOT NULL,        -- morph: Patient, Encounter, LabResult, ...
    documentable_id     BIGINT UNSIGNED NOT NULL,
    category            VARCHAR(60)     NOT NULL DEFAULT 'general', -- 'lab_report','radiology','consent','id_scan'
    title               VARCHAR(200)    NULL,
    disk                VARCHAR(40)     NOT NULL DEFAULT 'local',   -- local|s3|r2|b2
    path                VARCHAR(512)    NOT NULL,
    original_name       VARCHAR(255)    NULL,
    mime_type           VARCHAR(120)    NULL,
    size_bytes          BIGINT UNSIGNED NULL,
    checksum_sha256     CHAR(64)        NULL,
    is_sensitive        TINYINT(1)      NOT NULL DEFAULT 1,
    uploaded_by         BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_documents_public_id (public_id),
    KEY idx_documents_morph (documentable_type, documentable_id),
    KEY idx_documents_branch (branch_id),
    KEY idx_documents_category (category),
    CONSTRAINT fk_documents_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_documents_uploader FOREIGN KEY (uploaded_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Appointments & Queue

### `appointments`

```sql
CREATE TABLE appointments (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    provider_id         BIGINT UNSIGNED NULL,            -- users.id (doctor)
    department          VARCHAR(80)     NULL,
    appointment_type    ENUM('new','follow_up','review','procedure','teleconsult') NOT NULL DEFAULT 'new',
    scheduled_start     DATETIME        NOT NULL,
    scheduled_end       DATETIME        NULL,
    status              ENUM('booked','confirmed','checked_in','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'booked',
    reason              VARCHAR(255)    NULL,
    channel             ENUM('walk_in','phone','portal','referral') NOT NULL DEFAULT 'walk_in',
    cancelled_reason    VARCHAR(255)    NULL,
    reminded_at         TIMESTAMP       NULL,
    created_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_appointments_public_id (public_id),
    KEY idx_appt_branch_date (branch_id, scheduled_start),
    KEY idx_appt_patient (patient_id),
    KEY idx_appt_provider_date (provider_id, scheduled_start),
    KEY idx_appt_status (status),
    CONSTRAINT fk_appt_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_appt_provider FOREIGN KEY (provider_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_appt_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `visits`
A patient's single trip through the branch on a given day. One `visits` row ties together the chain of
`queue_tickets` (one per department hop) and the clinical `encounter(s)` for that visit (foundation §13
pipeline). The pipeline trail (`Reception → Triage → Doctor → Lab → Pharmacy → Billing`) shares one
`visit_id`.

```sql
CREATE TABLE visits (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    appointment_id      BIGINT UNSIGNED NULL,
    encounter_id        BIGINT UNSIGNED NULL,            -- primary encounter spawned by the visit
    visit_date          DATE            NOT NULL,        -- Africa/Nairobi day (daily scope)
    visit_type          ENUM('walk_in','appointment','referral','follow_up','emergency') NOT NULL DEFAULT 'walk_in',
    status              ENUM('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
    current_department  ENUM('REC','TRI','DOC','LAB','PHA','BIL') NULL,  -- where the patient is now
    started_at          TIMESTAMP       NULL,
    completed_at        TIMESTAMP       NULL,
    created_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,            -- clinical-adjacent ⇒ soft-delete only
    PRIMARY KEY (id),
    UNIQUE KEY uq_visits_public_id (public_id),
    KEY idx_visits_branch_date (branch_id, visit_date),
    KEY idx_visits_patient_date (patient_id, visit_date),
    KEY idx_visits_branch_status (branch_id, status),
    KEY idx_visits_appointment (appointment_id),
    KEY idx_visits_encounter (encounter_id),
    CONSTRAINT fk_visits_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_visits_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_visits_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> FK `visits.encounter_id` → `encounters(id) ON DELETE SET NULL` is added via `ALTER TABLE` after
> `encounters` exists (see §6), to avoid a forward reference.

### `queue_stations`
Configured stations along the canonical pipeline (Reception → Triage → Doctor → Lab → Pharmacy → Billing).

```sql
CREATE TABLE queue_stations (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NOT NULL,
    code            VARCHAR(16)     NOT NULL,            -- 'REC','TRI','DOC','LAB','PHA','BIL'
    name            VARCHAR(80)     NOT NULL,
    station_type    ENUM('reception','triage','doctor','lab','pharmacy','billing','radiology') NOT NULL,
    pipeline_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    assigned_user_id BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_qstation_branch_code (branch_id, code),
    KEY idx_qstation_branch_type (branch_id, station_type),
    CONSTRAINT fk_qstation_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_qstation_user FOREIGN KEY (assigned_user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `queue_tickets`
Per-department daily-reset ticket (`{DEPT}-{NNN}`). Live state in Redis; this is the durable record.

```sql
CREATE TABLE queue_tickets (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id       CHAR(36)        NOT NULL,            -- external/QR reference (no sequence leak)
    branch_id       BIGINT UNSIGNED NOT NULL,
    visit_id        BIGINT UNSIGNED NULL,                -- links the whole pipeline trail (visits.id)
    station_id      BIGINT UNSIGNED NOT NULL,            -- canonical station column (station that called/served)
    patient_id      BIGINT UNSIGNED NOT NULL,
    encounter_id    BIGINT UNSIGNED NULL,
    appointment_id  BIGINT UNSIGNED NULL,
    ticket_number   VARCHAR(16)     NOT NULL,            -- '{DEPT}-{NNN}' e.g. 'TRI-014'
    sequence_value  SMALLINT UNSIGNED NULL,              -- raw NNN for the day/branch/dept
    ticket_date     DATE            NOT NULL,
    priority        ENUM('normal','priority','emergency') NOT NULL DEFAULT 'normal',
    triage_level    ENUM('red','orange','yellow','green','blue') NULL,
    mts_category    ENUM('red','orange','yellow','green','blue') NULL,  -- MTS band driving priority (foundation §12)
    status          ENUM('waiting','called','serving','served','skipped','no_show','transferred') NOT NULL DEFAULT 'waiting',
    called_at       TIMESTAMP       NULL,
    served_at       TIMESTAMP       NULL,
    completed_at    TIMESTAMP       NULL,
    served_by       BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_qticket_public_id (public_id),
    UNIQUE KEY uq_qticket_branch_station_date_num (branch_id, station_id, ticket_date, ticket_number),
    KEY idx_qticket_branch_date_status (branch_id, ticket_date, status),
    KEY idx_qticket_station_status (station_id, status, priority),
    KEY idx_qticket_visit (visit_id),
    KEY idx_qticket_patient (patient_id),
    KEY idx_qticket_encounter (encounter_id),
    CONSTRAINT fk_qticket_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_qticket_visit FOREIGN KEY (visit_id)
        REFERENCES visits (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_qticket_station FOREIGN KEY (station_id)
        REFERENCES queue_stations (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_qticket_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_qticket_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_qticket_served_by FOREIGN KEY (served_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> `station_id` is the **canonical** station column name (the live "called/served at" station). FK
> `encounter_id` is added after `encounters` exists (see §6) to avoid forward-reference; declared with
> `ON DELETE SET NULL`. `mts_category` mirrors the Triage-assigned band; `triage_level` is retained as a
> legacy synonym kept in step with it.

### `queue_events`
Immutable, append-only ledger of every ticket state transition — the source of truth for queue metrics and
the operational trail (mirrors the `audit_logs` append-only philosophy; no `updated_at`/`deleted_at`).

```sql
CREATE TABLE queue_events (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    queue_ticket_id     BIGINT UNSIGNED NOT NULL,
    station_id          BIGINT UNSIGNED NULL,            -- where it happened
    actor_user_id       BIGINT UNSIGNED NULL,            -- who performed it (NULL = system)
    event_type          ENUM('issued','called','recalled','served_start','held','resumed','advanced','completed','no_show','transferred','cancelled','preempted','reranked') NOT NULL,
    from_state          VARCHAR(16)     NULL,
    to_state            VARCHAR(16)     NULL,
    mts_category        ENUM('red','orange','yellow','green','blue') NULL,
    reason              VARCHAR(255)    NULL,            -- mandatory for preempted/cancelled/transferred
    meta                JSON            NULL,            -- {from_branch,to_branch,prev_ticket,position,eta}
    occurred_at         TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_qevent_branch_occurred (branch_id, occurred_at),
    KEY idx_qevent_ticket (queue_ticket_id, occurred_at),
    KEY idx_qevent_branch_type (branch_id, event_type, occurred_at),
    KEY idx_qevent_station (station_id),
    CONSTRAINT fk_qevent_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_qevent_ticket FOREIGN KEY (queue_ticket_id)
        REFERENCES queue_tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_qevent_station FOREIGN KEY (station_id)
        REFERENCES queue_stations (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_qevent_actor FOREIGN KEY (actor_user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 6. Triage & EMR

### `triage_assessments`
Manchester Triage System.

```sql
CREATE TABLE triage_assessments (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    queue_ticket_id     BIGINT UNSIGNED NULL,
    mts_level           ENUM('red','orange','yellow','green','blue') NOT NULL,
    chief_complaint     VARCHAR(255)    NULL,
    temperature_c       DECIMAL(4,1)    NULL,
    pulse_bpm           SMALLINT UNSIGNED NULL,
    respiratory_rate    SMALLINT UNSIGNED NULL,
    systolic_bp         SMALLINT UNSIGNED NULL,
    diastolic_bp        SMALLINT UNSIGNED NULL,
    spo2_pct            SMALLINT UNSIGNED NULL,
    weight_kg           DECIMAL(5,2)    NULL,
    height_cm           DECIMAL(5,2)    NULL,
    bmi                 DECIMAL(5,2)    NULL,            -- denormalized (derived; see Normalization note)
    pain_score          TINYINT UNSIGNED NULL,          -- 0-10
    notes               TEXT            NULL,
    assessed_by         BIGINT UNSIGNED NULL,
    assessed_at         TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_triage_branch_patient (branch_id, patient_id),
    KEY idx_triage_encounter (encounter_id),
    KEY idx_triage_level (mts_level),
    CONSTRAINT fk_triage_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_triage_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_triage_assessor FOREIGN KEY (assessed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `encounters`
A clinical visit (outpatient/inpatient/emergency). Central EMR aggregate.

```sql
CREATE TABLE encounters (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    appointment_id      BIGINT UNSIGNED NULL,
    provider_id         BIGINT UNSIGNED NULL,
    encounter_type      ENUM('outpatient','inpatient','emergency','teleconsult','procedure') NOT NULL DEFAULT 'outpatient',
    department          VARCHAR(80)     NULL,
    visit_date          DATETIME        NOT NULL,
    status              ENUM('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
    disposition         ENUM('discharged','admitted','referred','deceased','followup','none') NOT NULL DEFAULT 'none',
    closed_at           TIMESTAMP       NULL,
    created_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_encounters_public_id (public_id),
    KEY idx_enc_branch_date (branch_id, visit_date),
    KEY idx_enc_patient_date (patient_id, visit_date),
    KEY idx_enc_provider (provider_id),
    KEY idx_enc_status (status),
    CONSTRAINT fk_enc_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_enc_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_enc_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_enc_provider FOREIGN KEY (provider_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> Deferred FKs that reference `encounters`: `queue_tickets.encounter_id`, `visits.encounter_id`,
> `triage_assessments.encounter_id`, `triage_assessments.queue_ticket_id`. Apply via `ALTER TABLE` after
> both tables exist:
> ```sql
> ALTER TABLE visits
>   ADD CONSTRAINT fk_visits_encounter FOREIGN KEY (encounter_id)
>       REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE;
> ```

### `soap_notes`

```sql
CREATE TABLE soap_notes (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NOT NULL,
    encounter_id    BIGINT UNSIGNED NOT NULL,
    patient_id      BIGINT UNSIGNED NOT NULL,
    subjective      TEXT            NULL,
    objective       TEXT            NULL,
    assessment      TEXT            NULL,
    plan            TEXT            NULL,
    authored_by     BIGINT UNSIGNED NULL,
    signed_at       TIMESTAMP       NULL,
    is_amended      TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_soap_encounter (encounter_id),
    KEY idx_soap_patient (patient_id),
    KEY idx_soap_branch (branch_id),
    CONSTRAINT fk_soap_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_soap_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_soap_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_soap_author FOREIGN KEY (authored_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `diagnoses_catalog` (ICD-10 master — global reference)

```sql
CREATE TABLE diagnoses_catalog (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code        VARCHAR(10)     NOT NULL,                -- ICD-10, e.g. 'E11.9'
    description VARCHAR(255)    NOT NULL,
    category    VARCHAR(120)    NULL,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_dxcat_code (code),
    KEY idx_dxcat_desc (description(100)),
    FULLTEXT KEY ft_dxcat_desc (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `diagnoses`
Per-encounter coded diagnoses (ICD-10).

```sql
CREATE TABLE diagnoses (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    diagnosis_catalog_id BIGINT UNSIGNED NULL,
    icd10_code          VARCHAR(10)     NOT NULL,        -- denormalized snapshot of code
    description         VARCHAR(255)    NULL,            -- denormalized snapshot at time of dx
    diagnosis_type      ENUM('primary','secondary','provisional','differential') NOT NULL DEFAULT 'primary',
    certainty           ENUM('confirmed','suspected','ruled_out') NOT NULL DEFAULT 'confirmed',
    onset_date          DATE            NULL,
    diagnosed_by        BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_dx_encounter (encounter_id),
    KEY idx_dx_patient (patient_id),
    KEY idx_dx_branch (branch_id),
    KEY idx_dx_code (icd10_code),
    KEY idx_dx_catalog (diagnosis_catalog_id),
    CONSTRAINT fk_dx_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dx_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dx_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dx_catalog FOREIGN KEY (diagnosis_catalog_id)
        REFERENCES diagnoses_catalog (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dx_doctor FOREIGN KEY (diagnosed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 7. Pharmacy

### `drug_catalog` (global reference master)

```sql
CREATE TABLE drug_catalog (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code            VARCHAR(40)     NOT NULL,            -- internal SKU/formulary code
    generic_name    VARCHAR(160)    NOT NULL,
    brand_name      VARCHAR(160)    NULL,
    form            VARCHAR(60)     NULL,                -- tablet, syrup, injection
    strength        VARCHAR(60)     NULL,                -- '500mg'
    unit            VARCHAR(40)     NULL,                -- tablet, ml
    atc_code        VARCHAR(16)     NULL,
    is_controlled   TINYINT(1)      NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_drugcat_code (code),
    KEY idx_drugcat_generic (generic_name),
    KEY idx_drugcat_brand (brand_name),
    FULLTEXT KEY ft_drugcat_names (generic_name, brand_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `prescriptions`

```sql
CREATE TABLE prescriptions (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    prescription_number VARCHAR(28)     NOT NULL,        -- RX-{BRANCH}-YYYY-000001
    branch_id           BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    prescribed_by       BIGINT UNSIGNED NULL,
    status              ENUM('draft','active','partially_dispensed','dispensed','cancelled','expired') NOT NULL DEFAULT 'active',
    notes               VARCHAR(512)    NULL,
    prescribed_at       TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rx_public_id (public_id),
    UNIQUE KEY uq_rx_number (prescription_number),
    KEY idx_rx_branch_status (branch_id, status),
    KEY idx_rx_patient (patient_id),
    KEY idx_rx_encounter (encounter_id),
    CONSTRAINT fk_rx_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_rx_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_rx_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_rx_prescriber FOREIGN KEY (prescribed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `prescription_items`

```sql
CREATE TABLE prescription_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    prescription_id     BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    drug_catalog_id     BIGINT UNSIGNED NULL,
    drug_name           VARCHAR(200)    NOT NULL,        -- denormalized snapshot
    dosage              VARCHAR(80)     NULL,            -- '1 tablet'
    frequency           VARCHAR(80)     NULL,            -- 'TID'
    route               VARCHAR(60)     NULL,            -- 'PO'
    duration_days       SMALLINT UNSIGNED NULL,
    quantity            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    quantity_dispensed  DECIMAL(10,2)   NOT NULL DEFAULT 0,
    instructions        VARCHAR(255)    NULL,
    status              ENUM('pending','dispensed','partially_dispensed','cancelled') NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_rxitem_rx (prescription_id),
    KEY idx_rxitem_drug (drug_catalog_id),
    KEY idx_rxitem_branch (branch_id),
    CONSTRAINT fk_rxitem_rx FOREIGN KEY (prescription_id)
        REFERENCES prescriptions (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rxitem_drug FOREIGN KEY (drug_catalog_id)
        REFERENCES drug_catalog (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_rxitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `drug_batches`
Branch-held batches of a catalog drug (batch/expiry tracking).

```sql
CREATE TABLE drug_batches (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    drug_catalog_id     BIGINT UNSIGNED NOT NULL,
    batch_number        VARCHAR(80)     NOT NULL,
    expiry_date         DATE            NULL,
    quantity_received   DECIMAL(12,2)   NOT NULL DEFAULT 0,
    quantity_on_hand    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    cost_price          DECIMAL(12,2)   NOT NULL DEFAULT 0,
    selling_price       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    supplier_id         BIGINT UNSIGNED NULL,
    grn_item_id         BIGINT UNSIGNED NULL,
    received_at         DATE            NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_drugbatch (branch_id, drug_catalog_id, batch_number),
    KEY idx_drugbatch_branch_drug (branch_id, drug_catalog_id),
    KEY idx_drugbatch_expiry (expiry_date),
    KEY idx_drugbatch_supplier (supplier_id),
    CONSTRAINT fk_drugbatch_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_drugbatch_drug FOREIGN KEY (drug_catalog_id)
        REFERENCES drug_catalog (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> FKs `drug_batches.supplier_id` → `suppliers(id) ON DELETE SET NULL` and `drug_batches.grn_item_id` →
> `grn_items(id) ON DELETE SET NULL` are added by `ALTER TABLE` after §11 (Inventory) tables exist.

### `pharmacy_stock`
Aggregate stock-on-hand per branch per catalog drug (denormalized rollup of `drug_batches` for fast lookups + reorder alerts).

```sql
CREATE TABLE pharmacy_stock (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    drug_catalog_id     BIGINT UNSIGNED NOT NULL,
    quantity_on_hand    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    reorder_level       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    reorder_quantity    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    last_movement_at    TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pharmstock (branch_id, drug_catalog_id),
    KEY idx_pharmstock_reorder (branch_id, quantity_on_hand, reorder_level),
    CONSTRAINT fk_pharmstock_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pharmstock_drug FOREIGN KEY (drug_catalog_id)
        REFERENCES drug_catalog (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `dispenses`

```sql
CREATE TABLE dispenses (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    prescription_id     BIGINT UNSIGNED NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    invoice_id          BIGINT UNSIGNED NULL,
    dispensed_by        BIGINT UNSIGNED NULL,
    status              ENUM('pending','completed','partial','reversed') NOT NULL DEFAULT 'completed',
    total_amount        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    dispensed_at        TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_disp_branch (branch_id),
    KEY idx_disp_rx (prescription_id),
    KEY idx_disp_patient (patient_id),
    KEY idx_disp_invoice (invoice_id),
    CONSTRAINT fk_disp_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_disp_rx FOREIGN KEY (prescription_id)
        REFERENCES prescriptions (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_disp_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_disp_dispenser FOREIGN KEY (dispensed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> FK `dispenses.invoice_id` → `invoices(id) ON DELETE SET NULL` added via `ALTER TABLE` after §9.

### `dispense_items`

```sql
CREATE TABLE dispense_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    dispense_id         BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    prescription_item_id BIGINT UNSIGNED NULL,
    drug_catalog_id     BIGINT UNSIGNED NULL,
    drug_batch_id       BIGINT UNSIGNED NULL,
    drug_name           VARCHAR(200)    NOT NULL,        -- denormalized snapshot
    quantity            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    unit_price          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    line_total          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_dispitem_dispense (dispense_id),
    KEY idx_dispitem_batch (drug_batch_id),
    KEY idx_dispitem_branch (branch_id),
    CONSTRAINT fk_dispitem_dispense FOREIGN KEY (dispense_id)
        REFERENCES dispenses (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dispitem_rxitem FOREIGN KEY (prescription_item_id)
        REFERENCES prescription_items (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dispitem_drug FOREIGN KEY (drug_catalog_id)
        REFERENCES drug_catalog (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dispitem_batch FOREIGN KEY (drug_batch_id)
        REFERENCES drug_batches (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dispitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 8. Laboratory & Radiology

### `lab_test_catalog` (global reference master)

```sql
CREATE TABLE lab_test_catalog (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code                VARCHAR(40)     NOT NULL,
    name                VARCHAR(160)    NOT NULL,
    specimen_type       VARCHAR(80)     NULL,            -- blood, urine, stool
    department          VARCHAR(80)     NULL,            -- haematology, chemistry, micro
    unit                VARCHAR(40)     NULL,
    reference_range     VARCHAR(120)    NULL,
    default_price       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    turnaround_hours    SMALLINT UNSIGNED NULL,
    is_active           TINYINT(1)      NOT NULL DEFAULT 1,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_labcat_code (code),
    KEY idx_labcat_name (name),
    KEY idx_labcat_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `lab_orders`

```sql
CREATE TABLE lab_orders (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    ordered_by          BIGINT UNSIGNED NULL,
    priority            ENUM('routine','urgent','stat') NOT NULL DEFAULT 'routine',
    status              ENUM('ordered','sample_collected','in_progress','resulted','verified','cancelled') NOT NULL DEFAULT 'ordered',
    clinical_notes      VARCHAR(512)    NULL,
    invoice_id          BIGINT UNSIGNED NULL,
    ordered_at          TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_laborder_branch_status (branch_id, status),
    KEY idx_laborder_patient (patient_id),
    KEY idx_laborder_encounter (encounter_id),
    CONSTRAINT fk_laborder_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_laborder_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_laborder_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_laborder_orderer FOREIGN KEY (ordered_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `lab_samples`
Barcoded specimen (`LAB-{BRANCH}-YYMMDD-0001`).

```sql
CREATE TABLE lab_samples (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    lab_order_id        BIGINT UNSIGNED NOT NULL,
    sample_id           VARCHAR(28)     NOT NULL,        -- LAB-NRB-260622-0007
    specimen_type       VARCHAR(80)     NULL,
    status              ENUM('pending','collected','received','rejected','disposed') NOT NULL DEFAULT 'pending',
    collected_by        BIGINT UNSIGNED NULL,
    collected_at        TIMESTAMP       NULL,
    received_at         TIMESTAMP       NULL,
    rejection_reason    VARCHAR(255)    NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_labsample_id (sample_id),
    KEY idx_labsample_order (lab_order_id),
    KEY idx_labsample_branch_status (branch_id, status),
    CONSTRAINT fk_labsample_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_labsample_order FOREIGN KEY (lab_order_id)
        REFERENCES lab_orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_labsample_collector FOREIGN KEY (collected_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `lab_results`
One row per ordered test (line item of an order).

```sql
CREATE TABLE lab_results (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    lab_order_id        BIGINT UNSIGNED NOT NULL,
    lab_sample_id       BIGINT UNSIGNED NULL,
    lab_test_catalog_id BIGINT UNSIGNED NULL,
    test_name           VARCHAR(160)    NOT NULL,        -- denormalized snapshot
    result_value        VARCHAR(255)    NULL,
    unit                VARCHAR(40)     NULL,
    reference_range     VARCHAR(120)    NULL,
    flag                ENUM('normal','low','high','critical','abnormal') NULL,
    status              ENUM('pending','resulted','verified','amended','cancelled') NOT NULL DEFAULT 'pending',
    resulted_by         BIGINT UNSIGNED NULL,
    verified_by         BIGINT UNSIGNED NULL,
    resulted_at         TIMESTAMP       NULL,
    verified_at         TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_labresult_order (lab_order_id),
    KEY idx_labresult_sample (lab_sample_id),
    KEY idx_labresult_branch_status (branch_id, status),
    KEY idx_labresult_test (lab_test_catalog_id),
    CONSTRAINT fk_labresult_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_labresult_order FOREIGN KEY (lab_order_id)
        REFERENCES lab_orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_labresult_sample FOREIGN KEY (lab_sample_id)
        REFERENCES lab_samples (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_labresult_test FOREIGN KEY (lab_test_catalog_id)
        REFERENCES lab_test_catalog (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_labresult_resulter FOREIGN KEY (resulted_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_labresult_verifier FOREIGN KEY (verified_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `radiology_orders`

```sql
CREATE TABLE radiology_orders (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    ordered_by          BIGINT UNSIGNED NULL,
    modality            ENUM('xray','ct','mri','ultrasound','mammography','fluoroscopy','other') NOT NULL DEFAULT 'xray',
    body_part           VARCHAR(120)    NULL,
    priority            ENUM('routine','urgent','stat') NOT NULL DEFAULT 'routine',
    status              ENUM('ordered','scheduled','performed','reported','verified','cancelled') NOT NULL DEFAULT 'ordered',
    clinical_notes      VARCHAR(512)    NULL,
    invoice_id          BIGINT UNSIGNED NULL,
    ordered_at          TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_radorder_branch_status (branch_id, status),
    KEY idx_radorder_patient (patient_id),
    KEY idx_radorder_encounter (encounter_id),
    CONSTRAINT fk_radorder_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_radorder_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_radorder_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_radorder_orderer FOREIGN KEY (ordered_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `radiology_studies`
Performed study + report (`RAD-{BRANCH}-YYMMDD-0001`).

```sql
CREATE TABLE radiology_studies (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    radiology_order_id  BIGINT UNSIGNED NOT NULL,
    study_id            VARCHAR(28)     NOT NULL,        -- RAD-NRB-260622-0003
    accession_number    VARCHAR(60)     NULL,
    performed_by        BIGINT UNSIGNED NULL,            -- radiographer
    reported_by         BIGINT UNSIGNED NULL,            -- radiologist
    findings            TEXT            NULL,
    impression          TEXT            NULL,
    status              ENUM('scheduled','performed','reported','verified','cancelled') NOT NULL DEFAULT 'scheduled',
    performed_at        TIMESTAMP       NULL,
    reported_at         TIMESTAMP       NULL,
    verified_at         TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_radstudy_id (study_id),
    KEY idx_radstudy_order (radiology_order_id),
    KEY idx_radstudy_branch_status (branch_id, status),
    CONSTRAINT fk_radstudy_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_radstudy_order FOREIGN KEY (radiology_order_id)
        REFERENCES radiology_orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_radstudy_performer FOREIGN KEY (performed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_radstudy_reporter FOREIGN KEY (reported_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 9. Billing, Payments & Insurance (SHA)

### `invoices`

```sql
CREATE TABLE invoices (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id           CHAR(36)        NOT NULL,
    invoice_number      VARCHAR(30)     NOT NULL,        -- INV-{BRANCH}-YYYY-000001
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    invoice_type        ENUM('outpatient','inpatient','pharmacy','lab','radiology','mixed') NOT NULL DEFAULT 'outpatient',
    status              ENUM('draft','pending','partially_paid','paid','cancelled','refunded','written_off') NOT NULL DEFAULT 'pending',
    payer_type          ENUM('cash','sha','private','corporate') NOT NULL DEFAULT 'cash',
    subtotal            DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    discount_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    tax_amount          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    total_amount        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    amount_paid         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    balance             DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    insurance_id        BIGINT UNSIGNED NULL,            -- patient_insurance.id
    issued_at           TIMESTAMP       NULL,
    due_at              TIMESTAMP       NULL,
    created_by          BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_invoice_public_id (public_id),
    UNIQUE KEY uq_invoice_number (invoice_number),
    KEY idx_invoice_branch_status (branch_id, status),
    KEY idx_invoice_patient (patient_id),
    KEY idx_invoice_encounter (encounter_id),
    KEY idx_invoice_payer (payer_type),
    KEY idx_invoice_branch_issued (branch_id, issued_at),
    CONSTRAINT fk_invoice_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_invoice_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_invoice_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_invoice_insurance FOREIGN KEY (insurance_id)
        REFERENCES patient_insurance (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_invoice_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `invoice_items`
Polymorphic source line (links to dispense/lab/radiology/procedure).

```sql
CREATE TABLE invoice_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    invoice_id          BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    billable_type       VARCHAR(255)    NULL,            -- morph: Dispense, LabOrder, RadiologyOrder, Service
    billable_id         BIGINT UNSIGNED NULL,
    description         VARCHAR(255)    NOT NULL,
    quantity            DECIMAL(10,2)   NOT NULL DEFAULT 1,
    unit_price          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    discount_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    tax_amount          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    line_total          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_invitem_invoice (invoice_id),
    KEY idx_invitem_morph (billable_type, billable_id),
    KEY idx_invitem_branch (branch_id),
    CONSTRAINT fk_invitem_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_invitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `payments`

```sql
CREATE TABLE payments (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    invoice_id          BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    method              ENUM('cash','mpesa','card','bank','insurance','waiver') NOT NULL DEFAULT 'cash',
    amount              DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    status              ENUM('pending','completed','failed','reversed') NOT NULL DEFAULT 'completed',
    reference           VARCHAR(80)     NULL,            -- mpesa receipt / bank ref
    mpesa_transaction_id BIGINT UNSIGNED NULL,
    received_by         BIGINT UNSIGNED NULL,
    paid_at             TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_payment_branch (branch_id),
    KEY idx_payment_invoice (invoice_id),
    KEY idx_payment_patient (patient_id),
    KEY idx_payment_method_status (method, status),
    KEY idx_payment_reference (reference),
    CONSTRAINT fk_payment_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payment_receiver FOREIGN KEY (received_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> FK `payments.mpesa_transaction_id` → `mpesa_transactions(id) ON DELETE SET NULL` added via `ALTER TABLE` after `mpesa_transactions` exists.

### `receipts`

```sql
CREATE TABLE receipts (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    receipt_number      VARCHAR(30)     NOT NULL,        -- RCP-{BRANCH}-YYYY-000001
    branch_id           BIGINT UNSIGNED NOT NULL,
    payment_id          BIGINT UNSIGNED NOT NULL,
    invoice_id          BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    amount              DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    issued_by           BIGINT UNSIGNED NULL,
    issued_at           TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_receipt_number (receipt_number),
    KEY idx_receipt_branch (branch_id),
    KEY idx_receipt_payment (payment_id),
    KEY idx_receipt_invoice (invoice_id),
    CONSTRAINT fk_receipt_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_receipt_payment FOREIGN KEY (payment_id)
        REFERENCES payments (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_receipt_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_receipt_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_receipt_issuer FOREIGN KEY (issued_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `refunds`

```sql
CREATE TABLE refunds (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    payment_id          BIGINT UNSIGNED NOT NULL,
    invoice_id          BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    amount              DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    reason              VARCHAR(255)    NULL,
    method              ENUM('cash','mpesa','card','bank') NOT NULL DEFAULT 'cash',
    status              ENUM('pending','approved','completed','rejected') NOT NULL DEFAULT 'pending',
    approved_by         BIGINT UNSIGNED NULL,
    processed_by        BIGINT UNSIGNED NULL,
    refunded_at         TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_refund_branch (branch_id),
    KEY idx_refund_payment (payment_id),
    KEY idx_refund_invoice (invoice_id),
    CONSTRAINT fk_refund_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id)
        REFERENCES payments (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_refund_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_refund_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_refund_approver FOREIGN KEY (approved_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_refund_processor FOREIGN KEY (processed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `mpesa_transactions`
Idempotent by `CheckoutRequestID` / `mpesa_receipt`.

```sql
CREATE TABLE mpesa_transactions (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    invoice_id          BIGINT UNSIGNED NULL,
    payment_id          BIGINT UNSIGNED NULL,
    transaction_type    ENUM('stk_push','paybill','till','c2b','b2c','reversal') NOT NULL DEFAULT 'stk_push',
    checkout_request_id VARCHAR(80)     NULL,
    merchant_request_id VARCHAR(80)     NULL,
    mpesa_receipt       VARCHAR(40)     NULL,
    phone_number        VARCHAR(20)     NULL,
    amount              DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    account_reference   VARCHAR(80)     NULL,
    result_code         INT             NULL,
    result_desc         VARCHAR(255)    NULL,
    status              ENUM('initiated','pending','success','failed','timeout','reversed') NOT NULL DEFAULT 'initiated',
    raw_callback        JSON            NULL,
    transacted_at       TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mpesa_checkout (checkout_request_id),
    UNIQUE KEY uq_mpesa_receipt (mpesa_receipt),
    KEY idx_mpesa_branch (branch_id),
    KEY idx_mpesa_invoice (invoice_id),
    KEY idx_mpesa_status (status),
    KEY idx_mpesa_phone (phone_number),
    CONSTRAINT fk_mpesa_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_mpesa_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_mpesa_payment FOREIGN KEY (payment_id)
        REFERENCES payments (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `sha_claims`
SHA (Social Health Authority) claim (`CLM-{BRANCH}-YYYY-00001`).

```sql
CREATE TABLE sha_claims (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    claim_number        VARCHAR(30)     NOT NULL,        -- CLM-{BRANCH}-YYYY-00001
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    invoice_id          BIGINT UNSIGNED NULL,
    patient_insurance_id BIGINT UNSIGNED NULL,
    sha_member_number   VARCHAR(80)     NULL,
    preauth_number      VARCHAR(80)     NULL,
    claim_type          ENUM('outpatient','inpatient','emergency','maternity','surgical') NOT NULL DEFAULT 'outpatient',
    status              ENUM('draft','submitted','pre_auth','approved','partially_approved','rejected','paid','appealed') NOT NULL DEFAULT 'draft',
    claimed_amount      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    approved_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    paid_amount         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    rejection_reason    VARCHAR(512)    NULL,
    submitted_at        TIMESTAMP       NULL,
    responded_at        TIMESTAMP       NULL,
    paid_at             TIMESTAMP       NULL,
    submitted_by        BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_shaclaim_number (claim_number),
    KEY idx_shaclaim_branch_status (branch_id, status),
    KEY idx_shaclaim_patient (patient_id),
    KEY idx_shaclaim_invoice (invoice_id),
    KEY idx_shaclaim_encounter (encounter_id),
    CONSTRAINT fk_shaclaim_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_shaclaim_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_shaclaim_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_shaclaim_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_shaclaim_insurance FOREIGN KEY (patient_insurance_id)
        REFERENCES patient_insurance (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_shaclaim_submitter FOREIGN KEY (submitted_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `sha_claim_items`

```sql
CREATE TABLE sha_claim_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sha_claim_id        BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    invoice_item_id     BIGINT UNSIGNED NULL,
    sha_code            VARCHAR(40)     NULL,            -- SHA benefit/tariff code
    description         VARCHAR(255)    NOT NULL,
    quantity            DECIMAL(10,2)   NOT NULL DEFAULT 1,
    claimed_amount      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    approved_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    status              ENUM('claimed','approved','partially_approved','rejected') NOT NULL DEFAULT 'claimed',
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_shaitem_claim (sha_claim_id),
    KEY idx_shaitem_branch (branch_id),
    KEY idx_shaitem_invitem (invoice_item_id),
    CONSTRAINT fk_shaitem_claim FOREIGN KEY (sha_claim_id)
        REFERENCES sha_claims (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_shaitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_shaitem_invitem FOREIGN KEY (invoice_item_id)
        REFERENCES invoice_items (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 10. Inpatient

### `wards`

```sql
CREATE TABLE wards (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NOT NULL,
    code            VARCHAR(16)     NOT NULL,
    name            VARCHAR(100)    NOT NULL,
    ward_type       ENUM('general','private','icu','hdu','maternity','pediatric','isolation') NOT NULL DEFAULT 'general',
    gender_policy   ENUM('mixed','male','female') NOT NULL DEFAULT 'mixed',
    capacity        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ward_branch_code (branch_id, code),
    KEY idx_ward_branch (branch_id),
    CONSTRAINT fk_ward_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `beds`

```sql
CREATE TABLE beds (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NOT NULL,
    ward_id         BIGINT UNSIGNED NOT NULL,
    bed_number      VARCHAR(20)     NOT NULL,
    status          ENUM('available','occupied','reserved','maintenance','cleaning') NOT NULL DEFAULT 'available',
    daily_rate      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bed_ward_number (ward_id, bed_number),
    KEY idx_bed_branch_status (branch_id, status),
    KEY idx_bed_ward (ward_id),
    CONSTRAINT fk_bed_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_bed_ward FOREIGN KEY (ward_id)
        REFERENCES wards (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `admissions`
Admission no. `ADM-{BRANCH}-YYYY-00001`.

```sql
CREATE TABLE admissions (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admission_number    VARCHAR(28)     NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    ward_id             BIGINT UNSIGNED NULL,
    bed_id              BIGINT UNSIGNED NULL,
    admitting_doctor_id BIGINT UNSIGNED NULL,
    admitted_at         DATETIME        NOT NULL,
    expected_discharge  DATE            NULL,
    discharged_at       DATETIME        NULL,
    status              ENUM('admitted','transferred','discharged','absconded','deceased') NOT NULL DEFAULT 'admitted',
    discharge_type      ENUM('normal','referred','against_advice','deceased','none') NOT NULL DEFAULT 'none',
    discharge_summary   TEXT            NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admission_number (admission_number),
    KEY idx_admission_branch_status (branch_id, status),
    KEY idx_admission_patient (patient_id),
    KEY idx_admission_bed (bed_id),
    KEY idx_admission_ward (ward_id),
    CONSTRAINT fk_admission_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_admission_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_admission_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_admission_ward FOREIGN KEY (ward_id)
        REFERENCES wards (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_admission_bed FOREIGN KEY (bed_id)
        REFERENCES beds (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_admission_doctor FOREIGN KEY (admitting_doctor_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `nursing_charts`
Vitals / observations / nursing notes during admission.

```sql
CREATE TABLE nursing_charts (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    admission_id        BIGINT UNSIGNED NOT NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    chart_type          ENUM('vitals','intake_output','medication','observation','note') NOT NULL DEFAULT 'vitals',
    temperature_c       DECIMAL(4,1)    NULL,
    pulse_bpm           SMALLINT UNSIGNED NULL,
    respiratory_rate    SMALLINT UNSIGNED NULL,
    systolic_bp         SMALLINT UNSIGNED NULL,
    diastolic_bp        SMALLINT UNSIGNED NULL,
    spo2_pct            SMALLINT UNSIGNED NULL,
    pain_score          TINYINT UNSIGNED NULL,
    intake_ml           INT UNSIGNED    NULL,
    output_ml           INT UNSIGNED    NULL,
    notes               TEXT            NULL,
    recorded_by         BIGINT UNSIGNED NULL,
    recorded_at         TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_nchart_admission (admission_id, recorded_at),
    KEY idx_nchart_patient (patient_id),
    KEY idx_nchart_branch (branch_id),
    CONSTRAINT fk_nchart_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_nchart_admission FOREIGN KEY (admission_id)
        REFERENCES admissions (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nchart_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_nchart_recorder FOREIGN KEY (recorded_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 11. Inventory & Supply Chain

### `inventory_categories`

```sql
CREATE TABLE inventory_categories (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,                -- NULL = global category
    parent_id       BIGINT UNSIGNED NULL,
    name            VARCHAR(120)    NOT NULL,
    code            VARCHAR(40)     NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_invcat_parent (parent_id),
    KEY idx_invcat_branch (branch_id),
    CONSTRAINT fk_invcat_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_invcat_parent FOREIGN KEY (parent_id)
        REFERENCES inventory_categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `inventory_items`
Non-pharmacy consumables/equipment (drugs are tracked via `drug_catalog`/`drug_batches`/`pharmacy_stock`).

```sql
CREATE TABLE inventory_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    category_id         BIGINT UNSIGNED NULL,
    sku                 VARCHAR(60)     NOT NULL,
    name                VARCHAR(160)    NOT NULL,
    unit                VARCHAR(40)     NULL,
    quantity_on_hand    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    reorder_level       DECIMAL(12,2)   NOT NULL DEFAULT 0,
    reorder_quantity    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    unit_cost           DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    is_active           TINYINT(1)      NOT NULL DEFAULT 1,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_invitem_branch_sku (branch_id, sku),
    KEY idx_invitem_category (category_id),
    KEY idx_invitem_branch_reorder (branch_id, quantity_on_hand, reorder_level),
    KEY idx_invitem_name (name),
    CONSTRAINT fk_invitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_invitem_category FOREIGN KEY (category_id)
        REFERENCES inventory_categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `suppliers`

```sql
CREATE TABLE suppliers (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,                -- NULL = shared across branches
    name            VARCHAR(160)    NOT NULL,
    code            VARCHAR(40)     NULL,
    contact_person  VARCHAR(120)    NULL,
    phone           VARCHAR(30)     NULL,
    email           VARCHAR(150)    NULL,
    address         VARCHAR(255)    NULL,
    kra_pin         VARCHAR(40)     NULL,
    payment_terms   VARCHAR(120)    NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_supplier_branch (branch_id),
    KEY idx_supplier_name (name),
    CONSTRAINT fk_supplier_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `purchase_orders`
`PO-{BRANCH}-YYYY-0001`.

```sql
CREATE TABLE purchase_orders (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    po_number           VARCHAR(28)     NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    supplier_id         BIGINT UNSIGNED NOT NULL,
    status              ENUM('draft','submitted','approved','partially_received','received','cancelled') NOT NULL DEFAULT 'draft',
    order_date          DATE            NULL,
    expected_date       DATE            NULL,
    subtotal            DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    tax_amount          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    total_amount        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    notes               VARCHAR(512)    NULL,
    created_by          BIGINT UNSIGNED NULL,
    approved_by         BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_po_number (po_number),
    KEY idx_po_branch_status (branch_id, status),
    KEY idx_po_supplier (supplier_id),
    CONSTRAINT fk_po_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id)
        REFERENCES suppliers (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_po_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_po_approver FOREIGN KEY (approved_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `purchase_order_items`

```sql
CREATE TABLE purchase_order_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    purchase_order_id   BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    inventory_item_id   BIGINT UNSIGNED NULL,
    drug_catalog_id     BIGINT UNSIGNED NULL,
    description         VARCHAR(255)    NOT NULL,
    quantity_ordered    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    quantity_received   DECIMAL(12,2)   NOT NULL DEFAULT 0,
    unit_cost           DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    line_total          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_poitem_po (purchase_order_id),
    KEY idx_poitem_invitem (inventory_item_id),
    KEY idx_poitem_drug (drug_catalog_id),
    KEY idx_poitem_branch (branch_id),
    CONSTRAINT fk_poitem_po FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_poitem_invitem FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_poitem_drug FOREIGN KEY (drug_catalog_id)
        REFERENCES drug_catalog (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_poitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `goods_received_notes`

```sql
CREATE TABLE goods_received_notes (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    grn_number          VARCHAR(28)     NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    purchase_order_id   BIGINT UNSIGNED NULL,
    supplier_id         BIGINT UNSIGNED NOT NULL,
    delivery_note_ref   VARCHAR(80)     NULL,
    invoice_ref         VARCHAR(80)     NULL,
    status              ENUM('draft','received','verified','rejected') NOT NULL DEFAULT 'received',
    received_at         DATE            NULL,
    total_amount        DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    received_by         BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    deleted_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_grn_number (grn_number),
    KEY idx_grn_branch (branch_id),
    KEY idx_grn_po (purchase_order_id),
    KEY idx_grn_supplier (supplier_id),
    CONSTRAINT fk_grn_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_grn_po FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_grn_supplier FOREIGN KEY (supplier_id)
        REFERENCES suppliers (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_grn_receiver FOREIGN KEY (received_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `grn_items`

```sql
CREATE TABLE grn_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    grn_id              BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NOT NULL,
    purchase_order_item_id BIGINT UNSIGNED NULL,
    inventory_item_id   BIGINT UNSIGNED NULL,
    drug_catalog_id     BIGINT UNSIGNED NULL,
    description         VARCHAR(255)    NOT NULL,
    batch_number        VARCHAR(80)     NULL,
    expiry_date         DATE            NULL,
    quantity_received   DECIMAL(12,2)   NOT NULL DEFAULT 0,
    unit_cost           DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    line_total          DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_grnitem_grn (grn_id),
    KEY idx_grnitem_poitem (purchase_order_item_id),
    KEY idx_grnitem_drug (drug_catalog_id),
    KEY idx_grnitem_branch (branch_id),
    CONSTRAINT fk_grnitem_grn FOREIGN KEY (grn_id)
        REFERENCES goods_received_notes (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_grnitem_poitem FOREIGN KEY (purchase_order_item_id)
        REFERENCES purchase_order_items (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_grnitem_invitem FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_grnitem_drug FOREIGN KEY (drug_catalog_id)
        REFERENCES drug_catalog (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_grnitem_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `stock_movements`
Immutable ledger of all stock in/out (drug batches + inventory items), polymorphic source.

```sql
CREATE TABLE stock_movements (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    stockable_type      VARCHAR(255)    NOT NULL,        -- morph: DrugBatch, InventoryItem, PharmacyStock
    stockable_id        BIGINT UNSIGNED NOT NULL,
    movement_type       ENUM('grn_in','dispense_out','adjustment','transfer_in','transfer_out','return','wastage','expiry') NOT NULL,
    quantity            DECIMAL(12,2)   NOT NULL,        -- signed (+in / -out)
    balance_after       DECIMAL(12,2)   NULL,
    reference_type      VARCHAR(255)    NULL,            -- morph source doc: GrnItem, DispenseItem...
    reference_id        BIGINT UNSIGNED NULL,
    reason              VARCHAR(255)    NULL,
    performed_by        BIGINT UNSIGNED NULL,
    moved_at            TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_stkmov_branch (branch_id),
    KEY idx_stkmov_stockable (stockable_type, stockable_id),
    KEY idx_stkmov_reference (reference_type, reference_id),
    KEY idx_stkmov_type_date (movement_type, moved_at),
    CONSTRAINT fk_stkmov_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stkmov_performer FOREIGN KEY (performed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Deferred FKs applied here (Inventory now exists):**
> ```sql
> ALTER TABLE drug_batches
>   ADD CONSTRAINT fk_drugbatch_supplier FOREIGN KEY (supplier_id)
>       REFERENCES suppliers (id) ON DELETE SET NULL ON UPDATE CASCADE,
>   ADD CONSTRAINT fk_drugbatch_grnitem FOREIGN KEY (grn_item_id)
>       REFERENCES grn_items (id) ON DELETE SET NULL ON UPDATE CASCADE;
> ```

---

## 12. Communication & Clinical Alerts

### `notifications`
Laravel-style notifications table (morphable notifiable), extended with channel/status.

```sql
CREATE TABLE notifications (
    id              CHAR(36)        NOT NULL,            -- UUID (Laravel default)
    branch_id       BIGINT UNSIGNED NULL,
    type            VARCHAR(255)    NOT NULL,
    notifiable_type VARCHAR(255)    NOT NULL,
    notifiable_id   BIGINT UNSIGNED NOT NULL,
    channel         ENUM('database','mail','sms','broadcast') NOT NULL DEFAULT 'database',
    data            JSON            NOT NULL,
    status          ENUM('queued','sent','delivered','failed','read') NOT NULL DEFAULT 'queued',
    read_at         TIMESTAMP       NULL,
    sent_at         TIMESTAMP       NULL,
    failed_reason   VARCHAR(255)    NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_notif_notifiable (notifiable_type, notifiable_id),
    KEY idx_notif_branch (branch_id),
    KEY idx_notif_status (status),
    KEY idx_notif_read (notifiable_id, read_at),
    CONSTRAINT fk_notif_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `broadcasts`
Admin-authored announcements (branch-wide or system-wide).

```sql
CREATE TABLE broadcasts (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,                -- NULL = all branches
    title           VARCHAR(200)    NOT NULL,
    body            TEXT            NOT NULL,
    audience        ENUM('all','staff','doctors','nurses','patients','role') NOT NULL DEFAULT 'staff',
    target_role     VARCHAR(125)    NULL,                -- when audience='role'
    channel         ENUM('in_app','email','sms','all') NOT NULL DEFAULT 'in_app',
    status          ENUM('draft','scheduled','sent','cancelled') NOT NULL DEFAULT 'draft',
    scheduled_at    TIMESTAMP       NULL,
    sent_at         TIMESTAMP       NULL,
    created_by      BIGINT UNSIGNED NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_broadcast_branch (branch_id),
    KEY idx_broadcast_status (status, scheduled_at),
    CONSTRAINT fk_broadcast_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_broadcast_creator FOREIGN KEY (created_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `alert_rules`
Configurable clinical alert rules (drug interaction, allergy, critical lab, vitals threshold).

```sql
CREATE TABLE alert_rules (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,                -- NULL = global rule
    code            VARCHAR(60)     NOT NULL,
    name            VARCHAR(160)    NOT NULL,
    rule_type       ENUM('drug_interaction','allergy','critical_lab','vitals_threshold','duplicate_order','custom') NOT NULL,
    severity        ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',
    conditions      JSON            NULL,                -- declarative match conditions
    message_template VARCHAR(512)   NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    deleted_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_alertrule_branch_code (branch_id, code),
    KEY idx_alertrule_type (rule_type, is_active),
    CONSTRAINT fk_alertrule_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `clinical_alerts`
Fired alert instances (against a patient/encounter), acknowledged by clinicians.

```sql
CREATE TABLE clinical_alerts (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id           BIGINT UNSIGNED NOT NULL,
    alert_rule_id       BIGINT UNSIGNED NULL,
    patient_id          BIGINT UNSIGNED NOT NULL,
    encounter_id        BIGINT UNSIGNED NULL,
    source_type         VARCHAR(255)    NULL,            -- morph: Prescription, LabResult, TriageAssessment
    source_id           BIGINT UNSIGNED NULL,
    severity            ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',
    title               VARCHAR(200)    NOT NULL,
    message             VARCHAR(512)    NULL,
    status              ENUM('active','acknowledged','overridden','resolved','expired') NOT NULL DEFAULT 'active',
    acknowledged_by     BIGINT UNSIGNED NULL,
    acknowledged_at     TIMESTAMP       NULL,
    override_reason     VARCHAR(512)    NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_calert_branch_status (branch_id, status),
    KEY idx_calert_patient (patient_id),
    KEY idx_calert_encounter (encounter_id),
    KEY idx_calert_rule (alert_rule_id),
    KEY idx_calert_source (source_type, source_id),
    CONSTRAINT fk_calert_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_calert_rule FOREIGN KEY (alert_rule_id)
        REFERENCES alert_rules (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_calert_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_calert_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_calert_ack FOREIGN KEY (acknowledged_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 13. Audit

### `activity_log` (Spatie Activity Log)
Standard package shape; logs model changes.

```sql
CREATE TABLE activity_log (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    log_name        VARCHAR(255)    NULL,
    description     TEXT            NOT NULL,
    subject_type    VARCHAR(255)    NULL,
    subject_id      BIGINT UNSIGNED NULL,
    event           VARCHAR(255)    NULL,
    causer_type     VARCHAR(255)    NULL,
    causer_id       BIGINT UNSIGNED NULL,
    properties      JSON            NULL,
    batch_uuid      CHAR(36)        NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_actlog_subject (subject_type, subject_id),
    KEY idx_actlog_causer (causer_type, causer_id),
    KEY idx_actlog_log_name (log_name),
    KEY idx_actlog_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `audit_logs` (immutable PHI / security audit)
Dedicated append-only trail for PHI access + security events. No `updated_at`/`deleted_at` (immutable).

```sql
CREATE TABLE audit_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    branch_id       BIGINT UNSIGNED NULL,
    user_id         BIGINT UNSIGNED NULL,
    event_type      VARCHAR(80)     NOT NULL,            -- 'phi.view','phi.export','login','permission.change'
    auditable_type  VARCHAR(255)    NULL,                -- morph subject
    auditable_id    BIGINT UNSIGNED NULL,
    description     VARCHAR(512)    NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      VARCHAR(512)    NULL,
    old_values      JSON            NULL,
    new_values      JSON            NULL,
    metadata        JSON            NULL,
    created_at      TIMESTAMP       NULL,
    PRIMARY KEY (id),
    KEY idx_auditlog_branch (branch_id),
    KEY idx_auditlog_user (user_id, created_at),
    KEY idx_auditlog_event (event_type, created_at),
    KEY idx_auditlog_auditable (auditable_type, auditable_id),
    CONSTRAINT fk_auditlog_branch FOREIGN KEY (branch_id)
        REFERENCES branches (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_auditlog_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> Immutability is enforced at the application layer (write-only repository, no update/delete) and optionally
> by a MySQL trigger blocking `UPDATE`/`DELETE`. Retention ≥ 10 years; archival to cold storage, never hard-deleted.

---

## 14. Indexing Strategy

**Principles**

1. **Tenancy-leading composites.** Almost every operational query is scoped by `branch_id` (the `BranchScope`
   global scope). The leftmost column of the primary working index on each operational table is `branch_id`,
   followed by the next most selective filter/sort column:
   - `patients (branch_id, is_active)`, name index `(last_name, first_name)`.
   - `appointments (branch_id, scheduled_start)` and `(provider_id, scheduled_start)` for provider day views.
   - `encounters (branch_id, visit_date)` and `(patient_id, visit_date)` for patient timeline.
   - `queue_tickets (branch_id, ticket_date, status)` and `(station_id, status, priority)` for live boards.
   - `invoices (branch_id, status)` and `(branch_id, issued_at)` for cashier dashboards & revenue reports.
   - `lab_orders / radiology_orders (branch_id, status)` for worklists.
   - `*_stock (branch_id, quantity_on_hand, reorder_level)` for reorder/low-stock alerts.

2. **Every FK column is indexed.** InnoDB requires it for referential integrity performance, and it accelerates
   joins. Where an FK already appears as the left prefix of a composite (e.g. `idx_qticket_station_status`),
   no separate single-column index is added to avoid redundancy.

3. **Unique business keys.** Human-facing identifiers are `UNIQUE`: `patient_number`, `invoice_number`,
   `receipt_number`, `prescription_number`, `claim_number`, `po_number`, `grn_number`, `admission_number`,
   `lab_samples.sample_id`, `radiology_studies.study_id`. `public_id` (UUID) is `UNIQUE` on every externally
   exposed table. Idempotency keys `mpesa_transactions.checkout_request_id` and `.mpesa_receipt` are `UNIQUE`.

4. **Composite unique constraints for natural keys / pivots.** e.g. `branch_user (user_id, branch_id)`,
   `drug_batches (branch_id, drug_catalog_id, batch_number)`, `pharmacy_stock (branch_id, drug_catalog_id)`,
   `settings (branch_id, group, key)`, `queue_stations (branch_id, code)`, `beds (ward_id, bed_number)`,
   `queue_tickets (branch_id, station_id, ticket_date, ticket_number)` (daily-reset uniqueness).

5. **Polymorphic morph indexes.** All morphable tables carry `(*_type, *_id)` composite indexes:
   `documents`, `invoice_items` (billable), `stock_movements` (stockable + reference), `clinical_alerts`
   (source), `notifications` (notifiable), `activity_log` (subject + causer), `audit_logs` (auditable).

6. **Search indexes.** B-tree on `patients (last_name, first_name)`, `patients.phone`, `patients.national_id`,
   `patients.sha_number`. `FULLTEXT` on `drug_catalog (generic_name, brand_name)` and
   `diagnoses_catalog (description)` for type-ahead drug/diagnosis lookup. Optional `FULLTEXT` on patient names
   if fuzzy matching is required.

7. **Time-series / reporting indexes.** `audit_logs (event_type, created_at)`, `login_histories (status, created_at)`,
   `stock_movements (movement_type, moved_at)`, `activity_log (created_at)` support audit queries and reporting
   without full scans. Consider monthly **range partitioning** on `audit_logs` and `activity_log` at volume
   (10-year retention) — deferred to ops, not schema-breaking.

8. **Covering-index opportunities.** Cashier revenue and worklist queries are tuned so the leading composite
   plus selected columns satisfy common `WHERE … ORDER BY` paths (e.g. `invoices (branch_id, issued_at)` with
   `status`/`total_amount` read from row). Add covering columns later only if `EXPLAIN` shows filesort/temp.

9. **Avoid over-indexing write-hot tables.** `queue_tickets`, `payments`, `mpesa_transactions`, `stock_movements`
   are write-heavy; only query-justified indexes are kept to protect insert throughput under load.

---

## 15. Normalization Note

The schema is designed to **Third Normal Form (3NF)** as the baseline: every non-key attribute depends on the
key, the whole key, and nothing but the key. Repeating groups are extracted into child tables
(`prescription_items`, `invoice_items`, `lab_results`, `sha_claim_items`, `purchase_order_items`, `grn_items`,
`patient_next_of_kin`, `allergies`, etc.). Many-to-many relationships use pivots (`branch_user`, Spatie
`model_has_roles` / `role_has_permissions`). Reference/master data (`drug_catalog`, `lab_test_catalog`,
`diagnoses_catalog`) is global and 1:N to transactional rows.

**Justified, deliberate denormalizations** (each chosen for integrity-of-record or read performance, never to
avoid normalization work):

1. **Clinical/financial snapshots.** `prescription_items.drug_name`, `diagnoses.icd10_code` + `description`,
   `dispense_items.drug_name`, `lab_results.test_name` + `reference_range`, `invoice_items.description` store a
   **point-in-time copy** of catalog values. Rationale: a medico-legal record must reflect exactly what was
   prescribed/diagnosed/billed at the time, even if the catalog later changes or a row is deactivated. The FK to
   the catalog (`drug_catalog_id`, `diagnosis_catalog_id`, `lab_test_catalog_id`) is retained for analytics and
   is `SET NULL` on catalog deletion so the snapshot survives. This is a textbook acceptable 3NF deviation for
   audit/temporal accuracy.

2. **Aggregate stock rollups.** `pharmacy_stock.quantity_on_hand` and `inventory_items.quantity_on_hand` are
   maintained sums over `drug_batches` / `stock_movements`. The authoritative ledger is `stock_movements`
   (and per-batch `drug_batches.quantity_on_hand`); the rollup exists purely so low-stock/reorder dashboards
   avoid aggregating the ledger on every read. Kept consistent transactionally by the inventory service and
   reconcilable from the ledger.

3. **Monetary totals on headers.** `invoices.subtotal/total_amount/amount_paid/balance`,
   `purchase_orders.total_amount`, `dispenses.total_amount`, `sha_claims.claimed/approved/paid_amount` duplicate
   sums of their line items. Rationale: financial documents are read far more than written, totals are needed on
   listings, and the header total is the legally-frozen figure. Recomputable from items; maintained in the same
   transaction as item writes.

4. **Derived clinical values.** `triage_assessments.bmi` is derived from `weight_kg`/`height_cm`. Stored because
   it is charted, trended, and feeds alert rules; recomputation on read across history would be wasteful. Stored
   at write time, treated as immutable for that assessment.

5. **Vitals duplicated across triage and nursing charts.** Vitals columns repeat in `triage_assessments` and
   `nursing_charts` rather than living in one shared `observations` table. Rationale: the two contexts have
   different lifecycles, RBAC, retention semantics, and query patterns (single triage snapshot vs. high-frequency
   inpatient time-series); a shared table would couple them and complicate the `BranchScope`/inpatient queries.

All denormalized values have a single authoritative source and are maintained inside the owning service's DB
transaction, so they cannot drift independently. No denormalization introduces an update anomaly that the
service layer does not own.

**Soft deletes & retention.** All clinical and financial tables carry `deleted_at` and are **never hard-deleted**;
catalog/ledger/audit rows are retained ≥ 10 years per the Kenya Data Protection Act 2019 and MOH requirements
(`00-foundation.md` §11). Hard `ON DELETE CASCADE` exists only on tightly-owned child rows (line items, samples,
charts, pivots) as a referential safety net for the rare administrative hard purge; the production deletion path
is always soft-delete.
