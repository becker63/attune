# Validation results

Source revision: `4d9964102a9cbeaf32a527623d0a8df5866e4071`; infrastructure SHA-256: `cd7e6bda6808df5ff3e32eb06059d97bfddb53c85fabaa03e7c637931703ca39`; host: `aarch64-linux`.

| Check | Status | Reason |
|---|---|---|
| evaluation | PASS |  |
| installer-guard | PASS |  |
| science | PASS |  |
| worker | PASS |  |
| receipts | PASS |  |
| dashboards | PASS |  |
| queries | PASS |  |
| secrets | PASS |  |
| git-signatures | PASS |  |
| emulation | PASS |  |
| services | PASS |  |
| garage | PASS |  |
| persistence | PASS |  |
| science-integration | PASS |  |
| gitops | PASS |  |
| installer | NOT RUN | enable --installer |
| installer-attune-a | PASS |  |
| installer-attune-b | PASS |  |
| installer-attune-c | PASS |  |
| Physical ThinkCentre installation | NOT RUN | No physical disk operations authorized during development |
| Host enrollment and live Garage membership | BLOCKED | Requires verified physical machine identities and measured storage capacity |
| Operational off-cluster backup | BLOCKED | Requires independent destination; disposable restore fixture is tested separately |
| BuildBuddy CAS artifact download | NOT RUN | Receipt API access does not establish CAS byte retrieval; local evidence ingestion is supported |

See validation.json for derivations, store paths, tool versions, image hashes and logs.
