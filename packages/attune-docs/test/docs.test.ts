import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { assertApiManifestSchema, auditManifest } from "../src/audit.ts";
import { apiManifestDigest, digest, digestValue } from "../src/canonical.ts";
import { assessTypeDocCompatibility } from "../src/compatibility.ts";
import { extractApiManifest } from "../src/extract.ts";
import {
  attachGuideApproval,
  checkGuideStaleness,
  createGuideApproval,
  materializeGuide,
  validateGuide,
} from "../src/guides.ts";
import { renderApiIndex, renderApiSymbol, renderGuide } from "../src/html.ts";
import { renderGuideMarkdown } from "../src/markdown.ts";
import type {
  ApiManifest,
  DocumentationPolicy,
  EvidenceManifest,
  GuideApproval,
  GuideTemplate,
  ProseDraft,
  RepositoryMap,
  TraceArtifact,
  TraceExport,
} from "../src/model.ts";
import {
  DocumentationSchemaError,
  parseEvidenceManifest,
  parseGuideApproval,
  parseProseAgentOutput,
  parseProseDraft,
} from "../src/parse.ts";
import { buildSite, resolveOutputPath } from "../src/site.ts";
import {
  validatePublicationTraceBinding,
  validateTraceExport,
} from "../src/traces.ts";
import { discoverStaticPages } from "../src/static-pages.ts";

const fixtureRoot = Path.join(import.meta.dirname, "fixtures", "api");
const policy: DocumentationPolicy = {
  requiredDocumentation: [
    {
      name: "fixture-docs",
      exportNamePattern:
        "^(Investigation|ActiveInvestigation|ExampleOperation|ExampleFailure)$",
      minMatches: 4,
      rationale: "The fixture surface is intentionally documented.",
    },
  ],
  requiredRelations: [
    {
      name: "fixture-lifecycle",
      exportNamePattern: "^ExampleOperation$",
      minMatches: 1,
      anyOf: ["requires", "produces", "transitionsTo"],
      rationale: "The fixture operation has descriptor metadata.",
    },
  ],
  allowedRelationTargets: ["active", "preserve"],
};

const extractFixture = (
  sourceRef = "fixture-ref",
  sourceRevision = "fixture-revision",
): Promise<ApiManifest> =>
  extractApiManifest({
    entryPoint: Path.join(fixtureRoot, "src", "index.ts"),
    packageName: "fixture",
    packageRoot: fixtureRoot,
    policy,
    repositoryUrl: "https://example.test/repository",
    sourceRef,
    sourceRevision,
    tsConfigPath: Path.join(fixtureRoot, "tsconfig.json"),
  });

const template: GuideTemplate = {
  schemaVersion: "1.0.0",
  id: "guide.fixture",
  slug: "fixture",
  title: "Fixture guide",
  summary: "A deterministic guide fixture.",
  audience: "Documentation test contributors.",
  sections: [
    {
      id: "state",
      heading: "Carry the state",
      claims: [
        {
          id: "fixture.claim",
          text: "An active investigation carries its lifecycle state.",
          certainty: "direct",
          evidence: [
            {
              symbol: "ActiveInvestigation",
              facts: ["signature"],
            },
          ],
        },
      ],
    },
  ],
  nextPages: ["fixture"],
  unresolvedQuestions: [],
  provenance: {
    kind: "maintainer-authored",
  },
};

const approveFixture = (
  manifest: ApiManifest,
): { readonly approval: GuideApproval; readonly draft: ProseDraft } => {
  const proposed = materializeGuide(template, manifest);
  const approval = createGuideApproval(proposed, manifest, {
    reviewer: "fixture maintainer",
    decisionId: "fixture-approval",
    decidedAt: "2026-07-27T00:00:00Z",
  });
  return {
    approval,
    draft: materializeGuide(template, manifest, approval),
  };
};

const traceAddress = (value: unknown): string => `sha256:${digestValue(value)}`;

const publicationDigest = (value: Record<string, unknown>, field: string): string => {
  const copy = { ...value };
  delete copy[field];
  return `sha256:${digestValue(copy)}`;
};

const traceEdgeId = (source: string, target: string, type: string): string =>
  traceAddress({ source, target, type });

const traceNode = (
  type: string,
  data: Readonly<Record<string, unknown>>,
): TraceExport["nodes"][number] => {
  const contentAddress = traceAddress({ recordType: type, value: data });
  return {
    id: traceAddress({ content_address: contentAddress, type, data }),
    type,
    content_address: contentAddress,
    data,
  };
};

const replaceTraceNode = (
  trace: TraceExport,
  nodeId: string,
  data: Readonly<Record<string, unknown>>,
): TraceExport => {
  const previous = trace.nodes.find((node) => node.id === nodeId);
  if (previous === undefined) throw new Error(`Unknown fixture node ${nodeId}`);
  const replacement = traceNode(previous.type, data);
  return {
    ...trace,
    nodes: trace.nodes.map((node) =>
      node.id === previous.id ? replacement : node,
    ),
    edges: trace.edges.map((edge) => {
      const source = edge.source === previous.id ? replacement.id : edge.source;
      const target = edge.target === previous.id ? replacement.id : edge.target;
      return {
        ...edge,
        id: traceEdgeId(source, target, edge.type),
        source,
        target,
      };
    }),
  };
};

const publicationExpectationFor = (
  draft: ProseDraft,
  manifest: ApiManifest,
) => {
  const path = `guides/${draft.slug}.html`;
  return {
    path,
    digest: digest(renderGuide(draft, manifest, [draft], "/attune/")),
    basePath: "/attune/",
    siteUrl: "https://example.test/attune/",
    publicationRevision: "fixture-publication",
  } as const;
};

const publicationTraceFor = (
  draft: ProseDraft,
  manifest: ApiManifest,
): TraceArtifact => {
  const guideId = draft.slug;
  const source = traceNode("attune_doc_source_revision", {
    repository: "fixture",
    revision: draft.sourceRevision,
    source_digest: draft.sourceDigest,
    schema_version: 1,
  });
  const manifestInput = traceNode("attune_doc_manifest_input", {
    revision: manifest.source.revision,
    manifest_digest: apiManifestDigest(manifest),
    locator: "api-manifest.json",
    schema_version: 1,
  });
  const facts = draft.sections.flatMap((guideSection) =>
    guideSection.claims.flatMap((claim) =>
      claim.evidence.flatMap((evidence) =>
        evidence.facts.map((fact) => {
          const manifestFact = manifest.symbols
            .find((symbol) => symbol.id === evidence.symbolId)!
            .facts.find((candidate) => candidate.id === fact.id)!;
          return traceNode("attune_doc_manifest_fact", {
            fact_id: fact.id,
            symbol_id: evidence.symbolId,
            kind: manifestFact.kind,
            value: manifestFact.value,
            schema_version: 1,
          });
        }),
      ),
    ),
  );
  const configuration = traceNode("attune_doc_agent_configuration", {
    agent_name: "fixture-docs-agent",
    agent_version: "1.0.0",
    model: "fixture-model",
    schema_version: 1,
  });
  const run = traceNode("attune_doc_agent_run", {
    run_identity: draft.provenance.runId ?? "fixture-run",
    kind: "documentation",
    status: "completed",
    agent_name: "fixture-docs-agent",
    agent_version: "1.0.0",
    schema_version: 1,
  });
  const section = traceNode("attune_doc_guide_section", {
    guide_id: guideId,
    section_id: draft.sections[0]!.id,
    heading: draft.sections[0]!.heading,
    prose: draft.sections[0]!.claims.map((claim) => claim.text).join(" "),
    claim_ids: draft.sections[0]!.researchClaimIds,
    manifest_revision: manifest.source.revision,
    schema_version: 1,
  });
  const guideDraft = traceNode("attune_doc_guide_draft", {
    guide_id: guideId,
    source_revision: draft.sourceRevision,
    manifest_revision: draft.sourceRevision,
    manifest_digest: apiManifestDigest(manifest),
    draft_digest: draft.review.draftDigest,
    evidence_digest: draft.review.evidenceDigest,
    section_addresses: [section.content_address],
    schema_version: 1,
  });
  const approval = traceNode("attune_doc_approval_decision", {
    outcome: "approved",
    decision_id: draft.review.decisionId,
    decision_time: draft.review.decidedAt,
    reviewer: draft.review.reviewer,
    source_revision: draft.review.sourceRevision,
    manifest_digest: draft.review.manifestDigest,
    draft_digest: draft.review.draftDigest,
    evidence_digest: draft.review.evidenceDigest,
    subject_address: guideDraft.content_address,
    reviewer_role: "maintainer",
    schema_version: 1,
  });
  const validation = traceNode("attune_doc_validation_result", {
    outcome: "passed",
    subject_address: guideDraft.content_address,
    validation_id: "fixture-validation",
    validation_time: "2026-07-27T00:01:00Z",
    validator: "fixture-validator",
    validator_version: "1.0.0",
    checks: ["current-manifest"],
    schema_version: 1,
  });
  const sectionValidation = traceNode("attune_doc_validation_result", {
    outcome: "passed",
    subject_address: section.content_address,
    validation_id: "fixture-section-validation",
    validation_time: "2026-07-27T00:00:30Z",
    validator: "fixture-validator",
    validator_version: "1.0.0",
    checks: ["known-fact", "current-manifest"],
    schema_version: 1,
  });
  const expectedArtifact = publicationExpectationFor(draft, manifest);
  const renderedArtifact = traceNode("attune_doc_rendered_artifact", {
    guide_id: guideId,
    path: expectedArtifact.path,
    media_type: "text/html",
    artifact_digest: expectedArtifact.digest,
    renderer: "attune-static-docs",
    renderer_version: "1.0.0",
    schema_version: 1,
  });
  const publication = traceNode("attune_doc_publication_revision", {
    guide_id: guideId,
    revision: "fixture-publication",
    site: "https://example.test/attune/",
    published_by: "fixture-release",
    artifact_address: renderedArtifact.content_address,
    schema_version: 1,
  });
  return {
    kind: "publication",
    sourcePath: "fixture/publication-trace.json",
    trace: {
      schema_version: 1,
      activegraph_run_id: "run.fixture",
      guide_id: guideId,
      stale: false,
      nodes: [
        source,
        manifestInput,
        ...facts,
        configuration,
        run,
        section,
        guideDraft,
        approval,
        validation,
        sectionValidation,
        renderedArtifact,
        publication,
      ],
      edges: [
        {
          id: traceEdgeId(guideDraft.id, source.id, "cites"),
          source: guideDraft.id,
          target: source.id,
          type: "cites",
          provenance_kind: "content",
        },
        {
          id: traceEdgeId(guideDraft.id, manifestInput.id, "cites"),
          source: guideDraft.id,
          target: manifestInput.id,
          type: "cites",
          provenance_kind: "content",
        },
        {
          id: traceEdgeId(guideDraft.id, section.id, "derivedFrom"),
          source: guideDraft.id,
          target: section.id,
          type: "derivedFrom",
          provenance_kind: "content",
        },
        ...facts.flatMap((fact) => [
          {
            id: traceEdgeId(section.id, fact.id, "cites"),
            source: section.id,
            target: fact.id,
            type: "cites",
            provenance_kind: "content" as const,
          },
          {
            id: traceEdgeId(fact.id, manifestInput.id, "derivedFrom"),
            source: fact.id,
            target: manifestInput.id,
            type: "derivedFrom",
            provenance_kind: "content" as const,
          },
        ]),
        {
          id: traceEdgeId(section.id, sectionValidation.id, "validatedBy"),
          source: section.id,
          target: sectionValidation.id,
          type: "validatedBy",
          provenance_kind: "review",
        },
        {
          id: traceEdgeId(guideDraft.id, run.id, "producedBy"),
          source: guideDraft.id,
          target: run.id,
          type: "producedBy",
          provenance_kind: "execution",
        },
        {
          id: traceEdgeId(run.id, configuration.id, "configuredBy"),
          source: run.id,
          target: configuration.id,
          type: "configuredBy",
          provenance_kind: "execution",
        },
        {
          id: traceEdgeId(run.id, source.id, "usesInput"),
          source: run.id,
          target: source.id,
          type: "usesInput",
          provenance_kind: "execution",
        },
        {
          id: traceEdgeId(run.id, manifestInput.id, "usesInput"),
          source: run.id,
          target: manifestInput.id,
          type: "usesInput",
          provenance_kind: "execution",
        },
        {
          id: traceEdgeId(guideDraft.id, approval.id, "approvedBy"),
          source: guideDraft.id,
          target: approval.id,
          type: "approvedBy",
          provenance_kind: "review",
        },
        {
          id: traceEdgeId(guideDraft.id, validation.id, "validatedBy"),
          source: guideDraft.id,
          target: validation.id,
          type: "validatedBy",
          provenance_kind: "review",
        },
        {
          id: traceEdgeId(renderedArtifact.id, guideDraft.id, "renders"),
          source: renderedArtifact.id,
          target: guideDraft.id,
          type: "renders",
          provenance_kind: "presentation",
        },
        {
          id: traceEdgeId(publication.id, renderedArtifact.id, "renders"),
          source: publication.id,
          target: renderedArtifact.id,
          type: "renders",
          provenance_kind: "presentation",
        },
      ],
    },
  };
};

const carriedPublicationTraceFor = (
  priorDraft: ProseDraft,
  priorManifest: ApiManifest,
  currentDraft: ProseDraft,
  currentManifest: ApiManifest,
): TraceArtifact => {
  const prior = publicationTraceFor(priorDraft, priorManifest);
  const current = publicationTraceFor(currentDraft, currentManifest);
  const priorDraftNode = prior.trace.nodes.find(
    (node) => node.type === "attune_doc_guide_draft",
  )!;
  const currentDraftNode = current.trace.nodes.find(
    (node) => node.type === "attune_doc_guide_draft",
  )!;
  const priorApprovalEdge = prior.trace.edges.find(
    (edge) => edge.source === priorDraftNode.id && edge.type === "approvedBy",
  )!;
  const priorApproval = prior.trace.nodes.find(
    (node) => node.id === priorApprovalEdge.target,
  )!;
  const currentApprovalEdge = current.trace.edges.find(
    (edge) => edge.source === currentDraftNode.id && edge.type === "approvedBy",
  )!;
  const carryForward = traceNode("attune_doc_approval_carry_forward", {
    carry_forward_id: "fixture-carry-forward",
    current_draft_address: currentDraftNode.content_address,
    prior_draft_address: priorDraftNode.content_address,
    prior_approval_address: priorApproval.content_address,
    draft_digest: currentDraft.review.draftDigest,
    evidence_digest: currentDraft.review.evidenceDigest,
    workflow: "fixture-docs-release",
    workflow_version: "1.0.0",
    revalidation_time: "2026-07-27T01:00:00Z",
    reason: "Only source-link coordinates changed.",
    schema_version: 1,
  });
  const carryEdges: TraceExport["edges"] = [
    {
      id: traceEdgeId(
        currentDraftNode.id,
        carryForward.id,
        "approvalCarriedForwardBy",
      ),
      source: currentDraftNode.id,
      target: carryForward.id,
      type: "approvalCarriedForwardBy",
      provenance_kind: "review",
    },
    {
      id: traceEdgeId(
        carryForward.id,
        priorDraftNode.id,
        "carriesApprovalFrom",
      ),
      source: carryForward.id,
      target: priorDraftNode.id,
      type: "carriesApprovalFrom",
      provenance_kind: "review",
    },
    {
      id: traceEdgeId(carryForward.id, priorApproval.id, "revalidatesApproval"),
      source: carryForward.id,
      target: priorApproval.id,
      type: "revalidatesApproval",
      provenance_kind: "review",
    },
  ];

  const priorAncestryNodes = prior.trace.nodes.filter(
    (node) =>
      node.type !== "attune_doc_rendered_artifact" &&
      node.type !== "attune_doc_publication_revision",
  );
  const priorAncestryIds = new Set(priorAncestryNodes.map((node) => node.id));
  const nodes = new Map(
    [
      ...current.trace.nodes.filter(
        (node) => node.id !== currentApprovalEdge.target,
      ),
      ...priorAncestryNodes,
      carryForward,
    ].map((node) => [node.id, node]),
  );
  const edges = new Map(
    [
      ...current.trace.edges.filter(
        (edge) => edge.id !== currentApprovalEdge.id,
      ),
      ...prior.trace.edges.filter(
        (edge) =>
          priorAncestryIds.has(edge.source) &&
          priorAncestryIds.has(edge.target),
      ),
      ...carryEdges,
    ].map((edge) => [edge.id, edge]),
  );
  return {
    ...current,
    sourcePath: "fixture/carried-publication-trace.json",
    trace: {
      ...current.trace,
      nodes: [...nodes.values()],
      edges: [...edges.values()],
    },
  };
};

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("deterministic API manifest", () => {
  test("extracts stable symbols, documentation, and descriptor authority", async () => {
    const first = await extractFixture();
    const second = await extractFixture();

    expect(second).toEqual(first);
    expect(first.diagnostics).toEqual([]);
    const failure = first.symbols.find(
      (symbol) => symbol.exportName === "ExampleFailure",
    )!;
    const spread = first.symbols.find(
      (symbol) => symbol.exportName === "SpreadOperation",
    )!;
    const commentOnly = first.symbols.find(
      (symbol) => symbol.exportName === "CommentOnlyOperation",
    )!;
    expect(failure.members.map((member) => member.name)).toContain("explain");
    expect(failure.members.map((member) => member.name)).not.toEqual(
      expect.arrayContaining([
        "internalDiagnostic",
        "recoverInternally",
        "inspectInternals",
        "#secretState",
      ]),
    );
    expect(
      spread.relations
        .filter((relation) => relation.source === "descriptor")
        .map((relation) => `${relation.kind}:${relation.target}`),
    ).toEqual(["produces:active", "requires:active", "transitionsTo:preserve"]);
    expect(
      commentOnly.relations.filter(
        (relation) => relation.source === "descriptor",
      ),
    ).toEqual([]);
    expect(
      first.symbols.map((symbol) => ({
        id: symbol.id,
        kind: symbol.kind,
        documented: symbol.summary.length > 0,
        descriptorRelations: symbol.relations
          .filter((relation) => relation.source === "descriptor")
          .map((relation) => `${relation.kind}:${relation.target}`),
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "descriptorRelations": [],
          "documented": true,
          "id": "fixture#ActiveInvestigation",
          "kind": "type",
        },
        {
          "descriptorRelations": [],
          "documented": true,
          "id": "fixture#artifactReference",
          "kind": "variable",
        },
        {
          "descriptorRelations": [],
          "documented": true,
          "id": "fixture#ArtifactReference",
          "kind": "interface",
        },
        {
          "descriptorRelations": [],
          "documented": true,
          "id": "fixture#CommentOnlyOperation",
          "kind": "variable",
        },
        {
          "descriptorRelations": [],
          "documented": true,
          "id": "fixture#ExampleFailure",
          "kind": "class",
        },
        {
          "descriptorRelations": [
            "produces:active",
            "requires:active",
            "transitionsTo:preserve",
          ],
          "documented": true,
          "id": "fixture#ExampleOperation",
          "kind": "variable",
        },
        {
          "descriptorRelations": [],
          "documented": true,
          "id": "fixture#Investigation",
          "kind": "interface",
        },
        {
          "descriptorRelations": [
            "produces:active",
            "requires:active",
            "transitionsTo:preserve",
          ],
          "documented": true,
          "id": "fixture#SpreadOperation",
          "kind": "variable",
        },
      ]
    `);
    expect(first.generator).toMatchObject({
      typescriptVersion: "7.0.2",
      tsMorphVersion: "28.0.0",
    });
  });

  test("validates the generated manifest against its closed JSON Schema", async () => {
    const manifest = await extractFixture();
    const schemaPath = Path.join(
      import.meta.dirname,
      "..",
      "schema",
      "api-manifest.schema.json",
    );
    await expect(
      assertApiManifestSchema(manifest, schemaPath),
    ).resolves.toBeUndefined();

    const malformed = structuredClone(manifest) as unknown as {
      symbols: ({ unexpected?: boolean } & ApiManifest["symbols"][number])[];
    };
    malformed.symbols[0]!.unexpected = true;
    await expect(
      assertApiManifestSchema(malformed, schemaPath),
    ).rejects.toThrow("$.symbols[0].unexpected is not an allowed property");

    await expect(
      assertApiManifestSchema({ ...manifest, symbols: [] }, schemaPath),
    ).rejects.toThrow("$.symbols must contain at least 1 items");
  });

  test("keeps API reference render bytes stable", async () => {
    const manifest = await extractFixture();
    const symbol = manifest.symbols.find(
      (candidate) => candidate.exportName === "ExampleOperation",
    )!;
    const index = renderApiIndex(manifest, [], "/attune/");
    const symbolPage = renderApiSymbol(symbol, manifest, [], "/attune/");

    expect(index).not.toContain(fixtureRoot);
    expect(symbolPage).not.toContain(fixtureRoot);
    expect({
      index: digest(index),
      symbol: digest(symbolPage),
    }).toMatchInlineSnapshot(`
      {
        "index": "6001069b9d29c5ca52834ceaf45aa44d7f9f050e8b9ed61e5021724a34caa6eb",
        "symbol": "c2f1642d36d7176935052971e9655447cd55cc30e4d891b101d5221dc858876d",
      }
    `);
  });

  test("fails closed when a documentation policy rule matches too few exports", async () => {
    const manifest = await extractFixture();
    const failClosedPolicy = {
      requiredDocumentation: [
        {
          name: "removed-capability",
          exportNamePattern: "^RemovedCapability$",
          minMatches: 1,
          rationale: "The capability must remain part of the public surface.",
        },
      ],
      requiredRelations: [
        {
          name: "operation-cardinality",
          exportNamePattern: "^(Example|Spread)Operation$",
          minMatches: 3,
          anyOf: ["requires"],
          rationale: "All expected operations must remain present.",
        },
      ],
      allowedRelationTargets: [],
    } as unknown as DocumentationPolicy;
    const diagnostics = auditManifest(manifest, failClosedPolicy);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-documentation",
          symbolId: "policy:removed-capability",
        }),
        expect.objectContaining({
          code: "missing-relation",
          symbolId: "policy:operation-cardinality",
        }),
      ]),
    );
  });
});

describe("structured prose boundary", () => {
  test("rejects malformed nested evidence before dereferencing it", async () => {
    const manifest = await extractFixture();
    const draft = materializeGuide(template, manifest);
    const malformed = structuredClone(draft) as unknown as {
      sections: {
        claims: {
          evidence: { facts: { digest: unknown }[] }[];
        }[];
      }[];
    };
    malformed.sections[0]!.claims[0]!.evidence[0]!.facts[0]!.digest = 42;

    expect(() => parseProseDraft(malformed)).toThrow(DocumentationSchemaError);
  });

  test("validates exact approvals and unknown facts", async () => {
    const manifest = await extractFixture();
    const draft = parseProseDraft(approveFixture(manifest).draft);
    expect(
      validateGuide(draft, manifest, new Set(["fixture"]), {
        requireApproval: true,
      }),
    ).toEqual({ valid: true, issues: [] });

    const claim = draft.sections[0]!.claims[0]!;
    const evidence = claim.evidence[0]!;
    const unknownFactDraft: ProseDraft = {
      ...draft,
      sections: [
        {
          ...draft.sections[0]!,
          claims: [
            {
              ...claim,
              evidence: [
                {
                  ...evidence,
                  facts: [
                    {
                      id: "fixture#ActiveInvestigation/not-a-fact",
                      digest: "0".repeat(64),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const validation = validateGuide(
      unknownFactDraft,
      manifest,
      new Set(["fixture"]),
      { requireApproval: true },
    );
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "unknown-fact",
    );
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "not-approved",
    );
  });

  test("keeps model output structurally unable to approve itself", async () => {
    const manifest = await extractFixture();
    const { approval, draft } = approveFixture(manifest);
    const { review, ...agentOutput } = draft;
    void review;

    expect(parseProseAgentOutput(agentOutput)).toEqual(agentOutput);
    expect(() =>
      parseProseAgentOutput({
        ...agentOutput,
        review: approval,
      }),
    ).toThrow(DocumentationSchemaError);

    const proposed = materializeGuide(template, manifest);
    expect(
      validateGuide(proposed, manifest, new Set(["fixture"]), {
        requireApproval: true,
      }),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "not-approved" }),
      ]),
    });
  });

  test("requires a run identity for prose-agent provenance", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    expect(() =>
      parseProseDraft({
        ...draft,
        provenance: { kind: "prose-agent" },
      }),
    ).toThrow(/requires a non-empty runId/u);

    const agentTemplate: GuideTemplate = {
      ...template,
      provenance: { kind: "prose-agent", runId: "fixture-agent-run" },
    };
    const proposed = materializeGuide(agentTemplate, manifest);
    const approval = createGuideApproval(proposed, manifest, {
      reviewer: "fixture maintainer",
      decisionId: "fixture-agent-approval",
      decidedAt: "2026-07-27T00:00:00Z",
    });
    const agentDraft = materializeGuide(agentTemplate, manifest, approval);
    const output = await mkdtemp(Path.join(tmpdir(), "attune-docs-"));
    temporaryDirectories.push(output);
    await expect(
      buildSite(
        manifest,
        { revision: manifest.source.revision, areas: [] },
        [agentDraft],
        { basePath: "/attune/", outputDirectory: output },
      ),
    ).rejects.toThrow("requires exactly one validated publication trace");
  });

  test("rejects duplicate section, guide-wide claim, and question IDs", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    const section = draft.sections[0]!;
    const { review: _, ...agentOutput } = draft;
    void _;

    expect(() =>
      parseProseDraft({
        ...draft,
        sections: [section, { ...section }],
      }),
    ).toThrow(/duplicate section id state/u);
    expect(() =>
      parseProseDraft({
        ...draft,
        sections: [section, { ...section, id: "second-section" }],
      }),
    ).toThrow(/duplicate guide-wide claim id fixture\.claim/u);
    expect(() =>
      parseProseDraft({
        ...draft,
        unresolvedQuestions: [
          {
            id: "duplicate-question",
            question: "First form?",
            status: "open",
          },
          {
            id: "duplicate-question",
            question: "Second form?",
            status: "open",
          },
        ],
      }),
    ).toThrow(/duplicate question id duplicate-question/u);
    expect(() =>
      parseProseAgentOutput({ ...agentOutput, sections: [] }),
    ).toThrow(DocumentationSchemaError);
    expect(() =>
      parseProseAgentOutput({
        ...agentOutput,
        sections: [{ ...section, claims: [] }],
      }),
    ).toThrow(DocumentationSchemaError);
    expect(() =>
      parseProseAgentOutput({
        ...agentOutput,
        nextPages: ["fixture", "fixture"],
      }),
    ).toThrow(/duplicate page fixture/u);
    const claim = section.claims[0]!;
    const evidence = claim.evidence[0]!;
    expect(() =>
      parseProseAgentOutput({
        ...agentOutput,
        sections: [
          {
            ...section,
            claims: [{ ...claim, evidence: [evidence, evidence] }],
          },
        ],
      }),
    ).toThrow(/duplicate evidence/u);
    expect(() =>
      parseProseAgentOutput({
        ...agentOutput,
        sections: [
          {
            ...section,
            claims: [
              {
                ...claim,
                evidence: [
                  {
                    ...evidence,
                    facts: [evidence.facts[0]!, evidence.facts[0]!],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate fact id/u);
  });

  test("requires timezone-aware persisted approval decisions", async () => {
    const manifest = await extractFixture();
    const approval = approveFixture(manifest).approval;

    expect(() =>
      parseGuideApproval({
        ...approval,
        decidedAt: "2026-07-27T12:00:00",
      }),
    ).toThrow(/timezone/u);
    expect(
      parseGuideApproval({
        ...approval,
        decidedAt: "2026-07-27T12:00:00-04:00",
      }).decidedAt,
    ).toBe("2026-07-27T12:00:00-04:00");
    expect(() =>
      parseGuideApproval({
        ...approval,
        decidedAt: "Mon, 27 Jul 2026 12:00:00 Z",
      }),
    ).toThrow(/ISO-8601/u);
  });

  test("rejects traversal slugs, attribute-shaped IDs, and escaping outputs", async () => {
    const manifest = await extractFixture();
    const draft = structuredClone(
      materializeGuide(template, manifest),
    ) as unknown as {
      slug: string;
      sections: { claims: { id: string }[] }[];
    };
    draft.slug = "../escape";
    draft.sections[0]!.claims[0]!.id = 'claim" onmouseover="alert(1)';
    expect(() => parseProseDraft(draft)).toThrow(DocumentationSchemaError);
    expect(() =>
      resolveOutputPath("/tmp/attune-docs-safe", "../escape"),
    ).toThrow("escapes");
    expect(() =>
      resolveOutputPath("/tmp/attune-docs-safe", "/absolute.html"),
    ).toThrow("Unsafe");
  });

  test("invalidates only claims whose cited fact changed", async () => {
    const manifest = await extractFixture();
    const draft = materializeGuide(template, manifest);
    const citedFactId = draft.sections[0]!.claims[0]!.evidence[0]!.facts[0]!.id;
    const changed: ApiManifest = {
      ...manifest,
      symbols: manifest.symbols.map((symbol) => ({
        ...symbol,
        facts: symbol.facts.map((fact) =>
          fact.id === citedFactId ? { ...fact, digest: "f".repeat(64) } : fact,
        ),
      })),
    };
    expect(checkGuideStaleness(draft, changed)).toEqual({
      stale: true,
      changedClaims: [
        {
          claimId: "fixture.claim",
          changedFactIds: [citedFactId],
        },
      ],
    });

    const unrelated: ApiManifest = {
      ...manifest,
      symbols: manifest.symbols.map((symbol) => ({
        ...symbol,
        facts: symbol.facts.map((fact) =>
          fact.id === "fixture#ExampleFailure/signature"
            ? { ...fact, digest: "e".repeat(64) }
            : fact,
        ),
      })),
    };
    expect(checkGuideStaleness(draft, unrelated).stale).toBe(false);
  });

  test("requires a new approval for cited changes but not unrelated facts", async () => {
    const manifest = await extractFixture();
    const { approval, draft } = approveFixture(manifest);
    const citedFactId = draft.sections[0]!.claims[0]!.evidence[0]!.facts[0]!.id;
    const changedSource = {
      revision: "fixture-revision-next",
      digest: "1".repeat(64),
    };
    const withChangedFact = (
      factId: string,
      replacementDigest: string,
    ): ApiManifest => ({
      ...manifest,
      source: {
        ...manifest.source,
        ...changedSource,
      },
      symbols: manifest.symbols.map((symbol) => ({
        ...symbol,
        facts: symbol.facts.map((fact) =>
          fact.id === factId ? { ...fact, digest: replacementDigest } : fact,
        ),
      })),
    });

    const citedManifest = withChangedFact(citedFactId, "f".repeat(64));
    const citedDraft = materializeGuide(template, citedManifest, approval);
    expect(
      validateGuide(citedDraft, citedManifest, new Set(["fixture"]), {
        requireApproval: true,
      }),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "not-approved" }),
      ]),
    });

    const unrelatedManifest = withChangedFact(
      "fixture#ExampleFailure/signature",
      "e".repeat(64),
    );
    const unrelatedDraft = materializeGuide(
      template,
      unrelatedManifest,
      approval,
    );
    expect(
      validateGuide(unrelatedDraft, unrelatedManifest, new Set(["fixture"]), {
        requireApproval: true,
      }),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "not-approved" }),
      ]),
    });
    expect(
      validateGuide(unrelatedDraft, unrelatedManifest, new Set(["fixture"]), {
        requireApproval: true,
        allowApprovalCarryForward: true,
      }),
    ).toEqual({ valid: true, issues: [] });
  });

  test("rejects symbol-only evidence with no cited manifest facts", async () => {
    const manifest = await extractFixture();
    const proposed = materializeGuide(template, manifest);
    const { review: _, ...agentOutput } = proposed;
    const emptyEvidence = {
      ...agentOutput,
      sections: agentOutput.sections.map((section) => ({
        ...section,
        claims: section.claims.map((claim) => ({
          ...claim,
          evidence: claim.evidence.map((evidence) => ({
            ...evidence,
            facts: [],
          })),
        })),
      })),
    };
    const approval = createGuideApproval(emptyEvidence, manifest, {
      reviewer: "fixture maintainer",
      decisionId: "empty-evidence-approval",
      decidedAt: "2026-07-27T00:00:00Z",
    });
    const draft = attachGuideApproval(emptyEvidence, manifest, approval);
    expect(
      validateGuide(draft, manifest, new Set(["fixture"]), {
        requireApproval: true,
      }),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "missing-evidence",
          path: expect.stringContaining(".facts"),
        }),
      ]),
    });
  });

  test("keeps source evidence stable across refs but not source spans", async () => {
    const sourceTemplate: GuideTemplate = {
      ...template,
      sections: template.sections.map((section) => ({
        ...section,
        claims: section.claims.map((claim) => ({
          ...claim,
          evidence: [{ symbol: "ActiveInvestigation", facts: ["source"] }],
        })),
      })),
    };
    const first = await extractFixture("review-ref", "review-revision");
    const second = await extractFixture("deploy-sha", "deploy-revision");
    expect(apiManifestDigest(first)).toBe(apiManifestDigest(second));
    const firstSymbol = first.symbols.find(
      (symbol) => symbol.exportName === "ActiveInvestigation",
    )!;
    const secondSymbol = second.symbols.find(
      (symbol) => symbol.exportName === "ActiveInvestigation",
    )!;
    const firstSourceFact = firstSymbol.facts.find(
      (fact) => fact.kind === "source",
    )!;
    const secondSourceFact = secondSymbol.facts.find(
      (fact) => fact.kind === "source",
    )!;
    expect(firstSymbol.source.url).not.toBe(secondSymbol.source.url);
    expect(firstSourceFact.digest).toBe(secondSourceFact.digest);
    expect(firstSourceFact.digest).toBe(
      digestValue({
        path: firstSymbol.source.path,
        line: firstSymbol.source.line,
        endLine: firstSymbol.source.endLine,
      }),
    );

    const proposed = materializeGuide(sourceTemplate, first);
    const approval = createGuideApproval(proposed, first, {
      reviewer: "fixture maintainer",
      decisionId: "source-approval",
      decidedAt: "2026-07-27T00:00:00Z",
    });
    const deployDraft = materializeGuide(sourceTemplate, second, approval);
    expect(
      validateGuide(deployDraft, second, new Set(["fixture"]), {
        requireApproval: true,
        allowApprovalCarryForward: true,
      }),
    ).toEqual({ valid: true, issues: [] });

    const moved: ApiManifest = {
      ...second,
      source: {
        ...second.source,
        revision: "moved-revision",
        digest: "2".repeat(64),
      },
      symbols: second.symbols.map((symbol) => {
        if (symbol.exportName !== "ActiveInvestigation") return symbol;
        const movedSource = {
          ...symbol.source,
          path: `moved/${symbol.source.path}`,
          line: symbol.source.line + 1,
          endLine: symbol.source.endLine + 1,
        };
        return {
          ...symbol,
          source: movedSource,
          facts: symbol.facts.map((fact) =>
            fact.kind === "source"
              ? {
                  ...fact,
                  digest: digestValue({
                    path: movedSource.path,
                    line: movedSource.line,
                    endLine: movedSource.endLine,
                  }),
                  value: `${movedSource.path}:${movedSource.line}`,
                }
              : fact,
          ),
        };
      }),
    };
    expect(
      validateGuide(
        materializeGuide(sourceTemplate, moved, approval),
        moved,
        new Set(["fixture"]),
        { requireApproval: true },
      ),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "not-approved" }),
      ]),
    });
  });
});

describe("static publication", () => {
  test("emits Markdown, base-path-safe HTML, search, schemas, and traces", async () => {
    const manifest = await extractFixture();
    const draft = parseProseDraft(approveFixture(manifest).draft);
    const repository: RepositoryMap = {
      revision: manifest.source.revision,
      areas: [
        {
          id: "fixture",
          name: "Fixture package",
          path: "fixture",
          role: "Exercises the documentation compiler.",
          details: "A small source tree used only by tests.",
          connectsTo: [],
          sourceUrl: "https://example.test/repository/tree/fixture-ref/fixture",
        },
      ],
    };
    const claim = traceNode("attune_doc_research_claim", {
      claim_id: "claim.fixture",
      text: "The fixture claim is grounded.",
      certainty: "direct",
      schema_version: 1,
    });
    const source = traceNode("attune_doc_manifest_fact", {
      fact_id: "fact.fixture",
      symbol_id: "fixture#ActiveInvestigation",
      kind: "signature",
      value: "type ActiveInvestigation",
      schema_version: 1,
    });
    const trace: TraceExport = {
      schema_version: 1,
      activegraph_run_id: "run.fixture",
      guide_id: "guide.fixture",
      stale: false,
      nodes: [claim, source],
      edges: [
        {
          id: traceEdgeId(claim.id, source.id, "derivedFrom"),
          source: claim.id,
          target: source.id,
          type: "derivedFrom",
          provenance_kind: "content",
        },
      ],
    };
    const traceArtifact: TraceArtifact = {
      kind: "representative",
      trace,
      sourcePath: "fixture/representative-trace.json",
    };
    const output = await mkdtemp(Path.join(tmpdir(), "attune-docs-"));
    temporaryDirectories.push(output);
    await buildSite(
      manifest,
      repository,
      [draft],
      { basePath: "/attune/", outputDirectory: output },
      [traceArtifact],
    );

    const [html, markdown, traceHtml, traceJson] = await Promise.all([
      readFile(Path.join(output, "guides", "fixture.html"), "utf8"),
      readFile(Path.join(output, "guides", "fixture.md"), "utf8"),
      readFile(Path.join(output, "traces", "fixture.html"), "utf8"),
      readFile(Path.join(output, "traces", "examples", "fixture.json"), "utf8"),
    ]);
    expect(html).toContain('href="/attune/api/active-investigation.html"');
    expect(html).toContain('src="/attune/assets/site.js"');
    expect(markdown).toContain("### Grounded in");
    expect(markdown).toContain("(/attune/api/active-investigation.html)");
    expect(traceHtml).toContain(
      "Representative example—not this guide’s publication trace.",
    );
    expect(traceHtml).not.toContain(" · current");
    expect(traceHtml).not.toContain(" · stale");
    expect(traceJson).toContain('"provenance_kind": "content"');
    await expect(stat(Path.join(output, ".nojekyll"))).resolves.toBeDefined();
    await expect(
      stat(Path.join(output, "schemas", "prose-draft.schema.json")),
    ).resolves.toBeDefined();
    await expect(
      stat(Path.join(output, "schemas", "guide-approval.schema.json")),
    ).resolves.toBeDefined();

    const evidence: EvidenceManifest = {
      schemaVersion: "1.0.0",
      guideId: draft.id,
      sourceRevision: draft.sourceRevision,
      sourceDigest: draft.sourceDigest,
      review: draft.review,
      provenance: draft.provenance,
      claims: draft.sections.flatMap((section) =>
        section.claims.map((claim) => ({
          id: claim.id,
          certainty: claim.certainty,
          evidence: claim.evidence,
        })),
      ),
    };
    expect(parseEvidenceManifest(evidence)).toEqual(evidence);
    expect(() => parseEvidenceManifest({ ...evidence, claims: [] })).toThrow(
      DocumentationSchemaError,
    );
    expect(validateTraceExport(trace)).toBe(true);
  });

  test("renders guide Markdown deterministically", async () => {
    const manifest = await extractFixture();
    const draft = materializeGuide(template, manifest);
    expect(renderGuideMarkdown(draft, manifest, "/attune/")).toBe(
      renderGuideMarkdown(draft, manifest, "/attune/"),
    );
  });

  test("renders structured prose as literal Markdown text", async () => {
    const manifest = await extractFixture();
    const draft = materializeGuide(template, manifest);
    const adversarial: ProseDraft = {
      ...draft,
      title: "Title\u2028---\n# injected [link](https://example.test)",
      summary: "<script>alert(1)</script>\n> quote",
      audience: "people\n---\nadmin: true",
      sections: [
        {
          ...draft.sections[0]!,
          heading: "Heading\n## injected",
          claims: [
            {
              ...draft.sections[0]!.claims[0]!,
              text: "![tracking](https://example.test/pixel) **trusted**",
            },
          ],
        },
      ],
    };
    const markdown = renderGuideMarkdown(adversarial, manifest, "/attune/");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("\n# injected");
    expect(markdown).not.toContain("\n## injected");
    expect(markdown).not.toContain("![tracking](");
    expect(markdown).not.toContain("**trusted**");
    expect(markdown).not.toContain("\u2028");
    expect(markdown).toContain(String.raw`title: "Title\u2028---\n# injected`);
    expect(markdown).toContain(
      String.raw`# Title \-\-\- \# injected \[link\]\(https\:\/\/example\.test\)`,
    );
    expect(markdown).toContain(
      String.raw`\!\[tracking\]\(https\:\/\/example\.test\/pixel\) \*\*trusted\*\*`,
    );
  });

  test("rejects publication traces that are not bound to the exact build", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    const repository: RepositoryMap = {
      revision: manifest.source.revision,
      areas: [],
    };
    const mismatched: TraceArtifact = {
      kind: "publication",
      sourcePath: "fixture/publication-trace.json",
      trace: {
        schema_version: 1,
        activegraph_run_id: "run.fixture",
        guide_id: draft.id,
        stale: false,
        nodes: [
          {
            id: "publication.fixture",
            type: "publication",
            content_address: "sha256:fixture",
            data: {
              source_revision: "wrong-revision",
              manifest_digest: "0".repeat(64),
              draft_digest: draft.review.draftDigest,
            },
          },
        ],
        edges: [],
      },
    };
    const output = await mkdtemp(Path.join(tmpdir(), "attune-docs-"));
    temporaryDirectories.push(output);
    await expect(
      buildSite(
        manifest,
        repository,
        [draft],
        { basePath: "/attune/", outputDirectory: output },
        [mismatched],
      ),
    ).rejects.toThrow("is not bound");
  });

  test("requires the exact approved publication chain, not matching decoy data", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    const valid = publicationTraceFor(draft, manifest);
    const expectation = publicationExpectationFor(draft, manifest);

    expect(() =>
      validatePublicationTraceBinding(valid, draft, manifest, expectation),
    ).not.toThrow();
    expect(() =>
      validatePublicationTraceBinding(valid, draft, manifest, {
        ...expectation,
        digest: "f".repeat(64),
      }),
    ).toThrow("is not bound");

    const publication = valid.trace.nodes.find(
      (node) => node.type === "attune_doc_publication_revision",
    )!;
    const rebound: TraceArtifact = {
      ...valid,
      trace: replaceTraceNode(valid.trace, publication.id, {
        ...publication.data,
        artifact_address: traceAddress("another-rendered-artifact"),
      }),
    };
    expect(validateTraceExport(rebound.trace)).toBe(true);
    expect(() =>
      validatePublicationTraceBinding(rebound, draft, manifest, expectation),
    ).toThrow("is not bound");

    const decoy: TraceArtifact = {
      ...valid,
      trace: {
        ...valid.trace,
        edges: [],
      },
    };
    expect(() =>
      validatePublicationTraceBinding(decoy, draft, manifest, expectation),
    ).toThrow("is not bound");

    const section = valid.trace.nodes.find(
      (node) => node.type === "attune_doc_guide_section",
    )!;
    const manifestInput = valid.trace.nodes.find(
      (node) => node.type === "attune_doc_manifest_input",
    )!;
    const extraFact = traceNode("attune_doc_manifest_fact", {
      fact_id: "fixture#ActiveInvestigation/decoy",
      symbol_id: "fixture#ActiveInvestigation",
      kind: "signature",
      value: "forged support",
      schema_version: 1,
    });
    const overclaimed: TraceArtifact = {
      ...valid,
      trace: {
        ...valid.trace,
        nodes: [...valid.trace.nodes, extraFact],
        edges: [
          ...valid.trace.edges,
          {
            id: traceEdgeId(section.id, extraFact.id, "cites"),
            source: section.id,
            target: extraFact.id,
            type: "cites",
            provenance_kind: "content",
          },
          {
            id: traceEdgeId(extraFact.id, manifestInput.id, "derivedFrom"),
            source: extraFact.id,
            target: manifestInput.id,
            type: "derivedFrom",
            provenance_kind: "content",
          },
        ],
      },
    };
    expect(validateTraceExport(overclaimed.trace)).toBe(true);
    expect(() =>
      validatePublicationTraceBinding(
        overclaimed,
        draft,
        manifest,
        expectation,
      ),
    ).toThrow("is not bound");
  });

  test("accepts only an explicit carry-forward of a still-current human approval", async () => {
    const priorManifest = await extractFixture("review-ref", "review-revision");
    const currentManifest = await extractFixture(
      "publication-ref",
      "publication-revision",
    );
    const maintainerTemplate: GuideTemplate = {
      ...template,
      provenance: { kind: "maintainer-authored" },
    };
    const priorProposed = materializeGuide(maintainerTemplate, priorManifest);
    const approval = createGuideApproval(priorProposed, priorManifest, {
      reviewer: "fixture maintainer",
      decisionId: "fixture-human-approval",
      decidedAt: "2026-07-27T00:00:00Z",
    });
    const priorDraft = materializeGuide(
      maintainerTemplate,
      priorManifest,
      approval,
    );
    const currentDraft = materializeGuide(
      maintainerTemplate,
      currentManifest,
      approval,
    );
    expect(currentDraft.sourceRevision).not.toBe(priorDraft.sourceRevision);
    expect(currentDraft.review).toEqual(priorDraft.review);
    expect(
      validateGuide(currentDraft, currentManifest, new Set(["fixture"]), {
        requireApproval: true,
        allowApprovalCarryForward: true,
      }),
    ).toEqual({ valid: true, issues: [] });

    const direct = publicationTraceFor(currentDraft, currentManifest);
    const expectation = publicationExpectationFor(
      currentDraft,
      currentManifest,
    );
    expect(() =>
      validatePublicationTraceBinding(
        direct,
        currentDraft,
        currentManifest,
        expectation,
      ),
    ).toThrow("is not bound");

    const carried = carriedPublicationTraceFor(
      priorDraft,
      priorManifest,
      currentDraft,
      currentManifest,
    );
    expect(validateTraceExport(carried.trace)).toBe(true);
    expect(() =>
      validatePublicationTraceBinding(
        carried,
        currentDraft,
        currentManifest,
        expectation,
      ),
    ).not.toThrow();

    const priorSection = carried.trace.nodes.find(
      (node) =>
        node.type === "attune_doc_guide_section" &&
        node.data.manifest_revision === priorManifest.source.revision,
    )!;
    const decoyFact = traceNode("attune_doc_manifest_fact", {
      fact_id: "fixture#ActiveInvestigation/decoy",
      symbol_id: "fixture#ActiveInvestigation",
      kind: "signature",
      value: "forged support",
      schema_version: 1,
    });
    const changedSupport: TraceArtifact = {
      ...carried,
      trace: {
        ...carried.trace,
        nodes: [...carried.trace.nodes, decoyFact],
        edges: [
          ...carried.trace.edges,
          {
            id: traceEdgeId(priorSection.id, decoyFact.id, "cites"),
            source: priorSection.id,
            target: decoyFact.id,
            type: "cites",
            provenance_kind: "content",
          },
        ],
      },
    };
    expect(validateTraceExport(changedSupport.trace)).toBe(true);
    expect(() =>
      validatePublicationTraceBinding(
        changedSupport,
        currentDraft,
        currentManifest,
        expectation,
      ),
    ).toThrow("is not bound");

    const carryForward = carried.trace.nodes.find(
      (node) => node.type === "attune_doc_approval_carry_forward",
    )!;
    const earlyCarry: TraceArtifact = {
      ...carried,
      trace: replaceTraceNode(carried.trace, carryForward.id, {
        ...carryForward.data,
        revalidation_time: "2026-07-27T00:00:30Z",
      }),
    };
    expect(validateTraceExport(earlyCarry.trace)).toBe(true);
    expect(() =>
      validatePublicationTraceBinding(
        earlyCarry,
        currentDraft,
        currentManifest,
        expectation,
      ),
    ).toThrow("is not bound");

    const currentSection = carried.trace.nodes.find(
      (node) =>
        node.type === "attune_doc_guide_section" &&
        node.data.manifest_revision === currentManifest.source.revision,
    )!;
    const invalidation = traceNode("attune_doc_invalidation", {
      manifest_revision: currentManifest.source.revision,
      changes: [
        {
          fact_id: "fixture#ActiveInvestigation/signature",
          previous_address: decoyFact.content_address,
          current_address: null,
        },
      ],
      reason: "The cited fact changed.",
      schema_version: 1,
    });
    const invalidated: TraceArtifact = {
      ...carried,
      trace: {
        ...carried.trace,
        nodes: [...carried.trace.nodes, invalidation],
        edges: [
          ...carried.trace.edges,
          {
            id: traceEdgeId(invalidation.id, currentSection.id, "invalidates"),
            source: invalidation.id,
            target: currentSection.id,
            type: "invalidates",
            provenance_kind: "invalidation",
          },
        ],
      },
    };
    expect(validateTraceExport(invalidated.trace)).toBe(true);
    expect(() =>
      validatePublicationTraceBinding(
        invalidated,
        currentDraft,
        currentManifest,
        expectation,
      ),
    ).toThrow("is not bound");

    const currentDraftNode = carried.trace.nodes.find(
      (node) =>
        node.type === "attune_doc_guide_draft" &&
        node.data.source_revision === currentDraft.sourceRevision,
    )!;
    const rejection = traceNode("attune_doc_approval_decision", {
      outcome: "rejected",
      decision_id: "fixture-current-rejection",
      decision_time: "2026-07-27T02:00:00Z",
      reviewer: "fixture maintainer",
      source_revision: currentDraft.sourceRevision,
      manifest_digest: apiManifestDigest(currentManifest),
      draft_digest: currentDraft.review.draftDigest,
      evidence_digest: currentDraft.review.evidenceDigest,
      subject_address: currentDraftNode.content_address,
      reviewer_role: "maintainer",
      schema_version: 1,
    });
    const rejected: TraceArtifact = {
      ...carried,
      trace: {
        ...carried.trace,
        nodes: [...carried.trace.nodes, rejection],
        edges: [
          ...carried.trace.edges,
          {
            id: traceEdgeId(currentDraftNode.id, rejection.id, "approvedBy"),
            source: currentDraftNode.id,
            target: rejection.id,
            type: "approvedBy",
            provenance_kind: "review",
          },
        ],
      },
    };
    expect(() =>
      validatePublicationTraceBinding(
        rejected,
        currentDraft,
        currentManifest,
        expectation,
      ),
    ).toThrow("is not bound");
  });

  test("rejects duplicate trace node and edge identities", () => {
    const duplicate = traceNode("attune_doc_research_claim", {
      claim_id: "claim.fixture",
      text: "A duplicated claim.",
      certainty: "direct",
      schema_version: 1,
    });
    const trace: TraceExport = {
      schema_version: 1,
      activegraph_run_id: "run.fixture",
      guide_id: "guide.fixture",
      stale: false,
      nodes: [duplicate, duplicate],
      edges: [],
    };
    expect(validateTraceExport(trace)).toBe(false);

    const first = traceNode("attune_doc_research_claim", {
      claim_id: "claim.first",
      text: "The first claim.",
      certainty: "direct",
      schema_version: 1,
    });
    const second = traceNode("attune_doc_manifest_fact", {
      fact_id: "fact.second",
      symbol_id: "fixture#ActiveInvestigation",
      kind: "signature",
      value: "type ActiveInvestigation",
      schema_version: 1,
    });
    const edgeId = traceEdgeId(first.id, second.id, "cites");
    expect(
      validateTraceExport({
        ...trace,
        nodes: [first, second],
        edges: [
          {
            id: edgeId,
            source: first.id,
            target: second.id,
            type: "cites",
            provenance_kind: "content",
          },
          {
            id: edgeId,
            source: first.id,
            target: second.id,
            type: "cites",
            provenance_kind: "content",
          },
        ],
      }),
    ).toBe(false);
    expect(
      validateTraceExport({
        ...trace,
        nodes: [first, second],
        edges: [
          {
            id: traceEdgeId(first.id, second.id, "unreviewedRelation"),
            source: first.id,
            target: second.id,
            type: "unreviewedRelation",
            provenance_kind: "review",
          },
        ],
      }),
    ).toBe(false);
  });

  test("rejects trace relations with illegal endpoint object types", () => {
    const configuration = traceNode("attune_doc_agent_configuration", {
      agent_name: "fixture-agent",
      agent_version: "1.0.0",
      model: "fixture-model",
      schema_version: 1,
    });
    const source = traceNode("attune_doc_source_revision", {
      repository: "fixture",
      revision: "fixture-revision",
      source_digest: "a".repeat(64),
      schema_version: 1,
    });
    const illegalApproval: TraceExport = {
      schema_version: 1,
      activegraph_run_id: "run.fixture",
      guide_id: "guide.fixture",
      stale: false,
      nodes: [configuration, source],
      edges: [
        {
          id: traceEdgeId(configuration.id, source.id, "approvedBy"),
          source: configuration.id,
          target: source.id,
          type: "approvedBy",
          provenance_kind: "review",
        },
      ],
    };
    expect(validateTraceExport(illegalApproval)).toBe(false);

    const artifact = traceNode("attune_doc_rendered_artifact", {
      guide_id: "guide.fixture",
      path: "guides/fixture.html",
      media_type: "text/html",
      artifact_digest: "b".repeat(64),
      renderer: "attune-static-docs",
      renderer_version: "1.0.0",
      schema_version: 1,
    });
    expect(
      validateTraceExport({
        ...illegalApproval,
        nodes: [artifact],
        edges: [
          {
            id: traceEdgeId(artifact.id, artifact.id, "renders"),
            source: artifact.id,
            target: artifact.id,
            type: "renders",
            provenance_kind: "presentation",
          },
        ],
      }),
    ).toBe(false);
  });

  test("keeps validation and invalidation record constraints in Python parity", () => {
    const emptyValidation = traceNode("attune_doc_validation_result", {
      subject_address: traceAddress("validation-subject"),
      validation_id: "validation.empty-checks",
      validation_time: "2026-07-27T13:00:00Z",
      validator: "grounding-validator",
      validator_version: "1.0.0",
      outcome: "passed",
      checks: [],
      schema_version: 1,
    });
    const baseTrace: TraceExport = {
      schema_version: 1,
      activegraph_run_id: "run.fixture",
      guide_id: "guide.fixture",
      stale: false,
      nodes: [emptyValidation],
      edges: [],
    };
    expect(validateTraceExport(baseTrace)).toBe(false);

    const firstPrevious = traceAddress("first-previous-fact");
    const secondPrevious = traceAddress("second-previous-fact");
    const duplicateFactIds = traceNode("attune_doc_invalidation", {
      manifest_revision: "manifest.current",
      changes: [
        {
          fact_id: "fact.duplicate",
          previous_address: firstPrevious,
          current_address: null,
        },
        {
          fact_id: "fact.duplicate",
          previous_address: secondPrevious,
          current_address: null,
        },
      ],
      reason: "A fact may appear only once in one invalidation.",
      schema_version: 1,
    });
    expect(
      validateTraceExport({
        ...baseTrace,
        nodes: [duplicateFactIds],
      }),
    ).toBe(false);

    const duplicatePreviousAddresses = traceNode("attune_doc_invalidation", {
      manifest_revision: "manifest.current",
      changes: [
        {
          fact_id: "fact.first",
          previous_address: firstPrevious,
          current_address: null,
        },
        {
          fact_id: "fact.second",
          previous_address: firstPrevious,
          current_address: null,
        },
      ],
      reason: "One previous record cannot represent two changed facts.",
      schema_version: 1,
    });
    expect(
      validateTraceExport({
        ...baseTrace,
        nodes: [duplicatePreviousAddresses],
      }),
    ).toBe(false);
  });

  test("rejects empty run identities, forged projections, and private fields", () => {
    const node = traceNode("attune_doc_research_claim", {
      claim_id: "claim.fixture",
      text: "A fixture claim.",
      certainty: "direct",
      schema_version: 1,
    });
    const trace: TraceExport = {
      schema_version: 1,
      activegraph_run_id: "",
      guide_id: "guide.fixture",
      stale: false,
      nodes: [node],
      edges: [],
    };
    expect(validateTraceExport(trace)).toBe(false);
    expect(
      validateTraceExport({
        ...trace,
        activegraph_run_id: "run.fixture",
        nodes: [
          {
            ...trace.nodes[0]!,
            id: traceAddress("forged-projection"),
          },
        ],
      }),
    ).toBe(false);
    expect(
      validateTraceExport({
        ...trace,
        activegraph_run_id: "run.fixture",
        unexpected_private_field: "must not be republished",
      }),
    ).toBe(false);
    expect(
      validateTraceExport({
        ...trace,
        activegraph_run_id: "run.fixture",
        nodes: [
          {
            ...node,
            private_prompt: "must not be republished",
          },
        ],
      }),
    ).toBe(false);
    const wrongText = {
      ...node.data,
      text: { private_prompt: "must not be republished" },
    };
    expect(
      validateTraceExport({
        ...trace,
        activegraph_run_id: "run.fixture",
        nodes: [
          {
            ...node,
            id: traceAddress({
              content_address: node.content_address,
              type: node.type,
              data: wrongText,
            }),
            data: wrongText,
          },
        ],
      }),
    ).toBe(false);
    const privateData = {
      ...node.data,
      private_prompt: "must not be republished",
    };
    expect(
      validateTraceExport({
        ...trace,
        activegraph_run_id: "run.fixture",
        nodes: [
          {
            ...node,
            id: traceAddress({
              content_address: node.content_address,
              type: node.type,
              data: privateData,
            }),
            data: privateData,
          },
        ],
      }),
    ).toBe(false);
  });

  test("refuses to replace an authored in-repository output directory", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    const output = await mkdtemp(
      Path.join(import.meta.dirname, ".unsafe-site-output-"),
    );
    temporaryDirectories.push(output);
    await expect(
      buildSite(
        manifest,
        { revision: manifest.source.revision, areas: [] },
        [draft],
        { basePath: "/attune/", outputDirectory: output },
      ),
    ).rejects.toThrow("Refusing to replace broad documentation output");
  });

  test("refuses an external output symlink that resolves into authored source", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    const parent = await mkdtemp(Path.join(tmpdir(), "attune-docs-link-"));
    temporaryDirectories.push(parent);
    const output = Path.join(parent, "site");
    await symlink(fixtureRoot, output, "dir");
    await expect(
      buildSite(
        manifest,
        { revision: manifest.source.revision, areas: [] },
        [draft],
        { basePath: "/attune/", outputDirectory: output },
      ),
    ).rejects.toThrow("Refusing to replace broad documentation output");
    await expect(
      stat(Path.join(fixtureRoot, "src", "index.ts")),
    ).resolves.toBeDefined();
  });

  test("rejects duplicate guide and trace ownership before writing", async () => {
    const manifest = await extractFixture();
    const draft = approveFixture(manifest).draft;
    const output = await mkdtemp(Path.join(tmpdir(), "attune-docs-"));
    temporaryDirectories.push(output);

    await expect(
      buildSite(
        manifest,
        { revision: manifest.source.revision, areas: [] },
        [draft, { ...draft }],
        { basePath: "/attune/", outputDirectory: output },
      ),
    ).rejects.toThrow("Duplicate guide id");

    const representative = publicationTraceFor(draft, manifest);
    await expect(
      buildSite(
        manifest,
        { revision: manifest.source.revision, areas: [] },
        [draft],
        { basePath: "/attune/", outputDirectory: output },
        [
          { ...representative, kind: "representative" },
          {
            ...representative,
            kind: "representative",
            sourcePath: "fixture/second-trace.json",
          },
        ],
      ),
    ).rejects.toThrow("Duplicate trace guide");

    await expect(
      buildSite(
        manifest,
        { revision: manifest.source.revision, areas: [] },
        [draft],
        { basePath: "/attune/", outputDirectory: output },
        [
          { ...representative, kind: "representative" },
          {
            ...representative,
            kind: "representative",
            sourcePath: "fixture/id-addressed-trace.json",
            trace: { ...representative.trace, guide_id: draft.id },
          },
        ],
      ),
    ).rejects.toThrow("Duplicate trace guide");
  });

  test("emits one collision-safe page and search entry per symbol", async () => {
    const manifest = await extractFixture();
    const colliding = manifest.symbols.filter((symbol) =>
      ["ArtifactReference", "artifactReference"].includes(symbol.exportName),
    );
    expect(colliding).toHaveLength(2);
    expect(new Set(colliding.map((symbol) => symbol.slug)).size).toBe(2);

    const draft = approveFixture(manifest).draft;
    const output = await mkdtemp(Path.join(tmpdir(), "attune-docs-"));
    temporaryDirectories.push(output);
    await buildSite(
      manifest,
      { revision: manifest.source.revision, areas: [] },
      [draft],
      { basePath: "/attune/", outputDirectory: output },
    );
    const apiFiles = (await readdir(Path.join(output, "api"))).filter(
      (file) => file !== "index.html" && file.endsWith(".html"),
    );
    expect(apiFiles).toHaveLength(manifest.symbols.length);
    const search = JSON.parse(
      await readFile(Path.join(output, "search-index.json"), "utf8"),
    ) as { readonly href: string; readonly title: string }[];
    const collisionEntries = search.filter((entry) =>
      ["ArtifactReference", "artifactReference"].includes(entry.title),
    );
    expect(collisionEntries).toHaveLength(2);
    expect(new Set(collisionEntries.map((entry) => entry.href)).size).toBe(2);
  });
});

test("discovers a closed Python-generated static publication page", async () => {
  const root = await mkdtemp(Path.join(tmpdir(), "attune-experiment-"));
  temporaryDirectories.push(root);
  const page = Path.join(root, "fixture");
  await mkdir(page);
  const manifest = { experiment_id: "fixture", value: 1 };
  const report = { experiment_id: "fixture", title: "Fixture experiment" };
  const approval = { manifest_digest: publicationDigest(manifest, "manifest_digest"), report_digest: publicationDigest(report, "report_digest") };
  const publication = {
    manifest_digest: publicationDigest(manifest, "manifest_digest"),
    report_digest: publicationDigest(report, "report_digest"),
    approval_digest: publicationDigest(approval, "approval_digest"),
  };
  await Promise.all([
    writeFile(Path.join(page, "manifest.json"), JSON.stringify(manifest)),
    writeFile(Path.join(page, "report.json"), JSON.stringify(report)),
    writeFile(Path.join(page, "approval.json"), JSON.stringify(approval)),
    writeFile(Path.join(page, "publication.json"), JSON.stringify(publication)),
    writeFile(Path.join(page, "index.md"), "# Fixture experiment\n"),
  ]);
  await expect(discoverStaticPages(root)).resolves.toEqual([
    { slug: "fixture", title: "Fixture experiment", markdown: "# Fixture experiment\n" },
  ]);
});

test("records the current TypeDoc compatibility blocker", () => {
  expect(assessTypeDocCompatibility("0.28.20", "7.0.2")).toEqual({
    typedocVersion: "0.28.20",
    typescriptVersion: "7.0.2",
    compatible: false,
    reason:
      "TypeDoc 0.28.x does not support the repository TypeScript 7 compiler API.",
  });
});
