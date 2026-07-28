import { Schema } from "effect";
import { Tool } from "effect/unstable/ai";

const checked = (pattern: RegExp, expected: string, max: number) =>
  Schema.String.check(
    Schema.isNonEmpty(),
    Schema.isMaxLength(max),
    Schema.isPattern(pattern, { expected }),
  );

export const InvestigationId = checked(
  /^[0-9A-HJKMNP-TV-Z]{26}$/u,
  "an uppercase canonical ULID",
  26,
).pipe(Schema.brand("InvestigationId"));
export type InvestigationId = typeof InvestigationId.Type;

export const InvocationId = checked(
  /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$/u,
  "a caller-stable identifier using letters, numbers, dot, underscore, colon, or hyphen",
  128,
).pipe(Schema.brand("InvocationId"));
export type InvocationId = typeof InvocationId.Type;

export const FullGitCommit = checked(
  /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u,
  "a lowercase full Git commit identifier",
  64,
).pipe(Schema.brand("FullGitCommit"));
export type FullGitCommit = typeof FullGitCommit.Type;

export const Sha256Digest = checked(
  /^[0-9a-f]{64}$/u,
  "a lowercase SHA-256 digest",
  64,
).pipe(Schema.brand("Sha256Digest"));
export type Sha256Digest = typeof Sha256Digest.Type;

const relativePathIsContained = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith("/") &&
  !path.includes("\\") &&
  !path.includes("\0") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

export const RepositoryRelativePath = Schema.String.check(
  Schema.isMaxLength(4_096),
  Schema.makeFilter(relativePathIsContained, {
    expected: "a contained POSIX repository-relative path",
  }),
).pipe(Schema.brand("RepositoryRelativePath"));
export type RepositoryRelativePath = typeof RepositoryRelativePath.Type;

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
        return (
          path.length > 0 && path.every((part) => part !== "." && part !== "..")
        );
      },
      { expected: "an artifact URI without traversal segments" },
    ),
  )
  .pipe(Schema.brand("ArtifactUri"));
export type ArtifactUri = typeof ArtifactUri.Type;

const boundedText = (max: number) =>
  Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(max));
const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThan(0),
);
const NonNegativeInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);
const Timeout = PositiveInt.check(Schema.isLessThanOrEqualTo(1_200_000));
const Timestamp = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u, {
    expected: "an RFC 3339 UTC timestamp",
  }),
);

export const FreeFormReference = Schema.Struct({
  ref: boundedText(8_192),
  note: Schema.optional(Schema.String.check(Schema.isMaxLength(65_536))),
}).annotate({ identifier: "FreeFormReference" });
export type FreeFormReference = typeof FreeFormReference.Type;
export const FreeFormReferences = Schema.Array(FreeFormReference).check(
  Schema.isMaxLength(256),
);

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

const FailureFields = {
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
 * `code` selects the caller's recovery decision; the optional expected,
 * observed, and path fields provide bounded evidence without exposing an
 * arbitrary native exception across the MCP contract.
 */
export const AttuneFailure = Schema.Struct(FailureFields).annotate({
  identifier: "AttuneFailure",
});
export type AttuneFailure = typeof AttuneFailure.Type;

/**
 * Tagged Effect failure returned when an invocation cannot be accepted.
 *
 * @remarks
 * Accepted native-tool failures normally become terminal receipt values.
 * This error channel is reserved for boundary failures such as conflicting
 * invocation identity, unavailable workspace state, or a closed contract
 * mismatch. Callers should branch on `code` rather than parse `message`.
 */
export class AttuneToolFailure extends Schema.TaggedErrorClass<AttuneToolFailure>()(
  "AttuneToolFailure",
  FailureFields,
) {}

export const ToolName = Schema.Literals([
  "repository",
  "joern",
  "maude",
  "property",
  "ast-grep",
  "artifact",
]);
export type ToolName = typeof ToolName.Type;

const ReceiptBase = {
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

export const SucceededReceipt = Schema.Struct({
  ...ReceiptBase,
  status: Schema.Literal("succeeded"),
  snapshotId: FullGitCommit,
}).annotate({ identifier: "SucceededReceipt" });
export type SucceededReceipt = typeof SucceededReceipt.Type;

export const FailedReceipt = Schema.Struct({
  ...ReceiptBase,
  status: Schema.Literal("failed"),
  snapshotId: Schema.optional(FullGitCommit),
  failure: AttuneFailure,
}).annotate({ identifier: "FailedReceipt" });
export type FailedReceipt = typeof FailedReceipt.Type;

export const CancelledReceipt = Schema.Struct({
  ...ReceiptBase,
  status: Schema.Literal("cancelled"),
  snapshotId: Schema.optional(FullGitCommit),
  failure: AttuneFailure,
}).annotate({ identifier: "CancelledReceipt" });
export type CancelledReceipt = typeof CancelledReceipt.Type;

export const AttuneReceipt = Schema.Union([
  SucceededReceipt,
  FailedReceipt,
  CancelledReceipt,
]).annotate({ identifier: "AttuneReceipt" });
export type AttuneReceipt = typeof AttuneReceipt.Type;

const TerminalFailureResult = Schema.Struct({
  receipt: Schema.Union([FailedReceipt, CancelledReceipt]),
});
const accepted = <S extends Schema.Struct.Fields>(fields: S) =>
  Schema.Union([
    Schema.Struct({ ...fields, receipt: SucceededReceipt }),
    TerminalFailureResult,
  ]);

const Common = {
  invocationId: InvocationId,
  references: FreeFormReferences,
} as const;
const InvestigationCommon = {
  ...Common,
  investigationId: InvestigationId,
  expectedSnapshot: FullGitCommit,
} as const;

export const RepositoryMaterializeInput = Schema.Struct({
  ...Common,
  remote: boundedText(8_192),
  revision: boundedText(1_024),
  investigationId: Schema.optional(InvestigationId),
}).annotate({ identifier: "RepositoryMaterializeInput" });
export type RepositoryMaterializeInput = typeof RepositoryMaterializeInput.Type;
export const RepositoryMaterializeResult = accepted({
  investigationId: InvestigationId,
  requestedRevision: boundedText(1_024),
  resolvedCommit: FullGitCommit,
  branch: boundedText(256),
});
export type RepositoryMaterializeResult =
  typeof RepositoryMaterializeResult.Type;

export const RepositoryCheckpointInput = Schema.Struct({
  ...InvestigationCommon,
  policy: Schema.Literals(["require-clean", "commit"]),
  message: Schema.optional(boundedText(16_384)),
}).annotate({ identifier: "RepositoryCheckpointInput" });
export type RepositoryCheckpointInput = typeof RepositoryCheckpointInput.Type;
export const RepositoryCheckpointResult = accepted({
  snapshotId: FullGitCommit,
  createdCommit: Schema.Boolean,
});
export type RepositoryCheckpointResult = typeof RepositoryCheckpointResult.Type;

export const JoernStructuredDsl = Schema.Struct({
  version: Schema.Literal(1),
  cpgSchemaVersion: boundedText(256),
  cpgSchemaHash: Sha256Digest,
  segments: Schema.Array(Schema.Json).check(Schema.isMaxLength(512)),
  select: Schema.Record(boundedText(256), boundedText(256)).check(
    Schema.isMaxProperties(64),
  ),
}).annotate({ identifier: "JoernStructuredDsl" });
export type JoernStructuredDsl = typeof JoernStructuredDsl.Type;

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
    Schema.makeFilter(
      (input) => (input.cpgql === undefined) !== (input.dsl === undefined),
      { expected: "exactly one of cpgql or dsl" },
    ),
  )
  .annotate({ identifier: "JoernQueryInput" });
export type JoernQueryInput = typeof JoernQueryInput.Type;
export const JoernQueryResult = accepted({
  snapshotId: FullGitCommit,
  cpgId: Sha256Digest,
  summary: Schema.Unknown,
});
export type JoernQueryResult = typeof JoernQueryResult.Type;

export const MaudeRunInput = Schema.Struct({
  ...InvestigationCommon,
  moduleSource: boundedText(2 * 1024 * 1024),
  commands: boundedText(256 * 1024),
  timeoutMilliseconds: Timeout,
}).annotate({ identifier: "MaudeRunInput" });
export type MaudeRunInput = typeof MaudeRunInput.Type;
export const MaudeRunResult = accepted({
  snapshotId: FullGitCommit,
  exitCode: Schema.optional(Schema.Number.check(Schema.isInt())),
  stdoutTail: Schema.String.check(Schema.isMaxLength(65_536)),
  stderrTail: Schema.String.check(Schema.isMaxLength(65_536)),
});
export type MaudeRunResult = typeof MaudeRunResult.Type;

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
export const PropertyRunResult = accepted({
  snapshotId: FullGitCommit,
  outcome: Schema.Literals(["no-counterexample", "counterexample"]),
  seed: Schema.optional(Schema.Number.check(Schema.isInt32())),
  counterexamplePath: Schema.optional(Schema.String),
  numRuns: Schema.optional(NonNegativeInt),
  numShrinks: Schema.optional(NonNegativeInt),
});
export type PropertyRunResult = typeof PropertyRunResult.Type;

export const AstGrepRunInput = Schema.Struct({
  ...InvestigationCommon,
  mode: Schema.Literals(["test", "scan", "apply"]),
  configPath: RepositoryRelativePath,
  rulePaths: Schema.Array(RepositoryRelativePath).check(
    Schema.isMaxLength(1_024),
  ),
  timeoutMilliseconds: Timeout,
}).annotate({ identifier: "AstGrepRunInput" });
export type AstGrepRunInput = typeof AstGrepRunInput.Type;
export const AstGrepRunResult = accepted({
  snapshotId: FullGitCommit,
  mode: Schema.Literals(["test", "scan", "apply"]),
  findingCount: Schema.optional(NonNegativeInt),
  changedFiles: Schema.Array(RepositoryRelativePath),
});
export type AstGrepRunResult = typeof AstGrepRunResult.Type;

export const ArtifactPromoteInput = Schema.Struct({
  ...InvestigationCommon,
  artifactUri: ArtifactUri,
  destinationPath: RepositoryRelativePath,
}).annotate({ identifier: "ArtifactPromoteInput" });
export type ArtifactPromoteInput = typeof ArtifactPromoteInput.Type;
export const ArtifactPromoteResult = accepted({
  beforeSnapshot: FullGitCommit,
  destinationPath: RepositoryRelativePath,
  workingTreeChanged: Schema.Boolean,
});
export type ArtifactPromoteResult = typeof ArtifactPromoteResult.Type;

export const InvestigationFinalizeInput = Schema.Struct(
  InvestigationCommon,
).annotate({ identifier: "InvestigationFinalizeInput" });
export type InvestigationFinalizeInput = typeof InvestigationFinalizeInput.Type;
export const InvestigationFinalizeResult = accepted({
  finalSnapshot: FullGitCommit,
  finalizedAt: Timestamp,
});
export type InvestigationFinalizeResult =
  typeof InvestigationFinalizeResult.Type;

const makeTool = <
  const Name extends string,
  Parameters extends Schema.Top,
  Success extends Schema.Top,
>(
  name: Name,
  description: string,
  parameters: Parameters,
  success: Success,
  options: {
    readonly destructive: boolean;
    readonly idempotent: boolean;
    readonly openWorld: boolean;
  },
) =>
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

export const RepositoryMaterializeTool = makeTool(
  "repository_materialize",
  "Create or resume one exact repository-backed investigation.",
  RepositoryMaterializeInput,
  RepositoryMaterializeResult,
  { destructive: false, idempotent: true, openWorld: true },
);
export const RepositoryCheckpointTool = makeTool(
  "repository_checkpoint",
  "Checkpoint the attached investigation branch at a clean Git commit.",
  RepositoryCheckpointInput,
  RepositoryCheckpointResult,
  { destructive: false, idempotent: true, openWorld: false },
);
export const JoernQueryTool = makeTool(
  "joern_query",
  "Run native CPGQL through joern-effect against an exact commit.",
  JoernQueryInput,
  JoernQueryResult,
  { destructive: false, idempotent: true, openWorld: false },
);
export const MaudeRunTool = makeTool(
  "maude_run",
  "Run exact native Maude source and commands.",
  MaudeRunInput,
  MaudeRunResult,
  { destructive: false, idempotent: true, openWorld: false },
);
export const PropertyRunTool = makeTool(
  "property_run",
  "Run an ordinary TypeScript fast-check property and retain counterexamples.",
  PropertyRunInput,
  PropertyRunResult,
  { destructive: false, idempotent: true, openWorld: false },
);
export const AstGrepRunTool = makeTool(
  "ast_grep_run",
  "Test, scan, or apply repository-native ast-grep rules.",
  AstGrepRunInput,
  AstGrepRunResult,
  { destructive: true, idempotent: true, openWorld: false },
);
export const ArtifactPromoteTool = makeTool(
  "artifact_promote",
  "Copy one retained native artifact into the investigation repository.",
  ArtifactPromoteInput,
  ArtifactPromoteResult,
  { destructive: true, idempotent: true, openWorld: false },
);
export const InvestigationFinalizeTool = makeTool(
  "investigation_finalize",
  "Mechanically finalize one clean investigation.",
  InvestigationFinalizeInput,
  InvestigationFinalizeResult,
  { destructive: false, idempotent: true, openWorld: false },
);
