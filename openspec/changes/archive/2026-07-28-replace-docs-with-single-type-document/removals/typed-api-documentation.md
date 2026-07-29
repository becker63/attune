## Retired typed-documentation requirements

### Requirement: Lifecycle documentation in exported types

**Reason**: Source TSDoc remains mandatory, but one rule and the deterministic
reference own it without a page-oriented capability.

**Surviving contract**: Use `Single TSDoc authoring rule` and `Public concepts
are source documented`.

### Requirement: Executable lifecycle documentation examples

**Reason**: The one running complete investigation and focused checked
variations remain, but Twoslash is no longer the compiler or rendering
boundary.

**Surviving contract**: Use `Unified compiler resolution and checking` and the
package lifecycle contract in `Public concepts are source documented`.

### Requirement: Documentation coverage audit

**Reason**: The old export/page/lens coverage counter is deleted. Direct
MDAST reading mechanically emits every eligible declaration from exact
production roots, and one unified semantic pass fails any missing or invalid
entry. No classifications, dispositions, exception policy, debt baseline, or
coverage percentage is retained.

**Surviving contract**: Use `Single TSDoc authoring rule`, `Ordinary MDAST
documentation tree`, and `Unified compiler resolution and checking`.

### Requirement: Isolated Shiki and Twoslash rendering

**Reason**: The separate Twoslash compatibility package is removed. Only
Shiki's static code highlighting remains.

**Surviving contract**: Use the code-node lowering in `Unified compiler
resolution and checking` and the artifact constraints in `Deterministic
static API reference`.

### Requirement: A type hover on every emitted page

**Reason**: There is one API document, and canonical static definition links
replace hover boxes, copy UI, per-page quotas, and editor-state snapshots.

**Surviving contract**: Use the anchor and native browser-navigation contract
in `Deterministic static API reference` plus the single Playwright journey in
`One build, focused verification, and implementation budget`.
