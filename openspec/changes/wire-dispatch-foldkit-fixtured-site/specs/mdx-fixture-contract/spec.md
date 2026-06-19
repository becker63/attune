# mdx-fixture-contract

## ADDED Requirements

### Requirement: MDX/editorial pages are typed fixtures

MDX/editorial route content MUST be defined in typed fixture modules and compiled into the same site fixture model used by app route state.

#### Scenario: MDX fixture renders stable content

- **WHEN** the MDX fixture is rendered through FoldKit scene tests
- **THEN** expected text and component names are asserted from the typed fixture
- **AND** tests do not hardcode a separate hidden MDX-only UI.

### Requirement: MDX actions use existing controls

Existing MDX `Button` and `ActionBar` components MAY emit route, fixture start, fixture step, proof completion, or promotion messages. They MUST NOT introduce new visual controls for fixture-only behavior.

#### Scenario: action bar drives fixture transition

- **WHEN** a typed MDX ActionBar represents an existing promotion or findings action
- **THEN** the existing button emits a fixture-backed message/command transition.
