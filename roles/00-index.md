# 🏥 Afya HMS — Role Do's & Don'ts Index
> System: Afya HMS | Stack: Laravel 11 + React/Vite | Auth: Spatie RBAC + Sanctum  
> Last Updated: July 2026

---

## Role Documentation

| # | Role | File | Scope Summary |
|---|------|------|---------------|
| 01 | **Superadmin** | `01-superadmin.md` | System-wide config, user management, security, multi-branch oversight |
| 02 | **Doctor** | `02-doctor.md` | Clinical decisions, diagnosis, prescriptions, lab/radiology orders, discharge |
| 03 | **Nurse** | `03-nurse.md` | Triage, vitals, medication administration, patient monitoring, shift handover |
| 04 | **Receptionist** | `04-receptionist.md` | Patient registration, check-in, queue management, appointment scheduling |
| 05 | **Records** | `05-records.md` | Medical record custody, archiving, release authorization, data integrity |
| 06 | **Pharmacist** | `06-pharmacist.md` | Prescription verification, dispensing, inventory, drug safety, counseling |
| 07 | **Lab Technician** | `07-lab-technician.md` | Sample handling, analysis, result reporting, QC, radiation/biohazard safety |
| 08 | **Radiologist** | `08-radiologist.md` | Imaging acquisition, radiation safety, PACS, radiological reporting |
| 09 | **Cashier** | `09-cashier.md` | Invoicing, payment collection, insurance claims, financial reconciliation |
| 10 | **Patient** | `10-patient.md` | Portal access, appointments, medication adherence, self-service conduct |

---

## Design Principles Behind These Rules

### 1. Least Privilege
Every role accesses only what their job function strictly requires. Clinical data is partitioned from financial data. Branch data is isolated between branches.

### 2. Forward-Only Pipeline
The patient journey through queue stations is one-directional per visit. No role may re-open a completed department stage or create a new ticket for an already-completed stage in the same visit.

### 3. Immutable Audit Trail
No record is hard-deleted. Every mutation is logged with actor identity, timestamp, before/after values, and reason. This applies to clinical, financial, and administrative records equally.

### 4. Identity Verification as Non-Negotiable
Every clinical role (nurse, pharmacist, lab, radiology) must verify patient identity before every interaction — minimum two identifiers. This is not optional at any point.

### 5. Separation of Concerns
- Clinical decisions → Doctor only
- Drug dispensing → Pharmacist only  
- Billing → Cashier only  
- Record custody → Records Officer only  
- System config → Superadmin only  

No role inherits another role's write permissions without explicit RBAC grant.

---

## Quick Accountability Matrix

| Action | Who Can Do It |
|--------|--------------|
| Create/disable user accounts | Superadmin |
| Set system-wide config | Superadmin |
| Write diagnosis/prescription | Doctor |
| Administer medications | Nurse (with valid prescription) |
| Register new patient | Receptionist |
| Dispense drugs | Pharmacist |
| Release medical records | Records Officer (with authorization) |
| Collect payment | Cashier |
| Report lab results | Lab Technician |
| Issue radiology reports | Radiologist |
| Hard-delete any record | **Nobody** |

---

*These documents are living references — update them whenever RBAC policies or clinical workflows change.*
