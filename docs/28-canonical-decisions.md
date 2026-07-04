# 28 — Canonical Decisions, Patches & Cross-Cutting Rules

> **Authority:** Subordinate to `00-foundation.md` only. This document patches and
> supersedes any conflicting declaration in `08-rbac-matrix.md` and
> `17-queue-management-design.md`. Where this document and those two conflict,
> this document wins. Where this document and `00-foundation.md` conflict,
> `00-foundation.md` wins.
>
> **Purpose:** To consolidate every cross-cutting decision, permission name
> reconciliation, pipeline enforcement rule, and architectural constraint that
> was found inconsistent or absent across the existing design documents. Every
> other deliverable (01–27) must be updated to align with this file before
> any module is built.
>
> **Product:** Afya HMS · **Context:** Private multi-branch hospital, Kenya
> **Document version:** 1.0 · **Status:** Mandatory baseline — read before writing any code

---

## Table of contents

1. [Document authority chain](#1-document-authority-chain)
2. [Permission definition authority rule](#2-permission-definition-authority-rule)
3. [Canonical queue permission names](#3-canonical-queue-permission-names)
4. [Corrected queue RBAC matrix](#4-corrected-queue-rbac-matrix)
5. [Hospital-admin wildcard removal](#5-hospital-admin-wildcard-removal)
6. [Pipeline forward-only rule](#6-pipeline-forward-only-rule)
7. [Department-context enforcement rule](#7-department-context-enforcement-rule)
8. [System-actor and inter-module contract rule](#8-system-actor-and-inter-module-contract-rule)
9. [Visit creation ownership](#9-visit-creation-ownership)
10. [Radiology department and ENUM expansion](#10-radiology-department-and-enum-expansion)
11. [Records officer queue access](#11-records-officer-queue-access)
12. [Patient queue self-tracking permission](#12-patient-queue-self-tracking-permission)
13. [Reporting permission reconciliation](#13-reporting-permission-reconciliation)
14. [Visit closure ownership](#14-visit-closure-ownership)
15. [No-show grace window defaults](#15-no-show-grace-window-defaults)
16. [Held ticket resume scoring rule](#16-held-ticket-resume-scoring-rule)
17. [Cross-branch transfer acceptance design decision](#17-cross-branch-transfer-acceptance-design-decision)
28. [TV board display token endpoint](#28-tv-board-display-token-endpoint)
19. [Sequence scope format — canonical rule](#19-sequence-scope-format--canonical-rule)
20. [Redis degraded-mode rule](#20-redis-degraded-mode-rule)
21. [WebSocket PHI exposure rule](#21-websocket-phi-exposure-rule)
22. [Aging tick broadcast guard rule](#22-aging-tick-broadcast-guard-rule)
23. [ETA remaining service time rule](#23-eta-remaining-service-time-rule)
24. [Reverb horizontal scaling declaration](#24-reverb-horizontal-scaling-declaration)
25. [Queue module bootstrap process](#25-queue-module-bootstrap-process)
26. [Inter-module event contract](#26-inter-module-event-contract)
27. [Summary of changes per document](#27-summary-of-changes-per-document)

---

## 1. Document authority chain

The authority order across all Afya HMS design documents is as follows. When
any two documents conflict, the one higher in the chain wins without exception.

| Rank | Document | Scope |
|---|---|---|
| 1 | `00-foundation.md` | All cross-cutting constants, architecture style, roles, tenancy, security baseline |
| 2 | `29-canonical-decisions.md` *(this file)* | Reconciles conflicts between 08 and 17; declares missing rules |
| 3 | `08-rbac-matrix.md` | Permission catalogue and role-permission matrix |
| 4 | `17-queue-management-design.md` | Queue module design and data model |
| 5 | All other module docs (01–27) | Module-specific design; must not contradict 1–4 |

No module design document may introduce a new permission name, a new role, or
a new cross-cutting architectural pattern. All such decisions are made at rank
1 or rank 2 and referenced downward.

---

## 2. Permission definition authority rule

**Rule:** Permission strings are defined exclusively in `08-rbac-matrix.md`.
No other document may introduce a new permission name. All module design
documents reference permissions by their canonical name as it appears in
Doc 08. If a design document references a permission that does not exist in
Doc 08, that permission does not exist in the system until Doc 08 is formally
updated and this document acknowledges the addition.

**Consequence:** Any permission string found in Doc 17 that does not exist in
Doc 08 is considered a design error. The canonical name from Doc 08 is used
in all code, all policies, and all FormRequests. Doc 17 must be updated to
use the Doc 08 name, not the other way around.

**Enforcement:** The `RolesAndPermissionsSeeder` is the only authoritative
source of permissions in code. It is derived 1:1 from Doc 08. If a permission
is not in the seeder, it does not exist at runtime. Pest tests assert that the
seeder and Doc 08 never silently diverge.

---

## 3. Canonical queue permission names

The following table resolves every naming conflict between Doc 08 and Doc 17.
The Doc 08 name is canonical. Doc 17 must be updated to use these names. The
old Doc 17 name is listed only for traceability during the update process.

| Canonical Name (Doc 08 — use this) | Old Doc 17 Name (retire this) | Status in Doc 08 before this patch |
|---|---|---|
| `queue.read` | `queue.view` | Existed — no change |
| `queue.list` | *(not in Doc 17)* | Existed — no change |
| `queue.issue` | `queue.issue` | **Missing — must be added to Doc 08** |
| `queue.call-next` | `queue.call` | Existed — Doc 17 must update its name |
| `queue.advance` | `queue.advance` | **Missing — must be added to Doc 08** |
| `queue.manage` | `queue.manage` | Existed — no name change; scope clarified in §7 |
| `queue.void` | `queue.void` | **Missing — must be added to Doc 08** |
| `queue.override-priority` | `queue.prioritize` | Existed — Doc 17 must update its name |
| `queue.track-own` | *(not in Doc 17)* | **Missing — must be added to Doc 08** |

**Three permissions are being formally added to Doc 08 by this patch:**

- **`queue.issue`** — the right to create a new queue ticket for a patient at a
  given department. This is a write action separate from managing or advancing
  tickets. The Receptionist and Nurse hold this permission as their primary
  queue capability. Hospital Admin holds it for operational cover only.

- **`queue.advance`** — the right to complete the current department ticket and
  route the patient to the next department in the pipeline. This is held by
  every clinical role that occupies a station, scoped to their own department
  only by the department-context enforcement rule in §7.

- **`queue.void`** — the right to cancel or void a ticket. This is a
  destructive, audited action distinct from general queue management. It is
  held by Hospital Admin and Receptionist only.

- **`queue.track-own`** — the right of a Patient portal user to view the
  current state, position, and ETA of their own active ticket. This is
  own-data only, enforced by ownership policy on top of the permission.

---

## 4. Corrected queue RBAC matrix

This matrix supersedes the queue section of Doc 08 §6 in its entirety.
All other module matrices in Doc 08 remain unchanged unless explicitly
noted in a later section of this document.

Legend: **HA** Hospital Admin · **DR** Doctor · **NU** Nurse · **RC** Receptionist ·
**RO** Records Officer · **PH** Pharmacist · **LT** Lab Technician · **RD** Radiologist ·
**CA** Cashier/Accountant · **PT** Patient

| Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `queue.read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.list` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.issue` | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `queue.call-next` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.advance` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| `queue.manage` | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `queue.void` | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `queue.override-priority` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `queue.track-own` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

### Notes on specific role decisions

**Hospital Admin and `queue.issue`:** Hospital Admin may issue tickets only as
an operational cover action when no Receptionist is available. Every ticket
issued by Hospital Admin is flagged in `queue_events` with the actor role for
audit. This is an exception workflow, not a normal one. Future implementations
may add a UI warning when Hospital Admin performs this action.

**Doctor and `queue.manage`:** Doctors do not hold `queue.manage`. They serve
patients at their station and advance tickets to the next department. They do
not have the authority to reorder, transfer, or park other patients' tickets
outside their own station. Queue management authority belongs to clinical
supervisors (Nurse with `queue.manage`) and administrative supervisors
(Hospital Admin).

**Receptionist and `queue.void`:** The Receptionist may void tickets they
issued or tickets at the Reception department. They cannot void tickets that
have already progressed beyond Reception into clinical departments. Voiding a
ticket that has progressed past Reception requires Hospital Admin. This
constraint is enforced at the policy layer, not only by permission.

**Radiologist and `queue.call-next` / `queue.advance`:** The Radiologist holds
these permissions in anticipation of the Radiology department being added to
the pipeline (see §10). Until the Radiology module is live, these permissions
are granted but have no active station to exercise them on.

**Records Officer and `queue.read` / `queue.list`:** This is a correction to
the original Doc 08 matrix where Records Officer had no queue permissions.
A Records Officer must be able to locate which department a patient is
currently in to manage medical record retrieval. Read and list access is
granted. Records Officers have no action permissions on the queue.

---

## 5. Hospital-admin wildcard removal

**This section formally overrides the seeder declaration in Doc 08 §7.**

The `hospital-admin` role must NOT be seeded with a wildcard permission set.
The wildcard `['*']` approach grants Hospital Admin every clinical-authoring
permission in the system, including actions that require a professional
license under Kenyan law. This is a compliance violation and a legal risk.

**Explicitly excluded from Hospital Admin:** The following permissions must
never be granted to the `hospital-admin` role under any circumstance, whether
through the seeder, through the UI, or through any `Gate::before` override.

| Permission | Why it is excluded |
|---|---|
| `emr.sign` | Requires a licensed medical practitioner's electronic attestation |
| `emr.create` | Clinical authoring — not an administrative function |
| `emr.amend` | Amendment of signed clinical records — licensed clinician only |
| `prescriptions.create` | Prescribing authority — licensed doctor only |
| `prescriptions.dispense` | Controlled substance dispensing — licensed pharmacist only |
| `prescriptions.verify` | Clinical drug interaction verification — licensed pharmacist only |
| `lab.enter-result` | Result entry requires accredited lab technician |
| `lab.approve-result` | Result approval and release requires accredited lab technician |
| `radiology.report` | Radiology reporting requires a licensed radiologist |
| `radiology.sign-report` | Report attestation requires a licensed radiologist |
| `mar.administer` | Medication administration record — registered nurse only |
| `diagnoses.create` | Clinical diagnosis — licensed doctor only |
| `diagnoses.update` | Amendment of clinical diagnosis — licensed doctor only |

**Gate::before is prohibited for hospital-admin.** No super-admin short-circuit
may be wired for the `hospital-admin` role. Authorization for Hospital Admin
must always be evaluated against explicit permission grants, never bypassed.
This constraint must be documented in the seeder as a comment and enforced
as a Pest test that asserts Hospital Admin does not hold any of the excluded
permissions listed above.

**The seeder must be updated** to replace the `['*']` wildcard with an explicit
list of all permissions not in the excluded table above. The explicit list
approach keeps the audit trail honest and prevents newly added clinical
permissions from being silently granted to Hospital Admin on the next seed.

---

## 6. Pipeline forward-only rule

This is a new binding rule with no equivalent in any prior document. It governs
the movement of patients through the clinical pipeline and applies to the Queue
module, the QueueService, all queue API endpoints, and all queue-related policies.

### 6.1 The rule

**Once a queue ticket for a given visit has been marked as completed at a
department, no new queue ticket may be issued for that same visit at that
same department or any department that precedes it in the canonical pipeline.**

The canonical pipeline order is fixed as follows:

```
Reception (1) → Triage (2) → Doctor (3) → Radiology (4) →
Laboratory (5) → Pharmacy (6) → Billing (7)
```

Each department is assigned a fixed pipeline position number. A visit may only
move forward through these positions — never backward to a position it has
already completed. A visit may skip positions (for example, going directly from
Doctor to Billing if no lab work is needed), but it may never re-enter a
position it has already exited in the completed state.

### 6.2 What triggers the rule

The rule is enforced at the point of ticket issuance. Before any new ticket
is created for a visit, the system must check whether the visit already has
a ticket for the requested department in a terminal state. The terminal states
that activate the forward-only lock are `completed` and `transferred`. The
states `cancelled` and `no_show` do not activate the lock — a patient who
was cancelled at Triage may be re-issued a Triage ticket.

Specifically, a new ticket issue for department D on visit V is blocked if:

- A ticket exists for visit V at department D with state `completed`, OR
- A ticket exists for visit V at any department with a pipeline position
  number less than D's position number and state `completed`

The second condition is what makes the rule forward-only. If a patient has
completed Triage, they cannot be re-issued a Reception ticket either — they
have already passed Reception and Triage both.

### 6.3 Permitted re-entries — explicit exceptions

The following re-entry scenarios are permitted and do not violate the
forward-only rule because they create a new visit, not a new ticket on
the existing visit.

**Doctor re-consultation after lab results:** A patient who has completed the
Doctor stage, proceeded to Lab, received results, and needs the Doctor to
review those results is NOT re-routed by queue transfer on the same visit.
Instead, the system opens a NEW visit for the re-consultation. The new visit
begins at Doctor (position 3), skipping Reception and Triage, because the
patient is already known and triaged. The original visit is not modified.

**Return to pharmacy for substitution:** A patient sent back from the front
door because a prescribed drug is unavailable is processed as a new visit
at the Pharmacy stage, not as a backward movement on the original visit.

**Inpatient ward routing:** Inpatient movements are governed by the Inpatient
module, not the Queue module. Ward-to-ward transfers do not use queue tickets
and are outside the scope of this rule.

### 6.4 The administrative override

The forward-only rule may be overridden only by a user holding `queue.void`
AND `queue.override-priority` simultaneously. Both permissions are required.
An override must include a mandatory written reason which is recorded in
`queue_events` with event type `pipeline_override`. This event is
non-deletable and surfaced in the audit trail.

An override does not move the existing completed ticket backward. It creates
a new ticket at the target department for the same visit, with the override
reason embedded. The completed ticket remains completed. The pipeline trail
for that visit will show an out-of-order hop, which is visible on the audit
dashboard as an anomaly requiring review.

Overrides are reported to Hospital Admin via the audit module on the same
business day they occur.

### 6.5 Error response for forward-only violations

When the forward-only rule blocks a ticket issuance, the API must return a
422 Unprocessable Entity response. The response body must include a
machine-readable error code of `PIPELINE_FORWARD_ONLY_VIOLATION`, a
human-readable message explaining that the patient has already been processed
at the requested department on the current visit, and the list of departments
the visit has already completed, so the calling client can inform the user.

The error must never be silently swallowed or logged-only. It must surface to
the UI so the Receptionist or clinical staff understands why the ticket cannot
be issued and is guided toward the correct action, which is opening a new visit.

### 6.6 Idempotency and the duplicate issue guard

The forward-only rule works alongside but is distinct from the existing
duplicate-issue idempotency guard in Doc 17 §10.6. The idempotency guard
handles the case of two concurrent requests trying to create the same ticket.
The forward-only rule handles the case of a historically completed stage being
re-entered. Both checks must run, in the following order:

First, the idempotency guard checks whether an active ticket already exists
for this visit at this department. If one does, it returns the existing ticket.
Second, the forward-only rule checks whether a completed ticket exists. If one
does, it blocks issuance with the 422 error above. The idempotency check runs
first because an active ticket means no new ticket should be created, and this
is a softer condition than a forward-only violation.

---

## 7. Department-context enforcement rule

**Rule:** Holding a queue action permission is necessary but not sufficient
to perform a queue action. The action must also be contextually valid for the
department the actor is currently assigned to.

Specifically, a user may only call, advance, hold, or complete a ticket that
belongs to the department of the station they currently occupy. A Pharmacist
holding `queue.call-next` may call the next Pharmacy ticket only. They may not
call a Doctor ticket, even though the permission string is the same.

This constraint is enforced at the policy layer, not by permissions alone.
The permission check answers the question of whether the role is capable of
performing an action. The department-context check answers the question of
whether this specific ticket is within the actor's operational scope.

The department-context check must be applied on all of the following endpoints:
call-next, call specific ticket, serve, advance, complete, recall, hold, resume,
no-show, and transfer. It does not apply to read and list endpoints.

The only roles exempt from the department-context check are Hospital Admin
(who must be able to manage the queue across all departments for supervisory
purposes) and users holding `queue.manage` who are in a declared supervisor
session (initiated by an explicit supervisor-mode action, not implied by role
alone). Supervisor sessions are time-limited and audited.

---

## 8. System-actor and inter-module contract rule

**This section adds new text to `00-foundation.md §2` and must be treated
as part of the foundation from this point forward.**

### 8.1 Authorization boundary

Authorization is checked exactly once per HTTP request, at the outermost
boundary: the Controller or a dedicated Policy class called by the Controller.
Service classes, repository classes, and model classes do not perform
authorization checks. They receive pre-authorized data and act on it. A
service that performs its own authorization check in addition to the
controller's check is creating duplicate enforcement that will diverge over time.

### 8.2 Internal cross-module calls are trusted

When one service calls another service within the same HTTP request cycle,
the called service does not re-check permissions. Authorization was verified
at the entry point. The called service trusts that its caller has already
enforced access control. This applies to inter-module calls such as
QueueService calling VisitService to open a walk-in visit — the QueueService
has already enforced that the requesting user holds `queue.issue`. The
VisitService does not need to re-verify `visits.create`.

### 8.3 System-initiated actions

Some actions are initiated by the system rather than by a user. Examples
include the scheduled no-show sweep, the aging tick, the Redis rehydrate
command, and visit auto-closure on pipeline completion. These actions have
no authenticated user context. They must not check user permissions. They are
governed by business rules declared in the service layer, not by RBAC. Every
system-initiated action must record a null `actor_user_id` in any audit event
it generates, with a non-null `system_actor` label identifying which
system process initiated the action.

### 8.4 Module boundaries and service interfaces

Modules must not import concrete Service classes from other modules. Where one
module needs a capability owned by another module, it must depend on an
interface declared at the module boundary. The owning module provides the
implementation; the consuming module depends only on the interface. This keeps
module boundaries explicit and testable. Violating this rule by importing a
concrete cross-module service class is grounds for a blocking code review
comment.

---

## 9. Visit creation ownership

**Rule:** Visit records are owned and created exclusively by the Patients module
through the VisitService. No other module creates visit records directly.

When the Queue module receives a ticket issue request without an existing
visit ID (walk-in scenario), QueueService calls the VisitService interface
declared at the Patients module boundary to open a walk-in visit. This call
is a cross-module internal call and is trusted per §8.2. QueueService stores
the returned visit ID on the ticket but does not touch the visits table directly.

When a ticket issue request includes an existing visit ID, QueueService validates
that the visit exists, belongs to the correct patient and branch, and is in an
open state. It does not create or modify the visit record.

The VisitService is responsible for enforcing that a patient may not have two
simultaneously open visits at the same branch on the same day. This is a
Patients module rule and is not re-enforced inside the Queue module.

The `visits.create` permission in the RBAC matrix grants the right to call the
VisitService to open a visit. It does not grant direct write access to the
visits table. The table is only ever written to by the VisitService, regardless
of which upstream service initiated the call.

---

## 10. Radiology department and ENUM expansion

**Rule:** The `RAD` department code must be added to every ENUM, lookup table,
config entry, and documentation reference that currently enumerates pipeline
departments, effective immediately and before any queue-related table is created
in the database.

The corrected canonical department list is as follows:

| Department | Code | Pipeline position | Ticket prefix | Staffed by |
|---|---|---|---|---|
| Reception | `REC` | 1 | `REC-NNN` | `receptionist` |
| Triage | `TRI` | 2 | `TRI-NNN` | `nurse` |
| Doctor | `DOC` | 3 | `DOC-NNN` | `doctor` |
| Radiology | `RAD` | 4 | `RAD-NNN` | `radiologist` |
| Laboratory | `LAB` | 5 | `LAB-NNN` | `lab-technician` |
| Pharmacy | `PHA` | 6 | `PHA-NNN` | `pharmacist` |
| Billing | `BIL` | 7 | `BIL-NNN` | `cashier` |

Radiology is placed at position 4, between Doctor and Laboratory, reflecting
the clinical workflow where a doctor orders imaging before or alongside lab
work. Radiology is skippable — most visits will not pass through it.

The Radiology queue is active only when the Radiology module is live. Until
then, the `RAD` station may exist in configuration but carries zero tickets.
The department ENUM must include `RAD` from the first migration so no
schema alteration is required when Radiology is activated.

The canonical pipeline order in `00-foundation.md §13` must be updated to read:
Reception → Triage → Doctor → Radiology → Laboratory → Pharmacy → Billing.

---

## 11. Records officer queue access

This section corrects the omission in the original Doc 08 queue matrix where
Records Officer held no queue permissions.

Records Officers are granted `queue.read` and `queue.list` only. These
permissions allow them to determine which department a patient is currently in,
view ticket states across the branch, and locate patients for medical record
retrieval purposes.

Records Officers are not granted any action permissions on queue tickets. They
cannot issue, call, advance, hold, void, or prioritize tickets.

This correction is already reflected in the full corrected matrix in §4.

---

## 12. Patient queue self-tracking permission

The `patient` role is granted the new `queue.track-own` permission declared
in §3. This permits a Patient portal user to call the ticket detail endpoint
for their own active ticket to view their current department, queue position,
and estimated wait time.

The `queue.track-own` permission is enforced alongside an ownership policy
that verifies the requested ticket's `patient_id` matches the authenticated
user's `patient_id`. Holding the permission does not grant access to any other
patient's ticket. The permission is necessary but the ownership check is also
always required.

Patient portal users subscribed to the `private-patient.{patientId}` WebSocket
channel receive real-time queue position and ETA updates. Channel authorization
verifies that the authenticated patient's ID matches the channel parameter.
No staff-grade data is ever pushed on this channel.

---

## 13. Reporting permission reconciliation

Doc 17 §9 references a permission named `reporting.queue` on the queue metrics
endpoint. This permission does not exist in Doc 08. The correct permission for
this endpoint is `reporting.operational`, which already exists in Doc 08 and is
granted to all roles with an operational role in the system.

Doc 17 must be updated to replace `reporting.queue` with `reporting.operational`
on the metrics endpoint definition. No new permission is created. No seeder
change is required.

---

## 14. Visit closure ownership

The `visits.close` permission is currently granted only to Hospital Admin and
Receptionist in the Doc 08 matrix. This creates an operational problem: the
visit remains open after the patient completes Billing because neither the
Cashier nor the system automatically closes it.

**Rule:** Visit closure at the end of the pipeline is a system-initiated action,
not a user-permission-gated action. When QueueService processes the completion
of a ticket at the final department in a visit's pipeline path (the last ticket
in the chain for that visit has no `next_ticket_id` and the state moves to
`completed`), it calls VisitService internally to close the visit. This is a
system-actor call per §8.3 and does not require `visits.close` to be held by
the acting user.

Manual visit closure by a Receptionist or Hospital Admin through the UI
continues to require `visits.close`. The permission remains in the matrix
unchanged. The seeder change is that visit auto-closure at pipeline end is now
a declared business rule executed by the system, removing the dependency on
a human performing the close action.

---

## 15. No-show grace window defaults

Doc 17 §10.1 references a grace window of 90 seconds for Triage and Doctor
without declaring values for other departments. Ninety seconds is clinically
insufficient and creates false no-show events for patients momentarily away
from the waiting area. The following defaults are canonical and configurable
per branch via settings:

| Department | Default grace window | Rationale |
|---|---|---|
| Reception | 3 minutes | Administrative confirmation, low clinical risk |
| Triage | 5 minutes | Clinical risk of false no-show for walk-in urgent patients |
| Doctor | 5 minutes | Patient may be in adjacent triage or washroom |
| Radiology | 5 minutes | Patients may be changing for imaging |
| Laboratory | 3 minutes | Sample collection area is typically adjacent |
| Pharmacy | 3 minutes | Dispensing window is visible from waiting area |
| Billing | 3 minutes | Administrative, lowest clinical urgency |

These values are stored in `config/queue.php` under
`grace_windows.{department_code}` in seconds. Branch-level overrides are stored
in the branch settings table and take precedence over config values.

For Red (emergency) category patients, the grace window is zero. The moment a
Red ticket is called and the patient does not present within 60 seconds, a
supervisor alert fires. The ticket is not moved to `no_show` automatically —
it requires a manual no-show declaration by a user holding `queue.manage`
after physical confirmation that the patient is not at the station.

---

## 16. Held ticket resume scoring rule

Doc 17 §2.3 declares that a held ticket parks its position metadata but does
not specify the score that is applied when the ticket resumes and re-enters
the waiting state in the Redis sorted set.

**Rule:** When a held ticket resumes, its score is recalculated as the
original score at the time it was placed on hold, minus a hold credit. The
hold credit is calculated as half the number of seconds the ticket spent in
the held state, capped at one quarter of the band stride constant (21,600
seconds). The cap prevents a long-held ticket from accruing enough credit
to skip patients who arrived while it was on hold.

The rationale is fairness: a patient held because they stepped out or were
awaiting a prerequisite result should not return to the absolute back of the
queue, which would be punitive for a situation often outside their control.
However, they also should not be allowed to jump ahead of patients who have
been waiting the entire time. The capped half-credit formula places them
somewhere in the middle of their band — behind those who waited continuously
but ahead of those who arrived after them.

Every ticket resumption from held writes a `queue_events` row with event type
`resumed` and records the hold duration and the new score in the meta field.

---

## 17. Cross-branch transfer acceptance design decision

Doc 17 §10.5 describes a cross-branch transfer scenario where, if the acting
user does not have rights on the target branch, the transfer is "queued for the
target branch's reception to accept." This mechanism was described without any
supporting API endpoint, data model state, or event definition.

**Decision:** The cross-branch transfer acceptance queue mechanism is deferred
to a post-MVP phase. It will not be built in the initial release.

**MVP rule for cross-branch transfers:** A cross-branch transfer may only be
performed by a user who holds rights on both the source branch and the target
branch simultaneously. If the acting user does not hold rights on the target
branch, the transfer request is rejected with a 403 Forbidden response and an
error message indicating that the transfer requires authorization on the target
branch. The acting user must contact the target branch's reception, who can
initiate an inbound ticket issuance on the target side independently.

A ticket on the source side is marked `transferred` immediately upon the
rejection, with a reason of `pending_manual_coordination`. This leaves a clean
audit trail that the patient was referred cross-branch without creating an
orphaned transfer state in the system.

The full acceptance queue mechanism will be designed in a dedicated document
when it is prioritized for implementation.

---

## 28. TV board display token endpoint

Doc 17 §7.2 declares that the public-safe TV board channel uses a signed
display token but does not define how the token is issued, its structure,
its lifespan, or how a display device obtains and renews one.

**Canonical declaration:**

A display token is a signed, long-lived, branch-and-department-scoped token
that grants read-only access to the public projection of one department's queue
board at one branch. It carries no user identity and no PHI. It is issued
by a dedicated endpoint accessible only to users holding `settings.update`
(Hospital Admin only). The token is valid for 24 hours and is automatically
renewable by the display device before expiry without human intervention.

The endpoint is `POST /api/v1/queue/display-tokens` and accepts a branch ID
and department code as parameters. The response includes the signed token and
its expiry time. The token is stored on the display device and presented
as a bearer token on requests to the public board snapshot endpoint and as a
WebSocket connection parameter for the board channel subscription.

Tokens may be revoked by Hospital Admin at any time. Revocation takes effect
on the next request from the display device. Revoked tokens are kept in a
deny-list in Redis with a TTL equal to the original token lifespan to handle
tokens that have been revoked but not yet expired.

---

## 19. Sequence scope format — canonical rule

**This section adds a formal rule to `00-foundation.md §6`.**

All scope strings used with the `SequenceService` must follow this format:

`{entity_type}:{qualifier_1}:{qualifier_2}:...`

Scope strings are case-sensitive, colon-delimited, contain no spaces, and
use lowercase for all components. The entity type must be one of the reserved
values listed below. No new entity type may be introduced without updating this
document.

| Entity type | Example scope | Reset cycle |
|---|---|---|
| `patient` | `patient:2026` | Annual |
| `invoice` | `invoice:NRB:2026` | Annual per branch |
| `receipt` | `receipt:NRB:2026` | Annual per branch |
| `lab` | `lab:NRB:260622` | Daily per branch |
| `rad` | `rad:NRB:260622` | Daily per branch |
| `prescription` | `prescription:NRB:2026` | Annual per branch |
| `queue` | `queue:NRB:TRI:2026-06-22` | Daily per branch per department |
| `admission` | `admission:NRB:2026` | Annual per branch |
| `po` | `po:NRB:2026` | Annual per branch |
| `claim` | `claim:NRB:2026` | Annual per branch |

Daily reset is implicit for scopes whose last qualifier is a date string. A
new date string produces a new scope key, which starts at 1. No nightly job
is needed to reset the counter. An optional cleanup job prunes stale scope
rows older than 90 days.

All scope strings must use the `Africa/Nairobi` date for the date qualifier.
Never use UTC dates for scope strings, as a date rollover at 21:00 UTC
(midnight Nairobi) would cause sequence gaps on the current day and
phantom resets that confuse operators.

---

## 20. Redis degraded-mode rule

Doc 17 §7.1 mentions a `queue:rehydrate` artisan command that runs on deploy
or Redis recovery but does not define the system's behavior during the
Redis unavailability window.

**Rule:** The Queue module must operate in a degraded but functional mode when
Redis is unavailable. Degraded mode is defined as follows.

Ticket issuance falls back to MySQL sequence generation using the
`SequenceService` with a database lock. This is slower but correct. The ticket
is written to MySQL. The Redis ZADD is retried in the background via a queued
job. If Redis is unavailable for more than 60 seconds, an alert is sent to
Hospital Admin via the notification system.

The call-next operation falls back to a direct MySQL query that selects the
waiting ticket with the lowest `priority_score` and earliest `issued_at` for
the given branch and department. The Redis lock is bypassed. A database
transaction with a row-level lock is used to prevent two stations grabbing
the same ticket. Results are slower and do not benefit from the Redis ZSET
performance, but correctness is maintained.

WebSocket broadcasting is not affected by Redis queue storage unavailability
because Reverb uses a separate Redis connection for the pub-sub backplane.
However, if the Redis instance serving both is the same and it is down entirely,
WebSocket broadcasting is also unavailable. In this scenario, the frontend
polling fallback (Doc 17 §7.5) handles client updates automatically.

The `queue:health-check` artisan command must be scheduled to run every 30
seconds. It compares the Redis ZSET member count for each active department
against the MySQL count of tickets in the `waiting` state for the same
department and date. If they diverge by more than two tickets, the command
triggers an automatic `queue:rehydrate` for the affected department without
operator intervention.

---

## 21. WebSocket PHI exposure rule

**This section adds a compliance constraint arising from the intersection of
`00-foundation.md §11` and Doc 17 §7.2.**

Protected Health Information must not be transmitted in WebSocket event
payloads beyond the minimum necessary for the receiving party's clinical
function. The following rules govern what each channel may carry.

**Public board channels** (`board.{branch}.{dept}`) carry zero PHI. The only
patient-identifying information permitted is the ticket number, which is a
daily sequential counter and carries no inherent patient identity. Patient
names, ages, MRN numbers, and MTS categories are never transmitted on public
channels.

**Patient portal channels** (`private-patient.{patientId}`) carry only the
patient's own ticket information. The channel authorization verifies the
authenticated patient's identity before allowing subscription. Payload is
limited to ticket number, current department, position, ETA band, and status.
Clinical detail such as MTS category is not transmitted.

**Staff department channels** (`private-branch.{branchId}.dept.{dept}`) may
carry a minimal clinical identifier: display name (first name and last initial
only), age, and MTS category. Full name, national ID, MRN, and clinical notes
are never transmitted over WebSocket. Staff who need full patient detail must
load it through the standard authenticated REST endpoint.

All WebSocket channel subscriptions are authorized via Laravel Sanctum and the
`routes/channels.php` authorization callbacks. A channel authorization failure
returns a 403 response immediately without exposing channel metadata. Channel
authorization callbacks must check both authentication and the relevant RBAC
permission before allowing subscription.

PHI transmitted over staff channels is treated as data in transit and must be
served only over TLS connections. Reverb must be configured to refuse
non-TLS WebSocket connections in staging and production environments.

---

## 22. Aging tick broadcast guard rule

Doc 17 §4.2 defines a periodic aging tick that runs every 60 seconds to
recompute priority scores for long-waiting tickets. The tick dispatches a
`QueueReranked` broadcast event. At scale, this creates unnecessary broadcast
traffic when the aging computation produces no actual change in queue order.

**Rule:** The aging tick must compare the queue order before and after score
recomputation. A `QueueReranked` event must only be broadcast if at least one
ticket has changed its position relative to other tickets as a result of the
recomputation. If all scores changed (because all tickets aged by one step) but
no ticket's rank relative to others changed, no broadcast is emitted.

This comparison is performed on the Redis ZSET by capturing the ranked member
list before applying the new scores and comparing it to the ranked list after.
If the two ordered lists are identical, the tick completes silently. This
eliminates the majority of aging tick broadcasts under normal operating
conditions and significantly reduces WebSocket message volume at scale.

---

## 23. ETA remaining service time rule

Doc 17 §5.2 calculates the remaining service time of currently in-progress
tickets as half the average service time for the department. This memoryless
assumption is statistically incorrect for hospital service times, which
are approximately log-normally distributed, not exponentially distributed.

**Rule:** The remaining service time estimate for a ticket currently in service
must be calculated as the maximum of two values: the average service time for
the department minus the elapsed service time for that specific ticket, or
20 percent of the average service time as a minimum floor. The 20 percent floor
exists because no service interaction can be assumed to be nearly complete based
on elapsed time alone — a consultation that has run twice as long as average
may be a complex case that runs three times as long.

When multiple stations in a department have active tickets, the remaining
service time for the department as a whole is the average of the per-station
remaining estimates, divided by the number of active stations, as the
department's remaining-service contribution to the ETA formula.

This rule applies to the formula in Doc 17 §5.2 and supersedes the
`AST_d / 2` term used there.

---

## 24. Reverb horizontal scaling declaration

**This section adds a scaling constraint to `00-foundation.md §1`.**

Laravel Reverb in its default single-server configuration cannot serve the
number of concurrent WebSocket connections required at the 10,000-user scale
target stated in `00-foundation.md`. This is a known architectural constraint
that must be acknowledged before the system is deployed at scale.

**Declaration:** Before the system reaches 500 concurrent WebSocket
subscribers across all branches, a load test must be conducted against the
Reverb deployment to determine its single-node capacity under realistic board
subscription patterns. The load test must simulate concurrent staff dashboards,
TV board subscriptions, and patient portal tracking sessions.

If the single-node capacity is insufficient, Reverb must be scaled
horizontally using its shared Redis backplane mode, where multiple Reverb
nodes all connect to the same Redis pub-sub instance and any node can receive
and deliver any message. The Docker Compose configuration must be updated
to support multiple Reverb containers behind a load balancer before the
system reaches 80 percent of the tested single-node capacity.

If Reverb horizontal scaling proves insufficient or operationally complex at
the target scale, migration to a managed WebSocket service such as Pusher or
Ably is an acceptable alternative. The broadcasting abstraction in Laravel
means this migration requires only configuration changes and driver updates,
not application code changes, provided no Reverb-specific APIs were used
directly in application code.

---

## 25. Queue module bootstrap process

Doc 17 and the foundation both assume that stations exist and are configured
before the queue can operate, but neither document defines how stations are
created, who creates them, or what the process is for a new branch.

**Rule:** Station setup for a new branch is an administrative bootstrap
operation performed by Hospital Admin before any queuing begins at that
branch. It is not a queue operation and does not require any queue permissions.
It requires `settings.update`.

The bootstrap process for a new branch is as follows. First, the Hospital Admin
navigates to the branch administration section and selects the station
configuration panel. Second, they create at least one station for each
department that will be active at this branch. Third, they assign a department
code, a station code, a display name, and a sort order to each station. Fourth,
they set each station to `closed` initially. Stations are opened at the start
of each shift by the staff member who occupies them.

A branch that has no stations configured in a given department cannot receive
tickets for that department. The ticket issuance endpoint must validate that
at least one station exists (in any state) for the target department at the
target branch before issuing a ticket. If no station exists, the response is
a 422 error with code `NO_STATION_CONFIGURED`.

A `queue:bootstrap-check` artisan command is provided that prints a report of
departments with missing stations per branch. This command is run as part of
branch activation in the deployment process.

---

## 26. Inter-module event contract

**This section adds rules to `00-foundation.md §2`.**

Modules must communicate with each other only through the following two
mechanisms. Direct service-class imports across module boundaries are
prohibited.

**Domain events** are used for side-effects that occur after a primary action
completes. When QueueService advances a ticket from Doctor to Lab, it fires a
domain event. The Lab module listens to this event and prepares the worklist
entry. The Queue module does not know about or depend on the Lab module. The
domain event is the contract between them. Domain events are defined in the
owning module and are the only part of that module's internal logic that other
modules may reference.

**Module boundary interfaces** are used when one module needs to query or
command another module synchronously within a request. The interface is
declared in a shared contracts layer. The implementing module registers its
implementation in a service provider. The consuming module injects the
interface, never the implementation. When a new module is added, it declares
its boundary interface first, before writing any implementation, so other
modules can depend on the contract rather than waiting for the implementation.

No module may import from another module's `Services`, `Repositories`,
`Models`, or `Actions` namespaces directly. Only the module's declared
boundary interfaces and domain event classes may be imported by other modules.
Violations of this rule are detected by a static analysis rule enforced in CI.

---

## 27. Summary of changes per document

The following table summarises which sections of the existing documents must be
updated as a result of this canonical decisions document. Updates must be made
before the affected module is built.

### `00-foundation.md` updates required

| Section | Change |
|---|---|
| §2 Layered architecture | Add §8.1 through §8.4 from this document |
| §6 Sequence generation | Add canonical scope format table from §19 |
| §13 Queue pipeline | Add Radiology to the canonical pipeline order |

### `08-rbac-matrix.md` updates required

| Section | Change |
|---|---|
| §5 Permission list — Queue | Add `queue.issue`, `queue.advance`, `queue.void`, `queue.track-own` |
| §6 RBAC matrix — Queue | Replace queue section entirely with §4 of this document |
| §7 Seeder strategy | Remove `hospital-admin` wildcard; replace with explicit list; add clinical-exclusion comment and Pest test requirement |

### `17-queue-management-design.md` updates required

| Section | Change |
|---|---|
| §1.4 Departments and stations | Add RAD row with corrected pipeline position |
| §2.3 Transitions | Replace all Doc-17-only permission names with canonical Doc 08 names |
| §3 Ticket generation | No change required |
| §4.3 Emergency bypass | Confirm `queue.override-priority` name (already matches) |
| §5.2 ETA formula | Replace `remaining_curr = AST_d / 2` with rule from §23 |
| §7.2 Broadcasting channels | Add WebSocket PHI rules from §21 |
| §9 API endpoints | Update permission column for every row to use canonical names |
| §10.1 No-show | Update grace window values to match §15 |
| §10.5 Cross-branch transfer | Replace acceptance queue description with decision from §17 |

---

*End of 28 — Canonical Decisions, Patches & Cross-Cutting Rules.*
*This document supersedes conflicting content in `08-rbac-matrix.md` and*
*`17-queue-management-design.md`. Consistent with `00-foundation.md` v1.0.*
*Document version: 1.0 · Status: Mandatory baseline*
