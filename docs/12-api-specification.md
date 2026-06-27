# 12 — REST API Specification

> **Scope:** Exhaustive REST API contract for Afya HMS. Mirrors the layered backend
> (`Route → Controller → FormRequest → Service → Repository → Model`, DTOs in/out,
> Resources for JSON). Consistent with `00-foundation.md` (authority) and
> `08-rbac-matrix.md` (permissions), `09-system-architecture.md`.
>
> **API version:** v1 · **Status:** MVP baseline · **Auth:** Laravel Sanctum (bearer)
> **Format:** `application/json`; errors `application/problem+json`.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Response Envelope & Error Format](#2-response-envelope--error-format)
3. [Error Code Catalog](#3-error-code-catalog)
4. [Endpoint Reference](#4-endpoint-reference)
   - [4.1 Auth](#41-auth) · [4.2 Branches](#42-branches) · [4.3 Patients](#43-patients) · [4.4 Appointments](#44-appointments) · [4.5 Queue](#45-queue) · [4.6 Triage](#46-triage) · [4.7 Encounters / SOAP / Diagnoses](#47-encounters--soap--diagnoses) · [4.8 Prescriptions](#48-prescriptions) · [4.9 Pharmacy](#49-pharmacy) · [4.10 Laboratory](#410-laboratory) · [4.11 Radiology](#411-radiology) · [4.12 Billing & Payments](#412-billing--payments) · [4.13 SHA Claims](#413-sha-claims) · [4.14 Inpatient](#414-inpatient) · [4.15 Inventory](#415-inventory) · [4.16 Reporting](#416-reporting) · [4.17 Notifications](#417-notifications) · [4.18 Patient Portal](#418-patient-portal)
5. [Webhooks](#5-webhooks)
6. [Rate Limiting & Throttling](#6-rate-limiting--throttling)
7. [Error Handling Standards](#7-error-handling-standards)

---

## 1. Conventions

### 1.1 Base URL & Versioning

| Aspect | Value |
|---|---|
| Base URL | `https://api.afyahms.co.ke/api/v1` |
| Local dev | `http://localhost:8000/api/v1` |
| Versioning | **URI path** (`/api/v1`). Breaking changes → `/api/v2`. v1 supported ≥ 12 months after v2 GA. |
| Deprecation signal | `Deprecation: true` + `Sunset: <RFC1123 date>` response headers on sunset endpoints. |
| Content type | Request & response `application/json; charset=utf-8`. Errors `application/problem+json`. |
| Encoding | UTF-8. Money strings `DECIMAL(12,2)` serialized as numbers; currency always `KES`. |
| Timestamps | ISO-8601 UTC (`2026-06-22T09:14:03Z`) in payloads. Clients render in `Africa/Nairobi`. |
| IDs | Internal resources: numeric `id`. Externally-exposed (patients, documents): UUID `public_id` (see Foundation §3). Endpoints accept the UUID for those resources. |

### 1.2 Authentication

- **Laravel Sanctum** personal access / SPA tokens. All endpoints except `auth/login`, `auth/refresh`, `auth/otp/*` (pre-auth steps) and public webhooks require:

```
Authorization: Bearer <sanctum_token>
Accept: application/json
```

- Token TTL: **access 60 min**, **refresh 30 days** (rotating). Idle session timeout 20 min enforced server-side (`last_activity_at`).
- **MFA-gated roles** (`hospital-admin`, `doctor`, `pharmacist`, per Foundation §5): login returns `mfa_required: true` and a short-lived `mfa_token`; a full bearer token is issued only after `auth/mfa/verify`.
- `401` = missing/expired/invalid token. `419` = session/CSRF (SPA cookie mode only). `403` = authenticated but lacks permission or branch access.

### 1.3 Branch Context Header

- Every operational request MUST send the active branch:

```
X-Branch-Id: 3
```

- The `BranchScope` global scope filters all queries by this branch. Rules:
  - The user must have access to the branch (home branch or granted). Else `403 BRANCH_ACCESS_DENIED`.
  - Missing header on a branch-scoped endpoint → falls back to the user's `active_branch_id` (token claim); if none → `422 BRANCH_REQUIRED`.
  - Roles with `branch.view-all` may send `X-Branch-Id: *` to query across branches (read-only endpoints only); writes always require a concrete branch.
  - Global reference data (drug catalog master, ICD-10, system settings, roles) ignores the header.

### 1.4 Pagination

Cursor pagination is default for high-volume collections (queue, audit, encounters); page-number pagination for admin lists.

**Query params (page mode):** `?page=2&per_page=25` (default `per_page=25`, max `100`).
**Query params (cursor mode):** `?cursor=eyJpZCI6MTQyfQ&per_page=50`.

Pagination metadata in the envelope `meta.pagination`:

```json
{
  "meta": {
    "pagination": {
      "mode": "page",
      "current_page": 2,
      "per_page": 25,
      "total": 318,
      "last_page": 13,
      "from": 26,
      "to": 50
    }
  },
  "links": {
    "first": "/api/v1/patients?page=1",
    "prev": "/api/v1/patients?page=1",
    "next": "/api/v1/patients?page=3",
    "last": "/api/v1/patients?page=13"
  }
}
```

Cursor mode replaces `pagination` with `{ "mode": "cursor", "per_page": 50, "next_cursor": "...", "prev_cursor": null }`.

### 1.5 Filtering

- Spatie-query-builder style. Filters whitelisted per endpoint.
  - Equality: `?filter[status]=active`
  - Multiple values (OR): `?filter[status]=active,pending`
  - Partial/like: `?filter[name]=joh` (on text fields flagged searchable)
  - Date range: `?filter[created_between]=2026-06-01,2026-06-22`
  - Free-text search: `?search=john+doe` (module-defined searchable columns)
- Unknown filter key → `422 INVALID_FILTER`.

### 1.6 Sorting

- `?sort=-created_at,last_name` (prefix `-` = DESC). Whitelisted columns per endpoint; unknown → `422 INVALID_SORT`. Default sort documented per collection.

### 1.7 Sparse Fieldsets & Includes

- `?fields[patient]=id,full_name,patient_number` — limit returned attributes.
- `?include=insurance,nextOfKin` — eager-load whitelisted relations (avoids N+1; capped at depth 2).

### 1.8 Idempotency (payments & critical writes)

- Mutating financial endpoints (payment initiation, refunds, invoice posting, dispense, GRN posting) require:

```
Idempotency-Key: 5f8d1c2e-3b4a-4d6e-9f01-2a3b4c5d6e7f
```

- Server stores `(idempotency_key, endpoint, request_hash, response, status)` for **24h** in Redis.
  - Same key + same payload → returns the **stored response** (`200`/`201`) with header `Idempotent-Replay: true`.
  - Same key + **different** payload → `409 IDEMPOTENCY_KEY_REUSE`.
  - Missing key on a required endpoint → `422 IDEMPOTENCY_KEY_REQUIRED`.

### 1.9 Conditional Requests & Concurrency

- Resources return `ETag` and `Last-Modified`. Clients may send `If-None-Match` (→ `304`) and `If-Match` on updates for optimistic concurrency; stale write → `412 PRECONDITION_FAILED`.
- Domain-level optimistic lock via `version` integer on mutable clinical records (encounters, charts); mismatch → `409 STALE_RESOURCE`.

### 1.10 Common Headers (summary)

| Header | Direction | Purpose |
|---|---|---|
| `Authorization: Bearer …` | req | Sanctum auth |
| `X-Branch-Id` | req | Active branch context |
| `Idempotency-Key` | req | Idempotent financial writes |
| `If-Match` / `If-None-Match` | req | Concurrency / cache |
| `Accept-Language: en \| sw` | req | i18n of messages |
| `X-Request-Id` | req/res | Client trace id, echoed; server generates if absent |
| `X-RateLimit-Limit` / `-Remaining` / `-Reset` | res | Throttle state |
| `Retry-After` | res | On `429`/`503` |
| `Deprecation` / `Sunset` | res | Version lifecycle |

---

## 2. Response Envelope & Error Format

### 2.1 Success Envelope

All success responses use a consistent envelope. Single resource:

```json
{
  "data": {
    "id": 42,
    "type": "patient",
    "attributes": { "...": "..." }
  },
  "meta": { "request_id": "req_01J...", "timestamp": "2026-06-22T09:14:03Z" }
}
```

Collection:

```json
{
  "data": [ { "...": "..." } ],
  "meta": {
    "request_id": "req_01J...",
    "timestamp": "2026-06-22T09:14:03Z",
    "pagination": { "mode": "page", "current_page": 1, "per_page": 25, "total": 318, "last_page": 13 }
  },
  "links": { "first": "...", "next": "...", "last": "..." }
}
```

- `2xx` always carry `data` (object, array, or `null` for `204`-style writes returning `200`).
- Resources are shaped by Laravel API Resources; relations appear under `data.<relation>` when `include`d.

### 2.2 Error Format (RFC 9457 problem+json)

`Content-Type: application/problem+json`. Single shape for every error:

```json
{
  "type": "https://api.afyahms.co.ke/problems/validation-error",
  "title": "The given data was invalid.",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "One or more fields failed validation.",
  "instance": "/api/v1/patients",
  "request_id": "req_01J5ABCDEF",
  "errors": {
    "phone": ["The phone field must be a valid Kenyan MSISDN."],
    "date_of_birth": ["The date of birth must be a date before today."]
  },
  "meta": { "timestamp": "2026-06-22T09:14:03Z" }
}
```

| Field | Notes |
|---|---|
| `type` | URI reference to the problem doc (stable, dereferenceable). |
| `title` | Human-readable summary (localized by `Accept-Language`). |
| `status` | Mirrors HTTP status. |
| `code` | **Machine-readable** error code from the catalog (§3). Clients branch on this, never on `title`. |
| `detail` | Context-specific explanation. |
| `instance` | Request path. |
| `request_id` | Correlates with logs/audit. |
| `errors` | Present only for `VALIDATION_ERROR`: `{ field: [messages] }`, mirrors FormRequest bag and the frontend Zod schema. |

### 2.3 HTTP Status Codes (canonical usage)

| Code | When |
|---|---|
| `200 OK` | Read; update; idempotent replay; action with body. |
| `201 Created` | Resource created. Includes `Location` header. |
| `202 Accepted` | Async accepted (queued report export, bulk import, STK push pending callback). |
| `204 No Content` | Delete/soft-delete or write with no body (rare; prefer `200` + envelope). |
| `206 Partial Content` | Range download of large documents. |
| `301`/`308` | Endpoint moved (versioning). |
| `304 Not Modified` | `If-None-Match` hit. |
| `400 Bad Request` | Malformed JSON / unparseable. |
| `401 Unauthorized` | Auth missing/invalid/expired. |
| `402 Payment Required` | Account/billing block (e.g., portal feature requires settled invoice) — reserved. |
| `403 Forbidden` | Permission or branch-access denied. |
| `404 Not Found` | Resource absent or hidden by branch scope. |
| `405 Method Not Allowed` | Wrong verb. |
| `409 Conflict` | Idempotency reuse, stale resource, duplicate, state conflict. |
| `410 Gone` | Sunset endpoint. |
| `412 Precondition Failed` | `If-Match` mismatch. |
| `415 Unsupported Media Type` | Bad `Content-Type` / upload type. |
| `422 Unprocessable Entity` | Validation / business-rule violation. |
| `423 Locked` | Record locked (signed-off encounter, finalized invoice). |
| `429 Too Many Requests` | Throttled. `Retry-After` set. |
| `500 Internal Server Error` | Unhandled. Generic problem, `request_id` for support. |
| `502/503/504` | Upstream (Daraja/SHA/SMS) failure or maintenance. |

---

## 3. Error Code Catalog

`code` values are stable identifiers. Grouped by domain.

| `code` | HTTP | Meaning |
|---|---|---|
| **Generic** | | |
| `VALIDATION_ERROR` | 422 | FormRequest validation failed (`errors` populated). |
| `MALFORMED_REQUEST` | 400 | JSON unparseable / wrong shape. |
| `UNAUTHENTICATED` | 401 | No/invalid token. |
| `TOKEN_EXPIRED` | 401 | Access token expired (refresh needed). |
| `FORBIDDEN` | 403 | Missing permission. |
| `RESOURCE_NOT_FOUND` | 404 | Not found / scoped out. |
| `METHOD_NOT_ALLOWED` | 405 | Verb not supported. |
| `CONFLICT` | 409 | Generic state conflict. |
| `RESOURCE_LOCKED` | 423 | Immutable/finalized record. |
| `RATE_LIMITED` | 429 | Throttle exceeded. |
| `SERVER_ERROR` | 500 | Unhandled. |
| `SERVICE_UNAVAILABLE` | 503 | Maintenance/upstream down. |
| **Auth / MFA** | | |
| `INVALID_CREDENTIALS` | 422 | Bad email/password. |
| `ACCOUNT_LOCKED` | 423 | Too many failed attempts (lockout). |
| `PASSWORD_EXPIRED` | 403 | Password past expiry; must reset. |
| `MFA_REQUIRED` | 401 | MFA challenge outstanding. |
| `MFA_INVALID_CODE` | 422 | Wrong TOTP/OTP code. |
| `OTP_EXPIRED` | 422 | OTP window elapsed. |
| `OTP_THROTTLED` | 429 | Too many OTP requests. |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token revoked/expired. |
| `DEVICE_NOT_TRUSTED` | 403 | New device requires verification. |
| **Tenancy** | | |
| `BRANCH_REQUIRED` | 422 | No branch context resolvable. |
| `BRANCH_ACCESS_DENIED` | 403 | User lacks access to branch. |
| `BRANCH_INACTIVE` | 422 | Branch disabled. |
| **Idempotency / concurrency** | | |
| `IDEMPOTENCY_KEY_REQUIRED` | 422 | Missing on required endpoint. |
| `IDEMPOTENCY_KEY_REUSE` | 409 | Same key, different payload. |
| `STALE_RESOURCE` | 409 | `version` mismatch. |
| `PRECONDITION_FAILED` | 412 | `If-Match` failed. |
| **Query** | | |
| `INVALID_FILTER` | 422 | Unknown/forbidden filter. |
| `INVALID_SORT` | 422 | Unknown/forbidden sort column. |
| `INVALID_INCLUDE` | 422 | Unknown/forbidden relation. |
| **Patients** | | |
| `PATIENT_DUPLICATE` | 409 | Matches existing (National ID/phone) per dedupe rule. |
| `PATIENT_MERGED` | 410 | Record merged into another. |
| **Appointments / Queue** | | |
| `SLOT_UNAVAILABLE` | 409 | Time slot taken/blocked. |
| `SCHEDULE_CONFLICT` | 422 | Overlaps provider schedule. |
| `QUEUE_TICKET_INVALID_STATE` | 422 | Illegal queue transition. |
| **Clinical** | | |
| `ENCOUNTER_SIGNED_OFF` | 423 | Cannot edit signed encounter. |
| `TRIAGE_ALREADY_COMPLETED` | 409 | Re-triage not allowed without escalation. |
| **Prescriptions / Pharmacy** | | |
| `DRUG_INTERACTION_BLOCK` | 422 | Hard interaction; prescriber override required. |
| `INSUFFICIENT_STOCK` | 422 | Dispense exceeds on-hand. |
| `ALREADY_DISPENSED` | 409 | Prescription line already fulfilled. |
| **Lab / Radiology** | | |
| `SAMPLE_ALREADY_COLLECTED` | 409 | Duplicate collection. |
| `RESULT_NOT_READY` | 422 | Approve before entry. |
| `RESULT_ALREADY_APPROVED` | 423 | Locked after approval. |
| **Billing / Payments** | | |
| `INVOICE_ALREADY_PAID` | 409 | Payment exceeds balance. |
| `INVOICE_FINALIZED` | 423 | Posted invoice immutable. |
| `PAYMENT_FAILED` | 422 | Gateway declined. |
| `STK_PUSH_FAILED` | 502 | Daraja initiation error. |
| `REFUND_EXCEEDS_PAID` | 422 | Refund > captured amount. |
| `CALLBACK_SIGNATURE_INVALID` | 401 | Webhook signature/IP check failed. |
| **SHA / Insurance** | | |
| `CLAIM_INVALID_STATE` | 422 | Illegal claim transition. |
| `PREAUTH_REQUIRED` | 422 | Service needs pre-authorization. |
| `SHA_UPSTREAM_ERROR` | 502 | SHA API failure. |
| **Inpatient** | | |
| `BED_OCCUPIED` | 409 | Bed not available. |
| `PATIENT_ALREADY_ADMITTED` | 409 | Active admission exists. |
| `NOT_ADMITTED` | 422 | Discharge/chart on non-admitted patient. |
| **Inventory** | | |
| `PO_INVALID_STATE` | 422 | Illegal PO transition. |
| `GRN_QTY_EXCEEDS_PO` | 422 | Received > ordered. |

---

## 4. Endpoint Reference

> **Permission** column uses `{module}.{action}` slugs (Foundation §5, full matrix in `08-rbac-matrix.md`). All endpoints are branch-scoped unless marked **(global)** or **(self)**. Validation rules are stated as **Laravel rule** → with the **Zod** mirror noted where it differs. All write endpoints have a FormRequest; all responses pass through a Resource.

---

### 4.1 Auth

Module: `Auth`. Base: `/auth`. Throttle group: `auth` (§6).

#### `POST /auth/login`
- **Description:** Authenticate with email + password. Returns token, or MFA/OTP challenge for gated roles.
- **Permission:** public.
- **Request DTO `LoginRequest`:**

| Field | Type | Validation (Laravel → Zod) |
|---|---|---|
| `email` | string | `required\|email\|max:191` → `z.string().email()` |
| `password` | string | `required\|string\|min:8` → `z.string().min(8)` |
| `device_name` | string | `required\|string\|max:120` (token label) |
| `remember` | bool | `sometimes\|boolean` |

```json
{ "email": "dr.amina@afyahms.co.ke", "password": "•••••••••", "device_name": "Chrome on Windows" }
```

- **Response 200 (no MFA):**

```json
{
  "data": {
    "type": "auth.session",
    "token": "12|aBcD...Sanctum",
    "token_type": "Bearer",
    "expires_at": "2026-06-22T10:14:03Z",
    "refresh_token": "rft_9f8e...",
    "user": {
      "id": 88, "name": "Dr. Amina Yusuf", "email": "dr.amina@afyahms.co.ke",
      "roles": ["doctor"], "permissions_version": 14,
      "home_branch_id": 3, "active_branch_id": 3,
      "accessible_branches": [{ "id": 3, "code": "NRB", "name": "Nairobi CBD" }],
      "mfa_enabled": true
    }
  },
  "meta": { "request_id": "req_01J...", "timestamp": "2026-06-22T09:14:03Z" }
}
```

- **Response 200 (MFA-gated role):**

```json
{ "data": { "type": "auth.mfa_challenge", "mfa_required": true, "mfa_token": "mfa_3b2c...", "methods": ["totp"], "expires_in": 300 } }
```

- **Status:** `200`; `422 INVALID_CREDENTIALS`; `423 ACCOUNT_LOCKED`; `403 PASSWORD_EXPIRED`; `429 RATE_LIMITED`.

#### `POST /auth/mfa/verify`
- **Description:** Complete MFA (TOTP) after a challenge; issues the full session.
- **Permission:** requires valid `mfa_token`.
- **Request `MfaVerifyRequest`:**

| Field | Type | Validation |
|---|---|---|
| `mfa_token` | string | `required\|string` |
| `code` | string | `required\|digits:6` → `z.string().regex(/^\d{6}$/)` |

- **Response 200:** identical `auth.session` payload as login.
- **Status:** `200`; `422 MFA_INVALID_CODE`; `401 MFA_REQUIRED` (token expired); `429`.

#### `POST /auth/otp/request`
- **Description:** Send a one-time code via SMS/email (used for patient portal login, new-device verification, password reset). Provider abstracted (Foundation §8).
- **Permission:** public.
- **Request `OtpRequestRequest`:**

| Field | Type | Validation |
|---|---|---|
| `channel` | enum | `required\|in:sms,email` |
| `identifier` | string | `required\|string` (MSISDN `2547XXXXXXXX` or email) |
| `purpose` | enum | `required\|in:login,verify_device,reset_password` |

- **Response 202:** `{ "data": { "type": "auth.otp", "sent": true, "channel": "sms", "expires_in": 300, "resend_after": 60 } }`
- **Status:** `202`; `422 VALIDATION_ERROR`; `429 OTP_THROTTLED`.

#### `POST /auth/otp/verify`
- **Description:** Verify OTP; for `login` purpose returns session, for `verify_device` trusts the device, for `reset_password` returns a reset token.
- **Request `OtpVerifyRequest`:** `identifier` (req), `code` (`required\|digits:6`), `purpose` (req enum).
- **Response 200:** `auth.session` (login) **or** `{ "data": { "reset_token": "rst_…", "expires_in": 600 } }`.
- **Status:** `200`; `422 MFA_INVALID_CODE` / `OTP_EXPIRED`; `429`.

#### `POST /auth/refresh`
- **Description:** Exchange a rotating refresh token for a new access token. Old refresh token invalidated.
- **Request:** `{ "refresh_token": "rft_…" }` (`required\|string`).
- **Response 200:** `{ "data": { "token": "…", "expires_at": "…", "refresh_token": "rft_new…" } }`
- **Status:** `200`; `401 REFRESH_TOKEN_INVALID`.

#### `POST /auth/logout`
- **Description:** Revoke the current access token.
- **Permission:** authenticated. **Response 200:** `{ "data": { "logged_out": true } }`. **Status:** `200`; `401`.

#### `POST /auth/logout-all`
- **Description:** Revoke all tokens/devices for the user. **Response 200** `{ "data": { "revoked": 4 } }`.

#### `GET /auth/me` (self)
- **Description:** Current user profile, roles, permissions, branches, MFA status.
- **Response 200:**

```json
{
  "data": {
    "type": "user", "id": 88, "name": "Dr. Amina Yusuf",
    "email": "dr.amina@afyahms.co.ke", "phone": "254712345678",
    "roles": ["doctor"], "permissions": ["encounters.create", "prescriptions.create", "..."],
    "permissions_version": 14, "active_branch_id": 3, "mfa_enabled": true,
    "password_expires_at": "2026-09-01T00:00:00Z", "last_login_at": "2026-06-22T06:01:00Z"
  }
}
```

#### `GET /auth/login-history` (self)
- **Description:** Paginated login history (IP, device, location, result).
- **Permission:** self; admins use `users/{id}/login-history` with `users.view`.
- **Filters:** `result` (`success,failed`), `created_between`. **Sort:** `-created_at` (default).
- **Response 200 (collection):**

```json
{ "data": [ { "id": 9921, "ip": "197.232.x.x", "device": "Chrome/Windows", "city": "Nairobi", "result": "success", "created_at": "2026-06-22T06:01:00Z" } ],
  "meta": { "pagination": { "mode": "cursor", "per_page": 25, "next_cursor": "…" } } }
```

#### `GET /auth/devices` (self)
- **Description:** List active sessions/devices (token id, name, last_used, current flag).
- **Response 200:** array of `{ "id": 12, "device_name": "Chrome on Windows", "last_used_at": "…", "ip": "…", "trusted": true, "current": true }`.

#### `DELETE /auth/devices/{tokenId}` (self)
- **Description:** Revoke a specific device/token. **Response 200** `{ "data": { "revoked": true } }`. `404 RESOURCE_NOT_FOUND`.

#### `POST /auth/mfa/enroll` · `POST /auth/mfa/confirm` · `DELETE /auth/mfa`
- **Enroll:** returns TOTP secret + `otpauth://` URI + QR (base64). **Confirm:** body `{ "code": "123456" }` activates and returns 10 recovery codes. **Delete:** disables MFA (blocked for gated roles → `422`).

---

### 4.2 Branches

Module: `Tenancy`. Base: `/branches`.

#### `GET /branches`
- **Description:** Branches the user can access (admins with `branch.view-all` see all).
- **Permission:** authenticated. **Filters:** `is_active`. **Sort:** `code`.
- **Response 200:** `[ { "id": 3, "code": "NRB", "name": "Nairobi CBD", "phone": "+254…", "timezone": "Africa/Nairobi", "is_active": true } ]`.

#### `POST /branches`
- **Permission:** `branches.create` (hospital-admin). **Request `StoreBranchRequest`:**

| Field | Type | Validation |
|---|---|---|
| `code` | string | `required\|alpha\|size:3\|unique:branches,code` → `z.string().length(3)` |
| `name` | string | `required\|string\|max:120` |
| `address` | string | `required\|string\|max:255` |
| `phone` | string | `required\|regex:/^\+?254\d{9}$/` |
| `timezone` | string | `required\|timezone` |

- **Status:** `201`; `422`; `403`.

#### `GET /branches/{id}` · `PUT /branches/{id}` · `DELETE /branches/{id}`
- View `branches.view`; update `branches.update`; delete = soft-disable, `branches.delete`. Deactivating a branch with open encounters → `422 BRANCH_INACTIVE` guard.

#### `POST /branches/switch`
- **Description:** Set the active branch for the session; rewrites the token claim `active_branch_id`.
- **Permission:** authenticated (must have access). **Request:** `{ "branch_id": 5 }` (`required\|exists:branches,id`).
- **Response 200:** `{ "data": { "active_branch_id": 5, "branch": { "id": 5, "code": "MSA", "name": "Mombasa" } } }`.
- **Status:** `200`; `403 BRANCH_ACCESS_DENIED`; `422 BRANCH_INACTIVE`.

---

### 4.3 Patients

Module: `Patients`. Base: `/patients`. Resources exposed by **UUID** `public_id`.

#### `GET /patients`
- **Description:** Paginated patient list within branch.
- **Permission:** `patients.view`. **Filters:** `gender`, `blood_group`, `is_active`, `created_between`, `search` (name, patient_number, phone, national_id). **Sort:** `-created_at` (default), `last_name`. **Includes:** `insurance`, `nextOfKin`, `allergies`.
- **Response 200 (collection item):**

```json
{
  "id": "9b1c…uuid", "type": "patient",
  "patient_number": "PAT-2026-000042", "full_name": "John Otieno",
  "gender": "male", "date_of_birth": "1990-04-11", "age": 36,
  "phone": "254712000111", "national_id": "•••••678",
  "blood_group": "O+", "branch_id": 3, "is_active": true,
  "created_at": "2026-01-10T08:00:00Z"
}
```

#### `POST /patients`
- **Description:** Register a patient. Patient number generated by `SequenceService`.
- **Permission:** `patients.create` (receptionist, records-officer). **Idempotency-Key** recommended.
- **Request `StorePatientRequest`:**

| Field | Type | Validation (Laravel → Zod) |
|---|---|---|
| `first_name` | string | `required\|string\|max:80` |
| `last_name` | string | `required\|string\|max:80` |
| `gender` | enum | `required\|in:male,female,other` |
| `date_of_birth` | date | `required\|date\|before:today` → `z.coerce.date().max(new Date())` |
| `phone` | string | `required\|regex:/^254\d{9}$/` |
| `national_id` | string | `nullable\|string\|max:20\|unique:patients,national_id` (encrypted cast) |
| `email` | string | `nullable\|email\|max:191` |
| `blood_group` | enum | `nullable\|in:A+,A-,B+,B-,AB+,AB-,O+,O-` |
| `county` | string | `nullable\|string\|max:80` |
| `address` | string | `nullable\|string\|max:255` |
| `dedupe_override` | bool | `sometimes\|boolean` (records-officer only; bypass soft duplicate) |

- **Dedupe:** fuzzy match on national_id/phone/name+dob → `409 PATIENT_DUPLICATE` with `meta.candidates[]` unless `dedupe_override:true`.
- **Response 201:** full patient resource; `Location: /api/v1/patients/{uuid}`.
- **Status:** `201`; `409 PATIENT_DUPLICATE`; `422`.

#### `GET /patients/{uuid}`
- **Permission:** `patients.view`. PHI access writes an `audit_logs` record. **Response 200:** full resource with optional includes.
- **Status:** `200`; `404`; `410 PATIENT_MERGED` (with `meta.merged_into`).

#### `PUT /patients/{uuid}` · `PATCH /patients/{uuid}`
- **Permission:** `patients.update`. Same fields as store (all `sometimes`). `If-Match` ETag supported. **Status:** `200`; `412`; `422`.

#### `DELETE /patients/{uuid}`
- **Permission:** `patients.delete` (records-officer). **Soft-delete only** (clinical retention ≥10y, Foundation §11). **Status:** `200`/`204`.

#### `GET /patients/search`
- **Description:** Type-ahead search (debounced). `?q=oti&limit=10`. Matches patient_number, name, phone, national_id.
- **Permission:** `patients.view`. **Response 200:** lightweight `[ { id, patient_number, full_name, phone, dob } ]`.

#### `POST /patients/merge`
- **Permission:** `patients.merge` (records-officer). **Request:** `{ "source_uuid": "...", "target_uuid": "...", "reason": "..." }`. Source → `410`. **Status:** `200`.

#### Next-of-Kin — `/patients/{uuid}/next-of-kin`
- `GET` (`patients.view`) list; `POST` (`patients.update`) create; `PUT /{nokId}`; `DELETE /{nokId}`.
- **Request `StoreNextOfKinRequest`:** `name` (`required\|max:120`), `relationship` (`required\|in:spouse,parent,child,sibling,guardian,other`), `phone` (`required\|regex:/^254\d{9}$/`), `is_primary` (`boolean`).

#### Insurance — `/patients/{uuid}/insurance`
- `GET` / `POST` / `PUT /{id}` / `DELETE /{id}`. Permission `patients.update`.
- **Request `StorePatientInsuranceRequest`:**

| Field | Type | Validation |
|---|---|---|
| `scheme` | enum | `required\|in:sha,private` |
| `insurer_name` | string | `required_if:scheme,private\|max:120` |
| `member_number` | string | `required\|string\|max:60` |
| `sha_id` | string | `required_if:scheme,sha\|string\|max:40` |
| `valid_from` | date | `required\|date` |
| `valid_to` | date | `nullable\|date\|after:valid_from` |
| `is_primary` | bool | `boolean` |

#### Allergies — `/patients/{uuid}/allergies`
- `GET` / `POST` / `DELETE /{id}`. Permission view `patients.view`, write `patients.update` (clinical roles). Feeds the ClinicalAlerts interaction engine.
- **Request `StoreAllergyRequest`:** `allergen` (`required\|max:120`), `type` (`required\|in:drug,food,environmental,other`), `reaction` (`nullable\|max:255`), `severity` (`required\|in:mild,moderate,severe,anaphylaxis`), `drug_code` (`nullable\|string` — RxNorm/local code when drug).

#### Documents — `/patients/{uuid}/documents`
- **`GET`** (`patients.documents.view`): list metadata `[ { id, type, filename, mime, size, uploaded_by, created_at } ]`.
- **`POST`** (`patients.documents.upload`): **multipart/form-data**.

| Field | Type | Validation |
|---|---|---|
| `file` | file | `required\|file\|mimes:pdf,jpg,jpeg,png\|max:10240` (10MB) |
| `type` | enum | `required\|in:id_card,referral,consent,insurance_card,external_report,other` |
| `description` | string | `nullable\|max:255` |

  - Stored via `DocumentService` on the configured disk (Foundation §7). **Response 201:** `{ "id": 551, "type": "consent", "filename": "consent.pdf", "size": 84221, "checksum": "sha256:…" }`. `415` on bad type.
- **`GET /patients/{uuid}/documents/{docId}/signed-url`** (`patients.documents.view`): returns a **time-limited signed URL** (no public buckets).
  - **Response 200:** `{ "data": { "url": "https://…?signature=…&expires=…", "expires_at": "2026-06-22T09:24:03Z", "ttl": 600 } }`.
- **`DELETE /patients/{uuid}/documents/{docId}`** (`patients.documents.delete`): soft-delete.

---

### 4.4 Appointments

Module: `Appointments`. Base: `/appointments`.

#### `GET /appointments`
- **Permission:** `appointments.view`. **Filters:** `provider_id`, `patient_uuid`, `status` (`scheduled,confirmed,checked_in,completed,cancelled,no_show`), `date`, `date_between`, `department_id`. **Sort:** `start_at`. **Includes:** `patient`, `provider`.
- **Response item:**

```json
{ "id": 7741, "patient": { "id": "uuid", "full_name": "John Otieno" }, "provider_id": 88,
  "department_id": 4, "start_at": "2026-06-23T08:30:00Z", "end_at": "2026-06-23T08:50:00Z",
  "status": "scheduled", "type": "consultation", "is_follow_up": false, "branch_id": 3 }
```

#### `GET /appointments/availability`
- **Description:** Open slots for a provider/department on a date, respecting working hours, existing bookings, and leave.
- **Permission:** `appointments.view`. **Query:** `provider_id` (req), `date` (req `date`), `duration` (min, default 20), `department_id`.
- **Response 200:** `{ "data": { "date": "2026-06-23", "provider_id": 88, "slots": [ { "start_at": "...", "end_at": "...", "available": true } ] } }`.

#### `POST /appointments`
- **Permission:** `appointments.create`. **Idempotency-Key** recommended.
- **Request `StoreAppointmentRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `provider_id` | int | `required\|exists:users,id` |
| `department_id` | int | `required\|exists:departments,id` |
| `start_at` | datetime | `required\|date\|after:now` |
| `duration` | int | `required\|integer\|between:5,240` (minutes) |
| `type` | enum | `required\|in:consultation,review,procedure,vaccination` |
| `reason` | string | `nullable\|max:255` |
| `notify_patient` | bool | `boolean` (SMS/email reminder) |

- **Conflict checks:** overlapping booking → `409 SLOT_UNAVAILABLE`; outside schedule → `422 SCHEDULE_CONFLICT`.
- **Status:** `201`; `409`; `422`.

#### `GET /appointments/{id}` · `PUT /appointments/{id}` · `DELETE /appointments/{id}`
- Update `appointments.update`; cancel via `DELETE` (`appointments.cancel`) sets `status=cancelled` with `cancellation_reason`.

#### State transitions
- `POST /appointments/{id}/confirm` (`appointments.update`).
- `POST /appointments/{id}/check-in` (`appointments.checkin`) — links to Queue, issues a reception ticket. Response includes `queue_ticket`.
- `POST /appointments/{id}/no-show` (`appointments.update`).
- `POST /appointments/{id}/reschedule` — body `{ start_at, duration }`, same conflict checks.

#### `POST /appointments/recurring`
- **Description:** Create a recurring series (e.g., chronic-care reviews).
- **Permission:** `appointments.create`. **Request `StoreRecurringAppointmentRequest`:** base fields plus:

| Field | Type | Validation |
|---|---|---|
| `frequency` | enum | `required\|in:daily,weekly,biweekly,monthly` |
| `interval` | int | `required\|integer\|min:1` |
| `count` | int | `required_without:until\|integer\|between:1,52` |
| `until` | date | `required_without:count\|date\|after:start_at` |
| `weekdays` | int[] | `required_if:frequency,weekly\|array` (0–6) |

- **Response 201:** `{ "data": { "series_id": "ser_…", "occurrences": [ { "id": …, "start_at": "…" } ] } }`. Slot conflicts returned in `meta.skipped[]`.

#### `POST /appointments/{id}/follow-up`
- **Description:** Create a follow-up linked to a completed encounter.
- **Permission:** `appointments.create` (doctor). **Request:** `{ "interval_days": 14, "type": "review", "reason": "BP recheck" }`. Auto-resolves first available slot for the same provider; returns the created appointment.

---

### 4.5 Queue

Module: `Queue`. Base: `/queue`. Real-time via Redis + Broadcasting (Foundation §13); REST endpoints below mutate state and broadcast `QueueUpdated`.

#### `POST /queue/tickets`
- **Description:** Issue a queue ticket at a station (ticket no. `{DEPT}-{NNN}`, daily reset).
- **Permission:** `queue.issue`. **Request `IssueTicketRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `station` | enum | `required\|in:reception,triage,doctor,lab,pharmacy,billing` |
| `priority` | enum | `nullable\|in:normal,priority,emergency` (default normal) |
| `appointment_id` | int | `nullable\|exists:appointments,id` |

- **Response 201:** `{ "data": { "id": 9001, "ticket_number": "TRI-014", "station": "triage", "priority": "normal", "position": 6, "estimated_wait_min": 24, "status": "waiting" } }`.

#### `GET /queue/board`
- **Description:** Current board state for a station (now-serving + waiting list), used by display screens.
- **Permission:** `queue.view`. **Query:** `station` (req), optional `counter`. (Live updates via WebSocket channel `branch.{id}.queue.{station}`.)
- **Response 200:**

```json
{ "data": {
  "station": "doctor", "now_serving": { "ticket_number": "DOC-007", "counter": 2 },
  "waiting": [ { "ticket_number": "DOC-008", "priority": "emergency", "position": 1, "patient_initials": "J.O.", "waited_min": 3 } ],
  "stats": { "waiting_count": 5, "avg_wait_min": 18, "served_today": 41 }
} }
```

#### `POST /queue/tickets/{id}/advance`
- **Description:** Advance ticket through the pipeline (`Reception → Triage → Doctor → Lab → Pharmacy → Billing`), or move to next state (`call`, `serve`, `complete`, `recall`, `skip`).
- **Permission:** `queue.advance`. **Request:** `{ "action": "call|serve|complete|recall|skip|transfer", "counter": 2, "to_station": "lab" }` (`to_station` required when `transfer`).
- **Status:** `200`; `422 QUEUE_TICKET_INVALID_STATE`.

#### `PATCH /queue/tickets/{id}/priority`
- **Description:** Re-prioritize (e.g., triage escalation, emergency bypass).
- **Permission:** `queue.prioritize` (nurse, triage). **Request:** `{ "priority": "emergency", "reason": "MTS Red" }`. Broadcasts reorder.

#### `GET /queue/tickets/{id}` · `DELETE /queue/tickets/{id}`
- View status; delete = cancel ticket (`queue.advance`), reason required.

---

### 4.6 Triage

Module: `Triage`. Base: `/triage`. Manchester Triage System (Foundation §12).

#### `POST /triage`
- **Description:** Record vitals + MTS category; drives queue priority & emergency bypass.
- **Permission:** `triage.create` (nurse). **Request `StoreTriageRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `queue_ticket_id` | int | `nullable\|exists:queue_tickets,id` |
| `mts_category` | enum | `required\|in:red,orange,yellow,green,blue` |
| `chief_complaint` | string | `required\|string\|max:255` |
| `temperature_c` | decimal | `nullable\|numeric\|between:30,45` |
| `pulse_bpm` | int | `nullable\|integer\|between:20,250` |
| `resp_rate` | int | `nullable\|integer\|between:5,80` |
| `bp_systolic` | int | `nullable\|integer\|between:50,260` |
| `bp_diastolic` | int | `nullable\|integer\|between:30,180` |
| `spo2` | int | `nullable\|integer\|between:50,100` |
| `weight_kg` | decimal | `nullable\|numeric\|between:0.5,400` |
| `height_cm` | decimal | `nullable\|numeric\|between:20,260` |
| `pain_score` | int | `nullable\|integer\|between:0,10` |

- **Response 201:** triage resource incl. derived `bmi`, MTS `target_time_min` (red 0, orange 10, yellow 60, green 120, blue 240), and updated queue priority.
- **Status:** `201`; `409 TRIAGE_ALREADY_COMPLETED`; `422`.

#### `GET /triage/{id}` · `GET /patients/{uuid}/triage`
- History list/detail. Permission `triage.view`. Re-triage requires `triage.escalate`.

---

### 4.7 Encounters / SOAP / Diagnoses

Module: `EMR`. Base: `/encounters`. Signed encounters are immutable (`423`).

#### `POST /encounters`
- **Description:** Open a clinical encounter (visit) for a patient.
- **Permission:** `encounters.create` (doctor, nurse). **Request `StoreEncounterRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `type` | enum | `required\|in:outpatient,inpatient,emergency,follow_up,teleconsult` |
| `appointment_id` | int | `nullable\|exists:appointments,id` |
| `triage_id` | int | `nullable\|exists:triages,id` |
| `chief_complaint` | string | `required\|max:255` |

- **Response 201:** `{ "id": 33120, "encounter_number": "ENC-…", "status": "open", "version": 1, "patient": {…}, "provider_id": 88, "opened_at": "…" }`.

#### `GET /encounters` · `GET /encounters/{id}`
- `encounters.view`. Filters `patient_uuid`, `provider_id`, `status` (`open,signed,amended`), `type`, `date_between`. Includes `soap`, `diagnoses`, `prescriptions`, `orders`.

#### `PUT /encounters/{id}/soap`
- **Description:** Upsert the SOAP note (Subjective/Objective/Assessment/Plan).
- **Permission:** `encounters.update`. **Optimistic lock** via `version`. **Request `UpsertSoapRequest`:**

| Field | Type | Validation |
|---|---|---|
| `subjective` | string | `nullable\|string\|max:10000` |
| `objective` | string | `nullable\|string\|max:10000` |
| `assessment` | string | `nullable\|string\|max:10000` |
| `plan` | string | `nullable\|string\|max:10000` |
| `version` | int | `required\|integer` (must equal current) |

- **Status:** `200`; `409 STALE_RESOURCE`; `423 ENCOUNTER_SIGNED_OFF`.

#### Diagnoses — `/encounters/{id}/diagnoses`
- `GET` / `POST` / `DELETE /{diagId}`. Permission `diagnoses.create` (doctor).
- **Request `StoreDiagnosisRequest`:**

| Field | Type | Validation |
|---|---|---|
| `icd10_code` | string | `required\|exists:icd10_codes,code` (global ref data) |
| `type` | enum | `required\|in:primary,secondary,provisional,differential` |
| `notes` | string | `nullable\|max:500` |
| `is_chronic` | bool | `boolean` |

- Only one `primary` per encounter → `422`.

#### `POST /encounters/{id}/sign`
- **Description:** Sign off the encounter; locks SOAP & diagnoses. **Permission:** `encounters.sign` (doctor). **Request:** `{ "version": 4, "attestation": true }`. **Status:** `200`; `423`; `409`.

#### `POST /encounters/{id}/amend`
- **Description:** Append a dated amendment to a signed encounter (audit-tracked; original preserved). **Permission:** `encounters.amend`. **Request:** `{ "reason": "...", "addendum": "..." }`.

#### `GET /encounters/{id}/pdf`
- Clinical summary PDF (Blade→PDF template). Returns signed URL or `application/pdf`. Permission `encounters.view`.

---

### 4.8 Prescriptions

Module: `Pharmacy`/`EMR`. Base: `/prescriptions`. RX no. `RX-{BRANCH}-YYYY-000001` (QR-coded).

#### `POST /prescriptions`
- **Description:** Create a prescription tied to an encounter; runs interaction check before commit.
- **Permission:** `prescriptions.create` (doctor). **Request `StorePrescriptionRequest`:**

| Field | Type | Validation |
|---|---|---|
| `encounter_id` | int | `required\|exists:encounters,id` |
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `items` | array | `required\|array\|min:1` |
| `items.*.drug_id` | int | `required\|exists:drugs,id` (global catalog) |
| `items.*.dose` | string | `required\|max:60` (e.g., "500 mg") |
| `items.*.route` | enum | `required\|in:oral,iv,im,sc,topical,inhaled,rectal,ophthalmic` |
| `items.*.frequency` | string | `required\|max:40` (e.g., "BD", "TDS") |
| `items.*.duration_days` | int | `required\|integer\|between:1,365` |
| `items.*.quantity` | int | `required\|integer\|min:1` |
| `items.*.instructions` | string | `nullable\|max:255` |
| `interaction_override` | bool | `sometimes\|boolean` (records prescriber override) |
| `override_reason` | string | `required_if:interaction_override,true\|max:255` |

- **Interaction check:** drug-drug + drug-allergy (patient allergies §4.3). **Hard** interaction without override → `422 DRUG_INTERACTION_BLOCK` with `meta.interactions[]`. **Soft** warnings returned in `meta.warnings[]` on success.
- **Response 201:** prescription resource with `rx_number`, per-item status `prescribed`, `qr_url`.

#### `POST /prescriptions/interaction-check`
- **Description:** Pre-flight check without persisting (used live as the doctor types).
- **Permission:** `prescriptions.create`. **Request:** `{ "patient_uuid": "...", "drug_ids": [12, 88, 301] }`.
- **Response 200:** `{ "data": { "interactions": [ { "severity": "major", "pair": ["Warfarin","Aspirin"], "effect": "bleeding risk", "management": "..." } ], "allergy_conflicts": [...] } }`.

#### `GET /prescriptions` · `GET /prescriptions/{id}`
- `prescriptions.view`. Filters `patient_uuid`, `encounter_id`, `status` (`prescribed,partially_dispensed,dispensed,cancelled`).

#### `POST /prescriptions/{id}/dispense`
- **Description:** Pharmacist dispenses items; decrements pharmacy stock (FEFO batch). **Idempotency-Key required.**
- **Permission:** `prescriptions.dispense` (pharmacist). **Request `DispenseRequest`:**

| Field | Type | Validation |
|---|---|---|
| `items` | array | `required\|array\|min:1` |
| `items.*.prescription_item_id` | int | `required\|exists:prescription_items,id` |
| `items.*.quantity` | int | `required\|integer\|min:1` |
| `items.*.batch_id` | int | `required\|exists:stock_batches,id` |
| `counsel_given` | bool | `boolean` |

- **Status:** `200`; `422 INSUFFICIENT_STOCK`; `409 ALREADY_DISPENSED`. Response returns dispensed lines + remaining qty + stock movements.

#### `POST /prescriptions/{id}/cancel`
- `prescriptions.cancel` (doctor/pharmacist), reason required. Blocked if fully dispensed.

#### `GET /prescriptions/{id}/pdf`
- QR-coded prescription PDF. Returns signed URL / `application/pdf`. Permission `prescriptions.view`.

---

### 4.9 Pharmacy (Stock)

Module: `Pharmacy`. Base: `/pharmacy`. Branch-scoped stock; drug master is global.

#### `GET /pharmacy/stock`
- **Description:** On-hand stock by drug with batches & expiry.
- **Permission:** `pharmacy.view-stock`. **Filters:** `drug_id`, `low_stock` (bool, below reorder level), `expiring_before` (date), `search`. **Sort:** `drug_name`, `expiry_date`.
- **Response item:** `{ "drug_id": 12, "drug_name": "Amoxicillin 500mg", "on_hand": 240, "reorder_level": 100, "batches": [ { "batch_id": 77, "lot_no": "AMX-2407", "qty": 120, "expiry_date": "2027-03-01" } ] }`.

#### `GET /pharmacy/stock/{drugId}/batches`
- Batch-level detail (FEFO order). `pharmacy.view-stock`.

#### `POST /pharmacy/stock/adjust`
- **Description:** Manual adjustment (wastage, count correction, expiry write-off).
- **Permission:** `pharmacy.manage-stock` (pharmacist). **Request `StockAdjustRequest`:**

| Field | Type | Validation |
|---|---|---|
| `drug_id` | int | `required\|exists:drugs,id` |
| `batch_id` | int | `required\|exists:stock_batches,id` |
| `type` | enum | `required\|in:wastage,correction,expiry,return` |
| `quantity` | int | `required\|integer\|not_in:0` (signed) |
| `reason` | string | `required\|max:255` |

- **Status:** `200`; `422 INSUFFICIENT_STOCK`.

#### `GET /pharmacy/movements`
- Stock ledger (dispense, GRN, adjustment, transfer). Filters `drug_id`, `type`, `date_between`. `pharmacy.view-stock`.

#### `POST /pharmacy/transfers`
- **Description:** Inter-branch stock transfer (creates out/in movements). **Permission:** `pharmacy.transfer`. **Request:** `{ "to_branch_id", "drug_id", "batch_id", "quantity", "notes" }`. **Idempotency-Key** required.

---

### 4.10 Laboratory

Module: `Laboratory`. Base: `/lab`. Sample IDs `LAB-{BRANCH}-YYMMDD-0001` (barcoded).

#### `POST /lab/orders`
- **Description:** Order lab tests from an encounter.
- **Permission:** `lab.order` (doctor). **Request `StoreLabOrderRequest`:**

| Field | Type | Validation |
|---|---|---|
| `encounter_id` | int | `required\|exists:encounters,id` |
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `tests` | array | `required\|array\|min:1` |
| `tests.*.test_id` | int | `required\|exists:lab_tests,id` |
| `priority` | enum | `required\|in:routine,urgent,stat` |
| `clinical_notes` | string | `nullable\|max:500` |

- **Response 201:** order with `order_number`, per-test status `ordered`, generated billing line.

#### `GET /lab/orders` · `GET /lab/orders/{id}`
- `lab.view`. Filters `status` (`ordered,collected,in_process,resulted,approved,cancelled`), `priority`, `patient_uuid`, `date_between`.

#### `POST /lab/orders/{id}/sample`
- **Description:** Collect/register a sample; mints barcode `LAB-...`. **Permission:** `lab.accession` (lab-technician, nurse). **Request `CollectSampleRequest`:**

| Field | Type | Validation |
|---|---|---|
| `tests` | int[] | `required\|array` (lab_order_test ids) |
| `specimen_type` | enum | `required\|in:blood,urine,stool,swab,csf,tissue,other` |
| `container` | string | `nullable\|max:60` |
| `collected_at` | datetime | `required\|date\|before_or_equal:now` |

- **Status:** `201`; `409 SAMPLE_ALREADY_COLLECTED`.

#### `POST /lab/orders/{id}/results`
- **Description:** Enter results (per analyte) — sets status `resulted`, awaits approval.
- **Permission:** `lab.enter-result` (lab-technician). **Request `EnterResultRequest`:**

| Field | Type | Validation |
|---|---|---|
| `results` | array | `required\|array\|min:1` |
| `results.*.test_id` | int | `required\|exists:lab_order_tests,id` |
| `results.*.value` | string | `required\|max:120` |
| `results.*.unit` | string | `nullable\|max:30` |
| `results.*.reference_range` | string | `nullable\|max:60` |
| `results.*.flag` | enum | `nullable\|in:normal,low,high,critical` |
| `results.*.method` | string | `nullable\|max:80` |
| `attachments` | file[] | `nullable\|array` (multipart variant; `mimes:pdf,jpg,png`) |

- **Status:** `200`.

#### `POST /lab/orders/{id}/approve`
- **Description:** Verify/approve results (locks them, notifies ordering provider, critical-value alert if flagged). **Permission:** `lab.approve-result` (senior lab-technician / pathologist). **Request:** `{ "test_ids": [..], "comment": "..." }`.
- **Status:** `200`; `422 RESULT_NOT_READY`; `423 RESULT_ALREADY_APPROVED`.

#### `GET /lab/orders/{id}/report/pdf`
- Approved report PDF (signed URL). `lab.view`.

#### `GET /lab/tests` (global)
- Lab test catalog (code, name, specimen, reference ranges, price). `lab.view`.

---

### 4.11 Radiology

Module: `Radiology`. Base: `/radiology`. Study IDs `RAD-{BRANCH}-YYMMDD-0001`.

#### `POST /radiology/orders`
- **Permission:** `radiology.order` (doctor). **Request `StoreRadiologyOrderRequest`:**

| Field | Type | Validation |
|---|---|---|
| `encounter_id` | int | `required\|exists:encounters,id` |
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `modality` | enum | `required\|in:xray,ultrasound,ct,mri,mammography` |
| `study_id` | int | `required\|exists:radiology_studies,id` (catalog) |
| `body_part` | string | `required\|max:80` |
| `priority` | enum | `required\|in:routine,urgent,stat` |
| `clinical_indication` | string | `required\|max:500` |
| `is_pregnant` | bool | `nullable\|boolean` (safety flag) |

#### `GET /radiology/orders` · `GET /radiology/orders/{id}`
- `radiology.view`. Status: `ordered,scheduled,acquired,reported,approved,cancelled`.

#### `POST /radiology/orders/{id}/acquire`
- **Description:** Mark images acquired; attach study (DICOM ref / image files). **Permission:** `radiology.upload-image` (radiologist). **Request (multipart):** `images[]` (`mimes:dcm,jpg,png,pdf|max:51200`), `acquired_at`, `technique_notes`.

#### `POST /radiology/orders/{id}/report`
- **Description:** Radiologist reports findings + impression. **Permission:** `radiology.report` (radiologist). **Request:** `{ "findings": "...", "impression": "...", "recommendation": "..." }` (findings & impression required, `max:10000`).

#### `POST /radiology/orders/{id}/approve`
- Approve/finalize report (locks; notifies provider). `radiology.report.approve`. `423 RESULT_ALREADY_APPROVED` if re-approved.

#### `GET /radiology/orders/{id}/images/signed-url` · `GET /radiology/orders/{id}/report/pdf`
- Signed URLs for images and report PDF. `radiology.view`.

---

### 4.12 Billing & Payments

Module: `Billing`. Base: `/billing`. Invoice `INV-{BRANCH}-YYYY-000001`, Receipt `RCP-{BRANCH}-YYYY-000001`. Money `DECIMAL(12,2)` KES.

#### `GET /billing/invoices`
- **Permission:** `invoices.read`. **Filters:** `patient_uuid`, `status` (`draft,issued,partially_paid,paid,void,refunded`), `date_between`, `payer` (`cash,sha,private_insurance`). **Sort:** `-created_at`.

#### `POST /billing/invoices`
- **Description:** Create an invoice (auto-aggregates billable encounter/lab/pharmacy lines or manual lines).
- **Permission:** `invoices.create` (cashier). **Idempotency-Key** required. **Request `StoreInvoiceRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `encounter_id` | int | `nullable\|exists:encounters,id` |
| `payer` | enum | `required\|in:cash,sha,private_insurance` |
| `lines` | array | `required\|array\|min:1` |
| `lines.*.service_code` | string | `required\|exists:billable_services,code` |
| `lines.*.description` | string | `required\|max:191` |
| `lines.*.quantity` | int | `required\|integer\|min:1` |
| `lines.*.unit_price` | decimal | `required\|numeric\|min:0\|decimal:0,2` |
| `lines.*.tax_rate` | decimal | `nullable\|numeric\|between:0,100` |
| `discount` | decimal | `nullable\|numeric\|min:0` |

- **Response 201:**

```json
{ "data": {
  "id": 5012, "invoice_number": "INV-NRB-2026-001934", "status": "issued",
  "payer": "cash", "subtotal": 4500.00, "tax": 0.00, "discount": 0.00,
  "total": 4500.00, "amount_paid": 0.00, "balance": 4500.00, "currency": "KES",
  "lines": [ { "description": "Consultation", "quantity": 1, "unit_price": 1500.00, "amount": 1500.00 } ],
  "created_at": "2026-06-22T09:14:03Z"
} }
```

#### `GET /billing/invoices/{id}` · `POST /billing/invoices/{id}/void`
- View `invoices.read`; void `billing.void-invoice` (reason required; blocked if paid → `423 INVOICE_FINALIZED`).

#### `POST /billing/invoices/{id}/payments`
- **Description:** Record a payment (cash, card, or M-Pesa manual reconcile). For STK use the dedicated endpoint below.
- **Permission:** `payments.create` (cashier). **Idempotency-Key required.**

| Field | Type | Validation |
|---|---|---|
| `method` | enum | `required\|in:cash,card,mpesa_manual,insurance,waiver` |
| `amount` | decimal | `required\|numeric\|min:0.01\|decimal:0,2` |
| `reference` | string | `nullable\|max:60` (M-Pesa receipt for manual) |
| `tendered` | decimal | `nullable\|numeric` (cash; computes change) |

- **Status:** `201`; `409 INVOICE_ALREADY_PAID` (overpay); `423 INVOICE_FINALIZED`. Response includes the receipt (`RCP-...`) when fully paid.

#### `POST /billing/invoices/{id}/mpesa/stk`
- **Description:** Initiate **M-Pesa Daraja STK Push** against an invoice. Async — completion arrives via the Daraja callback webhook (§5).
- **Permission:** `payments.create`. **Idempotency-Key required** (maps to one `CheckoutRequestID`).
- **Request `MpesaStkRequest`:**

| Field | Type | Validation |
|---|---|---|
| `phone` | string | `required\|regex:/^254\d{9}$/` → `z.string().regex(/^254\d{9}$/)` |
| `amount` | decimal | `required\|numeric\|min:1\|decimal:0,0` (Daraja whole KES) |
| `account_reference` | string | `nullable\|max:12` (defaults to invoice no.) |

- **Response 202:**

```json
{ "data": {
  "type": "payment.stk", "status": "pending",
  "checkout_request_id": "ws_CO_22062026091500123456",
  "merchant_request_id": "29115-34620561-1",
  "customer_message": "Enter your M-Pesa PIN to complete payment.",
  "poll_url": "/api/v1/billing/payments/ws_CO_22062026091500123456"
} }
```

- **Status:** `202`; `502 STK_PUSH_FAILED`; `409 INVOICE_ALREADY_PAID`.

#### `GET /billing/payments/{checkoutRequestId}`
- **Description:** Poll STK status (`pending,success,failed,timeout`). Frontend polls until terminal or receives WebSocket `PaymentCompleted`. **Permission:** `invoices.read`.
- **Response 200:** `{ "data": { "status": "success", "mpesa_receipt": "SLJ7XYZ123", "amount": 4500, "paid_at": "...", "receipt_number": "RCP-NRB-2026-001120" } }`.

#### `GET /billing/invoices/{id}/receipt/pdf`
- Receipt PDF (signed URL). `invoices.read`.

#### `POST /billing/invoices/{id}/refund`
- **Description:** Refund a captured payment (cash or M-Pesa B2C reversal). **Permission:** `billing.refund` (cashier-supervisor/admin). **Idempotency-Key required.**

| Field | Type | Validation |
|---|---|---|
| `payment_id` | int | `required\|exists:payments,id` |
| `amount` | decimal | `required\|numeric\|min:0.01` |
| `reason` | string | `required\|max:255` |
| `method` | enum | `required\|in:cash,mpesa_b2c` |

- **Status:** `200`/`202` (B2C async); `422 REFUND_EXCEEDS_PAID`.

---

### 4.13 SHA Claims

Module: `Insurance` (SHA). Base: `/sha`. Claim `CLM-{BRANCH}-YYYY-00001`. `ShaGateway` (Foundation §9).

#### `POST /sha/eligibility`
- **Description:** Verify SHA member eligibility/benefits before service.
- **Permission:** `sha.verify-eligibility`. **Request:** `{ "patient_uuid": "...", "sha_id": "SHA-..." }`.
- **Response 200:** `{ "data": { "eligible": true, "scheme": "SHIF", "benefits": [...], "checked_at": "..." } }`. `502 SHA_UPSTREAM_ERROR` on outage.

#### `POST /sha/preauth`
- **Description:** Request pre-authorization for a service/admission. **Permission:** `sha.pre-auth`. **Request:** `{ "patient_uuid", "service_codes": [], "estimated_cost", "clinical_justification" }`.
- **Response 201:** `{ "data": { "preauth_number": "...", "status": "pending|approved|declined", "approved_amount": 0 } }`.

#### `POST /sha/claims`
- **Permission:** `sha.create-claim`. **Request `StoreShaClaimRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `invoice_id` | int | `required\|exists:invoices,id` |
| `preauth_number` | string | `nullable\|string\|max:40` |
| `diagnosis_codes` | string[] | `required\|array\|min:1` (ICD-10) |
| `service_lines` | array | `required\|array\|min:1` |
| `service_lines.*.code` | string | `required\|exists:billable_services,code` |
| `service_lines.*.amount` | decimal | `required\|numeric\|min:0` |

- **Response 201:** claim with `claim_number`, status `draft`. `422 PREAUTH_REQUIRED` if service mandates pre-auth.

#### `GET /sha/claims` · `GET /sha/claims/{id}`
- `sha.read`. Status: `draft,submitted,under_review,approved,partially_approved,rejected,paid,appealed`.

#### `POST /sha/claims/{id}/submit`
- Submit to SHA (calls `ShaGateway`). `sha.submit-claim`. `422 CLAIM_INVALID_STATE`; `502 SHA_UPSTREAM_ERROR`.

#### `POST /sha/claims/{id}/appeal`
- Appeal a rejection. `sha.appeal-claim`. Body `{ "reason", "attachments[] }`.

#### `GET /sha/claims/{id}/status`
- Poll remote status (also updated via SHA webhook §5).

---

### 4.14 Inpatient

Module: `Inpatient`. Base: `/inpatient`. Admission `ADM-{BRANCH}-YYYY-00001`.

#### Wards & Beds
- `GET /inpatient/wards` (`inpatient.view`) — wards with bed occupancy summary.
- `POST /inpatient/wards` (`wards.manage`) — `{ "name", "type": "general|private|icu|maternity|pediatric", "capacity" }`.
- `GET /inpatient/wards/{id}/beds` — beds with status (`available,occupied,reserved,maintenance,cleaning`).
- `POST /inpatient/beds` (`wards.manage`) — `{ "ward_id", "bed_number", "daily_rate" }`.
- `PATCH /inpatient/beds/{id}/status` — `{ "status", "reason" }`.

#### `POST /inpatient/admissions`
- **Description:** Admit a patient to a bed. **Permission:** `inpatient.admit` (doctor/nurse). **Idempotency-Key** recommended.
- **Request `AdmitPatientRequest`:**

| Field | Type | Validation |
|---|---|---|
| `patient_uuid` | uuid | `required\|exists:patients,public_id` |
| `encounter_id` | int | `nullable\|exists:encounters,id` |
| `ward_id` | int | `required\|exists:wards,id` |
| `bed_id` | int | `required\|exists:beds,id` |
| `admitting_doctor_id` | int | `required\|exists:users,id` |
| `admission_type` | enum | `required\|in:emergency,elective,maternity,referral` |
| `provisional_diagnosis` | string | `required\|max:255` |
| `payer` | enum | `required\|in:cash,sha,private_insurance` |

- **Response 201:** `{ "data": { "id": 412, "admission_number": "ADM-NRB-2026-00231", "status": "admitted", "bed": {…}, "admitted_at": "…" } }`.
- **Status:** `201`; `409 BED_OCCUPIED`; `409 PATIENT_ALREADY_ADMITTED`.

#### `GET /inpatient/admissions` · `GET /inpatient/admissions/{id}`
- `inpatient.view`. Filters `status` (`admitted,discharged,transferred,deceased`), `ward_id`, `patient_uuid`.

#### `POST /inpatient/admissions/{id}/transfer`
- Transfer bed/ward. `inpatient.transfer`. Body `{ "to_bed_id", "reason" }`. `409 BED_OCCUPIED`.

#### `POST /inpatient/admissions/{id}/discharge`
- **Description:** Discharge; frees bed, triggers final billing & discharge summary.
- **Permission:** `inpatient.discharge` (doctor). **Request `DischargeRequest`:**

| Field | Type | Validation |
|---|---|---|
| `discharge_type` | enum | `required\|in:routine,referral,against_advice,absconded,deceased` |
| `discharge_diagnosis` | string[] | `required\|array\|min:1` (ICD-10) |
| `discharge_summary` | string | `required\|max:10000` |
| `follow_up_date` | date | `nullable\|date\|after:today` |

- **Status:** `200`; `422 NOT_ADMITTED`.

#### Nursing Chart — `/inpatient/admissions/{id}/nursing-chart`
- `GET` (`inpatient.view-chart`) — chart entries (vitals, intake/output, meds administered, notes).
- `POST` (`inpatient.create-chart`, nurse) — **Request `StoreNursingChartRequest`:**

| Field | Type | Validation |
|---|---|---|
| `recorded_at` | datetime | `required\|date\|before_or_equal:now` |
| `vitals.temperature_c` | decimal | `nullable\|numeric\|between:30,45` |
| `vitals.pulse_bpm` | int | `nullable\|integer\|between:20,250` |
| `vitals.bp_systolic` | int | `nullable\|integer\|between:50,260` |
| `vitals.bp_diastolic` | int | `nullable\|integer\|between:30,180` |
| `vitals.spo2` | int | `nullable\|integer\|between:50,100` |
| `intake_ml` | int | `nullable\|integer\|min:0` |
| `output_ml` | int | `nullable\|integer\|min:0` |
| `medications_given` | array | `nullable\|array` (`{ drug_id, dose, route, time }`) |
| `notes` | string | `nullable\|max:2000` |

- **Status:** `201`; `422 NOT_ADMITTED`.

---

### 4.15 Inventory

Module: `Inventory`. Base: `/inventory`. PO `PO-{BRANCH}-YYYY-0001`.

#### Items — `/inventory/items`
- `GET` (`inventory.view`) filters `category`, `low_stock`, `search`. `POST`/`PUT`/`DELETE` (`inventory.item.manage`).
- **Request `StoreItemRequest`:** `name` (`required\|max:120`), `sku` (`required\|unique:inventory_items,sku`), `category` (`required\|in:consumable,equipment,drug,reagent,stationery`), `unit` (`required\|max:20`), `reorder_level` (`required\|integer\|min:0`), `unit_cost` (`required\|numeric\|min:0`).

#### Suppliers — `/inventory/suppliers`
- `GET`/`POST`/`PUT`/`DELETE` (`inventory.supplier.manage`). Fields: `name`, `contact_person`, `phone` (`regex:/^\+?254\d{9}$/`), `email` (`nullable\|email`), `kra_pin` (`nullable\|max:20`), `payment_terms`.

#### Purchase Orders — `/inventory/purchase-orders`
- `GET` (`inventory.po.view`) filters `status` (`draft,submitted,approved,partially_received,received,cancelled`), `supplier_id`, `date_between`.
- `POST` (`inventory.po.create`) **Request `StorePurchaseOrderRequest`:**

| Field | Type | Validation |
|---|---|---|
| `supplier_id` | int | `required\|exists:suppliers,id` |
| `expected_date` | date | `nullable\|date\|after_or_equal:today` |
| `lines` | array | `required\|array\|min:1` |
| `lines.*.item_id` | int | `required\|exists:inventory_items,id` |
| `lines.*.quantity` | int | `required\|integer\|min:1` |
| `lines.*.unit_cost` | decimal | `required\|numeric\|min:0\|decimal:0,2` |

- `POST /inventory/purchase-orders/{id}/submit` · `/approve` (`inventory.po.approve`) · `/cancel`. Illegal transition → `422 PO_INVALID_STATE`.

#### Goods Received Note — `/inventory/grn`
- `POST` (`inventory.grn.create`) **Idempotency-Key required.** Receives against a PO; increments stock (with batch/expiry for drugs/reagents).
- **Request `StoreGrnRequest`:**

| Field | Type | Validation |
|---|---|---|
| `purchase_order_id` | int | `required\|exists:purchase_orders,id` |
| `delivery_note_no` | string | `nullable\|max:60` |
| `lines` | array | `required\|array\|min:1` |
| `lines.*.po_line_id` | int | `required\|exists:purchase_order_lines,id` |
| `lines.*.quantity_received` | int | `required\|integer\|min:1` |
| `lines.*.batch_no` | string | `required_if:lines.*.is_batched,true\|max:60` |
| `lines.*.expiry_date` | date | `required_if:lines.*.is_batched,true\|date\|after:today` |

- **Status:** `201`; `422 GRN_QTY_EXCEEDS_PO`.

#### Stock — `/inventory/stock`
- `GET` on-hand by item/branch; `GET /inventory/stock/movements` ledger; `POST /inventory/stock/adjust` (mirror of pharmacy adjust, `inventory.stock.adjust`).

---

### 4.16 Reporting

Module: `Reporting`. Base: `/reports`. Read-only; `branch.view-all` may aggregate across branches via `X-Branch-Id: *`.

#### `GET /reports/dashboard`
- **Description:** Role-aware KPI dashboard payload (today's patients, queue load, revenue, occupancy, pending claims).
- **Permission:** `reports.dashboard.view`. **Query:** `date` (default today), `compare` (`yesterday,last_week`).
- **Response 200:**

```json
{ "data": {
  "patients_today": 142, "appointments_today": 88, "queue_waiting": 17,
  "revenue_today": 248500.00, "currency": "KES",
  "bed_occupancy": { "occupied": 54, "total": 80, "rate": 0.675 },
  "pending_lab": 9, "pending_claims": 23,
  "trend": { "revenue_7d": [ { "date": "2026-06-16", "value": 210000 } ] }
} }
```

#### Domain report endpoints
| Endpoint | Permission | Description |
|---|---|---|
| `GET /reports/revenue` | `reports.financial.view` | Revenue by service/payer/period. |
| `GET /reports/patient-volume` | `reports.view` | Visits by department/day. |
| `GET /reports/pharmacy` | `reports.pharmacy.view` | Dispensing, stock-outs, expiry. |
| `GET /reports/lab-turnaround` | `reports.lab.view` | TAT by test. |
| `GET /reports/claims` | `reports.financial.view` | SHA claim status/aging. |
| `GET /reports/occupancy` | `reports.view` | Ward/bed occupancy. |

- Common query: `from`, `to` (`required\|date`), `group_by` (`day,week,month`), `department_id`, `branch_id` (admins).

#### `POST /reports/export`
- **Description:** Queue a large export (async). **Permission:** `reports.export`. **Request:** `{ "report": "revenue", "format": "csv|xlsx|pdf", "params": { "from": "...", "to": "..." } }`.
- **Response 202:** `{ "data": { "job_id": "exp_…", "status": "queued", "poll_url": "/api/v1/reports/exports/exp_…" } }`.
- `GET /reports/exports/{jobId}` → `{ status: queued|processing|ready|failed, download_url, expires_at }` (signed URL when ready).

---

### 4.17 Notifications

Module: `Communication`. Base: `/notifications`. Channels abstracted (SMS AfricasTalking, email Mailgun/Resend — Foundation §8).

#### `GET /notifications` (self)
- In-app notification feed. **Permission:** authenticated. Filters `read` (bool), `type`. **Response item:** `{ "id", "type": "lab_result_ready", "title", "body", "data": {…}, "read_at": null, "created_at" }`.

#### `POST /notifications/{id}/read` · `POST /notifications/read-all`
- Mark read. **Response 200** `{ "data": { "unread": 3 } }`.

#### `GET /notifications/preferences` · `PUT /notifications/preferences` (self)
- **Request:** `{ "channels": { "sms": true, "email": true, "push": false }, "categories": { "appointment_reminders": true, "results": true } }`.

#### `POST /notifications/send`
- **Description:** Admin-triggered notification/broadcast (e.g., recall, branch announcement). **Permission:** `communication.send` (admin). **Request `SendNotificationRequest`:**

| Field | Type | Validation |
|---|---|---|
| `channel` | enum | `required\|in:sms,email,in_app` |
| `audience` | enum | `required\|in:user,role,patient,segment` |
| `target` | mixed | `required` (user id / role slug / patient uuid / segment id) |
| `template` | string | `required\|exists:notification_templates,key` |
| `data` | object | `nullable\|array` (template variables) |
| `scheduled_at` | datetime | `nullable\|date\|after:now` |

- **Response 202:** `{ "data": { "batch_id": "ntf_…", "queued": 318 } }`.

#### `POST /notifications/devices/register` (self)
- Register a push token (PWA web-push). `{ "endpoint", "keys": { "p256dh", "auth" } }`.

---

### 4.18 Patient Portal

Module: `PatientPortal`. Base: `/portal`. Auth = patient role; all endpoints **(self)** scoped to the authenticated patient (no `patients.view` permission; portal-specific policies). Branch context derived from the patient's records.

| Endpoint | Method | Description | Validation / Notes |
|---|---|---|---|
| `/portal/profile` | GET | Own demographics. | (self) |
| `/portal/profile` | PUT | Update contact details only. | `phone`, `email`, `address` (no clinical fields) |
| `/portal/appointments` | GET | Own appointments (upcoming/past). | filters `status`, `date_between` |
| `/portal/appointments` | POST | Self-book into open slots. | mirrors `StoreAppointmentRequest` minus `patient_uuid` (implicit); `409 SLOT_UNAVAILABLE` |
| `/portal/appointments/{id}/cancel` | POST | Cancel own (≥ cutoff window). | `422` if within cutoff |
| `/portal/appointments/availability` | GET | Open slots. | `provider_id`/`department_id`, `date` |
| `/portal/prescriptions` | GET | Own prescriptions + status. | read-only |
| `/portal/lab-results` | GET | **Approved** results only. | unapproved hidden |
| `/portal/lab-results/{id}/pdf` | GET | Signed URL to report. | (self) |
| `/portal/invoices` | GET | Own invoices + balance. | |
| `/portal/invoices/{id}/pay` | POST | Initiate STK Push for own invoice. | `MpesaStkRequest`; **Idempotency-Key required**; `202` |
| `/portal/invoices/{id}/receipt/pdf` | GET | Receipt PDF (signed URL). | |
| `/portal/documents` | GET | Own documents (shared by clinicians). | |
| `/portal/documents/{id}/signed-url` | GET | Time-limited URL. | |
| `/portal/medical-summary` | GET | Allergies, chronic conditions, current meds. | sensitive — OTP/MFA re-auth may gate |
| `/portal/notifications` | GET | Own notifications. | |

- Portal login uses email/phone + password **or** OTP (§4.1). Rate-limited under the `portal` throttle group.

---

## 5. Webhooks

Inbound, unauthenticated by bearer token; secured by signature + IP allow-list + idempotency. Routes excluded from CSRF; **never** behind Sanctum. All webhook handlers are queued (`202` returned immediately to the provider after validation).

### 5.1 M-Pesa Daraja — STK Callback

- **Endpoint:** `POST /api/v1/webhooks/mpesa/stk-callback`
- **Security:**
  - IP allow-list (Safaricom Daraja ranges) — fail → `401 CALLBACK_SIGNATURE_INVALID`.
  - The callback URL embeds a signed token (`/webhooks/mpesa/stk-callback?token=<hmac>`); HMAC verified server-side.
  - **Idempotent** by `CheckoutRequestID` + `MpesaReceiptNumber` (Foundation §9). Replays return `200` without double-posting.
- **Inbound body (Daraja shape):**

```json
{
  "Body": { "stkCallback": {
    "MerchantRequestID": "29115-34620561-1",
    "CheckoutRequestID": "ws_CO_22062026091500123456",
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "CallbackMetadata": { "Item": [
      { "Name": "Amount", "Value": 4500 },
      { "Name": "MpesaReceiptNumber", "Value": "SLJ7XYZ123" },
      { "Name": "PhoneNumber", "Value": 254712345678 },
      { "Name": "TransactionDate", "Value": 20260622091530 }
    ] }
  } }
}
```

- **Handling:** `ResultCode 0` → mark payment success, apply to invoice, generate receipt, broadcast `PaymentCompleted`, notify cashier/patient. Non-zero (e.g., `1032` cancelled, `1037` timeout) → mark failed with reason. Unknown `CheckoutRequestID` → log + `200` (ignore).
- **Response:** always `200` `{ "ResultCode": 0, "ResultDesc": "Accepted" }` to Daraja (ack contract), regardless of internal outcome, once signature/IP pass.

### 5.2 M-Pesa Daraja — B2C Result (refunds) & Timeout

- `POST /api/v1/webhooks/mpesa/b2c-result` and `POST /api/v1/webhooks/mpesa/b2c-timeout`. Idempotent by `ConversationID`/`OriginatorConversationID`; reconciles refund status.

### 5.3 M-Pesa Validation/Confirmation (C2B Paybill/Till)

- `POST /api/v1/webhooks/mpesa/validation` → return `{ "ResultCode": 0, "ResultDesc": "Accepted" }` to accept, non-zero to reject. `POST /api/v1/webhooks/mpesa/confirmation` posts the payment (matches by account reference = invoice/patient no.).

### 5.4 SHA — Claim Status Callback

- **Endpoint:** `POST /api/v1/webhooks/sha/claim-status`
- **Security:** mutual TLS / signed header `X-SHA-Signature` (HMAC over raw body) + IP allow-list → fail `401 CALLBACK_SIGNATURE_INVALID`. Idempotent by `claim_number` + `event_id`.
- **Inbound body (illustrative):**

```json
{ "event_id": "evt_88213", "claim_number": "CLM-NRB-2026-00098",
  "status": "approved", "approved_amount": 38000.00, "remarks": "Within benefit limit",
  "decided_at": "2026-06-22T08:00:00Z" }
```

- **Handling:** update claim status (`approved/partially_approved/rejected/paid`), record `approved_amount`, notify billing, trigger reconciliation. **Response:** `200` `{ "received": true }`.

### 5.5 Webhook Conventions

- All webhooks: return `2xx` within 5s; heavy work dispatched to queues. Persist raw payload to `webhook_events` (immutable) for audit/replay. Manual replay via `POST /webhooks/{provider}/replay/{eventId}` (admin, `webhooks.replay`).

---

## 6. Rate Limiting & Throttling

Implemented with Laravel `RateLimiter` (Redis store). Limits keyed by IP + user + branch as noted. `429` responses carry `Retry-After` and `X-RateLimit-*` headers and use the problem+json body (`code: RATE_LIMITED`).

| Throttle group | Applies to | Limit | Key |
|---|---|---|---|
| `auth` | `login`, `mfa/verify`, `refresh` | **5 / min**, then exponential lockout to 15 min after 10 fails | IP + email |
| `otp` | `otp/request`, `otp/verify` | **3 / 5 min** request; 5 verify / 5 min | identifier (phone/email) |
| `password-reset` | reset flows | 3 / 15 min | IP + email |
| `global-authenticated` | all authenticated API | **120 / min** | user id |
| `read` | safe `GET` endpoints | **300 / min** | user id |
| `write` | `POST/PUT/PATCH/DELETE` | **60 / min** | user id |
| `search` | `patients/search`, type-ahead | **30 / min** | user id |
| `payments` | STK initiate, payments, refunds | **10 / min** | user id + invoice |
| `webhooks` | inbound provider callbacks | **600 / min** | source IP (per provider) |
| `reports-export` | `reports/export` | **5 / 10 min** | user id |
| `portal` | all `/portal/*` | **60 / min** | patient user id |
| `notifications-send` | `notifications/send` | **10 / min** + 5,000 recipients/hr | user id |

- Burst handling: token-bucket where applicable. Privileged service integrations may receive higher named limits via config.
- **STK push** additionally guarded against duplicate in-flight requests per invoice (one active `CheckoutRequestID`) regardless of throttle.

`429` example:

```json
{
  "type": "https://api.afyahms.co.ke/problems/rate-limited",
  "title": "Too Many Requests", "status": 429, "code": "RATE_LIMITED",
  "detail": "Rate limit exceeded for group 'auth'. Retry after 42 seconds.",
  "request_id": "req_01J...", "meta": { "retry_after": 42 }
}
```

---

## 7. Error Handling Standards

1. **Single rendering path.** A global exception handler maps every throwable to the problem+json shape (§2.2). No raw stack traces in any environment except local; production returns a generic `SERVER_ERROR` with a `request_id`.
2. **Validation.** `FormRequest::failedValidation` always yields `422 VALIDATION_ERROR` with the `errors` bag. Frontend Zod schemas mirror the same rules; field keys match exactly so the SPA can map errors to inputs without translation.
3. **Business rules in services.** Services throw domain exceptions (`InsufficientStockException`, `BedOccupiedException`, …) that the handler maps to the catalog code + status (§3). Controllers never embed business validation.
4. **Auth/authorization.** `AuthenticationException` → `401 UNAUTHENTICATED`/`TOKEN_EXPIRED`; `AuthorizationException`/policy denial → `403 FORBIDDEN`; branch-scope denial → `403 BRANCH_ACCESS_DENIED`. Policies enforce both permission and branch ownership.
5. **Not found.** `ModelNotFoundException` and branch-scoped misses → `404 RESOURCE_NOT_FOUND` (no existence leakage across branches).
6. **Concurrency & idempotency.** Stale `version` → `409 STALE_RESOURCE`; `If-Match` failure → `412`; idempotency-key conflicts → `409 IDEMPOTENCY_KEY_REUSE`; locked finalized records → `423`.
7. **Upstream failures.** Daraja/SHA/SMS errors surface as `502`/`503` with a domain code (`STK_PUSH_FAILED`, `SHA_UPSTREAM_ERROR`) and a `Retry-After` when retriable; calls go through gateway interfaces with timeouts, retries (idempotent ops only), and circuit breakers.
8. **Idempotent webhooks.** Provider callbacks are deduplicated and never double-post financial state; raw payloads persisted for replay.
9. **Observability.** Every response carries `X-Request-Id`; errors log `request_id`, user, branch, route, and code. Security/PHI-access events also write an immutable `audit_logs` row (Foundation §11). Error codes are stable across versions — clients branch on `code`, never on `title`/`detail`.
10. **No partial financial writes.** All money mutations run inside DB transactions; on any failure the transaction rolls back and the error is returned with no side effects (sequences are gap-tolerant per Foundation §6).
11. **Localization.** `title`/`detail`/validation messages honor `Accept-Language` (`en`/`sw`); `code` and field keys are never localized.

---

*End of 12 — REST API Specification.*
