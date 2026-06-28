import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  touches,
} from "../src/project-facts/core.js"
import {
  type ControlRpcId,
  EffectRpcAdapterCompatibility,
  EffectRpcAdapterCompatibilitySchema,
  type OperationRpcHandlerMap,
  type OperationRpcId,
  ProgramObservationRpcControlIds,
  ProgramObservationRpcGroupDescriptorSchema,
  RpcDescriptorSchema,
  controlRpcDescriptorById,
  controlRpcRegistry,
  defineProgramObservationRpcGroup,
  defineProgramObservationRpcHandlerRegistry,
  operationRpcDescriptorById,
  operationRpcRegistry,
} from "../src/project-facts/rpc.js"

const ReadinessInput = Schema.Struct({
  host: Schema.String,
})

const ReadinessOutput = Schema.Struct({
  ready: Schema.Boolean,
})

const InstallInput = Schema.Struct({
  disk: Schema.String,
  host: Schema.String,
})

const InstallOutput = Schema.Struct({
  installed: Schema.Boolean,
})

const InstallError = Schema.Struct({
  reason: Schema.String,
})

const PackageViews = definePackageViews({
  atoms: ["hostReadinessAtom", "providerGateAtom"],
  reactivityKeys: ["host-readiness", "destructive-approval"],
} as const)

const ReadinessOperation = defineOperation({
  id: "tailscale-readiness",
  input: ReadinessInput,
  kind: "query",
  output: ReadinessOutput,
  views: touches(PackageViews, {
    atoms: ["hostReadinessAtom"],
    reactivityKeys: ["host-readiness"],
  } as const),
})

const InstallOperation = defineOperation({
  error: InstallError,
  id: "nixos-anywhere-install",
  input: InstallInput,
  kind: "resource-provider",
  output: InstallOutput,
  views: touches(PackageViews, {
    atoms: ["hostReadinessAtom", "providerGateAtom"],
    reactivityKeys: ["host-readiness", "destructive-approval"],
  } as const),
})

const PackageContract = definePackageContract({
  operations: [ReadinessOperation, InstallOperation] as const,
  packageId: "home-deployment",
  packageKind: "day0-resource-runbook",
  views: PackageViews,
})

describe("program observation RPC descriptors", () => {
  it("derives stable operation and control RPC ids without importing the runtime adapter", () => {
    const group = defineProgramObservationRpcGroup(PackageContract)

    expect(group.packageId).toBe("home-deployment")
    expect(group.groupId).toBe("home-deployment.ProgramObservationRpc")
    expect(group.adapterCompatibility).toEqual(EffectRpcAdapterCompatibility)
    expect(group.adapterCompatibility.status).toBe("blocked")
    expect(group.adapterCompatibility.reason).toContain("Effect 4")
    expect(group.operations.map((descriptor) => descriptor.rpcId)).toEqual([
      "home-deployment.operation.tailscale-readiness",
      "home-deployment.operation.nixos-anywhere-install",
    ])
    expect(group.controls.map((descriptor) => descriptor.controlId)).toEqual([...ProgramObservationRpcControlIds])

    expectTypeOf<OperationRpcId<"home-deployment", "nixos-anywhere-install">>().toEqualTypeOf<
      "home-deployment.operation.nixos-anywhere-install"
    >()
    expectTypeOf<ControlRpcId<"home-deployment", "reset">>().toEqualTypeOf<"home-deployment.control.reset">()
  })

  it("records Schema descriptor roles for operation payloads, results, errors, evidence, and replay", () => {
    const group = defineProgramObservationRpcGroup(PackageContract)
    const install = operationRpcDescriptorById(group, "nixos-anywhere-install")
    const readiness = operationRpcDescriptorById(group, "tailscale-readiness")

    expect(install).toMatchObject({
      error: {
        operationId: "nixos-anywhere-install",
        role: "error",
        schemaId: "home-deployment.nixos-anywhere-install.error",
      },
      evidence: {
        operationId: "nixos-anywhere-install",
        role: "evidence",
      },
      replay: {
        operationId: "nixos-anywhere-install",
        role: "replay",
      },
    })
    expect(readiness.error).toBeUndefined()
    expect(readiness.payload).toMatchObject({
      operationId: "tailscale-readiness",
      role: "payload",
      source: "operation.input",
    })
  })

  it("builds exact descriptor registries for operations and controls", () => {
    const group = defineProgramObservationRpcGroup(PackageContract)

    expect(Object.keys(operationRpcRegistry(group))).toEqual([
      "tailscale-readiness",
      "nixos-anywhere-install",
    ])
    expect(controlRpcRegistry(group).reset.rpcId).toBe("home-deployment.control.reset")
    expect(controlRpcDescriptorById(group, "snapshot").payload).toMatchObject({
      controlId: "snapshot",
      source: "control.snapshot.payload",
    })
    expect(() => operationRpcDescriptorById(group, "missing" as never)).toThrow(
      'Missing program observation RPC descriptor for operation "missing"',
    )
  })

  it("decodes RPC descriptor data and adapter diagnostics through Effect Schema", () => {
    const group = defineProgramObservationRpcGroup(PackageContract)
    const decodedGroup = Schema.decodeUnknownSync(ProgramObservationRpcGroupDescriptorSchema)(group)
    const decodedOperation = Schema.decodeUnknownSync(RpcDescriptorSchema)(
      operationRpcDescriptorById(group, "nixos-anywhere-install"),
    )
    const decodedControl = Schema.decodeUnknownSync(RpcDescriptorSchema)(controlRpcDescriptorById(group, "get-coverage"))
    const decodedCompatibility = Schema.decodeUnknownSync(EffectRpcAdapterCompatibilitySchema)(
      EffectRpcAdapterCompatibility,
    )

    expect(decodedGroup.packageId).toBe("home-deployment")
    expect(decodedOperation.payload.operationId).toBe("nixos-anywhere-install")
    expect(decodedControl.controlId).toBe("get-coverage")
    expect(decodedControl.evidence.role).toBe("evidence")
    expect(decodedCompatibility).toMatchObject({
      adapter: "@effect/rpc",
      status: "blocked",
    })
  })

  it("preserves typed handler maps backed by programTestLayer", () => {
    const programTestLayer = {
      provides: ["HomeDeploymentService"],
    } as const
    const handlers = {
      "nixos-anywhere-install": async (payload) => ({
        installed: payload.disk.length > 0 && payload.host.length > 0,
      }),
      "tailscale-readiness": (payload) => ({
        ready: payload.host.length > 0,
      }),
    } satisfies OperationRpcHandlerMap<typeof PackageContract, typeof programTestLayer>

    const registry = defineProgramObservationRpcHandlerRegistry(PackageContract, programTestLayer, handlers)

    expect(registry.operationIds).toEqual(["tailscale-readiness", "nixos-anywhere-install"])
    expect(registry.programTestLayer).toBe(programTestLayer)
    expect(Object.keys(registry.handlers)).toEqual([
      "nixos-anywhere-install",
      "tailscale-readiness",
    ])
  })
})
