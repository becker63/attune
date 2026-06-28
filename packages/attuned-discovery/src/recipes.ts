import { defineRecipe } from "@attune/framework-protocol";
import { Schema as S } from "effect";

export interface AttuneDiscoveryRecipeSchemas {
  readonly RepoSnapshot: S.Schema<unknown>;
  readonly DiscoveryRun: S.Schema<unknown>;
  readonly AnchorCard: S.Schema<unknown>;
  readonly MotifHypothesis: S.Schema<unknown>;
  readonly EvidencePacket: S.Schema<unknown>;
  readonly DecisionPacket: S.Schema<unknown>;
  readonly RuleCandidate: S.Schema<unknown>;
  readonly DeterministicRule: S.Schema<unknown>;
  readonly DiscoveryReportInput: S.Schema<unknown>;
  readonly WorkbenchSnapshot: S.Schema<unknown>;
}

export const createAttuneDiscoveryRecipes = (
  schemas: AttuneDiscoveryRecipeSchemas,
) => [
  defineRecipe({
    id: "attuned-discovery.repo-snapshot",
    projectId: "attuned-discovery",
    title: "Capture repository snapshot",
    inputSchema: schemas.RepoSnapshot,
    outputSchema: schemas.RepoSnapshot,
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.anchor-retrieval",
    projectId: "attuned-discovery",
    title: "Retrieve semantic anchors",
    inputSchema: schemas.DiscoveryRun,
    outputSchema: S.Array(schemas.AnchorCard),
    dependencies: [{ recipeId: "attuned-discovery.repo-snapshot", reason: "anchors are scoped to a repo snapshot" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.hypothesis",
    projectId: "attuned-discovery",
    title: "Create motif hypothesis",
    inputSchema: S.Array(schemas.AnchorCard),
    outputSchema: schemas.MotifHypothesis,
    dependencies: [{ recipeId: "attuned-discovery.anchor-retrieval" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.joern-proof",
    projectId: "attuned-discovery",
    title: "Run bounded Joern proof",
    inputSchema: schemas.MotifHypothesis,
    outputSchema: schemas.EvidencePacket,
    dependencies: [{ recipeId: "attuned-discovery.hypothesis" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.evidence-scoring",
    projectId: "attuned-discovery",
    title: "Score proof evidence",
    inputSchema: S.Array(schemas.EvidencePacket),
    outputSchema: schemas.DecisionPacket,
    dependencies: [{ recipeId: "attuned-discovery.joern-proof" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.rule-candidate",
    projectId: "attuned-discovery",
    title: "Promote evidence into rule candidate",
    inputSchema: schemas.DecisionPacket,
    outputSchema: schemas.RuleCandidate,
    dependencies: [{ recipeId: "attuned-discovery.evidence-scoring" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.deterministic-rule",
    projectId: "attuned-discovery",
    title: "Generate deterministic rule artifact",
    inputSchema: schemas.RuleCandidate,
    outputSchema: schemas.DeterministicRule,
    dependencies: [{ recipeId: "attuned-discovery.rule-candidate" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
  defineRecipe({
    id: "attuned-discovery.report",
    projectId: "attuned-discovery",
    title: "Render discovery report and workbench snapshot",
    inputSchema: schemas.DiscoveryReportInput,
    outputSchema: schemas.WorkbenchSnapshot,
    dependencies: [{ recipeId: "attuned-discovery.deterministic-rule" }],
    nxTarget: "attuned-discovery:attune-check",
    sourcePath: "packages/attuned-discovery/src/recipes.ts",
    allowedFiles: ["packages/attuned-discovery/src/**"],
    validationEvidence: ["attuned-discovery:test"],
  }),
] as const;
