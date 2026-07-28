## 1. Close the TypeScript API

- [x] 1.1 Replace the root exports with the exact six-name inventory and add a declaration-level drift test
- [x] 1.2 Replace the inferred service alias with an explicit documented `Attune` interface and value in lifecycle order
- [x] 1.3 Collapse public lifecycle aliases into `Investigation<State>` and keep operation projections, registry metadata, factories, validators, and issuers private
- [x] 1.4 Add source TSDoc for the package, all six concepts, every public service member, parameters, returns, failures, relationships, and migration guidance
- [x] 1.5 Preserve the eight MCP operations and pass TypeScript, schema, Python parity, smoke, stdio, and service lifecycle tests

## 2. Make TSDoc the Documentation Model

- [x] 2.1 Replace the documentation model and extractor with package, symbol, member, example, relation, and exact provenance records sourced from declarations and TSDoc
- [x] 2.2 Preserve source-authored lifecycle order and render the package reference as the documentation root
- [x] 2.3 Delete guide drafts, guide content, guide approvals, guide publication commands, onboarding routes, and their tests
- [x] 2.4 Delete the guide-only Python documentation-provenance pack, records, example, entry point, and tests while retaining the MCP bridge and experiment publication
- [x] 2.5 Make documentation generation build and digest-check current upstream workspace declarations before extraction
- [x] 2.6 Generate immutable GitHub links for TSDoc, declaration, implementation, and example spans and validate every local destination

## 3. Link Real Twoslash Examples

- [x] 3.1 Extract complete fenced TypeScript `@example` programs, including multi-file and all supported cut directives
- [x] 3.2 Run examples fail-closed through the isolated Shiki/Twoslash package against the current declaration project
- [x] 3.3 Add stable API/member/source metadata and render keyboard-accessible linked identifier hovers without changing Twoslash itself
- [x] 3.4 Replace the generic documentation lens with page-specific checked highlights on every generated package, symbol, and member page
- [x] 3.5 Add fast tests for every-page coverage, own-symbol hovers, documentation, link resolution, cut semantics, diagnostics, and isolation
- [x] 3.6 Add one focused Playwright journey for focus, pointer hover, API navigation, source provenance, and code copy behavior

## 4. Regenerate and Prove the Cut

- [x] 4.1 Regenerate declarations, schemas, Python bindings, static documentation, manifests, and provenance from one committed revision
- [x] 4.2 Run OpenSpec strict validation, formatting, lint, typecheck, Vitest/property, Playwright, schema parity, Python, smoke, stdio, and broken-link checks
- [x] 4.3 Measure the public noun inventory and repository LOC with reproducible commands, keep the result at or below 8,000 LOC where the existing gate applies, and report counts without treating them as usability evidence
- [x] 4.4 Commit the folded change and align the participating `run-zero` and `cleanup` branches/worktrees at the same validated revision
