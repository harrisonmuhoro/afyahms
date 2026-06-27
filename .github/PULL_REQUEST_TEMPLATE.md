## Summary
<!-- A short summary of the change -->

## Type
<!-- feat | fix | docs | style | refactor | perf | test | build | ci | chore -->

## Module(s)
<!-- e.g. Phase 1 / Patients, EMR, Billing -->

## Linked Issue
<!-- Closes #123 -->

## Checklist
- [ ] Conventional commit message
- [ ] Tests added/updated (≥80% coverage on changed code)
- [ ] RBAC permissions declared/enforced (`{module}.{action}`)
- [ ] BranchScope respected (no cross-branch reads)
- [ ] i18n keys present (`en` + `sw`)
- [ ] Audit log entry on security-relevant events
- [ ] No secrets in code
- [ ] PII / PHI access logged
- [ ] No hardcoded user-facing strings (lint passes)
- [ ] Architecture test passes (modules isolated)
- [ ] Docs updated if user-facing