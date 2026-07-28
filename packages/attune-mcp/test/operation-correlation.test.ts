import {
  canonicalJson,
  isAttuneReceipt,
  MaudeRunOperation,
  sha256,
  validateOperationResult,
  type FullGitCommit,
  type InvestigationId,
  type InvocationId,
  type OperationResultOf,
  type OperationWireInput,
  RepositoryMaterializeOperation,
} from "attune-mcp";
import { Effect } from "effect";

const investigationId = "01K00000000000000000000000" as InvestigationId;
const snapshot = "a".repeat(40) as FullGitCommit;
const timestamp = new Date(0).toISOString();
const input: OperationWireInput<typeof MaudeRunOperation> = {
  investigationId,
  expectedSnapshot: snapshot,
  invocationId: "correlation-1" as InvocationId,
  references: [],
  moduleSource: "fmod TEST is endfm",
  commands: "reduce true .",
  timeoutMilliseconds: 1_000,
};

const validResult = (): OperationResultOf<typeof MaudeRunOperation> => ({
  snapshotId: snapshot,
  exitCode: 0,
  stdoutTail: "true",
  stderrTail: "",
  receipt: {
    schemaVersion: 1,
    invocationId: input.invocationId,
    investigationId,
    tool: "maude",
    operation: "run",
    inputDigest: sha256(`${canonicalJson(input)}\n`),
    toolchainDigest: sha256("correlation-toolchain"),
    artifacts: [],
    startedAt: timestamp,
    completedAt: timestamp,
    status: "succeeded",
    snapshotId: snapshot,
  },
});

describe("descriptor-owned receipt correlation", () => {
  it("requires the complete receipt schema in the exported type guard", () => {
    expect(isAttuneReceipt({ status: "succeeded" })).toBe(false);
    expect(isAttuneReceipt(validResult().receipt)).toBe(true);
  });

  it("accepts a result whose runtime identity is fully correlated", async () => {
    const result = validResult();
    expect(
      await Effect.runPromise(
        validateOperationResult(
          MaudeRunOperation,
          input,
          Effect.succeed(result),
        ),
      ),
    ).toEqual(result);
  });

  it.each([
    [
      "invocation identity",
      () => ({
        ...validResult(),
        receipt: {
          ...validResult().receipt,
          invocationId: "another-invocation",
        },
      }),
    ],
    [
      "investigation identity",
      () => ({
        ...validResult(),
        receipt: {
          ...validResult().receipt,
          investigationId: "01K11111111111111111111111",
        },
      }),
    ],
    [
      "canonical input digest",
      () => ({
        ...validResult(),
        receipt: {
          ...validResult().receipt,
          inputDigest: sha256("another request"),
        },
      }),
    ],
    [
      "success receipt snapshot",
      () => ({
        ...validResult(),
        receipt: {
          ...validResult().receipt,
          snapshotId: "b".repeat(40),
        },
      }),
    ],
    [
      "success result snapshot",
      () => ({
        ...validResult(),
        snapshotId: "b".repeat(40),
      }),
    ],
    [
      "descriptor tool",
      () => ({
        ...validResult(),
        receipt: { ...validResult().receipt, tool: "joern" },
      }),
    ],
    [
      "descriptor operation",
      () => ({
        ...validResult(),
        receipt: { ...validResult().receipt, operation: "query" },
      }),
    ],
  ])("rejects a mismatched %s", async (_label, malformed) => {
    await expect(
      Effect.runPromise(
        validateOperationResult(
          MaudeRunOperation,
          input,
          Effect.succeed(malformed()),
        ),
      ),
    ).rejects.toMatchObject({ code: "ContractMismatch" });
  });

  it("rejects a receipt that does not satisfy the result schema", async () => {
    const { inputDigest: _removed, ...receipt } = validResult().receipt;
    await expect(
      Effect.runPromise(
        validateOperationResult(
          MaudeRunOperation,
          input,
          Effect.succeed({ ...validResult(), receipt }),
        ),
      ),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message: "maude_run returned a result that violates its schema",
    });
  });

  it("permits a failed materialization whose allocated id has no result field", async () => {
    const materializeInput: OperationWireInput<
      typeof RepositoryMaterializeOperation
    > = {
      invocationId: "failed-materialization" as InvocationId,
      references: [],
      remote: "/missing",
      revision: "main",
    };
    const result = {
      receipt: {
        schemaVersion: 1,
        invocationId: materializeInput.invocationId,
        investigationId,
        tool: "repository",
        operation: "materialize",
        inputDigest: sha256(`${canonicalJson(materializeInput)}\n`),
        toolchainDigest: sha256("correlation-toolchain"),
        artifacts: [],
        startedAt: timestamp,
        completedAt: timestamp,
        status: "failed",
        failure: {
          code: "AgentFsFailure",
          message: "materialization failed after identity allocation",
        },
      },
    } as const;
    expect(
      await Effect.runPromise(
        validateOperationResult(
          RepositoryMaterializeOperation,
          materializeInput,
          Effect.succeed(result),
        ),
      ),
    ).toEqual(result);
  });

  it("correlates a failed materialization with an explicitly requested id", async () => {
    const requestedInvestigationId =
      "01K22222222222222222222222" as InvestigationId;
    const materializeInput: OperationWireInput<
      typeof RepositoryMaterializeOperation
    > = {
      invocationId: "failed-explicit-materialization" as InvocationId,
      investigationId: requestedInvestigationId,
      references: [],
      remote: "/missing",
      revision: "main",
    };
    const mismatched = {
      receipt: {
        schemaVersion: 1,
        invocationId: materializeInput.invocationId,
        investigationId,
        tool: "repository",
        operation: "materialize",
        inputDigest: sha256(`${canonicalJson(materializeInput)}\n`),
        toolchainDigest: sha256("correlation-toolchain"),
        artifacts: [],
        startedAt: timestamp,
        completedAt: timestamp,
        status: "failed",
        failure: {
          code: "AgentFsFailure",
          message: "materialization failed after identity allocation",
        },
      },
    } as const;

    await expect(
      Effect.runPromise(
        validateOperationResult(
          RepositoryMaterializeOperation,
          materializeInput,
          Effect.succeed(mismatched),
        ),
      ),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message:
        "repository_materialize returned a receipt that does not correlate with its request and result",
    });
  });
});
