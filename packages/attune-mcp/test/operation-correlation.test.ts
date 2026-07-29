import { Effect, Schema } from "effect";

import type { InvocationId } from "../src/contract/schemas.js";
import { validateOperationResult } from "../src/investigation/operation.js";
import { sha256 } from "../src/platform/core.js";
import { ATTUNE_OPERATIONS, AttuneToolkit, type AttuneOperationWireInput } from "../src/tools/registry.js";
import {
  FIXTURE_INVESTIGATION_ID as investigationId,
  FIXTURE_SNAPSHOT as snapshot,
  fixtureReceiptBase,
} from "./fixtures.js";
const names = [
  "repository_materialize",
  "repository_checkpoint",
  "joern_query",
  "maude_run",
  "property_run",
  "ast_grep_run",
  "artifact_promote",
  "investigation_finalize",
] as const;
const invocationId = "correlation-1" as InvocationId;
const toolchainDigest = sha256("correlation-toolchain");
const input: AttuneOperationWireInput<"maude_run"> = {
  investigationId,
  expectedSnapshot: snapshot,
  invocationId,
  references: [],
  moduleSource: "fmod TEST is endfm",
  commands: "reduce true .",
  timeoutMilliseconds: 1_000,
};
const validResult = () =>
  ({
    snapshotId: snapshot,
    exitCode: 0,
    stdoutTail: "true",
    stderrTail: "",
    receipt: {
      ...fixtureReceiptBase(input, "maude", "run", { toolchainDigest }),
      status: "succeeded",
      snapshotId: snapshot,
    },
  }) as const;
const validateMaude = (candidate: unknown) =>
  Effect.runPromise(validateOperationResult("maude_run", input, Effect.succeed(candidate)));
describe("closed operation correlation", () => {
  it("binds exactly eight Toolkit tools to the closed registry", () => {
    expect(Object.keys(AttuneToolkit.tools)).toEqual(names);
    expect(Object.keys(ATTUNE_OPERATIONS)).toEqual(names);
    for (const name of names) {
      expect(ATTUNE_OPERATIONS[name].tool).toBe(AttuneToolkit.tools[name]);
    }
  });
  it("allows every tool to terminate with only a failed or cancelled receipt", () => {
    for (const name of names) {
      const operation = ATTUNE_OPERATIONS[name].receipt[1];
      for (const status of ["failed", "cancelled"] as const) {
        const terminal = {
          receipt: {
            ...fixtureReceiptBase(
              { invocationId },
              ATTUNE_OPERATIONS[name].receipt[0],
              typeof operation === "string" ? operation : "scan",
            ),
            status,
            failure: {
              code: status === "failed" ? "ProcessExitFailure" : "Cancelled",
              message: status,
            },
          },
        };
        expect(Schema.is(AttuneToolkit.tools[name].successSchema)(terminal), `${name}:${status}`).toBe(true);
      }
    }
  });
  it("accepts a fully correlated result", async () => {
    const result = validResult();
    expect(await validateMaude(result)).toEqual(result);
  });
  it.each([
    [
      "identity",
      (result: ReturnType<typeof validResult>) => ({
        ...result,
        receipt: { ...result.receipt, invocationId: "another-invocation" },
      }),
    ],
    [
      "digest",
      (result: ReturnType<typeof validResult>) => ({
        ...result,
        receipt: { ...result.receipt, inputDigest: sha256("another request") },
      }),
    ],
    [
      "snapshot",
      (result: ReturnType<typeof validResult>) => ({
        ...result,
        snapshotId: "b".repeat(40),
      }),
    ],
  ])("rejects a mismatched %s", async (_label, corrupt) => {
    await expect(validateMaude(corrupt(validResult()))).rejects.toMatchObject({
      code: "ContractMismatch",
    });
  });
  it("permits allocated materialization identity but enforces a requested identity", async () => {
    const cases = [
      [undefined, true],
      ["01K22222222222222222222222" as typeof investigationId, false],
    ] as const;
    for (const [id, accepted] of cases) {
      const request: AttuneOperationWireInput<"repository_materialize"> = {
        invocationId,
        references: [],
        remote: "/missing",
        revision: "main",
        ...(id === undefined ? {} : { investigationId: id }),
      };
      const result = {
        receipt: {
          ...fixtureReceiptBase(request, "repository", "materialize", {
            investigationId,
            toolchainDigest,
          }),
          status: "failed" as const,
          failure: {
            code: "AgentFsFailure" as const,
            message: "materialization failed",
          },
        },
      };
      const outcome = await Effect.runPromise(
        validateOperationResult("repository_materialize", request, Effect.succeed(result)).pipe(
          Effect.result,
        ),
      );
      expect(outcome).toMatchObject(
        accepted
          ? { _tag: "Success", success: result }
          : {
              _tag: "Failure",
              failure: { code: "ContractMismatch" },
            },
      );
    }
  });
});
