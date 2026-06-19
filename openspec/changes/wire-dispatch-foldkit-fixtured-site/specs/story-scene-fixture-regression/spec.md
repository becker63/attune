# story-scene-fixture-regression

## ADDED Requirements

### Requirement: Story tests prove message-command-model loop

FoldKit `Story.story(...)` coverage MUST prove route/filter messages, startup command dispatch, fixture step command dispatch, command resolution, event counts, invalidated keys, atom labels, route events, and refreshed snapshot versions.

#### Scenario: start and proof steps update model state

- **WHEN** story tests apply fixture start and proof step results
- **THEN** the model snapshot version, route event count, event count, trace, invalidated keys, and atom labels change through the typed update loop.

### Requirement: Scene tests prove existing UI actions are real

FoldKit `Scene.scene(...)` coverage MUST prove existing Workbench and Findings controls emit deterministic fixture commands and still render the established product surface.

#### Scenario: existing action buttons dispatch fixture commands

- **WHEN** the user clicks Promote rule or True positive in scene tests
- **THEN** the scene observes the corresponding `AdvanceFixtureStep` command and can resolve it to an applied fixture step without a test-only UI.
