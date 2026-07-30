import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { gzipSync } from "node:zlib";

import type {
  Code,
  Data,
  Heading,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import { createHighlighter, type Highlighter } from "shiki";
import { VFile } from "vfile";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  compileDocumentation,
  type DocumentationOptions,
} from "../src/docs.ts";
import {
  bundleTreeRuntime,
  createDocumentationLanguage,
  replaceDirectory,
} from "../src/main.ts";
import { read } from "../src/read.ts";

const revision = "0123456789abcdef0123456789abcdef01234567";
const sourceRoot =
  "https://github.com/example/attune/blob/" + revision + "/packages/";

const data = (attune: Record<string, unknown>): Data =>
  ({ attune }) as unknown as Data;

const heading = (
  depth: Heading["depth"],
  label: string,
  id: string,
  source = false,
): Heading => ({
  type: "heading",
  depth,
  data: data({
    id,
    ...(source
      ? {
          role: id.startsWith("Attune.") ? "member" : "declaration",
          sourcePath: `packages/attune-mcp/src/${id}.ts`,
          sourceRange: { start: 0, end: 80, lineStart: 1, lineEnd: 4 },
          sourceHref: `${sourceRoot}attune-mcp/src/${id}.ts#L1-L4`,
        }
      : {}),
  }),
  children: [{ type: "text", value: label }],
});

const paragraph = (...children: PhrasingContent[]): Paragraph => ({
  type: "paragraph",
  children,
});

const reference = (label: string, url: string): Link => ({
  type: "link",
  url,
  children: [{ type: "text", value: label }],
});

const resolved = (source: string, needle: string, href: string, from = 0) => {
  const start = source.indexOf(needle, from);
  if (start < 0) throw new Error(`Fixture lacks ${needle}`);
  return { start, end: start + needle.length, href };
};

const signature = (value: string, links: readonly unknown[] = []): Code => ({
  type: "code",
  lang: "typescript",
  value,
  data: data({ role: "signature", checked: true, links }),
});

const declaration = (
  depth: Heading["depth"],
  label: string,
  id: string,
  value: string,
  links: readonly unknown[] = [],
): RootContent[] => [heading(depth, label, id, true), signature(value, links)];

const heroItem = (lead: string, explanation: string): ListItem => ({
  type: "listItem",
  children: [
    paragraph(
      { type: "strong", children: [{ type: "text", value: lead }] },
      { type: "text", value: ` ${explanation}` },
    ),
  ],
});

const hero = (): List => ({
  type: "list",
  ordered: false,
  children: [
    heroItem(
      "Follow every branch.",
      "ActiveGraph records what the agent tried, where the investigation changed direction, and how each result shaped the next step.",
    ),
    heroItem(
      "Keep the work rooted.",
      "Attune ties every accepted tool call to the exact repository state it used and preserves the evidence and artifacts it produced.",
    ),
    heroItem(
      "Propagate what survives.",
      "Useful queries, models, counterexamples, tests, and rules can be carried into later repositories, so the next investigation begins with accumulated research rather than an empty transcript.",
    ),
  ],
});
const toolTargets = {
  repository_materialize: [
    "RepositoryMaterializeTool",
    "tool--repository-materialize",
  ],
  repository_checkpoint: [
    "RepositoryCheckpointTool",
    "tool--repository-checkpoint",
  ],
  joern_query: ["JoernQueryTool", "tool--joern-query"],
  maude_run: ["MaudeRunTool", "tool--maude-run"],
  property_run: ["PropertyRunTool", "tool--property-run"],
  artifact_promote: ["ArtifactPromoteTool", "tool--artifact-promote"],
  ast_grep_run: ["AstGrepRunTool", "tool--ast-grep-run"],
} as const;
const freeFormReferenceTarget =
  "attune-mcp--packages-attune-mcp-src-contract-schemas.ts--FreeFormReference";
const artifactReferenceTarget =
  "attune-mcp--packages-attune-mcp-src-contract-schemas.ts--ArtifactReference";
const artifactPromoteTarget = toolTargets.artifact_promote[1];
const researchPackSource =
  "https://github.com/becker63/attune/blob/main/python/attune-activegraph/src/attune_activegraph/research/pack.py#L111-L149";
const pinnedResearchPackSource = researchPackSource.replace(
  "/blob/main/",
  `/blob/${revision}/`,
);
const interpretationToolSource =
  "https://github.com/becker63/attune/blob/main/python/attune-activegraph/src/attune_activegraph/research/ledger.py#L20-L41";
const pinnedInterpretationToolSource = interpretationToolSource.replace(
  "/blob/main/",
  `/blob/${revision}/`,
);
const artifact = (lang: string, value: string): Code => ({
  type: "code",
  lang,
  value,
  ...(lang === "ts"
    ? {
        data: data({
          role: "investigation",
          checked: true,
          links: Object.entries(toolTargets).flatMap(([name, [, id]]) =>
            value.includes(`"${name}"`)
              ? [resolved(value, name, `#${id}`)]
              : [],
          ),
        }),
      }
    : lang === "python"
      ? { data: data({ role: "activegraph-declaration" }) }
      : lang === "text" && value.startsWith("<investigation>/")
        ? { data: data({ role: "artifact-layout" }) }
        : {}),
});
const runIn = (label: string, value: string) =>
  paragraph(
    { type: "strong", children: [{ type: "text", value: label }] },
    { type: "text", value: ` ${value}` },
  );

const fixture = (): Root => ({
  type: "root",
  children: [
    heading(1, "Attune", "top"),
    hero(),
    heading(2, "The thesis", "the-thesis"),
    heading(3, "A living edge, a durable core", "a-living-edge-a-durable-core"),
    paragraph({
      type: "text",
      value:
        "A mature tree is mostly accumulated growth. New tissue forms at a thin living edge; much of what it produces eventually becomes the wood that supports another season. The tree remains capable of change because not every part of it has to remain equally alive.",
    }),
    paragraph({
      type: "text",
      value: "Attune makes the same wager about repository research.",
    }),
    paragraph({
      type: "text",
      value:
        "An investigation should stay warm where judgment matters. An agent needs room to follow a structural clue, form competing explanations, choose an experiment, reverse course after a counterexample, or leave a relationship unresolved. That movement is not waste. It is how the investigation discovers which distinctions are real.",
    }),
    paragraph({
      type: "text",
      value:
        "But a distinction that survives should not remain expensive model work forever. It should be allowed to cool into something another investigation can inspect and run: an exact query, an executable model, a replayable counterexample, a tested property, or a deterministic rule.",
    }),
    paragraph({
      type: "text",
      value:
        "Joern makes concrete program structure observable. Maude makes a chosen abstraction executable. fast-check searches for the case that breaks it. ast-grep preserves the portion that is simple and stable enough to enforce.",
    }),
    paragraph({
      type: "text",
      value:
        "These tools form a loop, not a conveyor belt. A counterexample can reopen the search. A model can expose a distinction that syntax cannot preserve. A useful discovery may remain a query, a property, or a carefully bounded refusal to create a rule at all. Observation, formalization, falsification, and lowering are distinct roles, and no run is required to pass through all four.",
    }),
    paragraph({
      type: "text",
      value:
        "The product thesis is economic as much as technical. The first investigation may still bear the full cost of discovery. Later investigations should begin with the structure it leaves behind and spend more of their time classifying, adapting, and handling exceptions.",
    }),
    paragraph({
      type: "text",
      value:
        "The living edge remains free to notice what is different. The durable core keeps what no longer needs to be rediscovered.",
    }),
    {
      type: "blockquote",
      children: [
        paragraph({
          type: "strong",
          children: [
            {
              type: "text",
              value:
                "Attune grows by making successful reasoning unnecessary to repeat.",
            },
          ],
        }),
      ],
    },
    heading(2, "The model", "the-model"),
    paragraph({
      type: "text",
      value:
        "ActiveGraph preserves the path of inquiry. Attune preserves the external work beneath it. One explains why the investigation moved; the other records what actually ran.",
    }),
    heading(3, "Branches", "branches"),
    paragraph({
      type: "text",
      value:
        "Repository research rarely moves in a straight line. An agent follows one call path, forms hypotheses, chooses experiments, and preserves reversals and unresolved alternatives as evidence changes the investigation’s direction. ActiveGraph records what the agent was trying to understand, which capabilities it chose, and how each result affected what happened next.",
    }),
    paragraph({
      type: "text",
      value:
        "Most systems flatten that movement into a transcript organized around the final response. ActiveGraph keeps dead ends and competing explanations in the durable history, so a later reader can recover why one path was abandoned and which result caused the turn.",
    }),
    heading(3, "Roots", "roots"),
    paragraph({
      type: "text",
      value:
        "Branches matter only while attached to evidence. Attune gives that history roots by binding every accepted step to the exact repository state it observed, the requested operation, its terminal result, retained artifacts, and durable receipt. That connection survives after the model context or client process is gone.",
    }),
    paragraph({
      type: "text",
      value:
        "A shared invocation identity joins the investigation history to its mechanical evidence. Joern queries, Maude theories, counterexamples, and ast-grep rules remain native artifacts rather than being flattened into a universal intermediate representation whose uniformity would erase useful meaning.",
    }),
    heading(3, "Cuttings", "cuttings"),
    paragraph({
      type: "text",
      value:
        "Research becomes cumulative when useful queries, executable models, falsifiers, counterexamples, applicability cues, exclusions, and deterministic rules can travel into another repository. Those cuttings preserve some of the instruments by which an answer was reached and challenged, while the next investigation remains free to adapt, prune, or reject them.",
    }),
    paragraph({
      type: "text",
      value:
        "Over time, work should move from unrestricted rediscovery toward classification, targeted falsification, adaptation, and exception handling. The inquiry remains alive where a repository differs; the portions that survive scrutiny do not have to be grown again from nothing.",
    }),
    {
      type: "code",
      lang: "text",
      value: `materialized
     │ activate
     ▼
   active ───── execute ─────▶ receipt
     │                           │
     │ finalize                  │ inspect
     ▼                           ▼
 finalized                durable evidence`,
    },
    heading(2, "ActiveGraph", "activegraph"),
    paragraph({
      type: "text",
      value:
        "ActiveGraph keeps four durable research objects: Case, Claim, Evidence, and Result. Its event history preserves when the agent made a semantic decision and which external action followed it.",
    }),
    paragraph(
      { type: "text", value: "Before that action, " },
      { type: "inlineCode", value: "record_interpretation" },
      {
        type: "text",
        value:
          " records an immutable decision ledger. The ledger is not a fifth ActiveGraph object, an MCP operation, or a universal intermediate representation.",
      },
    ),
    paragraph(
      {
        type: "text",
        value: "The dependent Attune request cites its digest through ",
      },
      reference("FreeFormReference", `#${freeFormReferenceTarget}`),
      {
        type: "text",
        value:
          ", so MCP binds the exact operation to caller context without interpreting the ledger.",
      },
    ),
    paragraph(
      { type: "inlineCode", value: "Result.retained_ledger_refs" },
      {
        type: "text",
        value:
          " selects the decision edges that survived synthesis; a later motif packet can embed those small ledgers while native evidence remains behind exact references.",
      },
    ),
    paragraph(
      {
        type: "text",
        value: "The production pack is generic. Its ",
      },
      {
        type: "link",
        url: researchPackSource,
        children: [
          {
            type: "inlineCode",
            value: "make_research_pack",
          },
        ],
      },
      {
        type: "text",
        value: " composes workspace tools, the case-bound ",
      },
      {
        type: "link",
        url: interpretationToolSource,
        children: [
          {
            type: "inlineCode",
            value: "make_interpretation_tool",
          },
        ],
      },
      {
        type: "text",
        value: ", and the generated MCP wrappers.",
      },
    ),
    paragraph({
      type: "text",
      value:
        "The continuations below are native files named by the preceding Attune receipt. Their exact artifact addresses become source references for the next ledger rather than miniature ActiveGraph APIs.",
    }),
    artifact(
      "python",
      `def make_interpretation_tool(case_id: str) -> Tool:
    @typed_tool(
        name="record_interpretation",
        description="Record one explicit semantic transition.",
        input_model=InterpretationLedger,
        output_model=LedgerReference,
        deterministic=True,
    )
    def record_interpretation(
        ledger: InterpretationLedger,
        _ctx: ToolContext,
    ) -> LedgerReference:
        if ledger.case_id != case_id:
            raise ValueError("interpretation ledger must address the configured case")
        return LedgerReference(ref=ledger_reference(ledger))

    return record_interpretation


def make_research_pack(
    *,
    settings: ResearchBenchSettings,
    workspace_root: str,
    caller: AttuneCaller | None = None,
) -> Pack:
    workspace = make_workspace_tools(Path(workspace_root))
    attune = (
        make_pack(caller=caller).tools
        if settings.capability_profile is CapabilityProfile.ATTUNE
        else ()
    )
    tools = workspace + (make_interpretation_tool(settings.case_id),) + attune
    return Pack(
        object_types=(Case, Claim, Evidence, Result),
        relation_types=(addresses, supports, challenges, refines, usesPacket),
        behaviors=(
            _llm("investigate", InvestigationOutput, _investigated, tools),
            _llm("synthesize", Result, _synthesized, tools),
        ),
        tools=tools,
    )`,
    ),
    heading(2, "The artifacts", "the-artifacts"),
    paragraph({
      type: "text",
      value:
        "Each investigation AgentFS database is presented through an operation-scoped validated FUSE mount. repo/ and artifacts/ share one identity and mount lifecycle. Attune unmounts after terminal evidence drains; a later operation remounts the same capsule and delta. Copy-up and whiteout records preserve the investigation delta without mutating the immutable base.",
    }),
    paragraph({
      type: "text",
      value:
        "The raw mount path is private runtime state, not an MCP wire field. repo/ is a normal attached Git worktree inside that scope. ",
    }),
    paragraph(
      reference(
        "repository_checkpoint",
        `#${toolTargets.repository_checkpoint[1]}`,
      ),
      {
        type: "text",
        value:
          " with policy commit stages current non-ignored changes and returns a new full commit; require-clean proves that repo HEAD already contains the observed bytes.",
      },
    ),
    paragraph({
      type: "text",
      value:
        "artifacts/investigation.json records the immutable base resolvedCommit, while repo HEAD names the current exact snapshot. Finalization adds finalSnapshot and finalizedAt.",
    }),
    paragraph({
      type: "text",
      value:
        "Every accepted operation receives artifacts/{tool}/{invocationId}/. request.json and references.json are written before native evidence. result.json is written before the detached receipt.json terminal envelope.",
    }),
    paragraph(
      {
        type: "text",
        value:
          "Each byte sequence listed in a receipt's artifacts array becomes an ",
      },
      reference("ArtifactReference", `#${artifactReferenceTarget}`),
      {
        type: "text",
        value:
          " with uri, mediaType, sha256, bytes, and complete. complete means full byte capture; it does not claim semantic correctness.",
      },
    ),
    paragraph({
      type: "text",
      value:
        "result.json and receipt.json are terminal files; neither appears as a receipt artifact.",
    }),
    paragraph({
      type: "text",
      value:
        "references.json carries an opaque ledger address, not a copied semantic document. The ledger body remains in ActiveGraph event history, and Attune retains the address without retrieving or interpreting it.",
    }),
    artifact(
      "text",
      `<investigation>/
├── repo/
│   ├── src/… [materialized repository files]
│   ├── rules/<rule>.yml [materialized candidate]
│   └── payment-retry.property.ts [promoted; exact after checkpoint]
└── artifacts/
    ├── investigation.json
    ├── joern/<invocationId>/
    │   ├── request.json
    │   ├── references.json
    │   ├── query.cpgql
    │   ├── query.dsl.json [DSL route only]
    │   ├── environment.json
    │   ├── joern-response.json [server response available]
    │   ├── joern-diagnostic.json [server response available]
    │   ├── joern-server-output.json [server process output; bounded]
    │   ├── joern-output.json | joern-output.txt [successful query; selected format]
    │   ├── joern-error.json [query execution or diagnostic failure]
    │   ├── result.json
    │   └── receipt.json
    ├── maude/<invocationId>/
    │   ├── request.json
    │   ├── references.json
    │   ├── module.maude
    │   ├── commands.maude
    │   ├── stdout.txt
    │   ├── stderr.txt
    │   ├── process.json
    │   ├── result.json
    │   └── receipt.json
    ├── property/<invocationId>/
    │   ├── request.json
    │   ├── references.json
    │   ├── property.ts
    │   ├── parameters.json
    │   ├── stdout.txt
    │   ├── stderr.txt
    │   ├── process.json
    │   ├── run-details.json [runner completed]
    │   ├── report.txt [runner completed]
    │   ├── counterexample.json [failed property only]
    │   ├── result.json
    │   └── receipt.json
    └── ast-grep/<invocationId>/
        ├── request.json
        ├── references.json
        ├── inputs/sgconfig.yml
        ├── inputs/rules/<rule>.yml
        ├── stdout.txt
        ├── stderr.txt
        ├── process.json
        ├── findings.jsonl [scan mode only]
        ├── patch.diff [apply mode with changes only]
        ├── result.json
        └── receipt.json`,
    ),
    paragraph({
      type: "text",
      value: "Tool exhaust stays in artifacts/. ",
    }),
    paragraph(reference("artifact_promote", `#${artifactPromoteTarget}`), {
      type: "text",
      value:
        " copies one caller-selected retained artifact to a contained repo/ destination. The documented flow copies the receipt-listed property.ts to repo/payment-retry.property.ts; a later checkpoint makes it part of an exact snapshot. Attune preserves these mechanics without deciding the artifact's semantic value.",
    }),
    heading(2, "The tools", "the-tools"),
    paragraph({
      type: "text",
      value: "One native investigation narrows its claim as evidence arrives.",
    }),
    paragraph(
      ...Object.entries(toolTargets).flatMap(([name, [, id]], index) => [
        ...(index === 0 ? [] : [{ type: "text", value: ", " } as const]),
        reference(name, `#${id}`),
      ]),
    ),
    runIn("Repository source.", "The fixture makes the crash window concrete."),
    artifact(
      "ts",
      'export async function fulfillOrder() {\n  await services.crashPoint("after-charge")\n}',
    ),
    runIn("Observe.", "Joern retains exact structural observation."),
    artifact(
      "ts",
      'await mcp.call("repository_materialize")\nawait mcp.call("repository_checkpoint")',
    ),
    runIn("Native query.", "The generated query remains native CPGQL."),
    artifact(
      "scala",
      'cpg.method.name("fulfillOrder").call.name("charge").toJson',
    ),
    runIn("Retained result.", "The receipt names the native output file."),
    artifact("ts", 'await mcp.call("joern_query")'),
    artifact(
      "json",
      `[
  {
    "call": "findPayment",
    "code": "services.orders.findPayment(order.id)",
    "file": "src/fulfill-order.ts",
    "line": 26
  },
  {
    "call": "charge",
    "code": "services.payments.charge(order.customerId, order.totalCents)",
    "file": "src/fulfill-order.ts",
    "line": 29
  },
  {
    "call": "crashPoint",
    "code": "services.crashPoint(\\"after-charge\\")",
    "file": "src/fulfill-order.ts",
    "line": 33
  },
  {
    "call": "recordPaid",
    "code": "services.orders.recordPaid(order.id, payment.id)",
    "file": "src/fulfill-order.ts",
    "line": 34
  }
]`,
    ),
    paragraph({
      type: "text",
      value:
        "The next ledger cites artifacts/joern/joern-payment-retry-01/joern-output.json.",
    }),
    runIn("Formalize.", "The agent chooses the executable abstraction."),
    runIn(
      "Agent-authored abstraction.",
      "Maude tests only the selected model.",
    ),
    artifact("maude", "mod PAYMENT-RETRY is\nendm"),
    artifact(
      "ts",
      'const runMaude = async (ledgerRef: string) =>\n  mcp.call("maude_run", { references: [{ ref: ledgerRef }] })',
    ),
    artifact("console", "Solution 1\nNo solution."),
    paragraph({
      type: "text",
      value:
        "The next ledger cites artifacts/maude/maude-payment-retry-01/stdout.txt.",
    }),
    runIn("Falsify.", "The property returns to the implementation."),
    runIn(
      "Concrete falsifier.",
      "fast-check searches the selected crash window.",
    ),
    artifact("ts", 'const CRASH_WINDOW = "crash-after-charge"'),
    artifact(
      "ts",
      'const runProperty = async (ledgerRef: string) =>\n  mcp.call("property_run", { references: [{ ref: ledgerRef }] })',
    ),
    artifact(
      "json",
      '{"seed":20260730,"counterexamplePath":"1:3:1","numRuns":2,"numShrinks":2}',
    ),
    paragraph({
      type: "text",
      value:
        "Replay coordinates remain in artifacts/property/property-payment-retry-01/run-details.json.",
    }),
    artifact("json", '[["crash-after-charge","crash-after-charge"]]'),
    paragraph({
      type: "text",
      value:
        "The minimized input remains in artifacts/property/property-payment-retry-01/counterexample.json.",
    }),
    runIn("Enshrine.", "Only the deterministic residue becomes a detector."),
    runIn("Deterministic residue.", "The warning contains no automatic fix."),
    artifact(
      "yaml",
      "id: review-retryable-payment-without-operation-key\nrule:\n  pattern: $P.charge($C, $A)\nseverity: warning",
    ),
    paragraph({
      type: "text",
      value:
        "The materialized fixture already versions rules/review-retryable-payment-without-operation-key.yml as a candidate. The agent selects the receipt-listed property.ts for repo/payment-retry.property.ts through artifact_promote. repository_checkpoint with policy commit stages that non-ignored research file and returns PACKET_SNAPSHOT. The scan retains artifacts/ast-grep/ast-grep-payment-rule-01/inputs/rules/review-retryable-payment-without-operation-key.yml.",
    }),
    artifact(
      "ts",
      'const runRule = async (\n  ledgerRef: string,\n  propertyResult: { readonly receipt: { readonly artifacts: readonly { readonly uri: string }[] } },\n) => {\n  const propertySource = propertyResult.receipt.artifacts.find((artifact) =>\n    artifact.uri.endsWith("/property.ts"),\n  )\n  if (propertySource === undefined) throw new Error("missing property source")\n  await mcp.call("artifact_promote", {\n    investigationId: INVESTIGATION_ID,\n    invocationId: "promote-payment-property-01",\n    expectedSnapshot: EXACT_SNAPSHOT,\n    references: [{ ref: ledgerRef }],\n    artifactUri: propertySource.uri,\n    destinationPath: "payment-retry.property.ts",\n  })\n  const packetSnapshot = await mcp.call("repository_checkpoint", {\n    investigationId: INVESTIGATION_ID,\n    invocationId: "checkpoint-payment-packet-01",\n    expectedSnapshot: EXACT_SNAPSHOT,\n    policy: "commit",\n    references: [{ ref: ledgerRef }],\n  })\n  return mcp.call("ast_grep_run", {\n    expectedSnapshot: packetSnapshot.snapshotId,\n    references: [{ ref: ledgerRef }],\n  })\n}',
    ),
    artifact(
      "json",
      '{"text":"services.payments.charge(\\n    order.customerId,\\n    order.totalCents,\\n  )","range":{"byteOffset":{"start":750,"end":823},"start":{"line":28,"column":24},"end":{"line":31,"column":3}},"file":"src/fulfill-order.ts","lines":"  const payment = await services.payments.charge(\\n    order.customerId,\\n    order.totalCents,\\n  )","charCount":{"leading":24,"trailing":0},"language":"TypeScript","metaVariables":{"single":{"TOTAL_CENTS":{"text":"order.totalCents","range":{"byteOffset":{"start":802,"end":818},"start":{"line":30,"column":4},"end":{"line":30,"column":20}}},"CUSTOMER_ID":{"text":"order.customerId","range":{"byteOffset":{"start":780,"end":796},"start":{"line":29,"column":4},"end":{"line":29,"column":20}}},"PAYMENTS":{"text":"services.payments","range":{"byteOffset":{"start":750,"end":767},"start":{"line":28,"column":24},"end":{"line":28,"column":41}}}},"multi":{},"transformed":{}},"ruleId":"review-retryable-payment-without-operation-key","severity":"warning","note":null,"message":"This two-argument payment charge may be replayed after partial failure. Verify provider idempotency and supply a stable operation key where supported.","labels":[{"text":"services.payments.charge(\\n    order.customerId,\\n    order.totalCents,\\n  )","range":{"byteOffset":{"start":750,"end":823},"start":{"line":28,"column":24},"end":{"line":31,"column":3}},"style":"primary"}]}',
    ),
    paragraph({
      type: "text",
      value:
        "The finding remains in artifacts/ast-grep/ast-grep-payment-rule-01/findings.jsonl.",
    }),
    heading(2, "The Packet", "the-packet"),
    paragraph({
      type: "text",
      value: "The packet indexes native evidence and explicit semantic loss.",
    }),
    artifact(
      "json",
      `{
  "schema_version": 1,
  "motif_id": "retryable-payment-idempotency",
  "source_case_ids": ["payment-retry"],
  "source_run_ids": ["activegraph-run-payment-retry-01"],
  "source_artifact_refs": [
    "attune://investigations/{id}/artifacts/joern/joern-payment-retry-01/joern-output.json",
    "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/stdout.txt",
    "attune://investigations/{id}/artifacts/property/property-payment-retry-01/run-details.json",
    "attune://investigations/{id}/artifacts/property/property-payment-retry-01/counterexample.json",
    "attune://investigations/{id}/artifacts/ast-grep/ast-grep-payment-rule-01/findings.jsonl"
  ],
  "claim": "A retryable charge needs stable operation identity.",
  "applicability": ["two-argument payment charge"],
  "exclusion_cues": ["provider-supplied idempotency"],
  "repository_signals": ["crash boundary before durable record"],
  "joern_queries": [
    {
      "cpgql": "cpg.method.name(\\"fulfillOrder\\").call.name(\\"charge\\")"
    }
  ],
  "formal_artifacts": [
    "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/module.maude"
  ],
  "falsifiers": [
    "attune://investigations/{id}/artifacts/property/property-payment-retry-01/property.ts"
  ],
  "counterexamples": [
    "attune://investigations/{id}/artifacts/property/property-payment-retry-01/counterexample.json"
  ],
  "ledgers": [
    {
      "schema_version": 1,
      "case_id": "payment-retry",
      "question": "Can replay charge one order twice?",
      "source_refs": [
        "attune://investigations/{id}/artifacts/joern/joern-payment-retry-01/joern-output.json"
      ],
      "retained": ["CRASH_WINDOW = charge -> crashPoint -> recordPaid"],
      "omitted": ["provider implementation"],
      "assumptions": ["a stable key deduplicates provider retries"],
      "next_step": "execute keyed and unkeyed retry models",
      "expected_discriminator": "only the unkeyed model reaches two charges",
      "limitations": ["provider key lifetime is not established"]
    }
  ],
  "lowerings": [
    {
      "kind": "ast-grep",
      "artifact_ref": "attune://investigations/{id}/artifacts/ast-grep/ast-grep-payment-rule-01/inputs/rules/review-retryable-payment-without-operation-key.yml",
      "proven_scope": "Warns on two-argument member charge calls; no fix.",
      "omitted_semantics": ["provider contract", "retry policy"]
    }
  ],
  "unresolved_questions": ["Which order expression is stable here?"]
}`,
    ),
    ...declaration(
      2,
      "Investigation<State>",
      "Investigation",
      "export interface Investigation<State extends InvestigationState> {}",
    ),
    ...declaration(2, "Attune", "Attune", "export interface Attune {}"),
    ...declaration(
      3,
      "Attune.materialize",
      "Attune.materialize",
      "materialize(input: MaterializeInput): Effect.Effect<Materialized>",
    ),
    ...declaration(
      3,
      "Attune.activate",
      "Attune.activate",
      'activate(value: Investigation<"materialized">): Effect.Effect<Investigation<"active">>',
    ),
    ...declaration(
      3,
      "Attune.acquireActive",
      "Attune.acquireActive",
      'acquireActive(id: string): Effect.Effect<Investigation<"active">>',
    ),
    ...declaration(
      3,
      "Attune.execute",
      "Attune.execute",
      'execute(value: Investigation<"active">): Effect.Effect<AttuneReceipt>',
    ),
    ...declaration(
      3,
      "Attune.finalize",
      "Attune.finalize",
      'finalize(value: Investigation<"active">): Effect.Effect<Investigation<"finalized">>',
    ),
    ...declaration(
      3,
      "Attune.recoverTerminal",
      "Attune.recoverTerminal",
      "recoverTerminal(receipt: AttuneReceipt): Effect.Effect<AttuneReceipt>",
    ),
    ...declaration(
      2,
      "AttuneReceipt",
      "AttuneReceipt",
      "export interface AttuneReceipt {}",
    ),
    heading(2, "Failures", "failures"),
    ...declaration(
      3,
      "InvestigationLifecycleError",
      "InvestigationLifecycleError",
      "export class InvestigationLifecycleError extends Error {}",
    ),
    ...declaration(
      3,
      "AttuneToolFailure",
      "AttuneToolFailure",
      "export class AttuneToolFailure extends Error {}",
    ),
    ...declaration(
      2,
      "AttuneToolkit",
      "AttuneToolkit",
      "export interface AttuneToolkit {}",
    ),
    heading(2, "Repository", "repository"),
    paragraph({
      type: "text",
      value: "attune-mcp · src/internal.ts",
    }),
    ...declaration(
      3,
      "makeInvestigation",
      "attune-mcp--src-internal--makeInvestigation",
      "const makeInvestigation = (): Investigation => ({})",
    ),
    ...Object.values(toolTargets).flatMap(([symbol, id]) =>
      declaration(3, symbol, id, `const ${symbol} = {}`),
    ),
    ...declaration(
      3,
      "FreeFormReference",
      freeFormReferenceTarget,
      "const FreeFormReference = {}",
    ),
    ...declaration(
      3,
      "ArtifactReference",
      artifactReferenceTarget,
      "const ArtifactReference = {}",
    ),
  ],
});

let highlighter: Highlighter;
let options: DocumentationOptions;

beforeAll(async () => {
  highlighter = await createHighlighter({
    langs: [
      "typescript",
      "javascript",
      "python",
      "scala",
      "json",
      "yaml",
      "console",
      "text",
    ],
    themes: ["github-light-default"],
  });
  options = {
    highlighter,
    language: { resolve: async () => undefined },
    metadata: {
      revision,
      typescriptVersion: "7.0.2",
      tsgoVersion: "0.24.3",
      languageServiceVersion: "0.87.1",
    },
  };
});

afterAll(() => {
  highlighter.dispose();
});

describe("single type document", () => {
  test("uses the real compiler for definitions, diagnostics, cuts, unicode, and failure channels", async () => {
    const repository = Path.resolve(import.meta.dirname, "../../..");
    const production = await read(repository, revision);
    const productionHeadings = production.children.filter(
      (node): node is Heading => node.type === "heading",
    );
    const sourcePath = "packages/attune-docs/test/fixtures/resolver.ts";
    const fixtureSource = await readFile(
      Path.join(repository, sourcePath),
      "utf8",
    );
    const range = (text: string) => {
      const start = fixtureSource.indexOf(text);
      if (start < 0) throw new Error(`Resolver fixture lacks ${text}`);
      return {
        start,
        end: start + text.length,
        lineStart: fixtureSource.slice(0, start).split("\n").length,
        lineEnd: fixtureSource.slice(0, start + text.length).split("\n").length,
      };
    };
    const target =
      "export interface ResolverTarget {\n  readonly value: string;\n}";
    const defaulted =
      "defaulted(input: ResolverTarget): Effect.Effect<ResolverTarget>;";
    const generic = `readonly generic: <E>(
    input: ResolverTarget,
  ) => Effect.Effect<ResolverTarget, E>;`;
    const sourceHeading = (
      label: string,
      id: string,
      text: string,
    ): Heading => ({
      type: "heading",
      depth: 3,
      children: [{ type: "text", value: label }],
      data: data({
        id,
        role: "member",
        sourcePath,
        sourceRange: range(text),
        definitionRanges: [
          {
            sourcePath,
            sourceRange: range(
              label.includes(".")
                ? label.slice(label.lastIndexOf(".") + 1)
                : label,
            ),
          },
        ],
      }),
    });
    const sourceCode = (ownerId: string, text: string): Code => {
      const owned = range(text);
      return {
        type: "code",
        lang: "ts",
        value: text,
        data: data({
          role: "signature",
          ownerId,
          callable: true,
          sourcePath,
          sourceRange: owned,
          intervals: [[0, text.length, owned.start, owned.end]],
        }),
      };
    };
    const exampleSource = `// @filename: setup.ts
export const emoji = "😀é"
// ---cut---
// @filename: visible.ts
import type { Investigation } from "attune-mcp"
import { emoji } from "./setup.js"
const unicode = "😀é"
declare const active: Investigation<"active">
// @errors: 2322
const bad: string = 1
active.state
emoji`;
    const semanticTree = (failure: boolean): Root => ({
      type: "root",
      children: [
        ...structuredClone(productionHeadings),
        sourceHeading("ResolverTarget", "ResolverTarget", target),
        sourceHeading("Attune.defaulted", "Attune.defaulted", defaulted),
        sourceCode("Attune.defaulted", defaulted),
        sourceHeading("Attune.generic", "Attune.generic", generic),
        sourceCode("Attune.generic", generic),
        ...(failure
          ? [
              paragraph({
                type: "link",
                url: "tsdoc:failure:E",
                children: [{ type: "text", value: "E" }],
                data: data({
                  role: "reference",
                  ownerId: "Attune.generic",
                  packageName: "attune-docs",
                  reference: "E",
                  referenceKind: "failure",
                  explanation: "Handle the caller-selected failure.",
                  sourcePath,
                  sourceRange: range(generic),
                }),
              }),
            ]
          : []),
        {
          type: "code",
          lang: "ts",
          value: exampleSource,
          data: data({
            role: "example",
            sourcePath,
            sourceRange: range(target),
          }),
        },
      ],
    });
    const inheritDirectory = await mkdtemp(
      Path.join(repository, "packages/attune-mcp/src/.inherit-doc-test-"),
    );
    const inheritPath = Path.join(inheritDirectory, "inherit.ts");
    const inheritSourcePath = Path.relative(repository, inheritPath).replaceAll(
      Path.sep,
      "/",
    );
    const contract = `export interface InheritContract<A> {
  inherited<T>(input: T, context: A): readonly [T, A];
  cycle(input: string): string;
}`;
    const implementation = `export class InheritImplementation<A> implements InheritContract<A> {
  inherited<T>(input: T, context: A): readonly [T, A] { return [input, context]; }
  cycle(input: string): string { return input; }
}`;
    const narrowContract = `export interface NarrowContract {
  inherited(input: string): string;
}`;
    const narrowImplementation = `export class NarrowImplementation implements NarrowContract {
  inherited(input: string): "fixed" { void input; return "fixed"; }
}`;
    const renamedImplementation = `export class RenamedImplementation<A> implements InheritContract<A> {
  inherited<T>(value: T, context: A): readonly [T, A] { return [value, context]; }
  cycle(input: string): string { return input; }
}`;
    const detached = `export class DetachedImplementation<A> {
  inherited<T>(input: T, context: A): readonly [T, A] { const result = [input, context] as const; return result; }
}`;
    const inheritSource = [
      contract,
      implementation,
      narrowContract,
      narrowImplementation,
      renamedImplementation,
      detached,
      "",
    ].join("\n");
    await writeFile(inheritPath, inheritSource);
    const inheritRange = (text: string) => {
      const start = inheritSource.indexOf(text);
      if (start < 0) throw new Error(`Inheritance fixture lacks ${text}`);
      return {
        start,
        end: start + text.length,
        lineStart: inheritSource.slice(0, start).split("\n").length,
        lineEnd: inheritSource.slice(0, start + text.length).split("\n").length,
      };
    };
    const inheritHeading = (
      label: string,
      id: string,
      text: string,
    ): Heading => ({
      type: "heading",
      depth: id.includes(".") ? 4 : 3,
      children: [{ type: "text", value: label }],
      data: data({
        id,
        role: id.includes(".") ? "member" : "declaration",
        sourcePath: inheritSourcePath,
        sourceRange: inheritRange(text),
        definitionRanges: [
          { sourcePath: inheritSourcePath, sourceRange: inheritRange(text) },
        ],
      }),
    });
    const inheritLink = (
      ownerId: string,
      reference: string,
      ownerText: string,
    ): Paragraph =>
      paragraph({
        type: "link",
        url: `tsdoc:inherit:${reference}`,
        children: [{ type: "text", value: reference }],
        data: data({
          role: "reference",
          ownerId,
          packageName: "attune-mcp",
          reference,
          referenceKind: "inherit",
          sourcePath: inheritSourcePath,
          sourceRange: inheritRange(ownerText),
        }),
      });
    const declarations = [
      ["InheritContract", "InheritContract", contract],
      [
        "InheritContract.inherited",
        "InheritContract.inherited",
        contract.split("\n")[1]!.trim(),
      ],
      [
        "InheritContract.cycle",
        "InheritContract.cycle",
        contract.split("\n")[2]!.trim(),
      ],
      [
        "InheritImplementation",
        "attune-mcp--InheritImplementation",
        implementation,
      ],
      [
        "InheritImplementation.inherited",
        "attune-mcp--InheritImplementation.inherited",
        implementation.split("\n")[1]!.trim(),
      ],
      ["NarrowContract", "NarrowContract", narrowContract],
      [
        "NarrowContract.inherited",
        "NarrowContract.inherited",
        narrowContract.split("\n")[1]!.trim(),
      ],
      [
        "NarrowImplementation",
        "attune-mcp--NarrowImplementation",
        narrowImplementation,
      ],
      [
        "NarrowImplementation.inherited",
        "attune-mcp--NarrowImplementation.inherited",
        narrowImplementation.split("\n")[1]!.trim(),
      ],
      [
        "RenamedImplementation",
        "attune-mcp--RenamedImplementation",
        renamedImplementation,
      ],
      [
        "RenamedImplementation.inherited",
        "attune-mcp--RenamedImplementation.inherited",
        renamedImplementation.split("\n")[1]!.trim(),
      ],
      [
        "DetachedImplementation",
        "attune-mcp--DetachedImplementation",
        detached,
      ],
      [
        "DetachedImplementation.inherited",
        "attune-mcp--DetachedImplementation.inherited",
        detached.split("\n")[1]!.trim(),
      ],
    ] as const;
    const inherited = (
      ownerId: string,
      target: string,
      ownerText: string,
    ): Root => ({
      type: "root",
      children: [
        ...declarations.map(([label, id, text]) =>
          inheritHeading(label, id, text),
        ),
        inheritLink(ownerId, target, ownerText),
      ],
    });
    const server = await createDocumentationLanguage(repository);
    try {
      const tree = semanticTree(true);
      const file = new VFile({ path: "index.html" });
      await server.language.resolve(tree, file);
      expect(file.messages.map(String)).toEqual([]);
      const codes = tree.children.filter(
        (node): node is Code => node.type === "code",
      );
      expect(codes.every((code) => code.data?.attune?.checked)).toBe(true);
      expect(codes[0]!.data?.attune?.links).toContainEqual(
        expect.objectContaining({ href: "#ResolverTarget" }),
      );
      expect(codes[1]!.data?.attune?.links).toContainEqual(
        expect.objectContaining({ href: "#Attune.generic" }),
      );
      const renderedExample = codes[2]!;
      expect(renderedExample.value).toContain("// @filename: visible.ts");
      expect(renderedExample.value).toContain('"😀é"');
      expect(renderedExample.value).not.toMatch(/---cut|@errors/u);
      expect(renderedExample.data?.attune?.links).toContainEqual(
        expect.objectContaining({ href: "#Investigation" }),
      );
      expect(
        renderedExample.data?.attune?.links?.some(
          (link) =>
            renderedExample.value.slice(link.start, link.end) === "emoji",
        ),
      ).toBe(false);

      const drift = semanticTree(false);
      const driftFile = new VFile({ path: "index.html" });
      await server.language.resolve(drift, driftFile);
      expect(driftFile.messages.map((message) => message.reason)).toContain(
        "Attune.generic error channel #Attune.generic does not match @failure none",
      );

      for (const [example, reason] of [
        [
          `import type { Investigation } from "attune-mcp"
// @errors: 2344
declare const invalid: Investigation<"bogus">`,
          'Investigation state "bogus" is not canonical',
        ],
        [
          `interface Investigation<State> { readonly state: State }
declare const shadow: Investigation<"active">`,
          "Investigation lifecycle reference does not resolve to #Investigation",
        ],
      ] as const) {
        const lifecycleTree: Root = {
          type: "root",
          children: [
            ...structuredClone(productionHeadings),
            {
              type: "code",
              lang: "ts",
              value: example,
              data: data({ role: "example", sourcePath }),
            },
          ],
        };
        const lifecycleFile = new VFile({ path: "index.html" });
        await server.language.resolve(lifecycleTree, lifecycleFile);
        expect(
          lifecycleFile.messages.map((message) => message.reason),
        ).toContain(reason);
      }

      const inheritanceCases = [
        {
          tree: inherited(
            "attune-mcp--InheritImplementation.inherited",
            "InheritContract.inherited",
            implementation.split("\n")[1]!.trim(),
          ),
          reason: undefined,
        },
        {
          tree: inherited(
            "attune-mcp--NarrowImplementation.inherited",
            "NarrowContract.inherited",
            narrowImplementation.split("\n")[1]!.trim(),
          ),
          reason: "not bidirectionally assignable",
        },
        {
          tree: inherited(
            "attune-mcp--RenamedImplementation.inherited",
            "InheritContract.inherited",
            renamedImplementation.split("\n")[1]!.trim(),
          ),
          reason: "callable names do not match",
        },
        {
          tree: inherited(
            "attune-mcp--DetachedImplementation.inherited",
            "InheritContract.inherited",
            detached.split("\n")[1]!.trim(),
          ),
          reason: "has no explicit implements or override relation",
        },
        {
          tree: inherited(
            "InheritContract.inherited",
            "InheritContract.inherited",
            contract.split("\n")[1]!.trim(),
          ),
          reason: "Cyclic inheritDoc chain",
        },
        {
          tree: inherited(
            "attune-mcp--InheritImplementation.inherited",
            "MissingContract.inherited",
            implementation.split("\n")[1]!.trim(),
          ),
          reason: "has no canonical definition",
        },
      ] as const;
      for (const testCase of inheritanceCases) {
        const inheritanceFile = new VFile({ path: "index.html" });
        await server.language.resolve(testCase.tree, inheritanceFile);
        const reasons = inheritanceFile.messages.map(
          (message) => message.reason,
        );
        const passed =
          testCase.reason === undefined
            ? reasons.length === 0
            : reasons.some((reason) => reason.includes(testCase.reason));
        expect(
          passed,
          `Expected ${testCase.reason ?? "no errors"}; received ${reasons.join("\n")}`,
        ).toBe(true);
      }

      const guide = await read(repository, revision);
      const guideFile = new VFile({ path: "index.html" });
      await server.language.resolve(guide, guideFile);
      expect(guideFile.messages.map(String)).toEqual([]);
      const toolsStart = guide.children.findIndex(
        (node) =>
          node.type === "heading" && node.data?.attune?.id === "the-tools",
      );
      const toolsEnd = guide.children.findIndex(
        (node, index) =>
          index > toolsStart &&
          node.type === "heading" &&
          node.data?.attune?.id === "the-packet",
      );
      const toolPrograms = guide.children
        .slice(toolsStart + 1, toolsEnd)
        .filter(
          (node): node is Code =>
            node.type === "code" && node.data?.attune?.role === "investigation",
        );
      expect(toolPrograms).toHaveLength(7);
      expect(
        toolPrograms.every(
          (code) =>
            code.data?.attune?.checked === true &&
            code.data.attune.links !== undefined,
        ),
      ).toBe(true);
      for (const [name, [symbol]] of Object.entries(toolTargets)) {
        const target = productionHeadings.find(
          (node) =>
            node.children[0]?.type === "text" &&
            node.children[0].value === symbol,
        )?.data?.attune?.id;
        expect(target).toBeTypeOf("string");
        expect(
          toolPrograms.some((code) =>
            code.data?.attune?.links?.some(
              (link) =>
                code.value.slice(link.start, link.end) === name &&
                link.href === `#${target}`,
            ),
          ),
          `Expected checked tools code link for ${name} -> ${symbol}`,
        ).toBe(true);
      }
      expect(
        toolPrograms.some((code) =>
          code.data?.attune?.links?.some((link) =>
            link.href.startsWith("#tools-definition-"),
          ),
        ),
      ).toBe(true);
    } finally {
      await server.close();
      await rm(inheritDirectory, { recursive: true, force: true });
    }
  }, 60_000);

  test("reads the real production universe into one deterministic guide", async () => {
    const repository = Path.resolve(import.meta.dirname, "../../..");
    const [first, second] = await Promise.all([
      read(repository, revision),
      read(repository, revision),
    ]);
    expect(second).toEqual(first);

    expect(first.children[0]).toMatchObject({
      type: "heading",
      depth: 1,
      data: { attune: { id: "top" } },
    });
    const opening = first.children[1];
    expect(opening).toMatchObject({ type: "list", ordered: false });
    if (opening?.type !== "list")
      throw new Error("Production opening is not a list");
    expect(opening.children).toHaveLength(3);
    for (const item of opening.children) {
      expect(item.children).toHaveLength(1);
      expect(item.children[0]).toMatchObject({
        type: "paragraph",
        children: [{ type: "strong" }, { type: "text" }],
      });
    }
    expect(first.children[2]).toMatchObject({
      type: "heading",
      depth: 2,
      data: { attune: { id: "the-thesis" } },
    });
    const modelIndex = first.children.findIndex(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "the-model",
    );
    expect(
      first.children
        .slice(3, modelIndex)
        .filter((node) => node.type === "blockquote"),
    ).toHaveLength(1);

    const headings = first.children.filter(
      (node): node is Heading => node.type === "heading",
    );
    expect(headings.slice(0, 25).map((node) => node.children[0])).toEqual(
      [
        "Attune",
        "The thesis",
        "A living edge, a durable core",
        "The model",
        "Branches",
        "Roots",
        "Cuttings",
        "ActiveGraph",
        "The artifacts",
        "The tools",
        "The Packet",
        "Investigation<State>",
        "Attune",
        "Attune.materialize",
        "Attune.activate",
        "Attune.acquireActive",
        "Attune.execute",
        "Attune.finalize",
        "Attune.recoverTerminal",
        "AttuneReceipt",
        "Failures",
        "InvestigationLifecycleError",
        "AttuneToolFailure",
        "AttuneToolkit",
        "Repository",
      ].map((value) => ({ type: "text", value })),
    );

    const codes = first.children.filter(
      (node): node is Code => node.type === "code",
    );
    expect(headings).toHaveLength(549);
    expect(codes).toHaveLength(555);
    const examples = codes.filter(
      (node) => node.data?.attune?.role === "example",
    );
    expect(examples).toHaveLength(0);
    expect(codes.filter((node) => node.lang === "text")).toHaveLength(2);
    const activeGraphStart = first.children.findIndex(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "activegraph",
    );
    const artifactsStart = first.children.findIndex(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "the-artifacts",
    );
    const toolsStart = first.children.findIndex(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "the-tools",
    );
    const packetStart = first.children.findIndex(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "the-packet",
    );
    const investigationStart = first.children.findIndex(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "Investigation",
    );
    const activeGraphCodes = first.children
      .slice(activeGraphStart + 1, artifactsStart)
      .filter((node): node is Code => node.type === "code");
    expect(activeGraphCodes).toHaveLength(1);
    expect(activeGraphCodes[0]).toMatchObject({
      lang: "python",
      data: { attune: { role: "activegraph-declaration" } },
    });
    expect(activeGraphCodes[0]!.value).toContain("def make_research_pack");
    const artifactCodes = first.children
      .slice(artifactsStart + 1, toolsStart)
      .filter((node): node is Code => node.type === "code");
    expect(artifactCodes).toHaveLength(1);
    expect(artifactCodes[0]).toMatchObject({
      lang: "text",
      data: { attune: { role: "artifact-layout" } },
    });
    expect(artifactCodes[0]!.value).toContain("artifacts/");
    expect(artifactCodes[0]!.value).toContain("receipt.json");
    const native = first.children
      .slice(toolsStart + 1, packetStart)
      .filter((node): node is Code => node.type === "code");
    expect(native.map(({ lang }) => lang)).toEqual([
      "ts",
      "ts",
      "scala",
      "ts",
      "json",
      "maude",
      "ts",
      "console",
      "ts",
      "ts",
      "json",
      "json",
      "yaml",
      "ts",
      "json",
    ]);
    expect(JSON.parse(native[4]!.value)).toMatchObject([
      { call: "findPayment", line: 26 },
      { call: "charge", line: 29 },
      { call: "crashPoint", line: 33 },
      { call: "recordPaid", line: 34 },
    ]);
    expect(JSON.parse(native[14]!.value)).toMatchObject({
      range: {
        byteOffset: { start: 750, end: 823 },
        start: { line: 28, column: 24 },
        end: { line: 31, column: 3 },
      },
      metaVariables: {
        single: {
          TOTAL_CENTS: {
            range: { byteOffset: { start: 802, end: 818 } },
          },
          CUSTOMER_ID: {
            range: { byteOffset: { start: 780, end: 796 } },
          },
          PAYMENTS: {
            range: { byteOffset: { start: 750, end: 767 } },
          },
        },
      },
      ruleId: "review-retryable-payment-without-operation-key",
      severity: "warning",
      note: null,
      labels: [{ style: "primary" }],
    });
    expect(
      native
        .filter((code) => code.lang === "ts")
        .every(
          (code) =>
            code.data?.attune?.role === "investigation" &&
            code.data?.attune?.checked === undefined &&
            code.data?.attune?.links === undefined,
        ),
    ).toBe(true);
    expect(
      native
        .filter((code) => code.lang !== "ts")
        .every((code) => code.data?.attune?.role === undefined),
    ).toBe(true);
    const packetCodes = first.children
      .slice(packetStart + 1, investigationStart)
      .filter((node): node is Code => node.type === "code");
    expect(packetCodes).toHaveLength(1);
    expect(packetCodes[0]?.lang).toBe("json");

    const ids = headings.map((node) => node.data?.attune?.id);
    expect(ids.every((id) => typeof id === "string")).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      headings.filter((node) =>
        ["declaration", "member"].includes(node.data?.attune?.role ?? ""),
      ),
    ).toHaveLength(536);

    const paths = new Set(
      headings.flatMap((node) =>
        node.data?.attune?.sourcePath === undefined
          ? []
          : [node.data.attune.sourcePath],
      ),
    );
    expect(
      [...paths].filter((path) => path.startsWith("packages/attune-mcp/")),
    ).toHaveLength(26);
    expect(
      headings
        .filter((node) =>
          ["declaration", "member"].includes(node.data?.attune?.role ?? ""),
        )
        .every(
          (node) =>
            node.data?.attune?.sourcePath?.startsWith("packages/attune-mcp/") ||
            node.data?.attune?.sourcePath?.startsWith("packages/effect-joern/"),
        ),
    ).toBe(true);
    expect(
      [...paths].filter((path) => path.startsWith("packages/effect-joern/")),
    ).toHaveLength(17);
    expect(
      [...paths].filter((path) => path.includes("/pure/generated/")),
    ).toHaveLength(4);
    expect(
      await readFile(
        Path.join(repository, "packages/attune-mcp/src/index.ts"),
        "utf8",
      ),
    ).not.toContain("@packageDocumentation");
    expect(
      await readFile(
        Path.join(repository, "packages/attune-guide/src/index.ts"),
        "utf8",
      ),
    ).toContain("@packageDocumentation");
  }, 15_000);

  test("renders the exact guide spine and static definition links", async () => {
    const { html } = await compileDocumentation(fixture(), options);
    const ids = [...html.matchAll(/\sid="([^"]+)"/gu)].map((match) => match[1]);
    const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/gu)].map(
      (match) => match[1]!,
    );

    expect(html.match(/<h1\b/gu)).toHaveLength(1);
    expect(html).toContain('<h1 id="top">Attune</h1>');
    const chapterPositions = [
      "the-thesis",
      "a-living-edge-a-durable-core",
      "the-model",
      "branches",
      "roots",
      "cuttings",
      "activegraph",
      "the-artifacts",
      "the-tools",
      "the-packet",
      "Investigation",
      "Attune",
      "AttuneReceipt",
      "failures",
      "AttuneToolkit",
      "repository",
    ].map((id) => html.indexOf(`id="${id}"`));
    expect(chapterPositions.every((position) => position >= 0)).toBe(true);
    expect(chapterPositions).toEqual(
      [...chapterPositions].sort((left, right) => left - right),
    );
    const activeGraph =
      /<h2 id="activegraph">ActiveGraph<\/h2>([\s\S]*?)<h2 id="the-artifacts">/u.exec(
        html,
      )?.[1];
    expect(activeGraph).toBeDefined();
    const activeGraphText = activeGraph?.replace(/<[^>]+>/gu, "") ?? "";
    expect(activeGraph).toContain(
      `href="#${freeFormReferenceTarget}">FreeFormReference</a>`,
    );
    expect(activeGraph).toContain("<code>record_interpretation</code>");
    expect(activeGraph).toContain("<code>Result.retained_ledger_refs</code>");
    expect(activeGraph).toContain(
      `href="${pinnedResearchPackSource}"><code>make_research_pack</code></a>`,
    );
    expect(activeGraph).toContain(
      `href="${pinnedInterpretationToolSource}"><code>make_interpretation_tool</code></a>`,
    );
    expect(activeGraph).toContain("native files");
    expect(activeGraph).toContain('data-code-role="activegraph-declaration"');
    expect(activeGraphText).toContain("make_research_pack");
    expect(activeGraphText).toContain("make_interpretation_tool");
    expect(activeGraphText).toContain("input_model=InterpretationLedger");
    expect(activeGraphText).toContain("output_model=LedgerReference");
    expect(activeGraphText).toContain("deterministic=True");
    expect(activeGraphText).toContain("ledger.case_id != case_id");
    expect(activeGraph).not.toContain("activegraph.call");
    expect(activeGraph).not.toMatch(/thesis-prose|model-prose|botanical-/u);
    const artifacts =
      /<h2 id="the-artifacts">The artifacts<\/h2>([\s\S]*?)<h2 id="the-tools">/u.exec(
        html,
      )?.[1];
    expect(artifacts).toBeDefined();
    expect(artifacts).toContain(
      `href="#${artifactReferenceTarget}">ArtifactReference</a>`,
    );
    expect(artifacts).toContain(
      `href="#${toolTargets.repository_checkpoint[1]}">repository_checkpoint</a>`,
    );
    expect(artifacts).toContain(
      `href="#${artifactPromoteTarget}">artifact_promote</a>`,
    );
    expect(artifacts).toContain(
      'data-language="text" data-code-role="artifact-layout"',
    );
    for (const path of [
      "investigation.json",
      "repo/",
      "src/…",
      "rules/",
      "payment-retry.property.ts",
      "artifacts/",
      "request.json",
      "references.json",
      "query.cpgql",
      "environment.json",
      "joern-output.json",
      "module.maude",
      "commands.maude",
      "stdout.txt",
      "stderr.txt",
      "process.json",
      "property.ts",
      "parameters.json",
      "run-details.json",
      "counterexample.json",
      "inputs/sgconfig.yml",
      "inputs/rules/",
      "findings.jsonl",
      "patch.diff",
      "result.json",
      "receipt.json",
    ])
      expect(artifacts).toContain(path);
    expect(artifacts).not.toMatch(
      /bases\/|bindings\/|capsules\/|mounts\/|\/(?:home|root)\//u,
    );
    expect(html).not.toContain("complete-investigation");
    expect(html.match(/data-language="text"/gu)).toHaveLength(2);
    expect(
      html.match(/data-language="(?:scala|maude|json|yaml)"/gu),
    ).toHaveLength(8);
    expect(html.match(/data-language="console"/gu)).toHaveLength(1);
    expect(html.match(/data-language="python"/gu)).toHaveLength(1);
    expect(html.match(/data-code-role="example"/gu) ?? []).toHaveLength(0);
    expect(html.match(/data-code-role="artifact-layout"/gu)).toHaveLength(1);
    expect(html.match(/data-code-role="investigation"/gu)).toHaveLength(7);
    expect(
      html.match(/data-code-role="activegraph-declaration"/gu),
    ).toHaveLength(1);
    expect(html).not.toContain('data-code-role="interpretation"');
    expect(
      html.match(/data-code-role="investigation" data-attune-checked="true"/gu),
    ).toHaveLength(7);
    for (const path of [
      "joern-output.json",
      "stdout.txt",
      "run-details.json",
      "counterexample.json",
      "repo/payment-retry.property.ts",
      "inputs/rules/review-retryable-payment-without-operation-key.yml",
      "findings.jsonl",
    ])
      expect(html).toContain(path);
    expect(html).not.toMatch(
      /joern\.summary|attune:(?:joern|maude|property):|ToolCall|PAYMENT_(?:MODEL|PROPERTY|RULE)_(?:CALL|LEDGER_REF)|query_ref|output_ref|findings_ref|<exact ActiveGraph run id>/u,
    );
    expect(html).toContain('href="#Investigation"');
    expect(html).toContain('class="definition-link"');
    expect(html).toContain(
      '<meta name="description" content="Follow every branch, keep repository research rooted in evidence, and propagate what survives.">',
    );
    expect(html.match(/<meta charset="utf-8">/gu)).toHaveLength(1);
    expect(html).toContain('href="styles.css"');
    expect(html).not.toMatch(/card|search-index|sidebar/iu);

    const opening = /<div class="opening">([\s\S]*?)<h2 id="the-thesis">/u.exec(
      html,
    )?.[1];
    const openingCopy =
      /<div class="opening-copy">([\s\S]*?)<\/div><div class="ascii-flair tree-flair ascii-hero"/u.exec(
        opening ?? "",
      )?.[1];
    const host =
      /<div class="ascii-flair tree-flair ascii-hero" aria-hidden="true" data-tree-mode="hero" data-tree-state="fallback">([\s\S]*?)<\/div>/u.exec(
        opening ?? "",
      )?.[1];
    const fallback =
      /<pre class="ascii-fallback tree-fallback" aria-hidden="true">([\s\S]*?)<\/pre>/u.exec(
        host ?? "",
      )?.[1];
    const art = (fallback ?? "").replace(/<[^>]+>/gu, "");
    const rows = art.split("\n");
    expect(openingCopy).toMatch(
      /^<h1 id="top">Attune<\/h1><ul>[\s\S]*<\/ul>$/u,
    );
    expect(openingCopy?.match(/<li>/gu)).toHaveLength(3);
    expect(
      [...(openingCopy ?? "").matchAll(/<strong>([^<]+)<\/strong>/gu)].map(
        (match) => match[1],
      ),
    ).toEqual([
      "Follow every branch.",
      "Keep the work rooted.",
      "Propagate what survives.",
    ]);
    expect(html).toContain('</div><h2 id="the-thesis">The thesis</h2>');
    expect(html).toContain(
      '<h3 id="a-living-edge-a-durable-core">A living edge, a durable core</h3>',
    );
    expect(opening?.indexOf("opening-copy")).toBeLessThan(
      opening?.indexOf("tree-flair") ?? -1,
    );
    expect(html.match(/class="ascii-flair /gu)).toHaveLength(4);
    expect(html.match(/class="ascii-fallback /gu)).toHaveLength(4);
    expect(html.match(/class="ascii-canvas /gu)).toHaveLength(4);
    expect(host).toContain(
      '<canvas class="ascii-canvas tree-canvas" aria-hidden="true"></canvas>',
    );
    expect(host).not.toMatch(/tabindex|<a\b|<button\b|<h[1-6]\b/iu);
    expect(rows).toHaveLength(56);
    expect(
      rows.every((row) => row.length === 144 && /^[\x20-\x7e]+$/u.test(row)),
    ).toBe(true);
    expect(createHash("sha256").update(art).digest("hex")).toBe(
      "79d425e9ca4b0d2c05c7c7bcc00ab74ab2832bcdaf87307a2a2a75bf4fa70ef3",
    );
    expect(fallback).toMatch(/class="tree-wood tree-wood-[0-3]"/u);
    expect(fallback).toContain('class="tree-root tree-wood"');
    expect(
      fallback?.match(/class="tree-leaf tree-leaf-[0-3]"/gu),
    ).not.toHaveLength(0);
    expect(
      fallback?.match(
        /<span class="tree-accent tree-leaf tree-leaf-[0-3]">\*<\/span>/gu,
      ),
    ).toHaveLength(7);
    const botanicalHosts = [
      ...html.matchAll(
        /<span class="ascii-flair botanical-flair ascii-(branches|roots|cuttings)" aria-hidden="true" data-tree-mode="\1" data-tree-state="fallback"><span class="ascii-fallback botanical-fallback" aria-hidden="true">([\s\S]*?)<\/span><canvas class="ascii-canvas botanical-canvas" aria-hidden="true"><\/canvas><\/span>/gu,
      ),
    ];
    expect(botanicalHosts.map((match) => match[1])).toEqual([
      "branches",
      "roots",
      "cuttings",
    ]);
    for (const [index, [mode, label]] of [
      ["branches", "Branches"],
      ["roots", "Roots"],
      ["cuttings", "Cuttings"],
    ].entries()) {
      const renderedHost = botanicalHosts[index]?.[0];
      expect(renderedHost).toBeDefined();
      expect(html).toContain(
        `<h3 id="${mode}">${label}</h3><p class="model-prose botanical-anchor botanical-${mode}">${renderedHost}`,
      );
    }
    expect(html).not.toMatch(
      /botanical-(?:field|item|label|prose)|<li[^>]*class="[^"]*botanical/iu,
    );
    const masks = botanicalHosts.map((match) =>
      match[2]!.replace(/<[^>]+>/gu, ""),
    );
    expect(
      masks.map((mask) => {
        const lines = mask.split("\n");
        return [
          lines[0]?.length,
          lines.length,
          createHash("sha256").update(mask).digest("hex"),
        ];
      }),
    ).toEqual([
      [
        31,
        11,
        "f09cc8081ad491d08e5e2eff164df3613b16e584dd36390c1a433269c4a5c923",
      ],
      [
        41,
        15,
        "c7a5415cdf7b1090b117ceb851dbfe337f45eaf5dccce800c943864222060813",
      ],
      [
        30,
        11,
        "1912ad1523b38707262c302dff3af77706dd0ea6b997854277e1d25457b82818",
      ],
    ]);
    expect(html.match(/data-language="text"/gu)).toHaveLength(2);
    expect(html.match(/<script\b/gu)).toHaveLength(1);
    expect(html).toContain('<script src="tree.js" defer></script>');
    expect(html).not.toMatch(
      /<script[^>]+\b(?:type|async|integrity|crossorigin)=|<script[^>]*>[^<]+/iu,
    );

    const local = hrefs
      .filter((href) => href.startsWith("#"))
      .map((href) => href.slice(1));
    expect(local.every((target) => ids.includes(target))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      hrefs
        .filter((href) => href.includes("/blob/"))
        .every((href) => href.includes(`/blob/${revision}/`)),
    ).toBe(true);
  });

  test("projects only the twelve conceptual contents links", async () => {
    const { html } = await compileDocumentation(fixture(), options);
    const contents = /<nav class="contents"[^>]*>([\s\S]*?)<\/nav>/u.exec(
      html,
    )?.[1];
    expect(contents).toBeDefined();
    const links = [...(contents ?? "").matchAll(/\shref="([^"]+)"/gu)].map(
      (match) => match[1],
    );
    expect(links).toEqual([
      "#top",
      "#the-thesis",
      "#the-model",
      "#activegraph",
      "#the-artifacts",
      "#the-tools",
      "#the-packet",
      "#Investigation",
      "#Attune",
      "#AttuneReceipt",
      "#failures",
      "#AttuneToolkit",
      "#repository",
    ]);
    expect(contents).not.toContain("Attune.execute");
    expect(contents).not.toContain("AttuneToolFailure");
    expect(contents).not.toMatch(
      /href="#(?:a-living-edge-a-durable-core|branches|roots|cuttings)"/u,
    );
  });

  test("is byte deterministic", async () => {
    const first = await compileDocumentation(fixture(), options);
    const second = await compileDocumentation(fixture(), options);
    expect(second.html).toBe(first.html);
    expect(first.file.messages).toHaveLength(0);
  });

  test("keeps opening wording source-owned inside the checked list shape", async () => {
    const revised = fixture();
    const opening = revised.children[1];
    const first = opening?.type === "list" ? opening.children[0] : undefined;
    const content = first?.children[0];
    const explanation =
      content?.type === "paragraph" ? content.children[1] : undefined;
    if (explanation?.type !== "text")
      throw new Error("Fixture opening drifted");
    explanation.value =
      " ActiveGraph keeps the changing research path without making that sentence a compiler constant.";
    const { html } = await compileDocumentation(revised, options);
    expect(html).toContain("without making that sentence a compiler constant");
    expect(html).toContain(
      '<div class="opening-copy"><h1 id="top">Attune</h1><ul>',
    );
  });

  test("rejects malformed source-authored openings", async () => {
    const cases: readonly [string, (tree: Root) => void][] = [
      [
        "paragraph instead of list",
        (tree) => {
          tree.children[1] = paragraph({
            type: "text",
            value: "A paragraph cannot replace the three-value opening.",
          });
        },
      ],
      [
        "ordered list",
        (tree) => {
          const opening = tree.children[1];
          if (opening?.type === "list") opening.ordered = true;
        },
      ],
      [
        "wrong item count",
        (tree) => {
          const opening = tree.children[1];
          if (opening?.type === "list") opening.children.pop();
        },
      ],
      [
        "missing strong lead",
        (tree) => {
          const opening = tree.children[1];
          const content =
            opening?.type === "list"
              ? opening.children[0]?.children[0]
              : undefined;
          if (content?.type === "paragraph")
            content.children[0] = { type: "text", value: "No lead." };
        },
      ],
      [
        "empty explanation",
        (tree) => {
          const opening = tree.children[1];
          const content =
            opening?.type === "list"
              ? opening.children[0]?.children[0]
              : undefined;
          if (content?.type === "paragraph")
            content.children.splice(1, Infinity, {
              type: "text",
              value: " ",
            });
        },
      ],
      [
        "extra pre-thesis node",
        (tree) => {
          tree.children.splice(
            2,
            0,
            paragraph({ type: "text", value: "Unexpected opening copy." }),
          );
        },
      ],
    ];

    for (const [, mutate] of cases) {
      const invalid = fixture();
      mutate(invalid);
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /opening/i,
      );
    }
  });

  test("rejects malformed thesis arguments", async () => {
    const findHeading = (tree: Root, id: string) =>
      tree.children.findIndex(
        (node) => node.type === "heading" && node.data?.attune?.id === id,
      );
    const cases: readonly ((tree: Root) => void)[] = [
      (tree) => {
        tree.children.splice(
          findHeading(tree, "a-living-edge-a-durable-core"),
          1,
        );
      },
      (tree) => {
        const thesis = findHeading(tree, "the-thesis");
        const model = findHeading(tree, "the-model");
        const quote = tree.children.findIndex(
          (node, index) =>
            index > thesis && index < model && node.type === "blockquote",
        );
        tree.children.splice(quote, 1);
      },
      (tree) => {
        tree.children[findHeading(tree, "the-thesis") + 2] = hero();
      },
    ];
    for (const mutate of cases) {
      const invalid = fixture();
      mutate(invalid);
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /thesis|curriculum|living-edge/i,
      );
    }
  });

  test("rejects malformed botanical prose anchors", async () => {
    const findHeading = (tree: Root, id: string) =>
      tree.children.findIndex(
        (node) => node.type === "heading" && node.data?.attune?.id === id,
      );
    const paragraphAfter = (tree: Root, id: string) => {
      const index = findHeading(tree, id);
      const node = tree.children[index + 1];
      return node?.type === "paragraph" ? node : undefined;
    };
    const cases: readonly ((tree: Root) => void)[] = [
      (tree) => {
        tree.children.splice(findHeading(tree, "branches"), 1);
      },
      (tree) => {
        const roots = findHeading(tree, "roots");
        const cuttings = findHeading(tree, "cuttings");
        [tree.children[roots], tree.children[cuttings]] = [
          tree.children[cuttings]!,
          tree.children[roots]!,
        ];
      },
      (tree) => {
        const cutting = tree.children[findHeading(tree, "cuttings")];
        if (cutting?.type === "heading" && cutting.children[0]?.type === "text")
          cutting.children[0].value = "Reusable research";
      },
      (tree) => {
        const roots = tree.children[findHeading(tree, "roots")];
        if (roots?.type === "heading") roots.depth = 2;
      },
      (tree) => {
        const roots = paragraphAfter(tree, "roots");
        if (roots !== undefined)
          roots.children = [
            {
              type: "text",
              value: "Too short.",
            },
          ];
      },
    ];
    for (const mutate of cases) {
      const invalid = fixture();
      mutate(invalid);
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /model|botanical|branch|root|cut|propagat/i,
      );
    }
  });

  test("rejects an incomplete ActiveGraph research-pack boundary", async () => {
    const cases = [
      "Claim",
      "record_interpretation",
      "make_interpretation_tool",
      "Result.retained_ledger_refs",
      "FreeFormReference",
      "fifth ActiveGraph object",
      "MCP operation",
      "universal intermediate representation",
    ] as const;
    for (const phrase of cases) {
      const invalid = fixture();
      let replaced = false;
      for (const node of invalid.children) {
        if (node.type !== "paragraph") continue;
        for (const child of node.children) {
          if (
            (child.type === "text" ||
              child.type === "inlineCode" ||
              child.type === "link") &&
            child.type !== "link" &&
            child.value.includes(phrase)
          ) {
            child.value = child.value.replace(phrase, "missing");
            replaced = true;
          } else if (
            child.type === "link" &&
            child.children.some(
              (label) =>
                (label.type === "text" || label.type === "inlineCode") &&
                label.value === phrase,
            )
          ) {
            child.children = [{ type: "text", value: "caller reference" }];
            replaced = true;
          }
        }
      }
      expect(replaced, `fixture should contain ${phrase}`).toBe(true);
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /ActiveGraph|four-object|FreeFormReference/i,
      );
    }
    for (const mutate of [
      (tree: Root) => {
        const declaration = tree.children.find(
          (node): node is Code =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration !== undefined)
          declaration.value = declaration.value.replace(
            "def make_research_pack",
            "def make_example",
          );
      },
      (tree: Root) => {
        const declaration = tree.children.findIndex(
          (node) =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration >= 0) tree.children.splice(declaration, 1);
      },
      (tree: Root) => {
        const declaration = tree.children.find(
          (node): node is Code =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration !== undefined)
          declaration.value = declaration.value.replace(
            "input_model=InterpretationLedger",
            "input_model=object",
          );
      },
      (tree: Root) => {
        const declaration = tree.children.find(
          (node): node is Code =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration !== undefined)
          declaration.value = declaration.value.replace(
            "output_model=LedgerReference",
            "output_model=object",
          );
      },
      (tree: Root) => {
        const declaration = tree.children.find(
          (node): node is Code =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration !== undefined)
          declaration.value = declaration.value.replace(
            "deterministic=True",
            "deterministic=False",
          );
      },
      (tree: Root) => {
        const declaration = tree.children.find(
          (node): node is Code =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration !== undefined)
          declaration.value = declaration.value.replace(
            "ledger.case_id != case_id",
            "ledger.case_id == case_id",
          );
      },
      (tree: Root) => {
        const declaration = tree.children.find(
          (node): node is Code =>
            node.type === "code" &&
            node.data?.attune?.role === "activegraph-declaration",
        );
        if (declaration !== undefined)
          declaration.value = declaration.value.replace(
            "return LedgerReference(ref=ledger_reference(ledger))",
            'return LedgerReference(ref="illustrative")',
          );
      },
    ]) {
      const invalid = fixture();
      mutate(invalid);
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /ActiveGraph|make_research_pack|declaration/i,
      );
    }
  });

  test("rejects incomplete, private, or stale artifact chapters", async () => {
    const artifactCode = (tree: Root) =>
      tree.children.find(
        (node): node is Code =>
          node.type === "code" && node.data?.attune?.role === "artifact-layout",
      );
    for (const mutate of [
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code !== undefined)
          code.value = code.value.replace("├── repo/", "    ├── repo/");
      },
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code !== undefined)
          code.value = code.value.replace("query.cpgql", "query.txt");
      },
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code !== undefined)
          code.value = code.value.replace(
            "rules/<rule>.yml",
            "scratch/<rule>.yml",
          );
      },
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code !== undefined)
          code.value = code.value.replace(
            "payment-retry.property.ts",
            "research/payment-retry/property.ts",
          );
      },
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code !== undefined)
          code.value = code.value.replace(
            "├── result.json\n    │   └── receipt.json",
            "├── receipt.json\n    │   └── result.json",
          );
      },
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code !== undefined)
          code.value += "\n    └── bindings/private-capsule";
      },
      (tree: Root) => {
        const code = artifactCode(tree);
        if (code?.data?.attune !== undefined)
          delete (code.data.attune as { role?: string }).role;
      },
    ]) {
      const invalid = fixture();
      mutate(invalid);
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /artifacts|filesystem|mounted|native evidence/i,
      );
    }

    const stale = fixture();
    stale.children.push(
      heading(2, "A complete investigation", "complete-investigation"),
    );
    await expect(compileDocumentation(stale, options)).rejects.toThrow(
      /removed #complete-investigation|curriculum/i,
    );
  });

  test("rejects invented tool continuations and missing native evidence files", async () => {
    for (const value of [
      "joern.summary is retained in result.json.",
      "attune:maude:maude-payment-retry-01",
      "PAYMENT_MODEL_LEDGER_REF",
      "ToolCall",
      '"query_ref": "invented"',
      '"output_ref": "invented"',
      '"findings_ref": "invented"',
      '"source_run_ids": ["<exact ActiveGraph run id>"]',
      "workspace_write",
      "The agent writes the YAML through ordinary access to the mounted worktree.",
    ]) {
      const invalid = fixture();
      const tools = invalid.children.findIndex(
        (node) =>
          node.type === "heading" && node.data?.attune?.id === "the-tools",
      );
      invalid.children.splice(tools + 1, 0, paragraph({ type: "text", value }));
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /tools and Packet|artifact-file|illustrative ActiveGraph/i,
      );
    }

    const missing = JSON.parse(
      JSON.stringify(fixture()).replaceAll(
        "run-details.json",
        "run-metadata.json",
      ),
    ) as Root;
    await expect(compileDocumentation(missing, options)).rejects.toThrow(
      /tools and Packet|artifact-file/i,
    );
  });

  test("rejects Packet examples that diverge from the closed Python contract", async () => {
    const mutatePacket = (replace: (value: string) => string) => {
      const invalid = fixture();
      const packet = invalid.children.find(
        (node): node is Code =>
          node.type === "code" &&
          node.lang === "json" &&
          node.value.includes('"motif_id": "retryable-payment-idempotency"'),
      );
      if (packet === undefined) throw new Error("Missing Packet fixture");
      packet.value = replace(packet.value);
      return invalid;
    };
    for (const invalid of [
      mutatePacket((value) =>
        value.replace(
          '"cpgql": "cpg.method.name(\\"fulfillOrder\\").call.name(\\"charge\\")"',
          '"query_ref": "attune://invented", "output_ref": "attune://invented"',
        ),
      ),
      mutatePacket((value) =>
        value.replace(
          '"proven_scope": "Warns on two-argument member charge calls; no fix.",',
          '"findings_ref": "attune://invented",',
        ),
      ),
      mutatePacket((value) =>
        value.replace(
          '"source_run_ids": ["activegraph-run-payment-retry-01"]',
          '"source_run_ids": ["<exact ActiveGraph run id>"]',
        ),
      ),
      mutatePacket((value) => value.replaceAll("{id}", "{investigationId}")),
      mutatePacket((value) =>
        value.replace(
          '"source_artifact_refs": [',
          '"unknown_packet_field": true,\\n  "source_artifact_refs": [',
        ),
      ),
    ])
      await expect(compileDocumentation(invalid, options)).rejects.toThrow(
        /tools and Packet|artifact-file/i,
      );
  });

  test("bundles one deterministic local tree runtime inside its hard boundary", async () => {
    const repository = Path.resolve(import.meta.dirname, "../../..");
    const [first, second, source] = await Promise.all([
      bundleTreeRuntime(repository),
      bundleTreeRuntime(repository),
      readFile(
        Path.join(repository, "packages/attune-docs/src/tree.ts"),
        "utf8",
      ),
    ]);
    expect(second).toBe(first);
    expect(Buffer.byteLength(first)).toBeLessThanOrEqual(84 * 1024);
    expect(gzipSync(first, { level: 9 }).byteLength).toBeLessThanOrEqual(
      24 * 1024,
    );
    expect(source.trimEnd().split(/\r?\n/u).length).toBeLessThanOrEqual(560);
    expect(first).not.toMatch(
      /\bimport\s*\(|sourceMappingURL|https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket/iu,
    );
    expect(first).not.toMatch(/(?:^|[;{}])\s*(?:import|export)\s/iu);
  }, 30_000);

  test("promotes staged documentation transactionally and restores on failure", async () => {
    const parent = await mkdtemp(Path.join(tmpdir(), "attune-docs-publish-"));
    const destination = Path.join(parent, "dist");
    const staged = Path.join(parent, "staged");
    try {
      await Promise.all([mkdir(destination), mkdir(staged)]);
      await Promise.all([
        writeFile(Path.join(destination, "version"), "old"),
        writeFile(Path.join(staged, "version"), "new"),
      ]);
      await replaceDirectory(staged, destination);
      expect(await readFile(Path.join(destination, "version"), "utf8")).toBe(
        "new",
      );
      expect(await readdir(parent)).toEqual(["dist"]);

      await rename(destination, Path.join(parent, ".dist-backup"));
      await mkdir(staged);
      await writeFile(Path.join(staged, "version"), "broken");
      await expect(
        replaceDirectory(staged, destination, async (from, to) => {
          if (from === staged) throw new Error("injected promotion failure");
          await rename(from, to);
        }),
      ).rejects.toThrow("injected promotion failure");
      expect(await readFile(Path.join(destination, "version"), "utf8")).toBe(
        "new",
      );
      expect(await readdir(parent)).toEqual(["dist"]);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  test("pins the two official local font inputs inside their hard boundary", async () => {
    const staticRoot = Path.resolve(import.meta.dirname, "..", "static");
    const expected = [
      {
        name: "attune-serif.woff2",
        bytes: 429_100,
        sha256:
          "940a76eda1388de39d38c8e7a79bf6ea058a387faee0a9f33c8d25c6ba05e1be",
      },
      {
        name: "attune-mono.woff2",
        bytes: 90_124,
        sha256:
          "d95dc751b4d82141259f5c00c9838addaadd3b4eac30dd7db4a0da4921d77792",
      },
    ] as const;
    const fonts = await Promise.all(
      expected.map(async (font) => ({
        ...font,
        data: await readFile(Path.join(staticRoot, font.name)),
      })),
    );

    for (const font of fonts) {
      expect(font.data.subarray(0, 4).toString("ascii")).toBe("wOF2");
      expect(font.data.byteLength).toBe(font.bytes);
      expect(createHash("sha256").update(font.data).digest("hex")).toBe(
        font.sha256,
      );
    }
    expect(fonts.reduce((total, font) => total + font.data.byteLength, 0)).toBe(
      519_224,
    );
    expect(
      fonts.reduce((total, font) => total + font.data.byteLength, 0),
    ).toBeLessThanOrEqual(510 * 1024);
  });

  test("keeps the technical-book stylesheet inside its hard boundary", async () => {
    const styles = await readFile(
      Path.resolve(import.meta.dirname, "..", "static", "styles.css"),
      "utf8",
    );
    const rules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].map(
      ([, selectors, declarations]) => ({
        selectors: selectors!
          .split(",")
          .map((selector) => selector.trim())
          .filter(Boolean),
        declarations: declarations!,
      }),
    );
    const declares = (
      selector: string,
      property: string,
      value: string,
    ): boolean => {
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const declaration = new RegExp(
        `${property}:\\s*${escaped}(?:\\s*;|\\s*$)`,
        "u",
      );
      return rules.some(
        (rule) =>
          rule.selectors.includes(selector) &&
          declaration.test(rule.declarations),
      );
    };
    const fontFaces = [...styles.matchAll(/@font-face\s*\{([^}]*)\}/gu)].map(
      (match) => match[1]!,
    );

    expect(styles.split("\n").length - 1).toBeLessThanOrEqual(500);
    expect(fontFaces).toHaveLength(2);
    for (const [family, asset] of [
      ['"Attune Serif"', "attune-serif.woff2"],
      ['"Attune Mono"', "attune-mono.woff2"],
    ] as const) {
      const face = fontFaces.find((candidate) =>
        candidate.includes(`font-family: ${family}`),
      );
      expect(face).toBeDefined();
      expect(face).toMatch(
        new RegExp(`src:\\s*url\\("${asset}"\\)\\s*format\\("woff2"\\)`, "u"),
      );
      expect(face).toMatch(/font-style:\s*normal/u);
      expect(face).toMatch(/font-weight:\s*200 900/u);
      expect(face).toMatch(/font-stretch:\s*normal/u);
      expect(face).toMatch(/font-display:\s*swap/u);
    }
    expect(styles).toMatch(
      /--font-text:\s*"Attune Serif",\s*Charter,\s*"Bitstream Charter",\s*"Sitka Text",\s*Cambria,\s*serif/u,
    );
    expect(styles).toMatch(
      /--font-mono:\s*"Attune Mono",\s*"Source Code Pro",\s*ui-monospace,\s*"Cascadia Mono",\s*"SFMono-Regular",\s*Consolas,\s*monospace/u,
    );
    expect(declares(":root", "--paper", "#faf7f1")).toBe(true);
    expect(declares(":root", "--surface", "#fffaf4")).toBe(true);
    expect(declares(":root", "--line", "#ded3c7")).toBe(true);
    expect(declares(":root", "--line-strong", "#bdaf9f")).toBe(true);
    expect(declares(":root", "--code-paper", "#f5f0e8")).toBe(true);
    expect(declares("body", "font-family", "var(--font-text)")).toBe(true);
    expect(declares("body", "font-size", "1.0625rem")).toBe(true);
    expect(declares("body", "line-height", "1.58")).toBe(true);
    expect(declares("body", "font-optical-sizing", "auto")).toBe(true);
    expect(declares("body", "font-kerning", "normal")).toBe(true);
    expect(
      declares(
        "body",
        "font-variant-numeric",
        "oldstyle-nums proportional-nums",
      ),
    ).toBe(true);
    expect(declares(".opening-copy > ul", "max-width", "46ch")).toBe(true);
    expect(
      declares(".opening-copy > ul", "padding-inline-start", "1.15em"),
    ).toBe(true);
    expect(declares(".opening-copy > ul", "font-size", "1rem")).toBe(true);
    expect(declares(".opening-copy > ul", "line-height", "1.5")).toBe(true);
    expect(
      declares(".opening-copy > ul > li::marker", "color", "var(--accent)"),
    ).toBe(true);
    const openingRule = rules.find((rule) =>
      rule.selectors.includes(".opening-copy > ul"),
    );
    expect(openingRule?.declarations).not.toMatch(
      /\b(?:background|border|box-shadow|filter):/u,
    );
    expect(declares("h1", "font-size", "clamp(3.8rem, 6vw, 4.75rem)")).toBe(
      true,
    );
    expect(declares("h1", "font-weight", "600")).toBe(true);
    expect(declares("h1", "line-height", "0.96")).toBe(true);
    expect(declares("h1", "letter-spacing", "-0.035em")).toBe(true);
    expect(declares("h2", "font-size", "clamp(1.95rem, 3vw, 2.35rem)")).toBe(
      true,
    );
    expect(declares("h2", "font-weight", "600")).toBe(true);
    expect(declares("h2", "line-height", "1.08")).toBe(true);
    expect(declares("h2", "letter-spacing", "-0.018em")).toBe(true);
    for (const selector of [
      ".contents .wordmark",
      ".source-link",
      ".site-footer",
      "code",
      "pre",
      ".ascii-flair",
    ]) {
      expect(declares(selector, "font-family", "var(--font-mono)")).toBe(true);
    }
    for (const selector of [
      "h3[data-attune-symbol]",
      "h4[data-attune-symbol]",
    ]) {
      expect(declares(selector, "font-family", "var(--font-text)")).toBe(true);
    }
    expect(
      rules.some(
        (rule) =>
          rule.selectors.includes("h2[data-attune-symbol]") &&
          /font-family:\s*var\(--font-mono\)/u.test(rule.declarations),
      ),
    ).toBe(false);
    expect(declares("h3[data-attune-symbol]", "font-size", "1.25rem")).toBe(
      true,
    );
    expect(declares("h3[data-attune-symbol]", "font-weight", "600")).toBe(true);
    expect(declares("h3[data-attune-symbol]", "line-height", "1.25")).toBe(
      true,
    );
    expect(
      declares("h3[data-attune-symbol]", "letter-spacing", "-0.01em"),
    ).toBe(true);
    expect(declares("h4[data-attune-symbol]", "font-size", "1.125rem")).toBe(
      true,
    );
    expect(declares("h4[data-attune-symbol]", "line-height", "1.3")).toBe(true);
    expect(
      declares("h4[data-attune-symbol]", "letter-spacing", "-0.005em"),
    ).toBe(true);
    expect(
      declares("[data-attune-symbol]:target", "color", "var(--accent)"),
    ).toBe(true);
    expect(declares(".contents", "font-family", "var(--font-text)")).toBe(true);
    expect(declares(".contents", "font-size", "0.82rem")).toBe(true);
    expect(declares(".contents", "line-height", "1")).toBe(true);
    expect(declares(".contents", "text-transform", "none")).toBe(true);
    expect(declares(".contents .wordmark", "font-size", "0.78rem")).toBe(true);
    expect(declares(".contents .wordmark", "font-weight", "600")).toBe(true);
    expect(declares(".contents .wordmark", "letter-spacing", "0.025em")).toBe(
      true,
    );
    expect(declares("code", "font-variant-ligatures", "none")).toBe(true);
    expect(declares("pre", "font-variant-ligatures", "none")).toBe(true);
    expect(
      declares("code", "font-variant-numeric", "lining-nums tabular-nums"),
    ).toBe(true);
    expect(
      declares("pre", "font-variant-numeric", "lining-nums tabular-nums"),
    ).toBe(true);
    expect(
      declares("table", "font-variant-numeric", "lining-nums tabular-nums"),
    ).toBe(true);
    expect(
      declares(
        ".site-footer",
        "font-variant-numeric",
        "lining-nums tabular-nums",
      ),
    ).toBe(true);
    expect(styles).toMatch(/pre\.attune-code[\s\S]*overflow-x:\s*auto/u);
    expect(declares("pre.attune-code", "font-size", "0.875rem")).toBe(true);
    expect(declares("pre.attune-code", "line-height", "1.52")).toBe(true);
    expect(declares(".guide p a", "color", "inherit")).toBe(true);
    expect(declares(".guide li a", "color", "inherit")).toBe(true);
    expect(styles).toMatch(
      /\.guide p a,\s*\.guide li a\s*\{[^}]*text-decoration-color:\s*color-mix\(in srgb, var\(--accent\) 55%, transparent\)/u,
    );
    expect(declares(".guide p a:hover", "color", "var(--accent)")).toBe(true);
    expect(declares(".guide li a:hover", "color", "var(--accent)")).toBe(true);
    expect(declares(":not(pre) > code", "padding", "0 0.08em")).toBe(true);
    expect(declares(":not(pre) > code", "color", "var(--accent)")).toBe(true);
    expect(declares(":not(pre) > code", "background", "transparent")).toBe(
      true,
    );
    expect(styles).toMatch(
      /:not\(pre\) > code\s*\{[^}]*border-bottom:\s*1px solid var\(--line\)/u,
    );
    expect(declares(".definition-link", "text-decoration-style", "solid")).toBe(
      true,
    );
    expect(
      declares(".definition-link", "text-decoration-thickness", "0.06em"),
    ).toBe(true);
    expect(styles).not.toMatch(
      /\.definition-link(?:\s*|:hover\s*)\{[^}]*(?:text-decoration-style:\s*dotted|background:)/u,
    );
    expect(styles).toContain("[data-attune-symbol]:target");
    expect(styles).toContain("ui-monospace");
    expect(styles).not.toMatch(/\.botanical-(?:field|item|label|prose)\b/u);
    expect(styles).toMatch(
      /@media \(min-width: 48rem\)[\s\S]*\.opening \{[\s\S]*display:\s*grid/iu,
    );
    expect(styles).toMatch(
      /\.tree-flair\s*\{[^}]*width:\s*min\(100%, calc\(52svh \* 1\.775\)\);[^}]*aspect-ratio:\s*1\.775/iu,
    );
    expect(styles).toContain("container-type: inline-size");
    expect(styles).toContain("font-size: calc(100cqi / 99.4)");
    expect(styles).toMatch(
      /\.ascii-flair\s*\{[^}]*overflow:\s*hidden;[^}]*pointer-events:\s*none;[^}]*user-select:\s*none/iu,
    );
    expect(styles).toMatch(
      /\.ascii-fallback,\s*\.ascii-canvas\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%/iu,
    );
    expect(styles).toMatch(
      /\.tree-fallback,\s*\.tree-canvas\s*\{[^}]*left:\s*9\.677%;[^}]*width:\s*80\.646%;[^}]*transform:\s*scaleX\(1\.24\);[^}]*transform-origin:\s*50% 0/iu,
    );
    const flairStyles = rules
      .filter((rule) =>
        rule.selectors.some((selector) =>
          /(?:ascii|tree|botanical)-(?:flair|fallback|canvas|leaf|wood|root|accent)/u.test(
            selector,
          ),
        ),
      )
      .map((rule) => rule.declarations)
      .join("\n");
    expect(flairStyles).not.toMatch(
      /\b(?:background|border|border-radius|outline|box-shadow|text-shadow|filter|backdrop-filter|mix-blend-mode|padding)\s*:/iu,
    );
    expect(styles).not.toMatch(/gradient\(|\.card\b|@keyframes|animation:/iu);
    expect(declares(".botanical-flair", "float", "inline-end")).toBe(true);
    expect(declares(".botanical-flair", "width", "min(22.5%, 20rem)")).toBe(
      true,
    );
    expect(declares(".botanical-flair", "display", "block")).toBe(true);
    expect(declares(".botanical-flair", "width", "min(82%, 24rem)")).toBe(true);
    expect(declares(".thesis-prose", "width", "100%")).toBe(true);
    expect(declares(".thesis-prose", "max-width", "none")).toBe(true);
    expect(declares("blockquote.thesis-prose", "margin-inline", "0")).toBe(
      true,
    );
    for (const selector of [
      "#roots",
      "#cuttings",
      "#activegraph",
      "#the-artifacts",
      "#the-tools",
      "#the-packet",
    ])
      expect(declares(selector, "clear", "both")).toBe(true);
    expect(
      declares(
        'pre[data-code-role="artifact-layout"]',
        "box-sizing",
        "border-box",
      ),
    ).toBe(true);
    expect(
      declares('pre[data-code-role="artifact-layout"]', "width", "100%"),
    ).toBe(true);
    expect(
      declares('pre[data-code-role="artifact-layout"]', "max-width", "100%"),
    ).toBe(true);
    expect(
      declares(
        'pre[data-code-role="artifact-layout"]',
        "background",
        "var(--code-paper) !important",
      ),
    ).toBe(true);
    expect(styles).toMatch(
      /@media \(min-width:\s*48rem\)[\s\S]*?\.botanical-flair\s*\{[^}]*float:\s*inline-end;[^}]*width:\s*min\(22\.5%, 20rem\)/iu,
    );
    expect(styles).not.toMatch(
      /\.botanical-flair\s*\{[^}]*position:\s*sticky/iu,
    );
    expect(flairStyles).toContain("rgb(25 51 18 / 55%)");
    expect(flairStyles).toContain("rgb(25 123 18 / 55%)");
    expect(flairStyles).toContain("rgb(105 109 18 / 66%)");
    expect(flairStyles).toContain("rgb(127 123 18 / 72%)");
  });

  test("fails closed on unresolved and unsafe links", async () => {
    const unresolved = fixture();
    unresolved.children.push(
      paragraph(reference("missing", "#MissingDeclaration")),
    );
    await expect(compileDocumentation(unresolved, options)).rejects.toThrow(
      /no (?:canonical heading|target)/u,
    );

    const unsafe = fixture();
    unsafe.children.push(paragraph(reference("unsafe", "javascript:alert(1)")));
    await expect(compileDocumentation(unsafe, options)).rejects.toThrow(
      /Unsafe link/u,
    );

    const escaped = fixture();
    const declaration = escaped.children.find(
      (node) =>
        node.type === "heading" && node.data?.attune?.id === "Investigation",
    );
    if (declaration?.data?.attune !== undefined)
      (
        declaration.data.attune as unknown as Record<string, unknown>
      ).sourcePath = "../escape.ts";
    await expect(compileDocumentation(escaped, options)).rejects.toThrow(
      /normalized immutable source/u,
    );
  });

  test("rejects source-authored runtime markup and assets", async () => {
    const raw = fixture();
    raw.children.push({
      type: "html",
      value:
        '<script src="extra.js"></script><canvas onclick="evil()"></canvas>',
    });
    await expect(compileDocumentation(raw, options)).rejects.toThrow(
      /Source-authored HTML is forbidden/u,
    );

    const image = fixture();
    image.children.push({
      type: "image",
      url: "https://example.com/tree.png",
      alt: "tree",
    });
    await expect(compileDocumentation(image, options)).rejects.toThrow(
      /Source-authored runtime assets are forbidden/u,
    );

    const override = fixture();
    const authored = paragraph({ type: "text", value: "attempted override" });
    authored.data = {
      hName: "canvas",
      hProperties: { onClick: "evil()", tabIndex: 0 },
    } as Data;
    override.children.push(authored);
    await expect(compileDocumentation(override, options)).rejects.toThrow(
      /Source-authored HTML overrides are forbidden/u,
    );
  });

  test("checks generated documentation and production roots excluded from authoring lint", async () => {
    const repository = Path.resolve(import.meta.dirname, "../../..");
    const generatedPackage = await mkdtemp(
      Path.join(repository, "packages/docs-generated-test-"),
    );
    const generatedRoot = Path.join(generatedPackage, "src/generated");
    await mkdir(generatedRoot, { recursive: true });
    await Promise.all([
      writeFile(
        Path.join(generatedPackage, "package.json"),
        '{"name":"docs-generated-test"}\n',
      ),
      writeFile(
        Path.join(generatedPackage, "tsconfig.build.json"),
        '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","target":"ESNext","strict":true},"include":["src/**/*.ts"]}\n',
      ),
      writeFile(
        Path.join(generatedRoot, "broken.ts"),
        `export const missingOwner = 1
/** @remarks This declaration deliberately has no summary. */
export const missingSummary = 2
/** Preserve the supplied value. */
export function missingTags<T>(input: T): T { return input }
`,
      ),
    ]);
    try {
      await expect(read(repository, revision)).rejects.toThrow(
        /missingOwner needs exactly one generated documentation owner[\s\S]*missingSummary needs a generated summary[\s\S]*missingTags @param order must be input[\s\S]*missingTags @typeParam order must be T[\s\S]*missingTags needs generated @returns/u,
      );
    } finally {
      await rm(generatedPackage, { recursive: true, force: true });
    }

    const outside = await mkdtemp(Path.join(tmpdir(), "attune-docs-outside-"));
    const outsidePackage = await mkdtemp(
      Path.join(repository, "packages/docs-root-test-"),
    );
    const outsideSource = Path.join(outside, "outside.ts");
    await Promise.all([
      writeFile(outsideSource, "export const escaped = true\n"),
      writeFile(
        Path.join(outsidePackage, "package.json"),
        '{"name":"docs-root-test"}\n',
      ),
      writeFile(
        Path.join(outsidePackage, "tsconfig.build.json"),
        JSON.stringify({ compilerOptions: {}, files: [outsideSource] }),
      ),
    ]);
    try {
      await expect(read(repository, revision)).rejects.toThrow(
        /is outside repository/u,
      );
    } finally {
      await Promise.all([
        rm(outsidePackage, { recursive: true, force: true }),
        rm(outside, { recursive: true, force: true }),
      ]);
    }
  });
});
