import { canonicalJson, isIsoTimestamp } from "./canonical.ts";
import type {
  EvidenceManifest,
  EvidenceReference,
  GuideApproval,
  ProseClaim,
  ProseAgentOutput,
  ProseDraft,
  ProseSection,
} from "./model.ts";

export class DocumentationSchemaError extends Error {
  readonly issues: readonly string[];

  constructor(name: string, issues: readonly string[]) {
    super(`${name} failed schema validation:\n${issues.join("\n")}`);
    this.name = "DocumentationSchemaError";
    this.issues = issues;
  }
}

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

const hasOnlyKeys = (
  value: UnknownRecord,
  allowed: readonly string[],
): boolean => Object.keys(value).every((key) => allowed.includes(key));

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const STRUCTURED_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const structuredId = (value: unknown): value is string =>
  nonEmptyString(value) && STRUCTURED_ID.test(value);

const slug = (value: unknown): value is string =>
  nonEmptyString(value) && SLUG.test(value);

const stringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(nonEmptyString);

const duplicates = (values: readonly string[]): readonly string[] => [
  ...new Set(
    values.filter((value, index, source) => source.indexOf(value) !== index),
  ),
];

const hasDuplicateValues = (values: readonly unknown[]): boolean => {
  const projected = values.map(canonicalJson);
  return new Set(projected).size !== projected.length;
};

const parseEvidence = (
  value: unknown,
  path: string,
  issues: string[],
): EvidenceReference | undefined => {
  const candidate = record(value);
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, ["symbolId", "facts"]) ||
    !nonEmptyString(candidate.symbolId) ||
    !Array.isArray(candidate.facts) ||
    candidate.facts.length === 0
  ) {
    issues.push(
      `${path} must contain symbolId and a non-empty facts array only.`,
    );
    return undefined;
  }
  const facts: { id: string; digest: string }[] = [];
  for (const [index, factValue] of candidate.facts.entries()) {
    const fact = record(factValue);
    if (
      fact === undefined ||
      !hasOnlyKeys(fact, ["id", "digest"]) ||
      !nonEmptyString(fact.id) ||
      !/^[a-f\d]{64}$/u.test(String(fact.digest))
    ) {
      issues.push(
        `${path}.facts[${index}] must contain an id and SHA-256 digest only.`,
      );
      continue;
    }
    facts.push({ id: fact.id, digest: String(fact.digest) });
  }
  for (const duplicate of duplicates(facts.map((fact) => fact.id))) {
    issues.push(`${path}.facts contains duplicate fact id ${duplicate}.`);
  }
  return { symbolId: candidate.symbolId, facts };
};

const parseClaim = (
  value: unknown,
  path: string,
  issues: string[],
): ProseClaim | undefined => {
  const candidate = record(value);
  const allowed = [
    "id",
    "text",
    "certainty",
    "trivial",
    "evidence",
    "unresolvedQuestionId",
  ];
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, allowed) ||
    !structuredId(candidate.id) ||
    !nonEmptyString(candidate.text) ||
    !["direct", "inference"].includes(String(candidate.certainty)) ||
    typeof candidate.trivial !== "boolean" ||
    !Array.isArray(candidate.evidence)
  ) {
    issues.push(`${path} is not a valid structured prose claim.`);
    return undefined;
  }
  const unresolvedQuestionId = candidate.unresolvedQuestionId;
  if (
    unresolvedQuestionId !== undefined &&
    !structuredId(unresolvedQuestionId)
  ) {
    issues.push(`${path}.unresolvedQuestionId must be a safe structured ID.`);
  }
  const evidence = candidate.evidence.flatMap((item, index) => {
    const parsed = parseEvidence(item, `${path}.evidence[${index}]`, issues);
    return parsed === undefined ? [] : [parsed];
  });
  if (hasDuplicateValues(evidence)) {
    issues.push(`${path}.evidence contains duplicate evidence records.`);
  }
  return {
    id: candidate.id,
    text: candidate.text,
    certainty: candidate.certainty as "direct" | "inference",
    trivial: candidate.trivial,
    evidence,
    ...(nonEmptyString(unresolvedQuestionId) ? { unresolvedQuestionId } : {}),
  };
};

const parseSection = (
  value: unknown,
  path: string,
  issues: string[],
): ProseSection | undefined => {
  const candidate = record(value);
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, ["id", "heading", "researchClaimIds", "claims"]) ||
    !structuredId(candidate.id) ||
    !nonEmptyString(candidate.heading) ||
    !Array.isArray(candidate.researchClaimIds) ||
    !candidate.researchClaimIds.every(structuredId) ||
    !Array.isArray(candidate.claims) ||
    candidate.claims.length === 0
  ) {
    issues.push(`${path} is not a valid prose section.`);
    return undefined;
  }
  for (const duplicate of duplicates(candidate.researchClaimIds)) {
    issues.push(
      `${path}.researchClaimIds contains duplicate claim id ${duplicate}.`,
    );
  }
  return {
    id: candidate.id,
    heading: candidate.heading,
    researchClaimIds: candidate.researchClaimIds,
    claims: candidate.claims.flatMap((claim, index) => {
      const parsed = parseClaim(claim, `${path}.claims[${index}]`, issues);
      return parsed === undefined ? [] : [parsed];
    }),
  };
};

const parseReview = (
  value: unknown,
  path: string,
  issues: string[],
): ProseDraft["review"] | undefined => {
  const candidate = record(value);
  const allowed = [
    "status",
    "reviewer",
    "decisionId",
    "decidedAt",
    "sourceRevision",
    "manifestDigest",
    "draftDigest",
    "evidenceDigest",
  ];
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, allowed) ||
    !["approved", "proposed", "rejected"].includes(String(candidate.status)) ||
    !nonEmptyString(candidate.reviewer) ||
    !nonEmptyString(candidate.decisionId) ||
    !nonEmptyString(candidate.decidedAt) ||
    !nonEmptyString(candidate.sourceRevision) ||
    !/^[a-f\d]{64}$/u.test(String(candidate.manifestDigest)) ||
    !/^[a-f\d]{64}$/u.test(String(candidate.draftDigest)) ||
    !/^[a-f\d]{64}$/u.test(String(candidate.evidenceDigest))
  ) {
    issues.push(`${path} is not a complete review decision.`);
    return undefined;
  }
  if (!isIsoTimestamp(candidate.decidedAt)) {
    issues.push(
      `${path}.decidedAt must be an ISO-8601 timestamp with a timezone.`,
    );
  }
  return {
    status: candidate.status as ProseDraft["review"]["status"],
    reviewer: candidate.reviewer,
    decisionId: candidate.decisionId,
    decidedAt: candidate.decidedAt,
    sourceRevision: candidate.sourceRevision,
    manifestDigest: String(candidate.manifestDigest),
    draftDigest: String(candidate.draftDigest),
    evidenceDigest: String(candidate.evidenceDigest),
  };
};

export const parseGuideApproval = (value: unknown): GuideApproval => {
  const candidate = record(value);
  const allowed = [
    "schemaVersion",
    "guideId",
    "status",
    "reviewer",
    "decisionId",
    "decidedAt",
    "sourceRevision",
    "manifestDigest",
    "draftDigest",
    "evidenceDigest",
  ];
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, allowed) ||
    candidate.schemaVersion !== "1.0.0" ||
    !structuredId(candidate.guideId) ||
    candidate.status !== "approved"
  ) {
    throw new DocumentationSchemaError("GuideApproval", [
      "$ must identify a versioned guide approval.",
    ]);
  }
  const reviewValue = {
    status: candidate.status,
    reviewer: candidate.reviewer,
    decisionId: candidate.decisionId,
    decidedAt: candidate.decidedAt,
    sourceRevision: candidate.sourceRevision,
    manifestDigest: candidate.manifestDigest,
    draftDigest: candidate.draftDigest,
    evidenceDigest: candidate.evidenceDigest,
  };
  const issues: string[] = [];
  const review = parseReview(reviewValue, "$", issues);
  if (review === undefined || issues.length > 0) {
    throw new DocumentationSchemaError("GuideApproval", issues);
  }
  return {
    schemaVersion: "1.0.0",
    guideId: candidate.guideId,
    ...review,
    status: "approved",
  };
};

const parseProvenance = (
  value: unknown,
  path: string,
  issues: string[],
): ProseDraft["provenance"] | undefined => {
  const candidate = record(value);
  const kind = candidate?.kind;
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, ["kind", "runId"]) ||
    !["maintainer-authored", "prose-agent"].includes(String(kind)) ||
    (candidate.runId !== undefined && !nonEmptyString(candidate.runId)) ||
    (kind === "prose-agent" && !nonEmptyString(candidate.runId))
  ) {
    issues.push(
      `${path} is not valid documentation provenance; prose-agent output requires a non-empty runId.`,
    );
    return undefined;
  }
  return {
    kind: kind as ProseDraft["provenance"]["kind"],
    ...(candidate.runId === undefined ? {} : { runId: candidate.runId }),
  };
};

export const parseProseDraft = (value: unknown): ProseDraft => {
  const issues: string[] = [];
  const candidate = record(value);
  const allowed = [
    "schemaVersion",
    "id",
    "slug",
    "title",
    "summary",
    "audience",
    "sourceRevision",
    "sourceDigest",
    "sections",
    "nextPages",
    "unresolvedQuestions",
    "review",
    "provenance",
  ];
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, allowed) ||
    candidate.schemaVersion !== "1.0.0" ||
    !structuredId(candidate.id) ||
    !slug(candidate.slug) ||
    !nonEmptyString(candidate.title) ||
    !nonEmptyString(candidate.summary) ||
    !nonEmptyString(candidate.audience) ||
    !nonEmptyString(candidate.sourceRevision) ||
    !/^[a-f\d]{64}$/u.test(String(candidate.sourceDigest)) ||
    !Array.isArray(candidate.sections) ||
    candidate.sections.length === 0 ||
    !stringArray(candidate.nextPages) ||
    !candidate.nextPages.every(slug) ||
    !Array.isArray(candidate.unresolvedQuestions)
  ) {
    throw new DocumentationSchemaError("ProseDraft", [
      "$ does not satisfy the prose-draft 1.0.0 envelope.",
    ]);
  }

  const sections = candidate.sections.flatMap((section, index) => {
    const parsed = parseSection(section, `$.sections[${index}]`, issues);
    return parsed === undefined ? [] : [parsed];
  });
  const unresolvedQuestions = candidate.unresolvedQuestions.flatMap(
    (value_, index) => {
      const question = record(value_);
      if (
        question === undefined ||
        !hasOnlyKeys(question, ["id", "question", "status", "resolution"]) ||
        !structuredId(question.id) ||
        !nonEmptyString(question.question) ||
        !["open", "resolved"].includes(String(question.status)) ||
        (question.resolution !== undefined &&
          !nonEmptyString(question.resolution))
      ) {
        issues.push(
          `$.unresolvedQuestions[${index}] is not a valid question record.`,
        );
        return [];
      }
      return [
        {
          id: question.id,
          question: question.question,
          status: question.status as "open" | "resolved",
          ...(question.resolution === undefined
            ? {}
            : { resolution: String(question.resolution) }),
        },
      ];
    },
  );
  const review = parseReview(candidate.review, "$.review", issues);
  const provenance = parseProvenance(
    candidate.provenance,
    "$.provenance",
    issues,
  );
  for (const duplicate of duplicates(sections.map((section) => section.id))) {
    issues.push(`$.sections contains duplicate section id ${duplicate}.`);
  }
  for (const duplicate of duplicates(
    sections.flatMap((section) => section.claims.map((claim) => claim.id)),
  )) {
    issues.push(
      `$.sections contains duplicate guide-wide claim id ${duplicate}.`,
    );
  }
  for (const duplicate of duplicates(
    unresolvedQuestions.map((question) => question.id),
  )) {
    issues.push(
      `$.unresolvedQuestions contains duplicate question id ${duplicate}.`,
    );
  }
  for (const duplicate of duplicates(candidate.nextPages)) {
    issues.push(`$.nextPages contains duplicate page ${duplicate}.`);
  }
  if (hasDuplicateValues(sections)) {
    issues.push("$.sections contains duplicate section records.");
  }
  if (hasDuplicateValues(unresolvedQuestions)) {
    issues.push("$.unresolvedQuestions contains duplicate question records.");
  }
  if (issues.length > 0 || review === undefined || provenance === undefined) {
    throw new DocumentationSchemaError("ProseDraft", issues);
  }
  return {
    schemaVersion: "1.0.0",
    id: candidate.id,
    slug: candidate.slug,
    title: candidate.title,
    summary: candidate.summary,
    audience: candidate.audience,
    sourceRevision: candidate.sourceRevision,
    sourceDigest: String(candidate.sourceDigest),
    sections,
    nextPages: candidate.nextPages,
    unresolvedQuestions,
    review,
    provenance,
  };
};

/**
 * Parses the exact strict-structured-output contract given to a prose model.
 * Review authority is intentionally not part of that contract.
 */
export const parseProseAgentOutput = (value: unknown): ProseAgentOutput => {
  const candidate = record(value);
  if (candidate === undefined || "review" in candidate) {
    throw new DocumentationSchemaError("ProseAgentOutput", [
      "$.review is not model-authorable; publication approval is joined from a separate persisted artifact.",
    ]);
  }
  const parsed = parseProseDraft({
    ...candidate,
    review: {
      status: "proposed",
      reviewer: "unreviewed",
      decisionId: "agent-output-boundary",
      decidedAt: "1970-01-01T00:00:00.000Z",
      sourceRevision: candidate.sourceRevision,
      manifestDigest: "0".repeat(64),
      draftDigest: "0".repeat(64),
      evidenceDigest: "0".repeat(64),
    },
  });
  const { review: reviewAuthority, ...agentOutput } = parsed;
  void reviewAuthority;
  return agentOutput;
};

export const parseEvidenceManifest = (value: unknown): EvidenceManifest => {
  const issues: string[] = [];
  const candidate = record(value);
  if (
    candidate === undefined ||
    !hasOnlyKeys(candidate, [
      "schemaVersion",
      "guideId",
      "sourceRevision",
      "sourceDigest",
      "review",
      "provenance",
      "claims",
    ]) ||
    candidate.schemaVersion !== "1.0.0" ||
    !structuredId(candidate.guideId) ||
    !nonEmptyString(candidate.sourceRevision) ||
    !/^[a-f\d]{64}$/u.test(String(candidate.sourceDigest)) ||
    !Array.isArray(candidate.claims) ||
    candidate.claims.length === 0
  ) {
    throw new DocumentationSchemaError("EvidenceManifest", [
      "$ does not satisfy the evidence-manifest 1.0.0 envelope.",
    ]);
  }
  const review = parseReview(candidate.review, "$.review", issues);
  const provenance = parseProvenance(
    candidate.provenance,
    "$.provenance",
    issues,
  );
  const claims = candidate.claims.flatMap((value_, index) => {
    const claim = record(value_);
    if (
      claim === undefined ||
      !hasOnlyKeys(claim, ["id", "certainty", "evidence"]) ||
      !structuredId(claim.id) ||
      !["direct", "inference"].includes(String(claim.certainty)) ||
      !Array.isArray(claim.evidence)
    ) {
      issues.push(`$.claims[${index}] is not a valid evidence claim.`);
      return [];
    }
    const evidence = claim.evidence.flatMap((item, evidenceIndex) => {
      const parsed = parseEvidence(
        item,
        `$.claims[${index}].evidence[${evidenceIndex}]`,
        issues,
      );
      return parsed === undefined ? [] : [parsed];
    });
    if (hasDuplicateValues(evidence)) {
      issues.push(
        `$.claims[${index}].evidence contains duplicate evidence records.`,
      );
    }
    return [
      {
        id: claim.id,
        certainty: claim.certainty as "direct" | "inference",
        evidence,
      },
    ];
  });
  for (const duplicate of duplicates(claims.map((claim) => claim.id))) {
    issues.push(`$.claims contains duplicate claim id ${duplicate}.`);
  }
  if (hasDuplicateValues(claims)) {
    issues.push("$.claims contains duplicate claim records.");
  }
  if (issues.length > 0 || review === undefined || provenance === undefined) {
    throw new DocumentationSchemaError("EvidenceManifest", issues);
  }
  return {
    schemaVersion: "1.0.0",
    guideId: candidate.guideId,
    sourceRevision: candidate.sourceRevision,
    sourceDigest: String(candidate.sourceDigest),
    review,
    provenance,
    claims,
  };
};
