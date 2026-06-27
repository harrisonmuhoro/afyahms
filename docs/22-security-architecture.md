# 22 — Security Architecture

> **Scope:** End-to-end security architecture for Afya HMS — a production, multi-branch
> Hospital Management System operating in Kenya, processing Protected Health Information
> (PHI) and payment data (M-Pesa Daraja, SHA insurance).
> **Authority:** This document elaborates §11 of `00-foundation.md` and MUST stay
> consistent with it. Where this document adds detail, the foundation constants still win.
> **Audience:** Engineering, DevOps/SRE, Data Protection Officer (DPO), auditors, MOH/ODPC reviewers.
> **Document version:** 1.0 · **Status:** Security baseline (MVP → scale to 10,000+ users).

---

## 0. Security principles (non-negotiables)

1. **Defense in depth** — no single control is trusted alone. Network, application, data, and operational layers each enforce independently.
2. **Least privilege** — every user, service, token, and DB account gets the minimum rights to do its job, scoped to a single branch by default.
3. **Secure by default / deny by default** — endpoints, routes, and policies fail closed. New routes are unauthenticated only by explicit, reviewed decision.
4. **Privacy by design & by default** — PHI minimization, purpose limitation, and consent are architectural, not bolt-on (§12, KDPA 2019 §25).
5. **Zero trust toward the client** — the React SPA is treated as hostile. All authorization, validation, and tenancy enforcement is **server-side**. The client UI hides controls only for UX, never for security.
6. **Auditability** — every PHI access and security-relevant event is recorded to an immutable audit trail.
7. **Assume breach** — short token lifetimes, segmentation, monitoring, and a rehearsed incident-response plan limit blast radius.

---

## 1. Threat model

### 1.1 Assets (what we protect, by sensitivity)

| Tier | Asset | Examples | Impact if compromised |
|---|---|---|---|
| **Crown jewels** | PHI / medical records | Diagnoses, EMR/SOAP notes, lab/radiology results, prescriptions, triage, mental-health & HIV status | Patient harm, KDPA breach, license loss, lawsuits |
| **Crown jewels** | Patient identity / PII | Name, National ID, phone, DOB, address, next-of-kin | Identity theft, KDPA breach |
| **High** | Payment & financial data | M-Pesa transactions, invoices, SHA claims, paybill/till config, Daraja credentials | Fraud, financial loss, regulatory penalty |
| **High** | Credentials & secrets | Password hashes, TOTP seeds, API keys, Daraja consumer secret, DB creds, signing keys | Full system compromise |
| **High** | Audit logs | `audit_logs`, activity log | Cover-up of attacks, loss of legal evidence |
| **Medium** | Operational data | Appointments, queue state, inventory, schedules | Disruption of care delivery |
| **Medium** | System availability | The HMS itself (clinical operations depend on it) | Care delivery halted (safety event) |

### 1.2 Threat actors

| Actor | Motivation | Capability | Notes |
|---|---|---|---|
| External cybercriminal | Financial (ransomware, data resale, M-Pesa fraud) | Medium–high | Primary external threat to PHI and payments |
| Opportunistic scanner / botnet | Commodity exploitation | Low–medium | Automated OWASP-style probing, credential stuffing |
| Malicious insider (staff) | Curiosity, revenge, bribery, snooping on VIP/relative records | Medium (has valid creds) | **Highest-likelihood PHI breach vector** in healthcare |
| Negligent insider | Accident | Low | Misdirected data, weak passwords, phishing victims |
| Compromised account | Varies | Inherits victim's role | Stolen/phished credentials, reused passwords |
| Nation-state / advanced | Espionage | High | Out of primary scope; mitigated by defense-in-depth |
| Third-party / supply chain | Varies | Medium | Compromised npm/composer package, vendor (SMS/email/Daraja) |
| Physical intruder | Theft | Low–medium | Branch reception kiosks, unattended sessions |

### 1.3 STRIDE overview

| STRIDE category | Threat in Afya HMS | Primary mitigations (see section) |
|---|---|---|
| **S**poofing | Impersonating a user/branch/M-Pesa callback | Sanctum auth, MFA/TOTP (§2), webhook signature validation (§6), TLS (§4) |
| **T**ampering | Modifying EMR, invoices, audit logs, requests in flight | Server-side validation (§5), CSRF, immutable audit log (§10), TLS/HSTS (§4), mass-assignment guards |
| **R**epudiation | "I never accessed/changed that record" | Immutable `audit_logs`, login history, activity log (§10) |
| **I**nformation disclosure | PHI leakage, IDOR, public buckets, log leakage | RBAC + policies + branch scope (§3), encryption (§4), signed URLs, scrubbed logs |
| **D**enial of service | Flooding endpoints, M-Pesa callback abuse, resource exhaustion | Rate limiting/throttling (§5), queue isolation, WAF/CDN, autoscaling |
| **E**levation of privilege | Role escalation, branch-scope bypass, mass assignment | Spatie RBAC, policy checks, `branch.view-all` gating (§3), guarded models |

### 1.4 Attack surface

- **Public-facing:** REST API (`/api/*`), Patient Portal SPA, M-Pesa Daraja callback webhooks, SHA callbacks, SMS/email provider webhooks, password-reset/OTP flows, login endpoint.
- **Authenticated:** All clinical/billing endpoints, file upload/download (signed URLs), branch switcher, admin/config endpoints.
- **Internal:** MySQL, Redis, queue workers, scheduler (cron), storage backend (local/S3/R2/B2), mail/SMS providers.
- **Client-side:** React SPA bundle (XSS, token storage), service worker / PWA cache (offline data at rest on device).
- **Operational:** CI/CD pipeline, `.env`/secrets, Docker images, backups, admin SSH/console.

**Trust boundaries:** Internet ↔ WAF/LB ↔ App (Laravel) ↔ Data tier (MySQL/Redis/Storage); App ↔ third-party providers (Daraja, SHA, AfricasTalking, Mailgun/Resend). Every boundary crossing authenticates and validates.

---

## 2. Authentication

### 2.1 Mechanism — Laravel Sanctum (SPA)

- **Sanctum SPA authentication** is canonical (§11). The React SPA and API are first-party; Sanctum issues a stateful, cookie-based session for the SPA (CSRF-protected) and/or bearer tokens for the PWA/mobile context.
- **SPA mode:** `EnsureFrontendRequestsAreStateful` middleware; auth cookie is `HttpOnly`, `Secure`, `SameSite=Lax/Strict`. CSRF cookie (`XSRF-TOKEN`) required on state-changing requests.
- **Token (PWA/native) mode:** Personal access tokens with **scoped abilities** and short expiry (`config('sanctum.expiration')`, default 480 min / 8h working shift). Tokens are hashed (SHA-256) at rest in `personal_access_tokens`.
- `stateful` domains and CORS `allowed_origins` are an explicit allowlist — no wildcards (§5.8).

### 2.2 Password policy

| Control | Setting |
|---|---|
| **Hashing** | **Argon2id** preferred (`config/hashing.php → 'driver' => 'argon2id'`), with bcrypt (cost ≥ 12) as fallback if Argon not compiled. Never MD5/SHA-1/plaintext. |
| **Complexity** | Laravel `Password::min(12)->mixedCase()->numbers()->symbols()->uncompromised()`. `uncompromised()` checks HaveIBeenPwned k-anonymity API. |
| **Length** | Minimum 12 chars (staff), 10 (patient portal); no maximum below 128. |
| **History** | Last **5** password hashes retained in `password_histories`; reuse rejected. |
| **Expiry** | Staff passwords expire every **90 days**; `password_changed_at` enforced by middleware → forced reset on next login. Patients: no forced expiry (NIST-aligned), but breach-triggered reset. |
| **Reset** | Signed, single-use, **time-limited (60 min)** reset tokens via email/SMS OTP. Reset invalidates all sessions/tokens. |
| **Rehash** | Automatic transparent rehash on login when algorithm/cost changes (`Hash::needsRehash`). |
| **No hints / no secret questions.** | |

> **Note on NIST vs. legacy:** Periodic expiry is retained for staff to satisfy MOH/auditor expectations, but the stronger control is breach-detection (`uncompromised()`) + MFA. Both are enabled.

### 2.3 OTP verification

- **OTP (One-Time Password)** used for: patient portal phone/email verification, password reset, and step-up on sensitive actions.
- 6-digit numeric, generated with CSPRNG, **hashed** at rest, **5-minute** validity, single-use, max **5** attempts then lockout.
- Delivered via the `NotificationChannelManager` (AfricasTalking SMS / Mailgun-Resend email — §8 foundation). Rate-limited per phone/email/IP.

### 2.4 MFA / TOTP (mandatory for privileged roles)

- **MFA required** for `hospital-admin`, `doctor`, `pharmacist` (foundation §5). Optional but recommended (and admin-enforceable) for `nurse`, `lab-technician`, `radiologist`, `cashier`, `records-officer`.
- **TOTP** (RFC 6238), 30-second window, ±1 step skew, SHA-1 standard authenticator apps (Google Authenticator, Authy, etc.). Library: `pragmarx/google2fa` or Laravel Fortify TOTP.
- **Enrollment flow:**
  1. User authenticates with password.
  2. Server generates TOTP secret, returns provisioning URI + QR code (rendered client-side, secret never logged).
  3. User confirms with a valid code → MFA marked `confirmed_at`. Secret stored **encrypted** (Laravel `encrypted` cast).
  4. **10 recovery codes** generated, shown **once**, stored **hashed**. Each single-use.
- **Enforcement:** privileged-role login is incomplete until TOTP challenge passes; a partial/"pending-mfa" token cannot access protected resources. Re-prompt on new device.
- **Recovery:** recovery codes; if exhausted, admin-assisted reset with identity verification and audit entry. Recovery-code use is audited and alerts the user.

### 2.5 Sessions, timeouts, device & IP tracking

| Control | Value |
|---|---|
| **Idle timeout** | **15 minutes** of inactivity → session/token invalidated (clinical workstations are shared). Configurable per role. |
| **Absolute timeout** | **8 hours** (one shift) regardless of activity → forced re-auth. |
| **Concurrent sessions** | Tracked; admin can view/revoke. Optional cap per user. |
| **Device tracking** | `user_devices` table: device fingerprint (UA + client hint hash), first/last seen, trust status. New device → email/SMS alert + optional MFA re-challenge. |
| **IP tracking** | Each session/login records source IP + geo (best-effort). Impossible-travel and new-country logins flagged. |
| **Login history** | `login_histories`: user_id, branch_id, ip, device, success/failure, MFA result, timestamp. Surfaced to user ("last login") and to admins/SIEM. |
| **Logout** | Server-side token/session revocation; "logout everywhere" revokes all of a user's tokens. |

### 2.6 Brute-force & credential-stuffing protection

- **Lockout:** Laravel `RateLimiter` / `ThrottlesLogins` — **5** failed attempts per (email + IP) → progressive backoff, lock for **15 minutes**; repeated lockouts escalate to admin alert.
- Per-IP and per-account throttles are independent (defeats distributed stuffing and targeted attacks).
- Generic failure messages ("invalid credentials") — no username enumeration. OTP/reset responses are uniform regardless of account existence.
- CAPTCHA / proof-of-work challenge after N failures on public login & patient portal.
- `uncompromised()` password check + breach-monitoring reduce credential-stuffing success.

---

## 3. Authorization

### 3.1 RBAC — Spatie Laravel Permission

- **10 canonical roles** (foundation §5). Permissions named `{module}.{action}` (e.g. `patients.create`, `prescriptions.dispense`, `billing.refund`). Full matrix in `08-rbac-matrix.md`.
- Roles/permissions are **global reference data** (not branch-scoped), cached in Redis; a user's effective permissions derive from role(s) + direct grants.
- **No permission logic in controllers as ad-hoc `if`s** — use `can:`/`->authorize()` and Policies.

### 3.2 Policies & gates

- A **Laravel Policy per domain model** (PatientPolicy, EncounterPolicy, InvoicePolicy, PrescriptionPolicy, …). Controllers call `$this->authorize('view', $patient)` or route `can:` middleware.
- Policies combine **permission check + branch-scope check + relationship check** (e.g., a doctor may view an EMR only within their branch and, for sensitive specialties, only with an active care relationship/consult).
- **Break-the-glass** (emergency override of relationship restriction) is allowed for clinicians but produces a high-priority audit event + post-hoc review (privacy requirement).

### 3.3 Branch-scope enforcement (multi-tenancy isolation)

- **Row-level isolation by `branch_id`** (foundation §4). The global `BranchScope` Eloquent scope auto-filters every operational query by the user's `active_branch_id`.
- Bypass only for roles holding `branch.view-all` (Hospital Admin, executive reporting). Bypass is explicit, logged, and never the default.
- **Defense in depth:** branch checks exist at (a) global scope, (b) policy, and (c) FormRequest validation (a payload's `branch_id` must equal the active branch unless `branch.view-all`). This blocks **IDOR / cross-branch** access even if one layer is bypassed.
- Externally-exposed resources use **UUID `public_id`** (foundation §3) to avoid sequence enumeration; internal BIGINT keys are never exposed.

### 3.4 Least privilege & server-side enforcement

- DB accounts: the app uses a least-privileged MySQL user (no `DROP`/`GRANT`/`FILE`); migrations run under a separate elevated account in CI/deploy only.
- Queue workers and scheduler run as non-root, dedicated OS users.
- **All authorization decisions are server-side.** The SPA's `<ProtectedRoute permission="...">` (foundation §10) is UX only; the API independently authorizes every request.

---

## 4. Data protection

### 4.1 Encryption at rest

- **Column-level encryption** for sensitive fields via Laravel `encrypted` / `encrypted:array` casts (AES-256-GCM, app `APP_KEY`). Applied to: TOTP secrets, recovery codes, next-of-kin contacts, National ID (where stored), insurance member IDs, free-text clinical notes flagged sensitive, M-Pesa/SHA tokens, document metadata secrets.
  - **Trade-off:** encrypted columns are not natively searchable. For lookup-needed PII (e.g., phone, National ID) use a **blind index** (HMAC-SHA256 of normalized value, keyed by a separate index key) alongside the encrypted column.
- **Database-/volume-level encryption** in production: MySQL **InnoDB tablespace encryption** (TDE) + encrypted EBS/disk volumes. Redis persistence on encrypted volume; sensitive data avoided in Redis where possible.
- **Backups encrypted** (§8). **Storage at rest encrypted** (SSE for S3/R2/B2; encrypted volume for `local`).
- **PWA/offline:** the service worker caches **only non-sensitive read data**; PHI is not persisted to IndexedDB unencrypted. Offline write queue holds minimal data and syncs over TLS.

### 4.2 Encryption in transit

- **TLS 1.2+ (prefer 1.3)** everywhere; TLS 1.0/1.1 and weak ciphers disabled. Strong cipher suites, forward secrecy.
- **HSTS** (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`). HTTP → HTTPS redirect; app forces HTTPS (`URL::forceScheme('https')` in prod).
- Internal service traffic (app ↔ DB/Redis/storage) over TLS or a private network segment. Outbound to Daraja/SHA/providers over TLS with certificate validation (no `verify=false`).

### 4.3 Key management

- `APP_KEY` and all encryption/signing keys live in environment/secret store, **never in code or VCS** (§7).
- **Vault-ready:** production targets a managed secret store (HashiCorp Vault / AWS Secrets Manager / cloud KMS). Envelope encryption: data keys wrapped by a KMS master key.
- **Key rotation:** documented procedure for rotating `APP_KEY` (re-encrypt encrypted columns via a maintenance command), TOTP/index keys, and provider secrets. Rotation events audited.
- Separate keys per purpose (encryption ≠ blind-index ≠ webhook-signing ≠ JWT/Sanctum). Separate keys per environment (dev/staging/prod never shared).

### 4.4 Secure file storage & signed URLs

- `StorageManager` abstraction (foundation §7) over `local`/`s3`/`r2`/`b2`. **No public buckets** — all clinical files private.
- Every clinical/document download is served via a **time-limited signed URL** (`Storage::temporaryUrl`, default TTL **5–15 min**), generated **only after** a policy + branch-scope authorization check. URLs are single-purpose and expire.
- Uploads stored under non-guessable, UUID-based keys segregated by branch; original filenames sanitized.
- Direct object access without a valid signature is denied at the bucket policy level (defense in depth even if app misbehaves).

---

## 5. Application security

### 5.1 CSRF

- Sanctum SPA flow uses the `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header; Laravel `VerifyCsrfToken` protects all stateful state-changing requests. Token-based (bearer) API requests are CSRF-exempt by design (no ambient cookie auth).
- `SameSite` cookies add a second layer.

### 5.2 XSS prevention

- API returns **JSON only**; React escapes by default. **No `dangerouslySetInnerHTML`** without sanitization (DOMPurify) — enforced by lint rule.
- Server-side output encoding for any HTML in mail/PDF templates (Blade auto-escapes `{{ }}`).
- **Content-Security-Policy** (§5.7) blocks inline scripts and untrusted sources as a backstop.
- All user-supplied rich text (e.g., clinical notes rendered as HTML) is sanitized server-side before storage/return.

### 5.3 SQL injection prevention

- **Eloquent ORM + query builder use parameterized/prepared statements** exclusively. Raw queries (`DB::raw`, `whereRaw`) are forbidden except with **bound parameters**, and flagged in code review.
- No string concatenation of user input into SQL. Repository pattern (foundation §2) centralizes data access and review surface.

### 5.4 Mass-assignment protection

- Models declare explicit **`$fillable`** allowlists (never `$guarded = []`). `branch_id`, `id`, `public_id`, role/permission, price, and status fields are **never** mass-assignable from client input.
- Writes go through **FormRequest validation → DTO → Service** (foundation §2); the service sets server-controlled fields (branch, actor, timestamps), not the raw request.

### 5.5 Rate limiting & throttling

| Surface | Limit (baseline, tunable) |
|---|---|
| Login / auth | 5 / min per IP+email, then lockout (§2.6) |
| OTP request | 3 / 5 min per phone/email; 10 / hr per IP |
| Password reset | 3 / hr per account |
| General authenticated API | 120 / min per user (named limiter) |
| Patient portal | Tighter per-user/IP limits |
| M-Pesa callback | Per-source allowlist + idempotency, not blanket throttle (§6) |
| File upload | Size + count limits, per-user quota |

Implemented via Laravel `RateLimiter::for()` named limiters + `throttle:` middleware; Redis-backed counters. WAF/CDN provides edge-level volumetric protection.

### 5.6 Input validation

- **Every write endpoint** uses a FormRequest (foundation §2) — no validation in controllers. Strict typing, allowlist rules, length/format bounds, enum constraints.
- Zod schemas on the frontend **mirror** backend FormRequests (foundation §10) for UX, but the server is authoritative.
- Canonical IDs/formats validated against patterns from foundation §3. Reject unexpected fields.

### 5.7 Secure headers

Set globally via middleware (and/or WAF):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` (nonce-based where inline needed) |
| `X-Frame-Options` | `DENY` (anti-clickjacking; CSP `frame-ancestors` reinforces) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disable camera/mic/geolocation unless explicitly needed |
| `Cache-Control` (PHI responses) | `no-store, no-cache, private` |

### 5.8 CORS

- Strict allowlist of `allowed_origins` (the SPA/portal domains only). `supports_credentials: true` for SPA cookie auth. **No `*`** with credentials. Methods/headers limited to those required.

### 5.9 File upload security

- **Validate:** MIME type **and** magic-byte content sniffing (not just extension), max size, allowed extensions (PDF, DICOM, JPG/PNG for clinical), filename sanitization, image re-encoding to strip metadata/embedded scripts.
- **Antivirus scanning** (ClamAV or cloud AV) on every upload **before** the file is made available; infected files quarantined + audited.
- Files stored outside web root / in private buckets; served only via signed URLs (§4.4). Never execute uploaded content; `Content-Disposition: attachment` + `nosniff`.

---

## 6. API security

- **Authentication:** all `/api/*` routes require Sanctum auth except a tiny explicit allowlist (login, register-OTP, public webhooks). Default-deny middleware.
- **Token scopes/abilities:** Sanctum token abilities map to role capabilities; the PWA/native token requests only the abilities it needs.
- **Idempotency:** state-changing financial/clinical POSTs accept an `Idempotency-Key` header (or use natural keys). M-Pesa callbacks are idempotent by `CheckoutRequestID` / `mpesa_receipt`; SHA claims by claim number (foundation §9). Replays return the original result without double-processing.
- **Webhook signature validation:**
  - **M-Pesa Daraja:** callbacks hit **signed webhook routes**; validate source IP allowlist (Safaricom ranges), validate the callback payload/`CheckoutRequestID` against the originating STK request, and verify any shared-secret/HMAC where applicable. Reject + log unmatched callbacks.
  - **SHA / other webhooks:** HMAC signature header verified against a per-provider signing secret; constant-time comparison; reject on mismatch or stale timestamp (anti-replay window).
  - All webhook endpoints validate `Content-Type`, enforce size limits, and never trust amounts/status without server-side reconciliation against the original transaction.
- **Versioning & errors:** stable error shape, no stack traces or internal details in prod responses (`APP_DEBUG=false`). Generic 401/403/404 to avoid info leak (404 instead of 403 for cross-branch resources to prevent existence disclosure).
- **Pagination/limits** to prevent bulk PHI exfiltration; large exports require elevated permission + are audited + rate-limited.

---

## 7. Secrets management

- **`.env` and secrets are never committed** — `.env` is git-ignored; `.env.example` carries only placeholder keys. CI/secret-scanning (e.g. gitleaks/trufflehog) blocks accidental commits.
- Secrets injected at runtime via environment/secret store; not baked into Docker images or frontend bundles. **No secret reaches the React bundle** (only public, non-sensitive `VITE_` vars).
- **Vault-ready** production: HashiCorp Vault / AWS Secrets Manager / cloud KMS; app reads at boot. Least-privilege access policies per service; secret access audited.
- Distinct secrets per environment; rotation procedures documented (§4.3). Daraja consumer key/secret, SHA creds, DB creds, mail/SMS keys, `APP_KEY`, signing keys all managed here.

---

## 8. Backup & recovery

| Aspect | Policy |
|---|---|
| **What** | MySQL (full + binlog/PITR), Redis (where durable), document storage objects, secret-store config (separately, securely). |
| **Frequency** | DB: nightly full + continuous binlog (point-in-time recovery). Storage: continuous/versioned object replication. |
| **Encryption** | All backups **encrypted at rest** (AES-256) with keys **separate** from production; encrypted in transit to backup destination. |
| **Retention** | Operational backups: 35 days rolling. **Clinical data retention ≥ 10 years** (foundation §11) honored via soft-delete + cold archival; **clinical data is never hard-deleted**. |
| **Offsite / 3-2-1** | ≥3 copies, 2 media/locations, 1 offsite (different region/provider). Immutable/WORM backup tier to resist ransomware. |
| **Restore testing** | **Quarterly** restore drills to a clean environment; integrity verified. A backup is "valid" only when a restore has been proven. |
| **DR** | Documented Disaster Recovery plan with **RPO ≤ 15 min** (PITR) and **RTO ≤ 4 h** target. Failover runbook, dependency map, periodic tabletop + live DR exercise. |
| **Access** | Backup access is least-privilege, MFA-gated, and audited. |

Because clinical operations are safety-critical, availability is a security property: redundancy at LB/app/DB tiers and tested failover are in scope.

---

## 9. Compliance mapping

### 9.1 Kenya Data Protection Act (KDPA) 2019 — primary obligation

| KDPA requirement | Implementation in Afya HMS |
|---|---|
| **Lawful basis & consent** (§30) | Explicit, recorded patient consent for processing; consent versioning + timestamp; purpose limitation. Marketing/communication consent separate from care. |
| **Data minimization** (§25) | Collect only what care/billing requires; PHI fields gated by role/policy. |
| **Data subject rights** (§26) | Patient portal supports access (data export), rectification requests, objection, and erasure-where-lawful. **Erasure is constrained by the 10-year medical-retention duty** — non-clinical PII can be erased; clinical records are retained per law and the conflict is documented to the data subject. |
| **Data Protection Officer** | A designated **DPO** owns compliance, breach response, and ODPC liaison. Contact published to patients. |
| **Breach notification** | Procedure to notify the **Office of the Data Protection Commissioner (ODPC) within 72 hours** of becoming aware of a breach posing risk, and affected data subjects without undue delay. Tied to IR plan (§10). |
| **Registration** | Hospital registered as **data controller** with the ODPC. |
| **Data residency / cross-border** (§48–49) | Primary data hosted in-country / KDPA-adequate jurisdiction; cross-border transfer only with safeguards + (where required) consent/authorization. Storage driver (§7 foundation) configured for compliant region. |
| **Records of processing** | Maintained processing register; DPIA for high-risk processing. |
| **Security safeguards** (§41) | This entire document. |

### 9.2 MOH (Kenya) & sectoral

- Conformance with Ministry of Health data and reporting standards; SHA (Social Health Authority) integration per SHA technical/security requirements; KMPDC record-keeping expectations.
- **Medical record retention ≥ 10 years** (foundation §11) — enforced by soft-delete + archival, never hard-delete clinical data.

### 9.3 HIPAA principles (applied where practical)

KDPA governs legally; HIPAA Security Rule safeguards are adopted as good practice: **Administrative** (risk analysis, workforce training, access management, sanctions), **Physical** (facility/workstation/device controls), **Technical** (access control, audit controls, integrity, transmission security). Minimum-necessary access maps to least privilege + branch scope.

### 9.4 OWASP

OWASP Top 10 mapping in §11; ASVS used as the application-security yardstick.

---

## 10. Logging, monitoring & incident response

### 10.1 Audit & security logging

- **Dual trail** (foundation §11): **Spatie Activity Log** for model changes + a dedicated **immutable `audit_logs`** stream for security/PHI-access events.
- **`audit_logs` is append-only/immutable:** no `UPDATE`/`DELETE` from the app DB user; consider WORM storage / hash-chaining (each row hashes the previous) for tamper-evidence. Retention aligns with clinical/legal needs.
- **Captured security events:** logins (success/fail), MFA challenges, password/role changes, **every PHI read** (who/what/when/branch/justification), break-the-glass overrides, permission changes, signed-URL issuance, payment events, webhook verifications, admin actions, exports.
- **Log hygiene:** **no secrets, no full PHI, no tokens** in application logs. PII scrubbed/redacted. Logs themselves are access-controlled.

### 10.2 Monitoring & SIEM

- Centralized, structured (JSON) logging shipped to a **SIEM-ready** pipeline (ELK/OpenSearch/cloud SIEM). Correlation rules + alerting for: brute force, impossible travel, mass-record access (snooping), privilege changes, failed webhook signatures, anomalous export volume, error spikes.
- App/infra health and security metrics; real-time alerting to on-call + DPO for security events.

### 10.3 Incident response plan

1. **Prepare** — IR runbook, roles (DPO, IR lead, eng on-call, comms), contacts, this document.
2. **Detect & analyze** — SIEM alert or report → triage severity, confirm, scope.
3. **Contain** — revoke tokens/sessions, isolate hosts, rotate compromised secrets, block IPs.
4. **Eradicate** — remove cause (patch, kill malicious account), validate.
5. **Recover** — restore from clean backup (§8), monitor for recurrence.
6. **Notify** — **ODPC within 72h** + affected data subjects (KDPA); regulators/insurers as required.
7. **Post-incident** — blameless review, root-cause, corrective actions, update controls. Evidence preserved (immutable logs) for forensics/legal.

---

## 11. Vulnerability management

- **Dependency scanning:** automated SCA in CI — `composer audit` (PHP), `npm audit` / Dependabot/Renovate (JS), container image scanning (Trivy/Grype). Critical/high CVEs block merge or trigger expedited patching SLA (critical ≤ 7 days).
- **SAST/secret scanning:** static analysis (PHPStan/Larastan, ESLint security rules) + secret scanning (gitleaks) in the pipeline (foundation §14 CI gates).
- **DAST / penetration testing:** external pen-test **at least annually** and after major releases/architecture changes; remediate per severity SLA. Bug-bounty / responsible-disclosure channel optional.
- **Patch management:** Laravel/PHP/Node/OS/DB patched on a defined cadence; security advisories monitored.

### 11.1 OWASP Top 10 (2021) checklist mapping

| OWASP risk | Afya HMS controls |
|---|---|
| **A01 Broken Access Control** | RBAC (Spatie) + Policies + **branch scope** + server-side checks + UUID public IDs + IDOR-safe 404s (§3) |
| **A02 Cryptographic Failures** | TLS 1.2+/HSTS, AES-256 at rest, Argon2id, key management, no weak ciphers (§4) |
| **A03 Injection** | Eloquent/prepared statements, FormRequest validation, output encoding, CSP (§5) |
| **A04 Insecure Design** | Threat model, privacy by design, secure-by-default, layered architecture (§0–1, §12) |
| **A05 Security Misconfiguration** | Secure headers, `APP_DEBUG=false`, hardened CORS, no public buckets, least-priv DB user (§4–7) |
| **A06 Vulnerable & Outdated Components** | SCA scanning, patch SLAs, image scanning (§11) |
| **A07 Identification & Auth Failures** | Sanctum, MFA/TOTP, lockout, strong password policy, session timeouts (§2) |
| **A08 Software & Data Integrity Failures** | Signed webhooks, idempotency, dependency pinning + integrity, signed releases (§6, §11) |
| **A09 Logging & Monitoring Failures** | Immutable audit log, SIEM, alerting, IR plan (§10) |
| **A10 SSRF** | Outbound allowlists, validate/deny internal targets for any URL-fetch feature, no user-controlled outbound URLs to internal ranges |

---

## 12. Privacy by design & by default

- **Data minimization & purpose limitation** baked into schema and APIs — PHI fields gated, exports restricted and audited.
- **Default privacy:** least-privilege + branch scope means a user sees only their branch's data needed for their role; sensitive specialties require a care relationship.
- **Consent-first:** processing requires recorded consent; communication/marketing consent is separate and revocable.
- **Pseudonymization/UUIDs** for external exposure; **National ID never used as a primary key** (foundation §3).
- **Transparency:** patients can view who accessed their records (access log), exercise data-subject rights via the portal, and reach the DPO.
- **DPIA** performed for high-risk processing; privacy reviewed at design time for every new module.
- **Retention by design:** 10-year clinical retention + soft-delete/archival; non-clinical PII subject to defined, shorter retention then purge.

---

## 13. Security responsibilities & cadence (summary)

| Activity | Cadence |
|---|---|
| Dependency/SCA scan | Every CI run |
| Secret scan / SAST | Every CI run |
| Backup restore drill | Quarterly |
| Penetration test | Annually + on major change |
| Access review (roles, branch grants, admin accounts) | Quarterly |
| Key/secret rotation review | Quarterly (immediate on compromise) |
| DR / IR tabletop exercise | Annually (tabletop semi-annual) |
| KDPA processing register / DPIA review | Annually + on new processing |
| Password expiry (staff) | 90 days |
| Idle / absolute session timeout | 15 min / 8 h |

---

*End of document 22 — Security Architecture. Consistent with `00-foundation.md` §11. Changes here must be reflected in the RBAC matrix (`08`) and any auth/audit deliverables.*
