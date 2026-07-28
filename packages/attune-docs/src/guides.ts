import { readdir, readFile } from "node:fs/promises";
import * as Path from "node:path";

import { apiManifestDigest, digestValue } from "./canonical.ts";
import type {
  ApiFact,
  ApiManifest,
  GuideApproval,
  GuideStaleness,
  GuideTemplate,
  GuideValidation,
  ProseAgentOutput,
  ProseDraft,
  ValidationIssue,
} from "./model.ts";
import { parseGuideApproval } from "./parse.ts";

export const readGuideTemplates = async (
  directory: string,
): Promise<readonly GuideTemplate[]> => {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".json"))
    .sort();
  return Promise.all(
    files.map(async (file) => {
      const source = await readFile(Path.join(directory, file), "utf8");
      return JSON.parse(source) as GuideTemplate;
    }),
  );
};

export const readGuideApprovals = async (
  directory: string,
): Promise<readonly GuideApproval[]> => {
  const files = await readdir(directory).catch((cause: unknown) => {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return [];
    }
    throw cause;
  });
  return Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map(async (file) =>
        parseGuideApproval(
          JSON.parse(
            await readFile(Path.join(directory, file), "utf8"),
          ) as unknown,
        ),
      ),
  );
};

const selectSymbol = (
  manifest: ApiManifest,
  selector: string | readonly string[],
) => {
  const candidates = typeof selector === "string" ? [selector] : selector;
  return candidates
    .map((candidate) =>
      manifest.symbols.find(
        (symbol) => symbol.id === candidate || symbol.exportName === candidate,
      ),
    )
    .find((symbol) => symbol !== undefined);
};

const selectFact = (
  facts: readonly ApiFact[],
  kind: "documentation" | "signature" | "source",
): ApiFact | undefined => facts.find((fact) => fact.kind === kind);

export const materializeGuide = (
  template: GuideTemplate,
  manifest: ApiManifest,
  approval?: GuideApproval,
): ProseDraft => {
  const sections = template.sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    researchClaimIds: section.researchClaimIds ?? [],
    claims: section.claims.map((claim) => ({
      ...claim,
      trivial: claim.trivial ?? false,
      evidence: (claim.evidence ?? []).map((reference) => {
        const symbol = selectSymbol(manifest, reference.symbol);
        if (symbol === undefined) {
          const candidates =
            typeof reference.symbol === "string"
              ? reference.symbol
              : reference.symbol.join(", ");
          throw new Error(
            `Guide ${template.id} cannot resolve evidence symbol: ${candidates}`,
          );
        }
        const facts = reference.facts.map((kind) => {
          const fact = selectFact(symbol.facts, kind);
          if (fact === undefined) {
            throw new Error(
              `Guide ${template.id} cannot resolve ${kind} fact for ${symbol.id}`,
            );
          }
          return fact;
        });
        return {
          symbolId: symbol.id,
          facts: facts.map((fact) => ({
            id: fact.id,
            digest: fact.digest,
          })),
        };
      }),
    })),
  }));
  const agentOutput: ProseAgentOutput = {
    ...template,
    sourceRevision: manifest.source.revision,
    sourceDigest: manifest.source.digest,
    sections,
  };
  return attachGuideApproval(agentOutput, manifest, approval);
};

/**
 * Deterministic authority join between model/maintainer prose and an approval
 * record that is persisted outside the agent-output channel.
 */
export const attachGuideApproval = (
  agentOutput: ProseAgentOutput,
  manifest: ApiManifest,
  approval?: GuideApproval,
): ProseDraft => {
  if (approval !== undefined && approval.guideId !== agentOutput.id) {
    throw new Error(
      `Approval ${approval.guideId} cannot approve guide ${agentOutput.id}.`,
    );
  }
  const unreviewed: ProseDraft = {
    ...agentOutput,
    review: {
      status: "proposed",
      reviewer: "unreviewed",
      decisionId: "no-approval",
      decidedAt: "1970-01-01T00:00:00.000Z",
      sourceRevision: manifest.source.revision,
      manifestDigest: apiManifestDigest(manifest),
      draftDigest: "",
      evidenceDigest: "",
    },
  };
  const approvedReview =
    approval === undefined
      ? undefined
      : {
          status: approval.status,
          reviewer: approval.reviewer,
          decisionId: approval.decisionId,
          decidedAt: approval.decidedAt,
          sourceRevision: approval.sourceRevision,
          manifestDigest: approval.manifestDigest,
          draftDigest: approval.draftDigest,
          evidenceDigest: approval.evidenceDigest,
        };
  return {
    ...unreviewed,
    review: approvedReview ?? {
      ...unreviewed.review,
      draftDigest: guideDraftDigest(unreviewed),
      evidenceDigest: guideEvidenceDigest(unreviewed),
    },
  };
};

export const guideDraftDigest = (draft: ProseAgentOutput): string =>
  digestValue({
    schemaVersion: draft.schemaVersion,
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    summary: draft.summary,
    audience: draft.audience,
    sections: draft.sections.map((section) => ({
      ...section,
      claims: section.claims.map((claim) => ({
        ...claim,
        evidence: claim.evidence.map((evidence) => ({
          symbolId: evidence.symbolId,
          factIds: evidence.facts.map((fact) => fact.id),
        })),
      })),
    })),
    nextPages: draft.nextPages,
    unresolvedQuestions: draft.unresolvedQuestions,
    provenance: draft.provenance,
  });

export const guideEvidenceDigest = (draft: ProseAgentOutput): string =>
  digestValue(
    draft.sections.flatMap((section) =>
      section.claims.map((claim) => ({
        claimId: claim.id,
        evidence: claim.evidence,
      })),
    ),
  );

export const createGuideApproval = (
  draft: ProseAgentOutput,
  manifest: ApiManifest,
  decision: {
    readonly reviewer: string;
    readonly decisionId: string;
    readonly decidedAt: string;
  },
): GuideApproval => ({
  schemaVersion: "1.0.0",
  guideId: draft.id,
  status: "approved",
  ...decision,
  sourceRevision: manifest.source.revision,
  manifestDigest: apiManifestDigest(manifest),
  draftDigest: guideDraftDigest(draft),
  evidenceDigest: guideEvidenceDigest(draft),
});

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export const validateGuide = (
  draft: ProseDraft,
  manifest: ApiManifest,
  guideSlugs: ReadonlySet<string>,
  options: {
    readonly requireApproval?: boolean;
    readonly allowApprovalCarryForward?: boolean;
  } = {},
): GuideValidation => {
  const issues: ValidationIssue[] = [];
  const issue = (
    code: ValidationIssue["code"],
    path: string,
    message: string,
  ) => issues.push({ code, path, message });

  if (
    draft.schemaVersion !== "1.0.0" ||
    !isString(draft.id) ||
    !isString(draft.slug) ||
    !isString(draft.title) ||
    !Array.isArray(draft.sections)
  ) {
    issue(
      "invalid-schema",
      "$",
      "Draft does not satisfy the prose-draft 1.0.0 envelope.",
    );
  }
  if (
    draft.sourceRevision !== manifest.source.revision ||
    draft.sourceDigest !== manifest.source.digest
  ) {
    issue(
      "stale-source",
      "$.sourceRevision",
      `Draft targets ${draft.sourceRevision}/${draft.sourceDigest.slice(0, 12)} but the manifest is ${manifest.source.revision}/${manifest.source.digest.slice(0, 12)}.`,
    );
  }
  if (options.requireApproval === true && draft.review.status !== "approved") {
    issue(
      "not-approved",
      "$.review.status",
      "Narrative publication requires an approved review decision.",
    );
  }
  if (
    options.requireApproval === true &&
    draft.review.status === "approved" &&
    (draft.review.sourceRevision !== manifest.source.revision ||
      draft.review.manifestDigest !== apiManifestDigest(manifest)) &&
    options.allowApprovalCarryForward !== true
  ) {
    issue(
      "not-approved",
      "$.review",
      "Persisted approval targets another source or manifest. Publication requires a current direct approval or an exact ActiveGraph carry-forward trace.",
    );
  }
  if (
    options.requireApproval === true &&
    (draft.review.draftDigest !== guideDraftDigest(draft) ||
      draft.review.evidenceDigest !== guideEvidenceDigest(draft))
  ) {
    issue(
      "not-approved",
      "$.review",
      "Persisted approval does not match this structured draft and its cited fact digests. Run the explicit guides:approve workflow after review.",
    );
  }

  const symbols = new Map(
    manifest.symbols.map((symbol) => [symbol.id, symbol]),
  );
  const questions = new Map(
    draft.unresolvedQuestions.map((question) => [question.id, question]),
  );
  for (const [sectionIndex, section] of draft.sections.entries()) {
    for (const [claimIndex, claim] of section.claims.entries()) {
      const claimPath = `$.sections[${sectionIndex}].claims[${claimIndex}]`;
      if (!claim.trivial && claim.evidence.length === 0) {
        issue(
          "missing-evidence",
          `${claimPath}.evidence`,
          `Non-trivial claim ${claim.id} has no evidence.`,
        );
      }
      if (claim.unresolvedQuestionId !== undefined) {
        const question = questions.get(claim.unresolvedQuestionId);
        if (question === undefined || question.status === "open") {
          issue(
            "open-question-asserted",
            `${claimPath}.unresolvedQuestionId`,
            `Claim ${claim.id} presents an unresolved question as prose.`,
          );
        }
      }
      for (const [evidenceIndex, evidence] of claim.evidence.entries()) {
        const evidencePath = `${claimPath}.evidence[${evidenceIndex}]`;
        if (evidence.facts.length === 0) {
          issue(
            "missing-evidence",
            `${evidencePath}.facts`,
            `Evidence for ${claim.id} must cite at least one manifest fact.`,
          );
        }
        const symbol = symbols.get(evidence.symbolId);
        if (symbol === undefined) {
          issue(
            "unknown-symbol",
            `${evidencePath}.symbolId`,
            `Unknown evidence symbol ${evidence.symbolId}.`,
          );
          continue;
        }
        const facts = new Map(symbol.facts.map((fact) => [fact.id, fact]));
        for (const evidenceFact of evidence.facts) {
          const fact = facts.get(evidenceFact.id);
          if (fact === undefined) {
            issue(
              "unknown-fact",
              `${evidencePath}.facts`,
              `${evidenceFact.id} is not a fact of ${symbol.id}.`,
            );
            continue;
          }
          if (evidenceFact.digest !== fact.digest) {
            issue(
              "stale-source",
              `${evidencePath}.facts`,
              `${evidenceFact.id} changed after this draft was grounded.`,
            );
          }
        }
      }
    }
  }

  for (const [index, slug] of draft.nextPages.entries()) {
    if (!guideSlugs.has(slug)) {
      issue(
        "unknown-next-page",
        `$.nextPages[${index}]`,
        `Unknown next-page slug ${slug}.`,
      );
    }
  }

  return { valid: issues.length === 0, issues };
};

export const checkGuideStaleness = (
  draft: ProseDraft,
  manifest: ApiManifest,
): GuideStaleness => {
  const facts = new Map(
    manifest.symbols.flatMap((symbol) =>
      symbol.facts.map((fact) => [fact.id, fact.digest] as const),
    ),
  );
  const changedClaims = draft.sections.flatMap((section) =>
    section.claims.flatMap((claim) => {
      const changedFactIds = claim.evidence.flatMap((evidence) =>
        evidence.facts
          .filter((fact) => facts.get(fact.id) !== fact.digest)
          .map((fact) => fact.id),
      );
      return changedFactIds.length === 0
        ? []
        : [{ claimId: claim.id, changedFactIds }];
    }),
  );
  return {
    stale: changedClaims.length > 0,
    changedClaims,
  };
};
