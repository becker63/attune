import { Schema } from "effect";
import { Tool } from "effect/unstable/ai";

/**
 * Builds a bounded patterned string schema. @param pattern - Accepted syntax.
 *
 * @param expected - Diagnostic expectation. @param max - Maximum length.
 * @returns The checked string schema.
 */
const checked = (pattern: RegExp, expected: string, max: number): Schema.String =>
  Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(max), Schema.isPattern(pattern, { expected }));

/**
 * Validates a canonical investigation ULID. @remarks The brand prevents unrelated strings from crossing
 * authority boundaries.
 */
export const InvestigationId = checked(/^[0-9A-HJKMNP-TV-Z]{26}$/u, "an uppercase canonical ULID", 26).pipe(
  Schema.brand("InvestigationId"),
);
export type InvestigationId = typeof InvestigationId.Type;

/**
 * Validates a caller-stable invocation identity. @remarks Canonical bounded syntax makes durable replay paths
 * unambiguous.
 */
export const InvocationId = checked(
  /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$/u,
  "a caller-stable identifier using letters, numbers, dot, underscore, colon, or hyphen",
  128,
).pipe(Schema.brand("InvocationId"));
export type InvocationId = typeof InvocationId.Type;

/**
 * Validates a full Git object identifier. @remarks Symbolic and abbreviated revisions cannot serve as
 * snapshot evidence.
 */
export const FullGitCommit = checked(
  /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u,
  "a lowercase full Git commit identifier",
  64,
).pipe(Schema.brand("FullGitCommit"));
export type FullGitCommit = typeof FullGitCommit.Type;

/**
 * Validates a lowercase SHA-256 digest. @remarks Digests correlate exact inputs, artifacts, and toolchain
 * selection.
 */
export const Sha256Digest = checked(/^[0-9a-f]{64}$/u, "a lowercase SHA-256 digest", 64).pipe(
  Schema.brand("Sha256Digest"),
);
export type Sha256Digest = typeof Sha256Digest.Type;

/**
 * Tests portable repository-relative containment. @param path - Candidate POSIX path. @returns Whether it
 * stays below its root.
 */
const relativePathIsContained = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith("/") &&
  !path.includes("\\") &&
  !path.includes("\0") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

/**
 * Validates a contained POSIX repository path. @remarks Absolute, backslash, null, empty, and traversal
 * segments are rejected before filesystem access.
 */
export const RepositoryRelativePath = Schema.String.check(
  Schema.isMaxLength(4_096),
  Schema.makeFilter(relativePathIsContained, {
    expected: "a contained POSIX repository-relative path",
  }),
).pipe(Schema.brand("RepositoryRelativePath"));
export type RepositoryRelativePath = typeof RepositoryRelativePath.Type;

/**
 * Validates one investigation-owned artifact URI. @remarks The URI carries exact investigation, tool,
 * invocation, and contained path identity.
 */
export const ArtifactUri = checked(
  /^attune:\/\/investigations\/[0-9A-HJKMNP-TV-Z]{26}\/artifacts\/(?:repository|joern|maude|property|ast-grep|artifact)\/[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/u,
  "a contained Attune artifact URI",
  8_192,
)
  .check(
    Schema.makeFilter(
      (uri) => {
        const path = uri
          .slice(uri.indexOf("/artifacts/") + 11)
          .split("/")
          .slice(2);
        return path.length > 0 && path.every((part) => part !== "." && part !== "..");
      },
      { expected: "an artifact URI without traversal segments" },
    ),
  )
  .pipe(Schema.brand("ArtifactUri"));
export type ArtifactUri = typeof ArtifactUri.Type;

/**
 * Builds a nonempty bounded text schema. @param max - Maximum length. @returns The checked string schema.
 */
const boundedText = (max: number): Schema.String =>
  Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(max));
/** Positive integer schema for execution bounds. */ const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThan(0),
);
/** Nonnegative integer schema for counts and byte sizes. */ const NonNegativeInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);
/** Bounded timeout in milliseconds. */ const Timeout = PositiveInt.check(
  Schema.isLessThanOrEqualTo(1_200_000),
);
/** Canonical RFC 3339 UTC timestamp. */ const Timestamp = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u, {
    expected: "an RFC 3339 UTC timestamp",
  }),
);

/**
 * Validates one bounded caller reference. @remarks References preserve caller context without granting
 * filesystem or lifecycle authority.
 */
export const FreeFormReference = Schema.Struct({
  ref: boundedText(8_192),
  note: Schema.optional(Schema.String.check(Schema.isMaxLength(65_536))),
}).annotate({ identifier: "FreeFormReference" });
export type FreeFormReference = typeof FreeFormReference.Type;
/**
 * Validates the bounded reference collection attached to a request. @remarks A finite list keeps receipt
 * evidence predictable.
 */
export const FreeFormReferences = Schema.Array(FreeFormReference).check(Schema.isMaxLength(256));

/**
 * Validates content-addressed retained-artifact evidence. @remarks URI, media type, digest, byte count, and
 * completeness travel together in receipts.
 */
export const ArtifactReference = Schema.Struct({
  uri: ArtifactUri,
  mediaType: checked(
    /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+(?:\s*;\s*charset=[A-Za-z0-9._-]+)?$/u,
    "an Internet media type",
    256,
  ),
  sha256: Sha256Digest,
  bytes: NonNegativeInt,
  complete: Schema.Boolean,
}).annotate({ identifier: "ArtifactReference" });
export type ArtifactReference = typeof ArtifactReference.Type;

/**
 * Enumerates stable tool-boundary recovery classifications. @remarks Callers branch on these codes rather
 * than parsing native messages.
 */
export const FailureCode = Schema.Literals([
  "InvalidIdentity",
  "UnknownInvestigation",
  "IdentityConflict",
  "InvocationConflict",
  "InvocationIncomplete",
  "StaleSnapshot",
  "DirtyRepository",
  "InvalidPath",
  "GitFailure",
  "GitlinkUnsupported",
  "AgentFsFailure",
  "ProcessSpawnFailure",
  "ProcessExitFailure",
  "ParseFailure",
  "DecodeFailure",
  "TimedOut",
  "ResourceLimited",
  "Cancelled",
  "ArtifactMissing",
  "ArtifactChanged",
  "PromotionRejected",
  "Finalized",
  "FinalizationFailure",
  "ResourceTooLarge",
  "ContractMismatch",
]);
export type FailureCode = typeof FailureCode.Type;

/** Shared bounded fields for public failures and receipt failure data. */ const FailureFields = {
  code: FailureCode,
  message: boundedText(16_384),
  expected: Schema.optional(Schema.String.check(Schema.isMaxLength(8_192))),
  observed: Schema.optional(Schema.String.check(Schema.isMaxLength(8_192))),
  path: Schema.optional(Schema.String.check(Schema.isMaxLength(8_192))),
} as const;

/**
 * Serializable failure details retained in failed and cancelled receipts.
 *
 * @remarks
 *   `code` selects the caller's recovery decision; the optional expected, observed, and path fields provide
 *   bounded evidence without exposing an arbitrary native exception across the MCP contract.
 */
export const AttuneFailure = Schema.Struct(FailureFields).annotate({
  identifier: "AttuneFailure",
});
export type AttuneFailure = typeof AttuneFailure.Type;

/**
 * Tagged Effect failure returned when an invocation cannot enter its tool boundary.
 *
 * @remarks
 *   This failure is reserved for boundary rejection: conflicting invocation identity, unavailable workspace
 *   state, process admission failure, or a value that violates the closed {@link AttuneToolkit} contract. The
 *   operation has not produced trustworthy accepted evidence merely because an exception object exists.
 *   Native failures after acceptance normally become failed or cancelled {@link AttuneReceipt} values,
 *   preserving their input digest, toolchain digest, artifacts, and terminal status as data. This separation
 *   lets {@link Attune.execute} return reproducible failure evidence without collapsing every native outcome
 *   into the Effect error channel. Branch on `code`, use bounded `expected`, `observed`, and `path` evidence
 *   when present, and never parse `message` as protocol. Invalid {@link Investigation} use is instead an
 *   {@link InvestigationLifecycleError}; an interrupted accepted exchange should be checked with
 *   {@link Attune.recoverTerminal}.
 */
export class AttuneToolFailure extends Schema.TaggedErrorClass<AttuneToolFailure>()(
  "AttuneToolFailure",
  FailureFields,
) {}

/**
 * Enumerates durable receipt tool namespaces. @remarks Tool names remain smaller than operation names and own
 * artifact URI paths.
 */
export const ToolName = Schema.Literals(["repository", "joern", "maude", "property", "ast-grep", "artifact"]);
export type ToolName = typeof ToolName.Type;

/** Common acceptance and correlation fields for every terminal receipt. */ const ReceiptBase = {
  schemaVersion: Schema.Literal(1),
  invocationId: InvocationId,
  investigationId: InvestigationId,
  tool: ToolName,
  operation: boundedText(128),
  inputDigest: Sha256Digest,
  toolchainDigest: Sha256Digest,
  artifacts: Schema.Array(ArtifactReference).check(Schema.isMaxLength(256)),
  startedAt: Timestamp,
  completedAt: Timestamp,
} as const;

/**
 * Validates successful terminal evidence. @remarks Success always carries the exact resulting snapshot.
 */
export const SucceededReceipt = Schema.Struct({
  ...ReceiptBase,
  status: Schema.Literal("succeeded"),
  snapshotId: FullGitCommit,
}).annotate({ identifier: "SucceededReceipt" });
export type SucceededReceipt = typeof SucceededReceipt.Type;

/**
 * Validates failed terminal evidence. @remarks Failure preserves structured recovery data and an optional
 * last snapshot.
 */
export const FailedReceipt = Schema.Struct({
  ...ReceiptBase,
  status: Schema.Literal("failed"),
  snapshotId: Schema.optional(FullGitCommit),
  failure: AttuneFailure,
}).annotate({ identifier: "FailedReceipt" });
export type FailedReceipt = typeof FailedReceipt.Type;

/**
 * Validates cancelled terminal evidence. @remarks Cancellation remains durable accepted evidence rather than
 * an absent result.
 */
export const CancelledReceipt = Schema.Struct({
  ...ReceiptBase,
  status: Schema.Literal("cancelled"),
  snapshotId: Schema.optional(FullGitCommit),
  failure: AttuneFailure,
}).annotate({ identifier: "CancelledReceipt" });
export type CancelledReceipt = typeof CancelledReceipt.Type;

/**
 * An {@link AttuneReceipt} records how an accepted operation ended and identifies the evidence it produced. It
 * proves that the work happened; it does not prove that the agent’s interpretation of that work is correct.
 *
 * @remarks
 *   Narrow `status` before reading terminal fields: `"succeeded"` always contains the exact resulting
 *   snapshot, while `"failed"` and `"cancelled"` contain structured failure evidence and may lack a resulting
 *   commit. Every branch remains ordinary {@link AttuneReceipt} data rather than an untyped native exception.
 *   The receipt binds invocation identity, {@link Investigation.investigationId}, operation name, input
 *   digest, toolchain digest, timestamps, and artifact references. When a snapshot exists it can be compared
 *   with {@link Investigation.snapshot}, making reproduced or promoted evidence traceable to one exact
 *   repository state. {@link Attune.execute} returns the correlated receipt with its result and active proof,
 *   replacing that proof only after a succeeded snapshot transition. If the caller loses that exchange after
 *   acceptance, {@link Attune.recoverTerminal} validates the persisted receipt before returning it;
 *   {@link AttuneToolFailure} still represents rejection before trustworthy terminal evidence exists. [The
 *   artifacts](#the-artifacts) shows the retained bytes and terminal envelope each receipt correlates.
 */
export const AttuneReceipt = Schema.Union([SucceededReceipt, FailedReceipt, CancelledReceipt]).annotate({
  identifier: "AttuneReceipt",
});
export type AttuneReceipt = typeof AttuneReceipt.Type;

/** Shared result shape for failed and cancelled operations. */ const TerminalFailureResult = Schema.Struct({
  receipt: Schema.Union([FailedReceipt, CancelledReceipt]),
});
/**
 * Adds terminal receipt correlation to an operation result schema. @typeParam S - Successful result fields.
 *
 * @param fields - Successful fields excluding receipt. @returns The success-or-terminal-failure schema.
 */
const accepted = <S extends Schema.Struct.Fields>(
  fields: S,
): Schema.Union<
  readonly [Schema.Struct<S & { readonly receipt: typeof SucceededReceipt }>, typeof TerminalFailureResult]
> => Schema.Union([Schema.Struct({ ...fields, receipt: SucceededReceipt }), TerminalFailureResult]);

/** Request fields shared by every operation. */ const Common = {
  invocationId: InvocationId,
  references: FreeFormReferences,
} as const;
/** Request fields requiring exact investigation authority. */ const InvestigationCommon = {
  ...Common,
  investigationId: InvestigationId,
  expectedSnapshot: FullGitCommit,
} as const;

/**
 * Validates repository materialization requests. @remarks Materialization creates identity, so investigation
 * identity is optional and no snapshot is yet supplied.
 */
export const RepositoryMaterializeInput = Schema.Struct({
  ...Common,
  remote: boundedText(8_192),
  revision: boundedText(1_024),
  investigationId: Schema.optional(InvestigationId),
}).annotate({ identifier: "RepositoryMaterializeInput" });
export type RepositoryMaterializeInput = typeof RepositoryMaterializeInput.Type;
/**
 * Validates materialization terminal results. @remarks Success grants exact repository and investigation
 * evidence.
 */
export const RepositoryMaterializeResult = accepted({
  investigationId: InvestigationId,
  requestedRevision: boundedText(1_024),
  resolvedCommit: FullGitCommit,
  branch: boundedText(256),
});
export type RepositoryMaterializeResult = typeof RepositoryMaterializeResult.Type;

/**
 * Validates repository checkpoint requests. @remarks Policy explicitly chooses clean verification or
 * deterministic commit creation.
 */
export const RepositoryCheckpointInput = Schema.Struct({
  ...InvestigationCommon,
  policy: Schema.Literals(["require-clean", "commit"]),
  message: Schema.optional(boundedText(16_384)),
}).annotate({ identifier: "RepositoryCheckpointInput" });
export type RepositoryCheckpointInput = typeof RepositoryCheckpointInput.Type;
/**
 * Validates checkpoint terminal results. @remarks Success reports the exact resulting snapshot and whether a
 * commit was created.
 */
export const RepositoryCheckpointResult = accepted({
  snapshotId: FullGitCommit,
  createdCommit: Schema.Boolean,
});
export type RepositoryCheckpointResult = typeof RepositoryCheckpointResult.Type;

/**
 * Validates the versioned structured Joern query form. @remarks Schema version and digest bind generated CPG
 * vocabulary to exact query segments.
 */
export const JoernStructuredDsl = Schema.Struct({
  version: Schema.Literal(1),
  cpgSchemaVersion: boundedText(256),
  cpgSchemaHash: Sha256Digest,
  segments: Schema.Array(Schema.Json).check(Schema.isMaxLength(512)),
  select: Schema.Record(boundedText(256), boundedText(256)).check(Schema.isMaxProperties(64)),
}).annotate({ identifier: "JoernStructuredDsl" });

/**
 * Validates Joern query requests. @remarks Exactly one raw or structured query is accepted against explicit
 * snapshot and frontend settings.
 */
export const JoernQueryInput = Schema.Struct({
  ...InvestigationCommon,
  cpgql: Schema.optional(boundedText(2 * 1024 * 1024)),
  dsl: Schema.optional(JoernStructuredDsl),
  frontend: Schema.Literals(["auto", "jssrc"]),
  importOptions: Schema.Struct({ schemaVersion: Schema.Literal(1) }),
  outputFormat: Schema.Literals(["text", "json"]),
  timeoutMilliseconds: Timeout,
})
  .check(
    Schema.makeFilter((input) => (input.cpgql === undefined) !== (input.dsl === undefined), {
      expected: "exactly one of cpgql or dsl",
    }),
  )
  .annotate({ identifier: "JoernQueryInput" });
export type JoernQueryInput = typeof JoernQueryInput.Type;
/**
 * Validates Joern terminal results. @remarks Success correlates summary output with snapshot and
 * content-addressed CPG identity.
 */
export const JoernQueryResult = accepted({
  snapshotId: FullGitCommit,
  cpgId: Sha256Digest,
  summary: Schema.Unknown,
});
export type JoernQueryResult = typeof JoernQueryResult.Type;

/**
 * Validates bounded Maude execution requests. @remarks Exact module and command text are retained with
 * snapshot and timeout authority.
 */
export const MaudeRunInput = Schema.Struct({
  ...InvestigationCommon,
  moduleSource: boundedText(2 * 1024 * 1024),
  commands: boundedText(256 * 1024),
  timeoutMilliseconds: Timeout,
}).annotate({ identifier: "MaudeRunInput" });
export type MaudeRunInput = typeof MaudeRunInput.Type;
/**
 * Validates Maude terminal results. @remarks Success preserves bounded native output tails and process
 * status.
 */
export const MaudeRunResult = accepted({
  snapshotId: FullGitCommit,
  exitCode: Schema.optional(Schema.Number.check(Schema.isInt())),
  stdoutTail: Schema.String.check(Schema.isMaxLength(65_536)),
  stderrTail: Schema.String.check(Schema.isMaxLength(65_536)),
});
export type MaudeRunResult = typeof MaudeRunResult.Type;

/**
 * Validates bounded property-run requests. @remarks Seed, replay path, run count, and timeout make fast-check
 * execution reproducible.
 */
export const PropertyRunInput = Schema.Struct({
  ...InvestigationCommon,
  propertySource: boundedText(2 * 1024 * 1024),
  parameters: Schema.Struct({
    numRuns: PositiveInt.check(Schema.isLessThanOrEqualTo(100_000)),
    seed: Schema.optional(Schema.Number.check(Schema.isInt32())),
    path: Schema.optional(Schema.String.check(Schema.isMaxLength(4_096))),
    timeoutMilliseconds: Timeout,
  }),
}).annotate({ identifier: "PropertyRunInput" });
export type PropertyRunInput = typeof PropertyRunInput.Type;
/**
 * Validates property-run terminal results. @remarks Success distinguishes no counterexample from retained
 * replay evidence.
 */
export const PropertyRunResult = accepted({
  snapshotId: FullGitCommit,
  outcome: Schema.Literals(["no-counterexample", "counterexample"]),
  seed: Schema.optional(Schema.Number.check(Schema.isInt32())),
  counterexamplePath: Schema.optional(Schema.String),
  numRuns: Schema.optional(NonNegativeInt),
  numShrinks: Schema.optional(NonNegativeInt),
});
export type PropertyRunResult = typeof PropertyRunResult.Type;

/**
 * Validates repository-native ast-grep requests. @remarks Mode, config, rule paths, snapshot, and timeout
 * fully select the execution.
 */
export const AstGrepRunInput = Schema.Struct({
  ...InvestigationCommon,
  mode: Schema.Literals(["test", "scan", "apply"]),
  configPath: RepositoryRelativePath,
  rulePaths: Schema.Array(RepositoryRelativePath).check(Schema.isMaxLength(1_024)),
  timeoutMilliseconds: Timeout,
}).annotate({ identifier: "AstGrepRunInput" });
export type AstGrepRunInput = typeof AstGrepRunInput.Type;
/**
 * Validates ast-grep terminal results. @remarks Success records findings or changed files against the exact
 * snapshot.
 */
export const AstGrepRunResult = accepted({
  snapshotId: FullGitCommit,
  mode: Schema.Literals(["test", "scan", "apply"]),
  findingCount: Schema.optional(NonNegativeInt),
  changedFiles: Schema.Array(RepositoryRelativePath),
});
export type AstGrepRunResult = typeof AstGrepRunResult.Type;

/**
 * Validates artifact-promotion requests. @remarks Source evidence and destination containment are explicit
 * under current snapshot authority.
 */
export const ArtifactPromoteInput = Schema.Struct({
  ...InvestigationCommon,
  artifactUri: ArtifactUri,
  destinationPath: RepositoryRelativePath,
}).annotate({ identifier: "ArtifactPromoteInput" });
export type ArtifactPromoteInput = typeof ArtifactPromoteInput.Type;
/**
 * Validates artifact-promotion terminal results. @remarks Success reports the prior snapshot, destination,
 * and whether bytes changed.
 */
export const ArtifactPromoteResult = accepted({
  beforeSnapshot: FullGitCommit,
  destinationPath: RepositoryRelativePath,
  workingTreeChanged: Schema.Boolean,
});
export type ArtifactPromoteResult = typeof ArtifactPromoteResult.Type;

/**
 * Validates finalization requests. @remarks Exact active investigation authority is the entire finalization
 * input.
 */
export const InvestigationFinalizeInput = Schema.Struct(InvestigationCommon).annotate({
  identifier: "InvestigationFinalizeInput",
});
export type InvestigationFinalizeInput = typeof InvestigationFinalizeInput.Type;
/**
 * Validates finalization terminal results. @remarks Success closes the investigation at one exact snapshot
 * and timestamp.
 */
export const InvestigationFinalizeResult = accepted({
  finalSnapshot: FullGitCommit,
  finalizedAt: Timestamp,
});
export type InvestigationFinalizeResult = typeof InvestigationFinalizeResult.Type;

/**
 * Builds one closed Effect tool contract. @typeParam Name - Operation name.
 *
 * @typeParam Parameters - Input schema. @typeParam Success - Result schema.
 * @param name - Stable operation name. @param description - Caller-facing purpose. @param parameters - Input
 *   schema. @param success - Success schema.
 * @param options - Destructive, idempotent, and open-world annotations.
 * @returns The annotated tool definition.
 */
const makeTool = <const Name extends string, Parameters extends Schema.Top, Success extends Schema.Top>(
  name: Name,
  description: string,
  parameters: Parameters,
  success: Success,
  options: {
    readonly destructive: boolean;
    readonly idempotent: boolean;
    readonly openWorld: boolean;
  },
): Tool.Tool<
  Name,
  {
    readonly parameters: Parameters;
    readonly success: Success;
    readonly failure: typeof AttuneToolFailure;
    readonly failureMode: "return";
  },
  never
> =>
  Tool.make(name, {
    description,
    parameters,
    success,
    failure: AttuneToolFailure,
    failureMode: "return",
  })
    .annotate(Tool.Readonly, false)
    .annotate(Tool.Destructive, options.destructive)
    .annotate(Tool.Idempotent, options.idempotent)
    .annotate(Tool.OpenWorld, options.openWorld);

/**
 * Defines the repository materialization tool. @remarks This is the sole operation that creates investigation
 * authority.
 */
export const RepositoryMaterializeTool = makeTool(
  "repository_materialize",
  "Create or resume one exact repository-backed investigation.",
  RepositoryMaterializeInput,
  RepositoryMaterializeResult,
  { destructive: false, idempotent: true, openWorld: true },
);
/**
 * Defines the repository checkpoint tool. @remarks The contract preserves current investigation authority
 * while selecting snapshot policy.
 */
export const RepositoryCheckpointTool = makeTool(
  "repository_checkpoint",
  "Checkpoint the attached investigation branch at a clean Git commit.",
  RepositoryCheckpointInput,
  RepositoryCheckpointResult,
  { destructive: false, idempotent: true, openWorld: false },
);
/**
 * Defines the Joern query tool. @remarks Query inputs remain correlated with their terminal CPG evidence.
 */
export const JoernQueryTool = makeTool(
  "joern_query",
  "Run native CPGQL through joern-effect against an exact commit.",
  JoernQueryInput,
  JoernQueryResult,
  { destructive: false, idempotent: true, openWorld: false },
);
/**
 * Defines the Maude execution tool. @remarks Native inputs and bounded output share one terminal contract.
 */
export const MaudeRunTool = makeTool(
  "maude_run",
  "Run exact native Maude source and commands.",
  MaudeRunInput,
  MaudeRunResult,
  { destructive: false, idempotent: true, openWorld: false },
);
/**
 * Defines the property execution tool. @remarks Reproducibility parameters and counterexample evidence remain
 * schema checked.
 */
export const PropertyRunTool = makeTool(
  "property_run",
  "Run an ordinary TypeScript fast-check property and retain counterexamples.",
  PropertyRunInput,
  PropertyRunResult,
  { destructive: false, idempotent: true, openWorld: false },
);
/**
 * Defines the ast-grep tool. @remarks One contract covers test, scan, and apply modes under explicit writer
 * metadata.
 */
export const AstGrepRunTool = makeTool(
  "ast_grep_run",
  "Test, scan, or apply repository-native ast-grep rules.",
  AstGrepRunInput,
  AstGrepRunResult,
  { destructive: true, idempotent: true, openWorld: false },
);
/**
 * Defines the artifact-promotion tool. @remarks Promotion is the explicit boundary from retained evidence to
 * repository bytes.
 */
export const ArtifactPromoteTool = makeTool(
  "artifact_promote",
  "Copy one retained native artifact into the investigation repository.",
  ArtifactPromoteInput,
  ArtifactPromoteResult,
  { destructive: true, idempotent: true, openWorld: false },
);
/**
 * Defines the investigation finalization tool. @remarks Finalization consumes active authority at an exact
 * clean snapshot.
 */
export const InvestigationFinalizeTool = makeTool(
  "investigation_finalize",
  "Mechanically finalize one clean investigation.",
  InvestigationFinalizeInput,
  InvestigationFinalizeResult,
  { destructive: false, idempotent: true, openWorld: false },
);
