import { access, readdir, readFile } from "node:fs/promises";
import * as Path from "node:path";

import { apiManifestDigest, digestValue, isIsoTimestamp } from "./canonical.ts";
import type {
  ApiManifest,
  ProseDraft,
  TraceArtifact,
  TraceExport,
} from "./model.ts";
import { paths } from "./paths.ts";

const contentAddressPattern = /^sha256:[0-9a-f]{64}$/u;
const bareDigestPattern = /^[0-9a-f]{64}$/u;
const publicTraceEdgeKinds = {
  derivedFrom: "content",
  informedBy: "content",
  cites: "content",
  usesInput: "execution",
  configuredBy: "execution",
  producedBy: "execution",
  validatedBy: "review",
  approvedBy: "review",
  approvalCarriedForwardBy: "review",
  carriesApprovalFrom: "review",
  revalidatesApproval: "review",
  renders: "presentation",
  invalidates: "invalidation",
} as const;
const publicTraceFields: Readonly<Record<string, readonly string[]>> = {
  attune_doc_source_revision: [
    "repository",
    "revision",
    "source_digest",
    "schema_version",
  ],
  attune_doc_manifest_input: [
    "revision",
    "manifest_digest",
    "locator",
    "schema_version",
  ],
  attune_doc_manifest_fact: [
    "fact_id",
    "symbol_id",
    "kind",
    "value",
    "schema_version",
  ],
  attune_doc_agent_configuration: [
    "agent_name",
    "agent_version",
    "model",
    "schema_version",
  ],
  attune_doc_agent_run: [
    "run_identity",
    "kind",
    "status",
    "agent_name",
    "agent_version",
    "schema_version",
  ],
  attune_doc_evidence: ["evidence_id", "kind", "locator", "schema_version"],
  attune_doc_research_claim: [
    "claim_id",
    "text",
    "certainty",
    "schema_version",
  ],
  attune_doc_guide_section: [
    "guide_id",
    "section_id",
    "heading",
    "prose",
    "claim_ids",
    "manifest_revision",
    "schema_version",
  ],
  attune_doc_guide_draft: [
    "guide_id",
    "source_revision",
    "manifest_revision",
    "manifest_digest",
    "draft_digest",
    "evidence_digest",
    "section_addresses",
    "schema_version",
  ],
  attune_doc_validation_result: [
    "subject_address",
    "validation_id",
    "validation_time",
    "validator",
    "validator_version",
    "outcome",
    "checks",
    "schema_version",
  ],
  attune_doc_approval_decision: [
    "subject_address",
    "decision_id",
    "source_revision",
    "manifest_digest",
    "draft_digest",
    "evidence_digest",
    "reviewer",
    "reviewer_role",
    "outcome",
    "decision_time",
    "schema_version",
  ],
  attune_doc_approval_carry_forward: [
    "carry_forward_id",
    "current_draft_address",
    "prior_draft_address",
    "prior_approval_address",
    "draft_digest",
    "evidence_digest",
    "workflow",
    "workflow_version",
    "revalidation_time",
    "reason",
    "schema_version",
  ],
  attune_doc_rendered_artifact: [
    "guide_id",
    "path",
    "media_type",
    "artifact_digest",
    "renderer",
    "renderer_version",
    "schema_version",
  ],
  attune_doc_publication_revision: [
    "guide_id",
    "revision",
    "site",
    "published_by",
    "artifact_address",
    "schema_version",
  ],
  attune_doc_invalidation: [
    "manifest_revision",
    "changes",
    "reason",
    "schema_version",
  ],
};

type PublicTraceEdgeType = keyof typeof publicTraceEdgeKinds;

interface PublicTraceEndpointRule {
  readonly sourceTypes: readonly string[];
  readonly targetTypes: readonly string[];
  readonly exactPairs?: readonly (readonly [string, string])[];
}

const contentSourceTypes = [
  "attune_doc_source_revision",
  "attune_doc_manifest_input",
  "attune_doc_manifest_fact",
  "attune_doc_evidence",
  "attune_doc_research_claim",
  "attune_doc_guide_section",
] as const;
const contentSubjectTypes = [
  "attune_doc_manifest_fact",
  "attune_doc_evidence",
  "attune_doc_research_claim",
  "attune_doc_guide_section",
  "attune_doc_guide_draft",
] as const;
const publicTraceEndpointRules: Readonly<
  Record<PublicTraceEdgeType, PublicTraceEndpointRule>
> = {
  derivedFrom: {
    sourceTypes: contentSubjectTypes,
    targetTypes: contentSourceTypes,
  },
  informedBy: {
    sourceTypes: ["attune_doc_guide_section"],
    targetTypes: ["attune_doc_research_claim"],
  },
  cites: {
    sourceTypes: [
      "attune_doc_research_claim",
      "attune_doc_guide_section",
      "attune_doc_guide_draft",
    ],
    targetTypes: [
      "attune_doc_source_revision",
      "attune_doc_manifest_input",
      "attune_doc_manifest_fact",
      "attune_doc_evidence",
      "attune_doc_research_claim",
    ],
  },
  usesInput: {
    sourceTypes: ["attune_doc_agent_run"],
    targetTypes: ["attune_doc_source_revision", "attune_doc_manifest_input"],
  },
  configuredBy: {
    sourceTypes: ["attune_doc_agent_run"],
    targetTypes: ["attune_doc_agent_configuration"],
  },
  producedBy: {
    sourceTypes: [
      "attune_doc_evidence",
      "attune_doc_research_claim",
      "attune_doc_guide_section",
      "attune_doc_guide_draft",
      "attune_doc_rendered_artifact",
    ],
    targetTypes: ["attune_doc_agent_run"],
  },
  validatedBy: {
    sourceTypes: [
      "attune_doc_research_claim",
      "attune_doc_guide_section",
      "attune_doc_guide_draft",
      "attune_doc_rendered_artifact",
    ],
    targetTypes: ["attune_doc_validation_result"],
  },
  approvedBy: {
    sourceTypes: ["attune_doc_research_claim", "attune_doc_guide_draft"],
    targetTypes: ["attune_doc_approval_decision"],
  },
  approvalCarriedForwardBy: {
    sourceTypes: ["attune_doc_guide_draft"],
    targetTypes: ["attune_doc_approval_carry_forward"],
  },
  carriesApprovalFrom: {
    sourceTypes: ["attune_doc_approval_carry_forward"],
    targetTypes: ["attune_doc_guide_draft"],
  },
  revalidatesApproval: {
    sourceTypes: ["attune_doc_approval_carry_forward"],
    targetTypes: ["attune_doc_approval_decision"],
  },
  renders: {
    sourceTypes: [
      "attune_doc_rendered_artifact",
      "attune_doc_publication_revision",
    ],
    targetTypes: ["attune_doc_guide_draft", "attune_doc_rendered_artifact"],
    exactPairs: [
      ["attune_doc_rendered_artifact", "attune_doc_guide_draft"],
      ["attune_doc_publication_revision", "attune_doc_rendered_artifact"],
    ],
  },
  invalidates: {
    sourceTypes: ["attune_doc_invalidation"],
    targetTypes: [
      "attune_doc_manifest_fact",
      "attune_doc_research_claim",
      "attune_doc_guide_section",
    ],
  },
};

type TraceData = Readonly<Record<string, unknown>>;

const isNonBlankString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isBareDigest = (value: unknown): value is string =>
  typeof value === "string" && bareDigestPattern.test(value);

const isContentAddress = (value: unknown): value is string =>
  typeof value === "string" && contentAddressPattern.test(value);

const isStringArray = (
  value: unknown,
  options: { readonly nonEmpty?: boolean; readonly unique?: boolean } = {},
): value is readonly string[] =>
  Array.isArray(value) &&
  (options.nonEmpty !== true || value.length > 0) &&
  value.every(isNonBlankString) &&
  (options.unique !== true || new Set(value).size === value.length);

const isInvalidationChangeArray = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) return false;
  const factIds = new Set<string>();
  const previousAddresses = new Set<string>();
  for (const change of value) {
    if (
      typeof change !== "object" ||
      change === null ||
      !hasExactKeys(change, [
        "fact_id",
        "previous_address",
        "current_address",
      ]) ||
      !isNonBlankString(change.fact_id) ||
      !isContentAddress(change.previous_address) ||
      (change.current_address !== null &&
        !isContentAddress(change.current_address)) ||
      factIds.has(change.fact_id) ||
      previousAddresses.has(change.previous_address)
    ) {
      return false;
    }
    factIds.add(change.fact_id);
    previousAddresses.add(change.previous_address);
  }
  return true;
};

const isJsonValue = (value: unknown): boolean => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  return Object.values(value).every(isJsonValue);
};

const hasSchemaVersion = (data: TraceData): boolean =>
  data.schema_version === 1;

const publicTraceDataValidators: Readonly<
  Record<string, (data: TraceData) => boolean>
> = {
  attune_doc_source_revision: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.repository) &&
    isNonBlankString(data.revision) &&
    isBareDigest(data.source_digest),
  attune_doc_manifest_input: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.revision) &&
    isBareDigest(data.manifest_digest) &&
    isNonBlankString(data.locator),
  attune_doc_manifest_fact: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.fact_id) &&
    isNonBlankString(data.symbol_id) &&
    isNonBlankString(data.kind) &&
    isJsonValue(data.value),
  attune_doc_agent_configuration: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.agent_name) &&
    isNonBlankString(data.agent_version) &&
    isNonBlankString(data.model),
  attune_doc_agent_run: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.run_identity) &&
    ["research", "documentation"].includes(String(data.kind)) &&
    ["completed", "failed", "cancelled"].includes(String(data.status)) &&
    isNonBlankString(data.agent_name) &&
    isNonBlankString(data.agent_version),
  attune_doc_evidence: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.evidence_id) &&
    isNonBlankString(data.kind) &&
    isNonBlankString(data.locator),
  attune_doc_research_claim: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.claim_id) &&
    isNonBlankString(data.text) &&
    ["direct", "inference"].includes(String(data.certainty)),
  attune_doc_guide_section: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.guide_id) &&
    isNonBlankString(data.section_id) &&
    isNonBlankString(data.heading) &&
    isNonBlankString(data.prose) &&
    isStringArray(data.claim_ids, { unique: true }) &&
    isNonBlankString(data.manifest_revision),
  attune_doc_guide_draft: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.guide_id) &&
    isNonBlankString(data.source_revision) &&
    isNonBlankString(data.manifest_revision) &&
    isBareDigest(data.manifest_digest) &&
    isBareDigest(data.draft_digest) &&
    isBareDigest(data.evidence_digest) &&
    isStringArray(data.section_addresses, {
      nonEmpty: true,
      unique: true,
    }) &&
    data.section_addresses.every(isContentAddress),
  attune_doc_validation_result: (data) =>
    hasSchemaVersion(data) &&
    isContentAddress(data.subject_address) &&
    isNonBlankString(data.validation_id) &&
    isIsoTimestamp(data.validation_time) &&
    isNonBlankString(data.validator) &&
    isNonBlankString(data.validator_version) &&
    ["passed", "failed"].includes(String(data.outcome)) &&
    isStringArray(data.checks, { nonEmpty: true, unique: true }),
  attune_doc_approval_decision: (data) =>
    hasSchemaVersion(data) &&
    isContentAddress(data.subject_address) &&
    isNonBlankString(data.decision_id) &&
    isNonBlankString(data.source_revision) &&
    isBareDigest(data.manifest_digest) &&
    isBareDigest(data.draft_digest) &&
    isBareDigest(data.evidence_digest) &&
    isNonBlankString(data.reviewer) &&
    isNonBlankString(data.reviewer_role) &&
    ["approved", "rejected"].includes(String(data.outcome)) &&
    isIsoTimestamp(data.decision_time),
  attune_doc_approval_carry_forward: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.carry_forward_id) &&
    isContentAddress(data.current_draft_address) &&
    isContentAddress(data.prior_draft_address) &&
    isContentAddress(data.prior_approval_address) &&
    isBareDigest(data.draft_digest) &&
    isBareDigest(data.evidence_digest) &&
    isNonBlankString(data.workflow) &&
    isNonBlankString(data.workflow_version) &&
    isIsoTimestamp(data.revalidation_time) &&
    isNonBlankString(data.reason),
  attune_doc_rendered_artifact: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.guide_id) &&
    isNonBlankString(data.path) &&
    isNonBlankString(data.media_type) &&
    isBareDigest(data.artifact_digest) &&
    isNonBlankString(data.renderer) &&
    isNonBlankString(data.renderer_version),
  attune_doc_publication_revision: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.guide_id) &&
    isNonBlankString(data.revision) &&
    isNonBlankString(data.site) &&
    isNonBlankString(data.published_by) &&
    isContentAddress(data.artifact_address),
  attune_doc_invalidation: (data) =>
    hasSchemaVersion(data) &&
    isNonBlankString(data.manifest_revision) &&
    isInvalidationChangeArray(data.changes) &&
    isNonBlankString(data.reason),
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const hasExactKeys = (value: object, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const allowed = [...expected].sort();
  return (
    actual.length === allowed.length &&
    allowed.every((field, index) => actual[index] === field)
  );
};

const traceEndpointsAreValid = (
  edge: TraceExport["edges"][number],
  nodesById: ReadonlyMap<string, TraceExport["nodes"][number]>,
): boolean => {
  const rule = publicTraceEndpointRules[edge.type as PublicTraceEdgeType];
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (
    rule === undefined ||
    source === undefined ||
    target === undefined ||
    !rule.sourceTypes.includes(source.type) ||
    !rule.targetTypes.includes(target.type)
  ) {
    return false;
  }
  return (
    rule.exactPairs === undefined ||
    rule.exactPairs.some(
      ([sourceType, targetType]) =>
        source.type === sourceType && target.type === targetType,
    )
  );
};

export const validateTraceExport = (value: unknown): value is TraceExport => {
  if (typeof value !== "object" || value === null) return false;
  const trace = value as Partial<TraceExport>;
  if (
    !hasExactKeys(value, [
      "schema_version",
      "activegraph_run_id",
      "guide_id",
      "stale",
      "nodes",
      "edges",
    ]) ||
    trace.schema_version !== 1 ||
    typeof trace.activegraph_run_id !== "string" ||
    trace.activegraph_run_id.trim().length === 0 ||
    typeof trace.guide_id !== "string" ||
    trace.guide_id.trim().length === 0 ||
    typeof trace.stale !== "boolean" ||
    !Array.isArray(trace.nodes) ||
    !Array.isArray(trace.edges)
  ) {
    return false;
  }
  const nodeIds = new Set<string>();
  const contentAddresses = new Set<string>();
  const nodesById = new Map<string, TraceExport["nodes"][number]>();
  for (const node of trace.nodes) {
    if (
      typeof node !== "object" ||
      node === null ||
      !hasExactKeys(node, ["id", "type", "content_address", "data"]) ||
      typeof node.id !== "string" ||
      !contentAddressPattern.test(node.id) ||
      typeof node.type !== "string" ||
      node.type.trim().length === 0 ||
      typeof node.content_address !== "string" ||
      !contentAddressPattern.test(node.content_address) ||
      typeof node.data !== "object" ||
      node.data === null ||
      Array.isArray(node.data)
    ) {
      return false;
    }
    const allowedFields = publicTraceFields[node.type];
    const validateData = publicTraceDataValidators[node.type];
    const actualFields = Object.keys(node.data).sort();
    if (
      allowedFields === undefined ||
      validateData === undefined ||
      !validateData(node.data) ||
      actualFields.length !== allowedFields.length ||
      ![...allowedFields]
        .sort()
        .every((field, index) => actualFields[index] === field) ||
      node.id !==
        `sha256:${digestValue({
          content_address: node.content_address,
          type: node.type,
          data: node.data,
        })}` ||
      nodeIds.has(node.id) ||
      contentAddresses.has(node.content_address)
    ) {
      return false;
    }
    nodeIds.add(node.id);
    contentAddresses.add(node.content_address);
    nodesById.set(node.id, node);
  }
  const edgeIds = new Set<string>();
  return trace.edges.every((edge) => {
    const valid =
      typeof edge === "object" &&
      edge !== null &&
      hasExactKeys(edge, [
        "id",
        "source",
        "target",
        "type",
        "provenance_kind",
      ]) &&
      typeof edge.id === "string" &&
      typeof edge.source === "string" &&
      typeof edge.target === "string" &&
      typeof edge.type === "string" &&
      edge.type.trim().length > 0 &&
      publicTraceEdgeKinds[edge.type as keyof typeof publicTraceEdgeKinds] ===
        edge.provenance_kind &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target) &&
      traceEndpointsAreValid(edge, nodesById) &&
      edge.id ===
        `sha256:${digestValue({
          source: edge.source,
          target: edge.target,
          type: edge.type,
        })}` &&
      !edgeIds.has(edge.id);
    if (valid) edgeIds.add(edge.id);
    return valid;
  });
};

export const readTraceExports = async (
  directory = process.env.DOCS_TRACE_EXPORT_DIR,
): Promise<readonly TraceArtifact[]> => {
  const knownFixture = Path.join(
    paths.repository,
    "python",
    "attune-activegraph",
    "examples",
    "guide-trace.json",
  );
  const files: {
    readonly path: string;
    readonly kind: TraceArtifact["kind"];
  }[] = [];
  if (directory !== undefined) {
    if (!(await exists(directory))) {
      throw new Error(`DOCS_TRACE_EXPORT_DIR does not exist: ${directory}`);
    }
    files.push(
      ...(await readdir(directory))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => ({
          path: Path.join(directory, file),
          kind: "publication" as const,
        })),
    );
  } else if (await exists(knownFixture)) {
    files.push({ path: knownFixture, kind: "representative" });
  }

  const traces: TraceArtifact[] = [];
  for (const file of files) {
    const value: unknown = JSON.parse(await readFile(file.path, "utf8"));
    if (!validateTraceExport(value)) {
      throw new Error(`Invalid ActiveGraph TraceExport: ${file.path}`);
    }
    traces.push({ kind: file.kind, trace: value, sourcePath: file.path });
  }
  return traces;
};

type TraceNode = TraceExport["nodes"][number];
type TraceEdge = TraceExport["edges"][number];

const nodeHasData = (
  node: TraceNode,
  expected: Readonly<Record<string, unknown>>,
): boolean =>
  Object.entries(expected).every(
    ([field, value]) => node.data[field] === value,
  );

const nonEmptyDataString = (node: TraceNode, field: string): boolean =>
  typeof node.data[field] === "string" &&
  (node.data[field] as string).trim().length > 0;

const timezoneAwareDataTimestamp = (node: TraceNode, field: string): boolean =>
  isIsoTimestamp(node.data[field]);

const bareDataDigest = (node: TraceNode, field: string): boolean => {
  const value = node.data[field];
  return typeof value === "string" && bareDigestPattern.test(value);
};

const hasEdge = (
  trace: TraceExport,
  source: TraceNode,
  target: TraceNode,
  type: string,
  provenanceKind: TraceEdge["provenance_kind"],
): boolean =>
  trace.edges.some(
    (edge) =>
      edge.source === source.id &&
      edge.target === target.id &&
      edge.type === type &&
      edge.provenance_kind === provenanceKind,
  );

const linkedTargets = (
  trace: TraceExport,
  source: TraceNode,
  edgeType: string,
  nodeType: string,
): readonly TraceNode[] =>
  trace.edges.flatMap((edge) => {
    if (edge.source !== source.id || edge.type !== edgeType) return [];
    const target = trace.nodes.find((node) => node.id === edge.target);
    return target?.type === nodeType ? [target] : [];
  });

const compareCodeUnits = (left: string, right: string): number =>
  left === right ? 0 : left < right ? -1 : 1;

const latestLinkedTarget = (
  trace: TraceExport,
  source: TraceNode,
  edgeType: string,
  nodeType: string,
  timeField: string,
  identityField: string,
): TraceNode | undefined => {
  const targets = linkedTargets(trace, source, edgeType, nodeType);
  if (
    targets.some(
      (target) =>
        !isIsoTimestamp(target.data[timeField]) ||
        typeof target.data[identityField] !== "string",
    )
  ) {
    return undefined;
  }
  return [...targets].sort((left, right) => {
    const timeDifference =
      Date.parse(String(right.data[timeField])) -
      Date.parse(String(left.data[timeField]));
    if (timeDifference !== 0) return timeDifference;
    const identityDifference = compareCodeUnits(
      right.data[identityField] as string,
      left.data[identityField] as string,
    );
    return identityDifference !== 0
      ? identityDifference
      : compareCodeUnits(right.content_address, left.content_address);
  })[0];
};

const passedValidationFor = (
  trace: TraceExport,
  subject: TraceNode,
): TraceNode | undefined => {
  const validation = latestLinkedTarget(
    trace,
    subject,
    "validatedBy",
    "attune_doc_validation_result",
    "validation_time",
    "validation_id",
  );
  return validation !== undefined &&
    nodeHasData(validation, {
      outcome: "passed",
      subject_address: subject.content_address,
      schema_version: 1,
    }) &&
    nonEmptyDataString(validation, "validation_id") &&
    nonEmptyDataString(validation, "validator") &&
    nonEmptyDataString(validation, "validator_version") &&
    timezoneAwareDataTimestamp(validation, "validation_time") &&
    Array.isArray(validation.data.checks) &&
    validation.data.checks.length > 0
    ? validation
    : undefined;
};

const approvedResearchClaim = (
  trace: TraceExport,
  claim: TraceNode,
): boolean => {
  const approval = latestLinkedTarget(
    trace,
    claim,
    "approvedBy",
    "attune_doc_approval_decision",
    "decision_time",
    "decision_id",
  );
  return (
    approval !== undefined &&
    nodeHasData(approval, {
      outcome: "approved",
      subject_address: claim.content_address,
      schema_version: 1,
    }) &&
    timezoneAwareDataTimestamp(approval, "decision_time") &&
    passedValidationFor(trace, claim) !== undefined
  );
};

const contentReaches = (
  trace: TraceExport,
  source: TraceNode,
  target: TraceNode,
): boolean => {
  const queue = [source.id];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target.id) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of trace.edges) {
      if (
        edge.source === current &&
        edge.provenance_kind === "content" &&
        ["derivedFrom", "informedBy", "cites"].includes(edge.type)
      ) {
        queue.push(edge.target);
      }
    }
  }
  return false;
};

interface DraftLineage {
  readonly source: TraceNode;
  readonly manifest: TraceNode;
  readonly sections: readonly TraceNode[];
}

const contentLineageIds = (
  trace: TraceExport,
  root: TraceNode,
): ReadonlySet<string> => {
  const seen = new Set<string>();
  const queue = [root.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of trace.edges) {
      if (
        edge.source === current &&
        edge.provenance_kind === "content" &&
        ["derivedFrom", "informedBy", "cites"].includes(edge.type)
      ) {
        queue.push(edge.target);
      }
    }
  }
  return seen;
};

const exactDraftLineage = (
  trace: TraceExport,
  draft: TraceNode,
): DraftLineage | undefined => {
  if (
    draft.type !== "attune_doc_guide_draft" ||
    !Array.isArray(draft.data.section_addresses)
  ) {
    return undefined;
  }
  const addresses = draft.data.section_addresses as readonly string[];
  const sections = addresses.map((address) =>
    trace.nodes.find(
      (node) =>
        node.type === "attune_doc_guide_section" &&
        node.content_address === address,
    ),
  );
  if (sections.some((section) => section === undefined)) return undefined;

  const outgoingContent = trace.edges.filter(
    (edge) => edge.source === draft.id && edge.provenance_kind === "content",
  );
  const targets = outgoingContent.map((edge) => ({
    edge,
    target: trace.nodes.find((node) => node.id === edge.target)!,
  }));
  const sourceBindings = targets.filter(
    ({ edge, target }) =>
      edge.type === "cites" && target.type === "attune_doc_source_revision",
  );
  const manifestBindings = targets.filter(
    ({ edge, target }) =>
      edge.type === "cites" && target.type === "attune_doc_manifest_input",
  );
  const sectionBindings = targets.filter(
    ({ edge, target }) =>
      edge.type === "derivedFrom" && target.type === "attune_doc_guide_section",
  );
  if (
    sourceBindings.length !== 1 ||
    manifestBindings.length !== 1 ||
    sectionBindings.length !== addresses.length ||
    outgoingContent.length !== addresses.length + 2
  ) {
    return undefined;
  }
  const sectionIds = new Set(sections.map((section) => section!.id));
  if (
    sectionBindings.some(({ target }) => !sectionIds.has(target.id)) ||
    sectionIds.size !== addresses.length
  ) {
    return undefined;
  }

  const source = sourceBindings[0]!.target;
  const manifest = manifestBindings[0]!.target;
  if (
    !nodeHasData(source, {
      revision: draft.data.source_revision,
      schema_version: 1,
    }) ||
    !nodeHasData(manifest, {
      revision: draft.data.manifest_revision,
      manifest_digest: draft.data.manifest_digest,
      schema_version: 1,
    })
  ) {
    return undefined;
  }

  for (const section of sections as readonly TraceNode[]) {
    if (
      !nodeHasData(section, {
        guide_id: draft.data.guide_id,
        manifest_revision: draft.data.manifest_revision,
        schema_version: 1,
      }) ||
      passedValidationFor(trace, section) === undefined
    ) {
      return undefined;
    }
    const reachableResearch = trace.nodes.filter(
      (node) =>
        node.type === "attune_doc_research_claim" &&
        contentReaches(trace, section, node),
    );
    if (
      reachableResearch.some((claim) => !approvedResearchClaim(trace, claim))
    ) {
      return undefined;
    }
  }

  const lineage = contentLineageIds(trace, draft);
  if (
    trace.edges.some(
      (edge) =>
        edge.type === "invalidates" &&
        edge.provenance_kind === "invalidation" &&
        lineage.has(edge.target),
    )
  ) {
    return undefined;
  }
  return {
    source,
    manifest,
    sections: sections as readonly TraceNode[],
  };
};

interface SemanticContentProjection {
  readonly type: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly support: readonly {
    readonly relation: string;
    readonly target: SemanticContentProjection;
  }[];
}

const semanticContentProjection = (
  trace: TraceExport,
  node: TraceNode,
  ancestry = new Set<string>(),
): SemanticContentProjection | undefined => {
  if (ancestry.has(node.id)) return undefined;
  const nextAncestry = new Set(ancestry);
  nextAncestry.add(node.id);
  const data = Object.fromEntries(
    Object.entries(node.data).filter(
      ([field]) =>
        !(
          node.type === "attune_doc_guide_section" &&
          field === "manifest_revision"
        ),
    ),
  );
  const support: {
    readonly relation: string;
    readonly target: SemanticContentProjection;
  }[] = [];
  for (const edge of trace.edges) {
    if (
      edge.source !== node.id ||
      edge.provenance_kind !== "content" ||
      !["derivedFrom", "informedBy", "cites"].includes(edge.type)
    ) {
      continue;
    }
    const target = trace.nodes.find(
      (candidate) => candidate.id === edge.target,
    );
    if (target === undefined) return undefined;
    if (
      target.type === "attune_doc_source_revision" ||
      target.type === "attune_doc_manifest_input"
    ) {
      continue;
    }
    const projected = semanticContentProjection(trace, target, nextAncestry);
    if (projected === undefined) return undefined;
    support.push({ relation: edge.type, target: projected });
  }
  support.sort((left, right) =>
    digestValue(left).localeCompare(digestValue(right)),
  );
  return { type: node.type, data, support };
};

const semanticDraftContentDigest = (
  trace: TraceExport,
  lineage: DraftLineage,
): string | undefined => {
  const sections: unknown[] = [];
  for (const section of lineage.sections) {
    const projection = semanticContentProjection(trace, section);
    if (projection === undefined) return undefined;
    sections.push(projection);
  }
  return digestValue(sections);
};

const publicationLineageMatches = (
  trace: TraceExport,
  guide: ProseDraft,
  manifest: ApiManifest,
  draft: TraceNode,
  manifestDigest: string,
): boolean => {
  const lineage = exactDraftLineage(trace, draft);
  if (lineage === undefined) return false;
  const { source, manifest: manifestInput } = lineage;
  if (
    !nodeHasData(source, {
      revision: guide.sourceRevision,
      source_digest: guide.sourceDigest,
      schema_version: 1,
    }) ||
    !nonEmptyDataString(source, "repository") ||
    !nodeHasData(manifestInput, {
      revision: manifest.source.revision,
      manifest_digest: manifestDigest,
      schema_version: 1,
    }) ||
    !nonEmptyDataString(manifestInput, "locator") ||
    lineage.sections.length !== guide.sections.length
  ) {
    return false;
  }

  for (const guideSection of guide.sections) {
    const claimIds = guideSection.researchClaimIds;
    const section = lineage.sections.find(
      (node) =>
        nodeHasData(node, {
          guide_id: trace.guide_id,
          section_id: guideSection.id,
          heading: guideSection.heading,
          prose: guideSection.claims.map((claim) => claim.text).join(" "),
          manifest_revision: manifest.source.revision,
          schema_version: 1,
        }) &&
        Array.isArray(node.data.claim_ids) &&
        node.data.claim_ids.length === claimIds.length &&
        node.data.claim_ids.every((value, index) => value === claimIds[index]),
    );
    if (
      section === undefined ||
      passedValidationFor(trace, section) === undefined
    ) {
      return false;
    }

    const expectedFactNodes: TraceNode[] = [];
    for (const claim of guideSection.claims) {
      for (const evidence of claim.evidence) {
        for (const fact of evidence.facts) {
          const manifestFact = manifest.symbols
            .find((symbol) => symbol.id === evidence.symbolId)
            ?.facts.find((candidate) => candidate.id === fact.id);
          const factNodes = trace.nodes.filter(
            (node) =>
              node.type === "attune_doc_manifest_fact" &&
              nodeHasData(node, {
                fact_id: fact.id,
                symbol_id: evidence.symbolId,
                kind: manifestFact?.kind,
                value: manifestFact?.value,
                schema_version: 1,
              }),
          );
          const factNode = factNodes[0];
          if (
            manifestFact === undefined ||
            factNodes.length !== 1 ||
            factNode === undefined ||
            !hasEdge(trace, factNode, manifestInput, "derivedFrom", "content")
          ) {
            return false;
          }
          expectedFactNodes.push(factNode);
        }
      }
    }
    const expectedResearchNodes = guideSection.researchClaimIds.map(
      (claimId) => {
        const candidates = trace.nodes.filter(
          (node) =>
            node.type === "attune_doc_research_claim" &&
            node.data.claim_id === claimId,
        );
        return candidates.length === 1 ? candidates[0] : undefined;
      },
    );
    if (
      expectedResearchNodes.some((claim) => claim === undefined) ||
      expectedResearchNodes.some(
        (claim) => !approvedResearchClaim(trace, claim!),
      )
    ) {
      return false;
    }
    const expectedSupport = [
      ...new Map(
        [
          ...expectedFactNodes.map((node) => ({
            target: node.id,
            type: "cites",
          })),
          ...expectedResearchNodes.map((node) => ({
            target: node!.id,
            type: "informedBy",
          })),
        ].map((support) => [`${support.type}\0${support.target}`, support]),
      ).values(),
    ];
    const actualSupport = trace.edges
      .filter(
        (edge) =>
          edge.source === section.id && edge.provenance_kind === "content",
      )
      .map((edge) => ({ target: edge.target, type: edge.type }));
    if (
      actualSupport.length !== expectedSupport.length ||
      expectedSupport.some(
        (expected) =>
          !actualSupport.some(
            (actual) =>
              actual.target === expected.target &&
              actual.type === expected.type,
          ),
      )
    ) {
      return false;
    }
  }

  if (guide.provenance.kind === "prose-agent") {
    const run = trace.nodes.find(
      (node) =>
        node.type === "attune_doc_agent_run" &&
        nodeHasData(node, {
          run_identity: guide.provenance.runId,
          kind: "documentation",
          status: "completed",
          schema_version: 1,
        }) &&
        nonEmptyDataString(node, "agent_name") &&
        nonEmptyDataString(node, "agent_version") &&
        hasEdge(trace, draft, node, "producedBy", "execution"),
    );
    if (
      run === undefined ||
      !hasEdge(trace, run, source, "usesInput", "execution") ||
      !hasEdge(trace, run, manifestInput, "usesInput", "execution")
    ) {
      return false;
    }
    const configuration = trace.nodes.find(
      (node) =>
        node.type === "attune_doc_agent_configuration" &&
        nodeHasData(node, {
          agent_name: run.data.agent_name,
          agent_version: run.data.agent_version,
          schema_version: 1,
        }) &&
        nonEmptyDataString(node, "model") &&
        hasEdge(trace, run, node, "configuredBy", "execution"),
    );
    if (configuration === undefined) return false;
  }

  return manifest.source.digest === guide.sourceDigest;
};

const matchingGuideApproval = (
  approval: TraceNode,
  subject: TraceNode,
  guide: ProseDraft,
): boolean =>
  nodeHasData(subject, {
    source_revision: guide.review.sourceRevision,
    manifest_digest: guide.review.manifestDigest,
    draft_digest: guide.review.draftDigest,
    evidence_digest: guide.review.evidenceDigest,
    schema_version: 1,
  }) &&
  nodeHasData(approval, {
    outcome: "approved",
    decision_id: guide.review.decisionId,
    decision_time: guide.review.decidedAt,
    reviewer: guide.review.reviewer,
    source_revision: guide.review.sourceRevision,
    manifest_digest: guide.review.manifestDigest,
    draft_digest: guide.review.draftDigest,
    evidence_digest: guide.review.evidenceDigest,
    subject_address: subject.content_address,
    schema_version: 1,
  }) &&
  nonEmptyDataString(approval, "reviewer_role") &&
  timezoneAwareDataTimestamp(approval, "decision_time");

/**
 * Validates an explicit machine revalidation of an unchanged human-reviewed
 * draft. A carry-forward is deliberately not an approval decision: the trace
 * must retain the previous draft and its still-latest human decision.
 */
const matchingApprovalCarryForward = (
  trace: TraceExport,
  draft: TraceNode,
  guide: ProseDraft,
): TraceNode | undefined => {
  // A direct decision on the current draft always outranks machine
  // carry-forward; in particular, carry-forward can never override rejection.
  if (
    linkedTargets(trace, draft, "approvedBy", "attune_doc_approval_decision")
      .length > 0
  ) {
    return undefined;
  }
  const carryForwards = linkedTargets(
    trace,
    draft,
    "approvalCarriedForwardBy",
    "attune_doc_approval_carry_forward",
  );
  if (carryForwards.length !== 1) return undefined;
  const carryForward = carryForwards[0]!;
  if (
    !nodeHasData(carryForward, {
      current_draft_address: draft.content_address,
      draft_digest: guide.review.draftDigest,
      evidence_digest: guide.review.evidenceDigest,
      schema_version: 1,
    }) ||
    !nonEmptyDataString(carryForward, "carry_forward_id") ||
    !nonEmptyDataString(carryForward, "workflow") ||
    !nonEmptyDataString(carryForward, "workflow_version") ||
    !nonEmptyDataString(carryForward, "reason") ||
    !timezoneAwareDataTimestamp(carryForward, "revalidation_time")
  ) {
    return undefined;
  }
  const incomingCarryEdges = trace.edges.filter(
    (edge) =>
      edge.target === carryForward.id &&
      edge.type === "approvalCarriedForwardBy" &&
      edge.provenance_kind === "review",
  );
  const outgoingCarryReviewEdges = trace.edges.filter(
    (edge) =>
      edge.source === carryForward.id && edge.provenance_kind === "review",
  );
  if (
    incomingCarryEdges.length !== 1 ||
    incomingCarryEdges[0]!.source !== draft.id ||
    outgoingCarryReviewEdges.length !== 2
  ) {
    return undefined;
  }

  const priorDrafts = linkedTargets(
    trace,
    carryForward,
    "carriesApprovalFrom",
    "attune_doc_guide_draft",
  );
  const priorApprovals = linkedTargets(
    trace,
    carryForward,
    "revalidatesApproval",
    "attune_doc_approval_decision",
  );
  if (priorDrafts.length !== 1 || priorApprovals.length !== 1) return undefined;
  const priorDraft = priorDrafts[0]!;
  const priorApproval = priorApprovals[0]!;
  const currentLineage = exactDraftLineage(trace, draft);
  const priorLineage = exactDraftLineage(trace, priorDraft);
  const currentValidation = passedValidationFor(trace, draft);
  const priorValidation = passedValidationFor(trace, priorDraft);
  const currentSemantic =
    currentLineage === undefined
      ? undefined
      : semanticDraftContentDigest(trace, currentLineage);
  const priorSemantic =
    priorLineage === undefined
      ? undefined
      : semanticDraftContentDigest(trace, priorLineage);
  if (
    priorDraft.id === draft.id ||
    currentLineage === undefined ||
    priorLineage === undefined ||
    currentValidation === undefined ||
    priorValidation === undefined ||
    currentSemantic === undefined ||
    currentSemantic !== priorSemantic ||
    (currentLineage.source.content_address ===
      priorLineage.source.content_address &&
      currentLineage.manifest.content_address ===
        priorLineage.manifest.content_address) ||
    !nodeHasData(carryForward, {
      prior_draft_address: priorDraft.content_address,
      prior_approval_address: priorApproval.content_address,
    }) ||
    !nodeHasData(priorDraft, {
      guide_id: draft.data.guide_id,
      source_revision: guide.review.sourceRevision,
      manifest_digest: guide.review.manifestDigest,
      draft_digest: guide.review.draftDigest,
      evidence_digest: guide.review.evidenceDigest,
      schema_version: 1,
    }) ||
    !nonEmptyDataString(priorDraft, "manifest_revision") ||
    !Array.isArray(priorDraft.data.section_addresses) ||
    priorDraft.data.section_addresses.length === 0 ||
    !matchingGuideApproval(priorApproval, priorDraft, guide) ||
    Date.parse(carryForward.data.revalidation_time as string) <
      Math.max(
        Date.parse(priorApproval.data.decision_time as string),
        Date.parse(currentValidation.data.validation_time as string),
        Date.parse(priorValidation.data.validation_time as string),
      )
  ) {
    return undefined;
  }
  const latestPriorApproval = latestLinkedTarget(
    trace,
    priorDraft,
    "approvedBy",
    "attune_doc_approval_decision",
    "decision_time",
    "decision_id",
  );
  return latestPriorApproval?.id === priorApproval.id
    ? carryForward
    : undefined;
};

export const validatePublicationTraceBinding = (
  artifact: TraceArtifact,
  guide: ProseDraft,
  manifest: ApiManifest,
  expectedArtifact: {
    readonly path: string;
    readonly digest: string;
    readonly basePath: string;
    readonly siteUrl: string;
    readonly publicationRevision: string;
  },
): void => {
  if (artifact.kind !== "publication") return;
  const trace = artifact.trace;
  const manifestDigest = apiManifestDigest(manifest);
  const guideMatches = [guide.id, guide.slug].includes(trace.guide_id);
  const structurallyValid = validateTraceExport(trace);
  const draft = trace.nodes.find(
    (node) =>
      node.type === "attune_doc_guide_draft" &&
      nodeHasData(node, {
        guide_id: trace.guide_id,
        source_revision: guide.sourceRevision,
        manifest_digest: manifestDigest,
        draft_digest: guide.review.draftDigest,
        evidence_digest: guide.review.evidenceDigest,
        schema_version: 1,
      }) &&
      Array.isArray(node.data.section_addresses) &&
      node.data.section_addresses.length > 0 &&
      node.data.section_addresses.every(
        (address) =>
          typeof address === "string" &&
          contentAddressPattern.test(address) &&
          trace.nodes.some(
            (candidate) => candidate.content_address === address,
          ),
      ),
  );
  const latestApproval =
    draft === undefined
      ? undefined
      : latestLinkedTarget(
          trace,
          draft,
          "approvedBy",
          "attune_doc_approval_decision",
          "decision_time",
          "decision_id",
        );
  const directApproval =
    latestApproval !== undefined &&
    draft !== undefined &&
    matchingGuideApproval(latestApproval, draft, guide)
      ? latestApproval
      : undefined;
  const carriedApproval =
    draft === undefined
      ? undefined
      : matchingApprovalCarryForward(trace, draft, guide);
  const validation =
    draft === undefined ? undefined : passedValidationFor(trace, draft);
  const renderedArtifact =
    draft === undefined
      ? undefined
      : trace.nodes.find(
          (node) =>
            node.type === "attune_doc_rendered_artifact" &&
            nodeHasData(node, {
              guide_id: trace.guide_id,
              path: expectedArtifact.path,
              media_type: "text/html",
              artifact_digest: expectedArtifact.digest,
              renderer: "attune-static-docs",
              schema_version: 1,
            }) &&
            bareDataDigest(node, "artifact_digest") &&
            nonEmptyDataString(node, "renderer_version") &&
            hasEdge(trace, node, draft, "renders", "presentation"),
        );
  const publication =
    renderedArtifact === undefined
      ? undefined
      : trace.nodes.find(
          (node) =>
            node.type === "attune_doc_publication_revision" &&
            nodeHasData(node, {
              guide_id: trace.guide_id,
              revision: expectedArtifact.publicationRevision,
              site: expectedArtifact.siteUrl,
              artifact_address: renderedArtifact.content_address,
              schema_version: 1,
            }) &&
            nonEmptyDataString(node, "published_by") &&
            hasEdge(trace, node, renderedArtifact, "renders", "presentation"),
        );
  const publicationSiteMatches =
    publication !== undefined &&
    (() => {
      try {
        const site = new URL(String(publication.data.site));
        return (
          site.protocol === "https:" && site.href === expectedArtifact.siteUrl
        );
      } catch {
        return false;
      }
    })();
  const lineageMatches =
    draft !== undefined &&
    publicationLineageMatches(trace, guide, manifest, draft, manifestDigest);

  if (
    !structurallyValid ||
    trace.stale ||
    guide.review.status !== "approved" ||
    !guideMatches ||
    draft === undefined ||
    (directApproval === undefined && carriedApproval === undefined) ||
    validation === undefined ||
    renderedArtifact === undefined ||
    publication === undefined ||
    !publicationSiteMatches ||
    !lineageMatches
  ) {
    throw new Error(
      `Publication TraceExport ${artifact.sourcePath} is not bound through an approved, current guide-to-publication chain for guide ${guide.id}, source ${guide.sourceRevision}, manifest ${manifestDigest}, and draft ${guide.review.draftDigest}.`,
    );
  }
};
