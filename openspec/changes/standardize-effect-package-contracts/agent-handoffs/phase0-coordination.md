# Phase 0 Coordination

Phase 0 started with the OpenSpec change valid and no implementation tasks
marked complete.

## Spawned Agents

| Role | Agent id | Nickname | Ownership |
| --- | --- | --- | --- |
| foundation-rename-agent | `019eed1f-b18a-7513-b47e-09f82e4736a8` | Herschel | `packages/attune-architecture-lint/**`; package-local final identity work |
| workspace-surface-agent | `019eed1f-c56d-7162-8b83-bbcbe22e1437` | Schrodinger | root `project.json`; public Nx target surface |
| generator-inventory-agent | `019eed1f-d6f3-7da1-9076-a7c5943b77e8` | Chandrasekhar | `packages/attune-nx/**`; generator inventory/prep |
| openspec-validation-agent | `019eed1f-e9b5-7da1-a82a-297d6a29835e` | Kierkegaard | OpenSpec validation and contradiction checks |
| workspace-validation-agent | `019eed1f-fa4d-75f2-aa95-2385eda709b5` | Planck | workspace graph and command-surface debt report |
| type-kernel-scout-agent | `019eed20-0ad7-7f31-8256-787656a4199d` | Euclid | Phase 1 type-kernel layout scout; handoff only |

## Coordinator Notes

- Foundation rename and workspace target cleanup are intentionally split:
  package-local identity changes first, root target wiring second.
- Phase 1 implementation agents should not edit the architecture package until
  Phase 0 rename integration is reviewed.
- Validation agents should be treated as blocking if they report contradictory
  public target names, stale OpenSpec phase/task references, or command-surface
  debt that would make Phase 1 generated targets ambiguous.

## Integration Checkpoint

The Phase 0 package-local rename, root public target cleanup, Source BOM index,
generator-shape manifest, and active TypeScript alias have been aligned on the
final project id `attune-architecture` while the physical directory remains
`packages/attune-architecture-lint`.

Validated after integration:

- `nx show projects | sort`
- `nx run workspace:source-bom-check`
- `nx run workspace:shape-conformance`
- `nx run workspace:package-contracts-check`
- `nx run attune-architecture:test`
- `nx run attune-architecture:typecheck`
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- project.json package.json tsconfig.base.json attune.source-bom.index.json attune.generator-shapes.json openspec/changes/standardize-effect-package-contracts`

Known remaining Phase 0 debt:

- Physical directory rename to `packages/attune-architecture`.
- Root and package command surfaces still use direct `nx:run-commands` until
  typed executors land.
- Historical OpenSpec changes may still mention the old target names as their
  archived/current-change context; final active guidance for this change uses
  the new minimal surface.
