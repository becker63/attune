import { describe, expect, expectTypeOf, it } from "vitest"
import {
  type AllowedDiagnosticRuleIdForOperation,
  allowedDiagnosticRuleIdsForKind,
  inferDiagnosticRuleIds,
  inferDiagnosticRules,
  isDiagnosticRuleAllowedForSymbol,
  missingMetadataForSymbol,
} from "../src/project-facts/diagnostic-rules.js"

const ids = (laws: readonly { readonly id: string }[]): readonly string[] => laws.map((law) => law.id)

describe("project facts law inference", () => {
  it("infers schema, determinism, read-only, and view movement laws for queries", () => {
    const operation = {
      id: "semantic-recall",
      kind: "query",
      schemas: {
        input: "RecallInput",
        output: "RecallOutput",
      },
      touches: {
        reactivityKeys: ["recall-results"],
        atoms: ["recallResultsAtom"],
      },
    } as const

    expect(ids(inferDiagnosticRules(operation))).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.readonly",
      "view.reactivity-key-moves",
      "view.atom-moves",
    ])
    expect(inferDiagnosticRules(operation).find((law) => law.id === "view.atom-moves")?.metadata).toMatchObject({
      operationId: "semantic-recall",
      atoms: ["recallResultsAtom"],
    })
  })

  it("infers deterministic output and provenance laws for generators", () => {
    const operation = {
      id: "effect-service-generator",
      kind: "generator",
      schemas: {
        input: "GeneratorOptions",
        output: "GeneratedFiles",
      },
      generator: {
        optionsSchema: "GeneratorOptions",
        virtualTreeSchema: "Tree",
        outputSchema: "GeneratedFiles",
        provenanceSchema: "GeneratorProvenance",
      },
      views: {
        packageViews: ["generatorPlan"],
      },
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.virtual-tree-only",
      "generator.options-decode",
      "generator.deterministic-output",
      "generator.provenance-recorded",
      "generator.no-untracked-output",
      "view.package-view-moves",
    ])
  })

  it("adds observed idempotence and destructive approval laws only when resource metadata is present", () => {
    const readOnlyResource = {
      id: "tailscale-readiness",
      kind: "resource-provider",
      schemas: {
        input: "HostInput",
        output: "ProviderEvidence",
      },
      resource: {
        observes: true,
        observationSchema: "ObservedHostState",
      },
    } as const

    expect(inferDiagnosticRuleIds(readOnlyResource)).toEqual([
      "schema.decode",
      "schema.encode",
      "side-effect.declared-boundary",
      "resource.observe-before-apply",
      "resource.observed-idempotence",
    ])
    expect(isDiagnosticRuleAllowedForSymbol("resource.destructive-approval", readOnlyResource)).toBe(false)

    const destructiveResource = {
      id: "nixos-anywhere-install",
      kind: "resource-provider",
      schemas: {
        input: "InstallInput",
        output: "InstallEvidence",
        error: "InstallError",
      },
      resource: {
        observes: true,
        observationSchema: "InstalledHostObservation",
        desiredStateSchema: "DesiredHost",
        currentProofSchema: "CurrentDiskProof",
        approvalSchema: "DestructiveApproval",
        destructive: true,
      },
      touches: {
        reactivityKeys: ["host-readiness", "destructive-approval"],
        atoms: ["hostReadinessAtom", "providerGateAtom"],
      },
    } as const

    expect(inferDiagnosticRuleIds(destructiveResource)).toEqual([
      "schema.decode",
      "schema.encode",
      "schema.error-decode",
      "side-effect.declared-boundary",
      "resource.observe-before-apply",
      "view.reactivity-key-moves",
      "view.atom-moves",
      "resource.observed-idempotence",
      "resource.current-destructive-proof",
      "resource.destructive-approval",
      "resource.no-repeat-destructive",
    ])
    expect(missingMetadataForSymbol(destructiveResource)).toEqual([])

    type DestructiveAllowed = AllowedDiagnosticRuleIdForOperation<typeof destructiveResource>
    expectTypeOf<DestructiveAllowed>().toEqualTypeOf<
      | "schema.decode"
      | "schema.encode"
      | "schema.error-decode"
      | "side-effect.declared-boundary"
      | "resource.observe-before-apply"
      | "view.reactivity-key-moves"
      | "view.atom-moves"
      | "resource.observed-idempotence"
      | "resource.current-destructive-proof"
      | "resource.destructive-approval"
      | "resource.no-repeat-destructive"
    >()
  })

  it("reports missing destructive proof metadata for destructive resource providers", () => {
    const operation = {
      id: "disk-wipe",
      kind: "resource-provider",
      resource: {
        destructive: true,
      },
    } as const

    expect(missingMetadataForSymbol(operation)).toEqual([
      "resource.observationSchema",
      "resource.currentProofSchema",
      "resource.approvalSchema",
    ])
  })

  it("infers replay and state laws for projections", () => {
    const operation = {
      id: "project-workbench-snapshot",
      kind: "projection",
      schemas: {
        input: "DiscoveryEvent",
        output: "WorkbenchSnapshot",
      },
      projection: {
        eventSchema: "DiscoveryEvent",
        stateSchema: "WorkbenchSnapshot",
        replay: true,
      },
      views: {
        reactivityKeys: ["workbench-snapshot"],
        packageViews: ["workbenchSnapshot"],
      },
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "side-effect.declared-boundary",
      "projection.event-decode",
      "projection.state-decode",
      "projection.deterministic-replay",
      "view.reactivity-key-moves",
      "view.package-view-moves",
    ])
  })

  it("infers finding schema and deterministic diagnostic laws for policy rules", () => {
    const operation = {
      id: "artifact-ownership",
      kind: "policy-rule",
      schemas: {
        input: "WorkspaceFacts",
        output: "PolicyFindings",
      },
      policy: {
        findingSchema: "PolicyFinding",
      },
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.readonly",
      "policy.finding-schema",
      "policy.deterministic-findings",
      "policy.stable-diagnostic-ids",
    ])
  })

  it("infers binding and normalized evidence laws for Joern templates", () => {
    const operation = {
      id: "joern-template-reachable-sink",
      kind: "joern-template",
      schemas: {
        input: "TemplateBindings",
        output: "JoernEvidence",
      },
      joern: {
        templateSchema: "TemplateSpec",
        bindingSchema: "TemplateBindings",
        evidenceSchema: "JoernEvidence",
      },
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.declared-boundary",
      "joern.template-binding-schema",
      "joern.evidence-schema",
      "joern.deterministic-template",
      "joern.normalized-evidence",
    ])
  })

  it("exposes canonical operation-kind allow lists", () => {
    expect(allowedDiagnosticRuleIdsForKind("generator")).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.virtual-tree-only",
      "generator.options-decode",
      "generator.deterministic-output",
      "generator.provenance-recorded",
      "generator.no-untracked-output",
    ])
  })
})
