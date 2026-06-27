# 05 — Non-Functional Requirements (NFRs)

> **Authority:** Subordinate to `00-foundation.md`. All targets here are consistent with the canonical stack (Laravel 11 / PHP 8.3+, MySQL 8+, Redis, React 18 PWA, Docker, Sanctum, Spatie Permission/Activity Log).
> **Scope:** Private multi-branch hospital, Kenya. 100–300 patients/day. 1,000 users today, architected for 10,000+.
> **Document version:** 1.0 · **Status:** MVP architecture baseline

---

## 0. How to read this document

- **Every NFR has a stable ID** (`NFR-{CATEGORY}-{NN}`). IDs are immutable once published; deprecate, never renumber.
- **Metric/Target** columns are *testable*. "Fast" is not a requirement; "p95 ≤ 300 ms" is.
- **Verification method** states *how compliance is proven* (load test, scan, audit, manual, monitoring assertion).
- **Priority:** `M` = MVP-blocking (must ship), `S` = should (next release), `C` = could (roadmap).
- **Environments:** targets refer to **production** unless stated. Staging mirrors prod topology at reduced scale.

### Category index

| Prefix | Category | Section |
|---|---|---|
| `NFR-PERF` | Performance | 1 |
| `NFR-SCAL` | Scalability | 2 |
| `NFR-AVAIL` | Availability & Reliability | 3 |
| `NFR-SEC` | Security | 4 |
| `NFR-COMP` | Compliance & Legal | 5 |
| `NFR-USE` | Usability & Accessibility | 6 |
| `NFR-MNT` | Maintainability | 7 |
| `NFR-OBS` | Observability | 8 |
| `NFR-PORT` | Portability | 9 |
| `NFR-LOC` | Localization & i18n | 10 |
| `NFR-PWA` | Offline / PWA | 11 |
| `NFR-DATA` | Data Integrity | 12 |
| `NFR-AUD` | Auditability | 13 |
| `NFR-CAP` | Capacity & Cost | 14 |

### Reference load model (sizing baseline for all targets below)

| Parameter | MVP value | Scale-out target |
|---|---|---|
| Patients/day (per busy branch) | 100–300 | 300 |
| Named users (system-wide) | 1,000 | 10,000+ |
| Concurrent active users (peak) | ~200 | 2,000 |
| Concurrent users — burst ceiling design | 1,000 | 10,000 |
| Write transactions/sec (sustained peak) | ~50 | ~500 |
| Read requests/sec (sustained peak) | ~300 | ~3,000 |
| Queue board live viewers (per branch) | ~30 | ~150 |

---

## 1. Performance — `NFR-PERF`

> Latency budgets are measured **server-side** (request received → response flushed) at the application edge, excluding client network. End-to-end (E2E) targets that include network are called out explicitly. p95/p99 are computed over rolling 5-minute windows under the reference load model.

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-PERF-01 | Performance | API read endpoint latency (cached/simple reads, e.g. patient lookup, queue status) | p50 ≤ 80 ms · **p95 ≤ 300 ms** · p99 ≤ 600 ms | k6/JMeter load test at 300 req/s; Prometheus histogram assertion in CI gate | M |
| NFR-PERF-02 | Performance | API write endpoint latency (single-transaction writes, e.g. create appointment, dispense) | p50 ≤ 150 ms · **p95 ≤ 500 ms** · p99 ≤ 1000 ms | Load test at 50 writes/s; histogram assertion | M |
| NFR-PERF-03 | Performance | Complex/aggregate reads (reporting list, EMR full-history fetch) | p95 ≤ 1200 ms · p99 ≤ 2500 ms | Load test against seeded 2-yr dataset; query EXPLAIN review | M |
| NFR-PERF-04 | Performance | Heavy analytical/report generation (cross-branch, date-range BI) | ≤ 5 s interactive **or** async job with progress if > 5 s | Manual + job-duration metric; UX async fallback enforced | S |
| NFR-PERF-05 | Performance | Queue real-time update propagation (state change → all subscribed boards/clients) | **≤ 1 s** end-to-end (Redis publish → WebSocket delivery) p95 | Synthetic broadcast probe measuring publish→ack RTT | M |
| NFR-PERF-06 | Performance | Authentication (login, token issue incl. password hash verify) | p95 ≤ 600 ms (Argon2id/bcrypt cost tuned to ≤ 250 ms hash) | Load test; hash-cost benchmark on prod-class CPU | M |
| NFR-PERF-07 | Performance | Patient/global search (typeahead) | p95 ≤ 400 ms for ≥ 3-char query over 1M patient rows | Seeded dataset load test; index coverage verified via EXPLAIN | M |
| NFR-PERF-08 | Performance | Sustained throughput (per app instance) | ≥ 150 req/s per instance at < 70% CPU sustained | Single-node saturation test | M |
| NFR-PERF-09 | Performance | System throughput (scaled) | ≥ 3,000 req/s aggregate at scale-out target | Distributed load test across N instances | S |
| NFR-PERF-10 | Performance | Database query budget per request | ≤ 15 queries/request avg; **zero N+1** in hot paths | Laravel Telescope/`db.query` count assertion in feature tests | M |
| NFR-PERF-11 | Performance | Frontend initial load (SPA shell, cold) | **LCP ≤ 2.5 s**, TTI ≤ 3.5 s, FCP ≤ 1.8 s on 4G mid-tier device | Lighthouse CI budget (fails build below threshold) | M |
| NFR-PERF-12 | Performance | Frontend route transition (warm, cached) | ≤ 300 ms perceived; route-level code-split chunks ≤ 250 KB gzip | Lighthouse + bundle-size budget gate | M |
| NFR-PERF-13 | Performance | Main JS bundle (initial entry) | ≤ 200 KB gzip; total initial transfer ≤ 1 MB | `vite build` size-limit CI check | M |
| NFR-PERF-14 | Performance | Cache hit ratio (Redis) for hot reference data (drug catalog, ICD-10, branches, RBAC) | ≥ 90% hit rate | Redis `keyspace_hits/misses` metric over 24 h | S |
| NFR-PERF-15 | Performance | PDF/document generation (invoice, prescription, lab report) | ≤ 3 s sync, or async queued with ≤ 30 s SLA | Job duration metric; manual timing | S |
| NFR-PERF-16 | Performance | M-Pesa STK push initiation responsiveness (our side) | ≤ 800 ms to dispatch + return checkout token (excl. Safaricom RTT) | Load test mocking Daraja; trace span timing | M |
| NFR-PERF-17 | Performance | Notification (SMS/email) enqueue latency | enqueue ≤ 100 ms (sent async); delivery handled by provider SLA | Queue-depth + enqueue metric | S |
| NFR-PERF-18 | Performance | No request blocks on slow side-effects | All notifications, audit writes, broadcasts, PDF gen run on **queues**, never inline | Code review + absence of sync provider calls in request path | M |

---

## 2. Scalability — `NFR-SCAL`

> The modular monolith scales **horizontally as identical stateless instances** behind a load balancer. All shared state lives in Redis or MySQL — never in process memory or local disk.

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-SCAL-01 | Scalability | Stateless application tier | Any instance serves any request; **no sticky sessions required** | Kill-and-replace instance under load; session via Redis/Sanctum token survives | M |
| NFR-SCAL-02 | Scalability | Horizontal app scaling | Add instances → near-linear throughput to ≥ 8 instances (≥ 0.8 scaling efficiency) | Scale-up load test, measure req/s per added node | M |
| NFR-SCAL-03 | Scalability | Sessions, cache, queues, broadcast state externalized to Redis | Zero local file/session/cache driver in prod; `SESSION_DRIVER=redis`, `CACHE_STORE=redis`, `QUEUE_CONNECTION=redis` | Config audit; prod `.env` lint | M |
| NFR-SCAL-04 | Scalability | Read scaling via MySQL read replicas | Read-heavy traffic (reports, search, lists) routed to replica(s); writes to primary | Verify Laravel read/write connection split; replica lag metric | S |
| NFR-SCAL-05 | Scalability | Replica lag tolerance | Replica lag ≤ 2 s p95; read-after-write consistency enforced on critical flows (route to primary) | `Seconds_Behind_Master` metric; targeted "sticky to primary" reads tested | S |
| NFR-SCAL-06 | Scalability | Queue worker horizontal scaling | Worker pool scales independently of web tier; backlog drains under burst | Burst test: enqueue 10k jobs, measure drain time vs worker count | M |
| NFR-SCAL-07 | Scalability | Concurrent user ceiling (design) | Support **1,000 concurrent now, 10,000 concurrent** at scale-out without architecture change | Sustained-concurrency load test at both tiers | M |
| NFR-SCAL-08 | Scalability | Multi-branch data growth | Row-level (`branch_id`) isolation scales to ≥ 50 branches on shared DB without schema change | Seeded multi-branch dataset; index/partition review | S |
| NFR-SCAL-09 | Scalability | Database growth headroom | Largest tables (EMR, audit_logs, lab_results) indexed + partition/archival strategy for 10-yr retention | Schema review; growth projection doc; partition plan for `audit_logs` by month | S |
| NFR-SCAL-10 | Scalability | WebSocket/broadcast scaling | Broadcast layer (Redis pub/sub + WS server) scales to ≥ 2,000 concurrent socket connections | Socket flood test; connection-count metric | S |
| NFR-SCAL-11 | Scalability | Auto-scaling triggers | Scale-out policy on CPU > 70% (5 min) or req queue depth; scale-in with cooldown | Orchestrator (k8s HPA / compose-equivalent) policy config review | C |
| NFR-SCAL-12 | Scalability | No singleton bottlenecks | Sequence generation (`SequenceService` w/ `FOR UPDATE`) holds locks ≤ 50 ms; no global app-level lock | Concurrency test: 500 parallel patient creates, assert no gaps-beyond-tolerance, no deadlock | M |

---

## 3. Availability & Reliability — `NFR-AVAIL`

> Uptime SLO is measured against successful health-check + golden-path synthetic transactions, excluding pre-announced maintenance windows.

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-AVAIL-01 | Availability | Application uptime SLO | **≥ 99.5%** monthly (MVP) → **99.9%** at scale (≈ 43 min/mo downtime) | Uptime monitor (synthetic + health probe) monthly report | M |
| NFR-AVAIL-02 | Availability | Planned maintenance windows | ≤ 4 h/month, off-peak (00:00–04:00 EAT), announced ≥ 48 h ahead; excluded from SLO | Change calendar + notification record | M |
| NFR-AVAIL-03 | Reliability | Recovery Time Objective (RTO) | **≤ 1 hour** for full-service restoration after major incident | DR drill (semi-annual) measuring restore time | M |
| NFR-AVAIL-04 | Reliability | Recovery Point Objective (RPO) | **≤ 15 minutes** data loss max (binlog/PITR), ≤ 24 h for non-critical | Restore-from-backup test; verify last-committed timestamp | M |
| NFR-AVAIL-05 | Reliability | Database backups | Automated daily full + binlog/incremental for point-in-time recovery; encrypted at rest | Backup job success metric; monthly restore drill | M |
| NFR-AVAIL-06 | Reliability | Backup retention | Daily ≥ 30 days, weekly ≥ 12 weeks, monthly ≥ 12 months; clinical archives per 10-yr rule | Backup catalog audit | M |
| NFR-AVAIL-07 | Reliability | Backup verification | Every backup integrity-checked; **restore test ≥ monthly** (no untested backup) | Documented restore-drill log | M |
| NFR-AVAIL-08 | Reliability | Off-site / cross-region backup copy | ≥ 1 geographically separate copy (cloud bucket, different region) | Storage location audit | S |
| NFR-AVAIL-09 | Reliability | Disaster Recovery plan | Documented, tested DR runbook; warm standby or rapid-provision IaC | Semi-annual DR exercise sign-off | S |
| NFR-AVAIL-10 | Reliability | No single point of failure (scaled tier) | ≥ 2 app instances, ≥ 2 queue workers, Redis + DB with failover/replica | Topology review; chaos kill-test | S |
| NFR-AVAIL-11 | Reliability | Graceful degradation | If Redis/broadcast down → queue board falls back to polling; if SMS provider down → queue & retry; core clinical workflow stays usable | Fault-injection test per dependency | M |
| NFR-AVAIL-12 | Reliability | Idempotent external callbacks | M-Pesa & SHA webhooks idempotent (by `CheckoutRequestID`/`mpesa_receipt`/claim ref); duplicate delivery causes no double-effect | Replay duplicate webhook in test; assert single effect | M |
| NFR-AVAIL-13 | Reliability | Failed-job durability & retry | Jobs retried with backoff; permanent failures land in `failed_jobs` + alert; no silent loss | Inject failing job; verify retry + failed_jobs + alert | M |
| NFR-AVAIL-14 | Reliability | Health & readiness endpoints | `/health` (liveness) + `/ready` (DB/Redis/queue checks) for LB & orchestrator | Endpoint test; LB config consumes them | M |
| NFR-AVAIL-15 | Reliability | Zero-downtime deploys | Rolling deploy with migrations backward-compatible; no full outage on release | Deploy under synthetic load; assert 0 failed golden-path txns | S |
| NFR-AVAIL-16 | Reliability | Error budget policy | Burn of monthly error budget freezes feature deploys until reliability restored | SLO dashboard + documented policy | C |

---

## 4. Security — `NFR-SEC`

> Aligned with `00-foundation §11`. Baseline references **OWASP ASVS L2** and the **OWASP Top 10 (2021)**. PHI = Protected Health Information.

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-SEC-01 | Security | Encryption in transit | **TLS 1.2+ (prefer 1.3)** on all external traffic; HSTS enabled; no plaintext HTTP | SSL Labs grade ≥ A; header scan | M |
| NFR-SEC-02 | Security | Encryption at rest — sensitive columns | PHI/PII sensitive columns encrypted via Laravel encrypted casts (AES-256-GCM) | Schema/cast audit; DB row inspection shows ciphertext | M |
| NFR-SEC-03 | Security | Encryption at rest — storage/volumes | DB volume + document storage encrypted (provider-managed or LUKS) in prod | Infra config audit | M |
| NFR-SEC-04 | Security | Clinical document access | All clinical files via **time-limited signed URLs**; no public buckets | Attempt direct/expired URL access → denied | M |
| NFR-SEC-05 | Security | Authentication | Laravel Sanctum token auth; secure cookie flags (HttpOnly, Secure, SameSite) for SPA session | Auth flow review; cookie inspection | M |
| NFR-SEC-06 | Security | Multi-Factor Authentication | **MFA (TOTP) mandatory** for `hospital-admin`, `doctor`, `pharmacist`; optional/encouraged others | Role-gated MFA enforcement test | M |
| NFR-SEC-07 | Security | Password policy | Min 12 chars, complexity, breach-check (HIBP-style), expiry, history reuse block | Policy unit tests; registration/reset validation | M |
| NFR-SEC-08 | Security | Password storage | Argon2id (or bcrypt cost ≥ 12); never plaintext/reversible | Hash inspection; config audit | M |
| NFR-SEC-09 | Security | Session management | Idle timeout (configurable, default 30 min), absolute timeout, device + IP tracking, login history, remote logout | Manual + automated session-expiry test | M |
| NFR-SEC-10 | Security | Rate limiting | Global + per-route throttles: login ≤ 5/min/IP+account, API default ≤ 60/min/user, OTP ≤ 5/15 min | Throttle test returns 429 at threshold | M |
| NFR-SEC-11 | Security | Brute-force / account lockout | Progressive backoff + lockout after N failures; alert on credential-stuffing pattern | Automated failed-login simulation | M |
| NFR-SEC-12 | Security | RBAC enforcement | Every endpoint guarded by `{module}.{action}` permission (Spatie); deny-by-default | Authorization feature tests per endpoint; no unguarded write routes | M |
| NFR-SEC-13 | Security | Tenant isolation | `BranchScope` prevents cross-branch data access; bypass only with `branch.view-all` | Cross-branch access attempt test → denied/empty | M |
| NFR-SEC-14 | Security | Input validation | All write endpoints use FormRequests; output encoded; parameterized queries only (no raw concat) | Static analysis + SQLi/XSS test suite | M |
| NFR-SEC-15 | Security | OWASP Top 10 coverage | No High/Critical findings for A01–A10 (2021) at release | OWASP ZAP/DAST scan + SAST gate in CI | M |
| NFR-SEC-16 | Security | Security headers | CSP, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy set | Header scanner assertion | M |
| NFR-SEC-17 | Security | CSRF protection | CSRF tokens for cookie-based state-changing requests; SameSite cookies | Framework config + test | M |
| NFR-SEC-18 | Security | Dependency vulnerability management | No known High/Critical CVEs in deps at release; auto-scan weekly | `composer audit` + `npm audit` + Dependabot CI gate | M |
| NFR-SEC-19 | Security | Secrets management | No secrets in code/repo; env/secret-store only; rotation policy | Repo secret-scan (gitleaks) in CI; vault/SSM use | M |
| NFR-SEC-20 | Security | Webhook authenticity | M-Pesa/SHA webhooks signature/source-IP verified + signed routes | Forged-webhook rejection test | M |
| NFR-SEC-21 | Security | Least privilege (data & infra) | DB users, service accounts, API tokens scoped minimally; no shared admin creds | Access-grant review | S |
| NFR-SEC-22 | Security | PHI access logging | Every read/export of PHI logged to immutable `audit_logs` (who, what, when, branch, IP) | Audit-trail verification (see §13) | M |
| NFR-SEC-23 | Security | Penetration testing | Independent pen-test before go-live, then annually; criticals remediated pre-release | Pen-test report + remediation sign-off | S |
| NFR-SEC-24 | Security | Data export controls | Bulk export/print of PHI permission-gated, rate-limited, and audited | Export attempt logged + permission test | S |
| NFR-SEC-25 | Security | Transport of backups & exports | Backups/exports encrypted in transit and at rest; signed-URL or secure channel only | Pipeline config audit | M |

---

## 5. Compliance & Legal — `NFR-COMP`

> Primary: **Kenya Data Protection Act (DPA) 2019** + Data Protection (General) Regulations 2021. Secondary: **MOH** standards, **HIPAA** principles where practical. Aligned with `00-foundation §11`.

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-COMP-01 | Compliance | KDPA 2019 — lawful basis & consent | Patient consent captured & versioned for data processing/marketing/communication; withdrawable | Consent records audit; UI flow review | M |
| NFR-COMP-02 | Compliance | KDPA — data subject rights | Support access, rectification, erasure*, portability requests (*erasure subordinate to legal retention) | DSAR workflow test; documented SOP | M |
| NFR-COMP-03 | Compliance | KDPA — data minimization & purpose limitation | Only necessary fields collected; documented processing register | Data-map / RoPA document review | M |
| NFR-COMP-04 | Compliance | KDPA — breach notification | Detect + notify Data Commissioner within **72 hours**; affected subjects per regs | Incident-response runbook + tabletop drill | M |
| NFR-COMP-05 | Compliance | KDPA — cross-border transfer | Data residency Kenya-preferred; cross-border only with adequacy/consent safeguards | Hosting-region attestation; transfer assessment | S |
| NFR-COMP-06 | Compliance | Medical record retention | **≥ 10 years** retention; clinical data **never hard-deleted** (soft-delete + archive) | Retention-policy config; hard-delete absence test on clinical models | M |
| NFR-COMP-07 | Compliance | Minors' records retention | Retain per stricter rule (≥ 10 yr or until age of majority + statutory period, whichever longer) | Retention rule review | S |
| NFR-COMP-08 | Compliance | MOH / regulatory reporting | Support required statutory clinical/operational reports & data formats | Report catalog vs MOH requirements review | S |
| NFR-COMP-09 | Compliance | HIPAA-principle alignment | Access controls, audit, integrity, transmission security applied to PHI ("where practical") | Mapping doc HIPAA Security Rule ↔ controls | C |
| NFR-COMP-10 | Compliance | SHA / insurance data handling | Insurance/claim PHI handled under same protection + consent; SHA data shared per scheme rules | SHA data-flow review | M |
| NFR-COMP-11 | Compliance | Audit trail for compliance | Immutable, tamper-evident audit log retained ≥ retention period; produces compliance evidence | Audit log retention + integrity check (§13) | M |
| NFR-COMP-12 | Compliance | Privacy by design & default | DPIA conducted for high-risk processing; privacy controls default-on | DPIA document; default-config review | S |
| NFR-COMP-13 | Compliance | Vendor/processor agreements | DPAs with sub-processors (SMS, email, storage, payment) | Contract register review | S |
| NFR-COMP-14 | Compliance | Patient data access transparency | Patient portal lets patients see their data & (where applicable) who accessed it | Portal feature review | C |

---

## 6. Usability & Accessibility — `NFR-USE`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-USE-01 | Accessibility | WCAG conformance | **WCAG 2.1 Level AA** across all clinical/admin screens | axe-core CI scan (0 critical), manual audit per release | M |
| NFR-USE-02 | Accessibility | Keyboard operability | All interactive flows fully keyboard-navigable; visible focus order logical | Keyboard-only walkthrough of golden paths | M |
| NFR-USE-03 | Accessibility | Screen-reader support | Semantic HTML + ARIA where needed; forms labeled; live regions for queue updates | NVDA/VoiceOver test on key flows | S |
| NFR-USE-04 | Accessibility | Color contrast | Text ≥ 4.5:1, large text/UI ≥ 3:1; never color-as-sole-indicator (triage uses label + color) | Contrast checker; triage shows text label too | M |
| NFR-USE-05 | Usability | Responsive design | Usable 360 px (mobile) → 1920 px+ (desktop/board); no horizontal scroll at standard breakpoints | Cross-viewport test matrix | M |
| NFR-USE-06 | Usability | Touch targets | Interactive targets ≥ 44×44 px on touch devices | Manual + automated measure | S |
| NFR-USE-07 | Usability | Error handling UX | Validation errors inline, specific, actionable; mirror backend FormRequest messages | UX review; Zod↔FormRequest parity check | M |
| NFR-USE-08 | Usability | Task efficiency — clinical hot paths | Reception check-in ≤ 60 s; doctor open EMR ≤ 3 clicks; dispense ≤ 5 actions | Timed usability test with representative users | S |
| NFR-USE-09 | Usability | Consistency | Single design system (Tailwind + `components/ui`); shared icon registry; no emojis | Component-library audit; lint for emojis | M |
| NFR-USE-10 | Usability | Loading & feedback states | Skeletons/spinners for waits > 300 ms; optimistic UI where safe; clear async progress | UX review | S |
| NFR-USE-11 | Usability | Dark/light theme | Theme toggle persisted; AA contrast met in both themes | Visual + contrast test both modes | S |
| NFR-USE-12 | Usability | Reduced-motion support | Honor `prefers-reduced-motion`; no essential info conveyed by motion alone | Setting toggle test | C |
| NFR-USE-13 | Usability | Queue board readability | Public queue display legible at distance (large type, high contrast, auto-refresh) | Display review at typical viewing distance | M |
| NFR-USE-14 | Usability | Print/PDF fidelity | Invoices, prescriptions, lab/radiology reports print cleanly on A4/A5 | Print-render verification | M |

---

## 7. Maintainability — `NFR-MNT`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-MNT-01 | Maintainability | Modular monolith boundaries | Bounded modules per `00-foundation §1`; cross-module calls via services/contracts, not foreign internals | Dependency-direction lint / architecture test | M |
| NFR-MNT-02 | Maintainability | Layered architecture adherence | Controller→Service→Repository→Model flow enforced; no business logic in controllers; no Eloquent in controllers | Architecture test (Pest arch/`deptrac`) | M |
| NFR-MNT-03 | Maintainability | Test coverage | **≥ 80%** line coverage backend & frontend; critical clinical/billing paths ≥ 90% | Coverage report CI gate (fails < 80%) | M |
| NFR-MNT-04 | Maintainability | SOLID & DRY | No duplicated business logic; shared logic in services/actions/traits | Code review checklist; duplication scanner (PHPCPD) | M |
| NFR-MNT-05 | Maintainability | Code style | PHP PSR-12 via Pint; TS ESLint+Prettier strict, no `any` | CI lint gate (blocking) | M |
| NFR-MNT-06 | Maintainability | Static analysis | PHPStan/Larastan level ≥ 6; TS `strict` true; zero new errors | CI static-analysis gate | M |
| NFR-MNT-07 | Maintainability | Cyclomatic complexity | Method complexity ≤ 10 (warn), classes cohesive; flag god-classes | Metrics tool report; review | S |
| NFR-MNT-08 | Maintainability | Documented public contracts | OpenAPI/Swagger for REST API kept in sync; DTOs typed | Spec-vs-impl contract test | S |
| NFR-MNT-09 | Maintainability | Conventional commits + CI gates | Husky pre-commit (lint, type-check, tests); Conventional Commits enforced | Commit-lint + pre-commit hook config | M |
| NFR-MNT-10 | Maintainability | Reproducible builds & onboarding | `docker compose up` yields working dev env; documented setup ≤ 1 day onboarding | Fresh-clone build test | M |
| NFR-MNT-11 | Maintainability | Database migrations | All schema via versioned migrations; reversible; backward-compatible for rolling deploy | Migration up/down test; deploy compat review | M |
| NFR-MNT-12 | Maintainability | Configurability over hardcoding | Abstractions (storage/notification/payment/insurer) provider-swappable via config | Config-driven swap test (e.g. local→s3) | M |
| NFR-MNT-13 | Maintainability | Dependency freshness | Framework/libs patched within SLA (criticals ≤ 7 days); no EOL runtimes | Dependency dashboard review | S |
| NFR-MNT-14 | Maintainability | Logging discipline | Structured logs, no `dd()`/`console.log` in prod, no PHI in plain logs | Lint/grep gate; log review | M |

---

## 8. Observability — `NFR-OBS`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-OBS-01 | Observability | Structured logging | JSON structured logs with correlation/request ID across app+queue; centralized aggregation | Log sample review; trace-id propagation test | M |
| NFR-OBS-02 | Observability | Log levels & retention | Appropriate levels; app logs retained ≥ 30 days searchable; security/audit per retention rule | Log-store config audit | M |
| NFR-OBS-03 | Observability | No PHI/secrets in logs | PHI, passwords, tokens, card/M-Pesa secrets redacted from logs | Log-scan for sensitive patterns | M |
| NFR-OBS-04 | Observability | Metrics | RED metrics (Rate, Errors, Duration) per endpoint + system (CPU/mem/queue depth/Redis/DB) exported | Prometheus/metrics endpoint present; dashboard | M |
| NFR-OBS-05 | Observability | Business/clinical metrics | Patients/day, avg wait time, queue length, dispense counts, revenue exposed as metrics/dashboards | Dashboard review | S |
| NFR-OBS-06 | Observability | Distributed tracing | Trace request → service → DB/Redis/external (M-Pesa/SMS) with spans | Trace sampling review (OpenTelemetry) | S |
| NFR-OBS-07 | Observability | Error tracking | Exceptions captured to error tracker (e.g. Sentry) with context, deduped, alertable | Trigger test error → appears with stack+context | M |
| NFR-OBS-08 | Observability | Alerting | Alerts on SLO breach, error-rate spike, queue backlog, replica lag, disk/cert expiry, failed backups | Alert-rule config + test-fire | M |
| NFR-OBS-09 | Observability | Alert routing & on-call | Severity-tiered routing (page vs notify); documented escalation; no alert black holes | Routing config + runbook review | S |
| NFR-OBS-10 | Observability | Uptime/synthetic monitoring | External synthetic checks of golden paths every ≤ 1 min | Synthetic monitor config | M |
| NFR-OBS-11 | Observability | Queue/job observability | Queue depth, throughput, failed-job count, retry visible (Horizon or equivalent) | Dashboard review | M |
| NFR-OBS-12 | Observability | Audit observability | Security/PHI-access events queryable & dashboarded distinctly from app logs | Audit dashboard review | S |
| NFR-OBS-13 | Observability | Deployment markers | Releases/migrations annotated on dashboards for correlation | Deploy-event in monitoring | C |

---

## 9. Portability — `NFR-PORT`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-PORT-01 | Portability | Containerized runtime | App, queue worker, scheduler run from Docker images; `docker compose` for local, orchestratable for cloud | Build + run on clean host | M |
| NFR-PORT-02 | Portability | Cloud-agnostic | No hard dependency on a single cloud's proprietary service for core function | Architecture review | M |
| NFR-PORT-03 | Portability | Storage driver abstraction | `StorageManager` swaps `local`/`s3`/`r2`/`b2` via config, zero app-code change | Switch driver in test env; uploads work | M |
| NFR-PORT-04 | Portability | Notification provider abstraction | SMS (AfricasTalking) / email (Mailgun/Resend) swappable via `config/notifications.php` | Provider swap test | M |
| NFR-PORT-05 | Portability | Payment/insurer abstraction | `PaymentGateway`/`InsurerGateway` interfaces allow new providers without core changes | Interface review; mock impl test | S |
| NFR-PORT-06 | Portability | 12-factor config | All env-specific config via env vars; no env-specific code branches | Config audit | M |
| NFR-PORT-07 | Portability | Browser support | Latest 2 versions of Chrome, Edge, Firefox, Safari; mobile Chrome/Safari | Cross-browser E2E (Playwright) matrix | M |
| NFR-PORT-08 | Portability | DB portability discipline | Standard SQL/Eloquent; vendor-specific features documented & isolated | Migration/query review | C |
| NFR-PORT-09 | Portability | Local-dev parity | Local stack mirrors prod services (MySQL, Redis, storage) via compose | Compose file review | M |

---

## 10. Localization & i18n — `NFR-LOC`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-LOC-01 | Localization | Bilingual UI | Full **English + Kiswahili (`sw`)** coverage; runtime switchable | Language toggle test; missing-key scan = 0 | M |
| NFR-LOC-02 | Localization | No hardcoded strings | All user-facing text via react-i18next namespaces; backend messages translatable | Lint for hardcoded literals; key-coverage report | M |
| NFR-LOC-03 | Localization | Locale-aware formatting | Dates/times in `Africa/Nairobi` (UTC+3) display; numbers/currency `KES` formatted | Render test both locales | M |
| NFR-LOC-04 | Localization | Currency & money | All money `KES`, `DECIMAL(12,2)`, never floats; consistent formatting | Money-handling review | M |
| NFR-LOC-05 | Localization | Notification localization | SMS/email content available in patient's preferred language | Template review per channel | S |
| NFR-LOC-06 | Localization | Translation completeness gate | 100% key parity between `en` and `sw` before release | CI i18n parity check | M |
| NFR-LOC-07 | Localization | Pluralization & interpolation | Correct plural/interpolation rules per locale | i18n unit tests | S |
| NFR-LOC-08 | Localization | Extensible to more locales | Adding a locale requires translation files only, no code change | Architecture review | C |

---

## 11. Offline / PWA — `NFR-PWA`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-PWA-01 | Offline/PWA | Installable PWA | Valid manifest + service worker; installable on desktop/mobile; passes PWA audit | Lighthouse PWA check | M |
| NFR-PWA-02 | Offline/PWA | Offline app shell | App shell + static assets cached; UI loads offline (no white screen) | Offline reload test | M |
| NFR-PWA-03 | Offline/PWA | Cached read data offline | Recently viewed read data (e.g. patient summary, schedule) available offline read-only | Offline read test | S |
| NFR-PWA-04 | Offline/PWA | Background sync for writes | Writes made offline queued and synced when connectivity returns (background sync) | Offline-write → reconnect → persisted test | S |
| NFR-PWA-05 | Offline/PWA | Conflict & integrity on sync | Queued writes apply idempotently; conflicts detected (version/updated_at) and surfaced, never silently overwrite | Concurrent offline-edit conflict test | S |
| NFR-PWA-06 | Offline/PWA | Clear connectivity status | UI clearly indicates offline/online and pending-sync state | Visual state test | M |
| NFR-PWA-07 | Offline/PWA | No stale-data harm | Offline data timestamped "as of"; safety-critical actions (dispensing, dosing) require live confirmation | UX rule review | M |
| NFR-PWA-08 | Offline/PWA | Cache update strategy | New SW version activates cleanly; user prompted to refresh; no broken mixed-version state | Deploy-then-reload test | S |
| NFR-PWA-09 | Offline/PWA | Cache size & privacy | Offline cache bounded; sensitive cached PHI cleared on logout | Logout-clears-cache test | M |

---

## 12. Data Integrity — `NFR-DATA`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-DATA-01 | Data integrity | Referential integrity | FK constraints enforced (incl. `branch_id`); no orphan clinical/billing records | Schema audit; orphan-row query = 0 | M |
| NFR-DATA-02 | Data integrity | Transactional consistency | Multi-step writes (billing, dispensing, queue moves) wrapped in DB transactions; all-or-nothing | Failure-injection mid-transaction → no partial state | M |
| NFR-DATA-03 | Data integrity | Unique identifier integrity | Canonical IDs (patient, invoice, Rx, etc.) unique per scope; `SequenceService` sole writer with `FOR UPDATE` | Concurrency test; unique constraints present | M |
| NFR-DATA-04 | Data integrity | Money precision | All monetary values `DECIMAL(12,2)`; totals reconcile (sum of lines = invoice total) | Reconciliation test; no float columns | M |
| NFR-DATA-05 | Data integrity | Soft-delete for clinical data | Clinical/financial records soft-deleted (`deleted_at`), never hard-deleted | Hard-delete attempt blocked test | M |
| NFR-DATA-06 | Data integrity | Optimistic concurrency | Concurrent edits to same record detected (version/`updated_at`), lost-update prevented | Concurrent-edit test | S |
| NFR-DATA-07 | Data integrity | Idempotent operations | Payment callbacks, sync replays, retried jobs idempotent (no duplicate charges/records) | Duplicate-trigger test | M |
| NFR-DATA-08 | Data integrity | Validation at boundaries | Server-side FormRequest validation authoritative; client validation advisory only | Bypass-client → server rejects test | M |
| NFR-DATA-09 | Data integrity | Timezone & timestamp consistency | All timestamps stored UTC; `created_at/updated_at/deleted_at` on all domain tables | Schema audit | M |
| NFR-DATA-10 | Data integrity | Branch scoping integrity | No record created/updated without valid `branch_id` (except global reference data) | Insert-without-branch test → rejected | M |
| NFR-DATA-11 | Data integrity | Backup integrity (restorability) | Restored data byte/row-consistent with source (verified, not assumed) | Restore-and-diff drill | M |
| NFR-DATA-12 | Data integrity | Migration safety | Data migrations idempotent, tested on prod-scale copy, reversible/forward-fixable | Staging migration dry-run | M |

---

## 13. Auditability — `NFR-AUD`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-AUD-01 | Auditability | Model-change audit | Create/update/delete of clinical/financial models logged via Spatie Activity Log (old→new, actor) | Mutate record → activity entry asserted | M |
| NFR-AUD-02 | Auditability | Immutable security/PHI audit log | Dedicated append-only `audit_logs` for auth events & PHI access; no update/delete API | Attempt to modify entry → blocked | M |
| NFR-AUD-03 | Auditability | Audit completeness | Captures: actor, role, branch, action, target, timestamp (UTC), IP, user-agent, outcome | Field-presence assertion on sample events | M |
| NFR-AUD-04 | Auditability | PHI access traceability | Every patient-record view/export attributable to a user (answer "who saw this patient?") | Query audit by patient → full access history | M |
| NFR-AUD-05 | Auditability | Authentication audit | Login success/failure, logout, MFA events, password/role changes, lockouts logged | Auth-event log assertion | M |
| NFR-AUD-06 | Auditability | Privileged-action audit | Admin actions (role grants, branch config, data export, voids/refunds) logged with reason where applicable | Privileged-action log test | M |
| NFR-AUD-07 | Auditability | Tamper evidence | Audit integrity protected (append-only + restricted DB grants; optional hash-chain) | Integrity-control review | S |
| NFR-AUD-08 | Auditability | Audit retention | Audit logs retained ≥ medical-record retention period (≥ 10 yr) | Retention config audit | M |
| NFR-AUD-09 | Auditability | Non-repudiation of clinical entries | EMR entries attributable & time-stamped to authoring clinician; amendments append-only (no silent overwrite) | EMR amendment trail test | M |
| NFR-AUD-10 | Auditability | Audit accessibility for compliance | Authorized compliance/admin users can query/export audit trail for investigations & DSARs | Audit-query/export feature test | S |
| NFR-AUD-11 | Auditability | Audit isolation from app failure | Audit writes durable even if downstream side-effects fail; queued audit cannot be silently dropped | Fault-injection → audit persisted | M |

---

## 14. Capacity & Cost Efficiency — `NFR-CAP`

| NFR-ID | Category | Requirement | Metric / Target | Verification method | Pri |
|---|---|---|---|---|---|
| NFR-CAP-01 | Capacity | Resource headroom | Sustained CPU < 70%, memory < 80% at peak load before scale-out | Load-test resource metrics | S |
| NFR-CAP-02 | Capacity | Storage growth planning | Document + DB growth projected; alert at 75% disk; archival for old documents/audit | Capacity dashboard + alert | S |
| NFR-CAP-03 | Capacity | Connection pool sizing | DB/Redis connection limits sized for max workers+web; no pool exhaustion under peak | Saturation test; no "too many connections" | M |
| NFR-CAP-04 | Capacity | Graceful overload | Beyond capacity, system sheds load via throttling/queueing, not crash; returns 429/503 cleanly | Over-capacity test | S |
| NFR-CAP-05 | Capacity | Cost efficiency | Scale-in during off-peak; no idle over-provisioning beyond HA minimum | Utilization review | C |
| NFR-CAP-06 | Capacity | Asset & egress efficiency | Static assets CDN-cached, compressed (gzip/brotli), long-cache-hashed; images optimized | Asset-header + size audit | S |

---

## 15. Verification & governance summary

| Verification mechanism | NFRs primarily covered | Cadence |
|---|---|---|
| **Load/perf testing** (k6/JMeter) | PERF, SCAL, CAP | Per release + pre-scale |
| **CI quality gates** (lint, PHPStan/Larastan, coverage, bundle/Lighthouse budgets, i18n parity) | MNT, PERF, USE, LOC | Every PR (blocking) |
| **Security scanning** (SAST, DAST/ZAP, `composer/npm audit`, gitleaks) | SEC, COMP | Every PR + weekly |
| **Penetration test** (independent) | SEC | Pre-go-live + annual |
| **Accessibility audit** (axe-core + manual) | USE | Every release |
| **DR & restore drills** | AVAIL, DATA | Backup restore monthly; DR semi-annual |
| **Monitoring/alerting assertions** (SLO dashboards) | AVAIL, OBS, PERF | Continuous |
| **Architecture tests** (Pest arch / deptrac) | MNT, SCAL | Every PR |
| **Compliance review** (DPIA, RoPA, retention) | COMP, AUD | Pre-go-live + annual |
| **Chaos / fault injection** | AVAIL, DATA, PWA | Semi-annual |

### Acceptance principle

A release is **NFR-acceptable** only when **all `M` (MVP-blocking) NFRs pass their verification method** and no `M`-level regression is open. `S`/`C` NFRs are tracked on the roadmap and must not be silently dropped.

> **Consistency note:** Where any target here interacts with another deliverable (e.g., RBAC matrix `08`, security design, deployment/infra docs), `00-foundation.md` remains authoritative; this document refines measurable targets only.
