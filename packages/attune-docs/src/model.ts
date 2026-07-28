export const API_MANIFEST_SCHEMA_VERSION = "2.0.0" as const;
export const PROSE_DRAFT_SCHEMA_VERSION = "1.0.0" as const;

export type ApiSymbolKind =
  | "class"
  | "enum"
  | "function"
  | "interface"
  | "namespace"
  | "type"
  | "variable"
  | "unknown";

export type LifecycleRelationKind =
  | "requires"
  | "produces"
  | "transitionsTo"
  | "throws";

export interface SourceLocation {
  readonly path: string;
  readonly line: number;
  readonly endLine: number;
  readonly url: string;
}

export interface TypeParameterDoc {
  readonly name: string;
  readonly constraint?: string;
  readonly default?: string;
  readonly description?: string;
}

export interface ApiMember {
  readonly name: string;
  readonly kind: ApiSymbolKind;
  readonly signature: string;
  readonly summary: string;
  readonly source: SourceLocation;
}

export interface LifecycleRelation {
  readonly kind: LifecycleRelationKind;
  readonly target: string;
  readonly targetSymbolId?: string;
  readonly source: "tsdoc" | "registry";
}

export interface ApiFact {
  readonly id: string;
  readonly kind:
    | "declaration"
    | "documentation"
    | "member"
    | "relation"
    | "signature"
    | "source";
  readonly digest: string;
  readonly value: string;
}

export interface ApiSymbol {
  readonly id: string;
  readonly exportName: string;
  readonly slug: string;
  readonly kind: ApiSymbolKind;
  readonly declaration: string;
  readonly signature: string;
  readonly summary: string;
  readonly remarks: string;
  readonly examples: readonly string[];
  readonly typeParameters: readonly TypeParameterDoc[];
  readonly members: readonly ApiMember[];
  readonly relations: readonly LifecycleRelation[];
  readonly source: SourceLocation;
  readonly facts: readonly ApiFact[];
}

export interface DocumentationDiagnostic {
  readonly code:
    | "invalid-relation"
    | "missing-documentation"
    | "missing-relation";
  readonly severity: "error" | "warning";
  readonly symbolId: string;
  readonly message: string;
}

export interface ApiManifest {
  readonly schemaVersion: typeof API_MANIFEST_SCHEMA_VERSION;
  readonly package: {
    readonly name: string;
    readonly entryPoint: string;
  };
  readonly source: {
    readonly revision: string;
    readonly ref: string;
    readonly digest: string;
    readonly repositoryUrl: string;
  };
  readonly generator: {
    readonly name: "attune-docs";
    readonly version: string;
    readonly typescriptVersion: string;
    readonly tsMorphVersion: string;
    readonly tsMorphCompilerVersion: string;
  };
  readonly symbols: readonly ApiSymbol[];
  readonly diagnostics: readonly DocumentationDiagnostic[];
}

export interface DocumentationPolicy {
  readonly requiredDocumentation: readonly {
    readonly name: string;
    readonly exportNamePattern: string;
    readonly minMatches: number;
    readonly rationale: string;
  }[];
  readonly requiredRelations: readonly {
    readonly name: string;
    readonly exportNamePattern: string;
    readonly minMatches: number;
    readonly anyOf: readonly LifecycleRelationKind[];
    readonly rationale: string;
  }[];
  readonly allowedRelationTargets: readonly string[];
}

export interface EvidenceReference {
  readonly symbolId: string;
  readonly facts: readonly {
    readonly id: string;
    readonly digest: string;
  }[];
}

export interface ProseClaim {
  readonly id: string;
  readonly text: string;
  readonly certainty: "direct" | "inference";
  readonly trivial: boolean;
  readonly evidence: readonly EvidenceReference[];
  readonly unresolvedQuestionId?: string;
}

export interface ProseSection {
  readonly id: string;
  readonly heading: string;
  /** Approved research claims that may inform this section's prose. */
  readonly researchClaimIds: readonly string[];
  readonly claims: readonly ProseClaim[];
}

export interface ProseAgentOutput {
  readonly schemaVersion: typeof PROSE_DRAFT_SCHEMA_VERSION;
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly audience: string;
  readonly sourceRevision: string;
  readonly sourceDigest: string;
  readonly sections: readonly ProseSection[];
  readonly nextPages: readonly string[];
  readonly unresolvedQuestions: readonly {
    readonly id: string;
    readonly question: string;
    readonly status: "open" | "resolved";
    readonly resolution?: string;
  }[];
  readonly provenance: {
    readonly kind: "maintainer-authored" | "prose-agent";
    readonly runId?: string;
  };
}

export interface GuideReview {
  readonly status: "approved" | "proposed" | "rejected";
  readonly reviewer: string;
  readonly decisionId: string;
  readonly decidedAt: string;
  readonly sourceRevision: string;
  readonly manifestDigest: string;
  readonly draftDigest: string;
  readonly evidenceDigest: string;
}

/**
 * A publication-ready guide. The prose agent never authors this shape:
 * deterministic materialization joins a {@link ProseAgentOutput} to a
 * separately persisted {@link GuideApproval}.
 */
export interface ProseDraft extends ProseAgentOutput {
  readonly review: GuideReview;
}

export interface GuideTemplateEvidence {
  readonly symbol: string | readonly string[];
  readonly facts: readonly ("documentation" | "signature" | "source")[];
}

export interface GuideTemplateClaim {
  readonly id: string;
  readonly text: string;
  readonly certainty: "direct" | "inference";
  readonly trivial?: boolean;
  readonly evidence?: readonly GuideTemplateEvidence[];
  readonly unresolvedQuestionId?: string;
}

export interface GuideTemplate {
  readonly schemaVersion: typeof PROSE_DRAFT_SCHEMA_VERSION;
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly audience: string;
  readonly sections: readonly {
    readonly id: string;
    readonly heading: string;
    readonly researchClaimIds?: readonly string[];
    readonly claims: readonly GuideTemplateClaim[];
  }[];
  readonly nextPages: readonly string[];
  readonly unresolvedQuestions: ProseDraft["unresolvedQuestions"];
  readonly provenance: ProseDraft["provenance"];
}

export type GuideApproval = Omit<GuideReview, "status"> & {
  readonly schemaVersion: "1.0.0";
  readonly guideId: string;
  readonly status: "approved";
};

export interface ValidationIssue {
  readonly code:
    | "invalid-schema"
    | "missing-evidence"
    | "not-approved"
    | "open-question-asserted"
    | "stale-source"
    | "unknown-fact"
    | "unknown-next-page"
    | "unknown-symbol";
  readonly path: string;
  readonly message: string;
}

export interface GuideValidation {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface EvidenceManifest {
  readonly schemaVersion: "1.0.0";
  readonly guideId: string;
  readonly sourceRevision: string;
  readonly sourceDigest: string;
  readonly review: ProseDraft["review"];
  readonly provenance: ProseDraft["provenance"];
  readonly claims: readonly {
    readonly id: string;
    readonly certainty: ProseClaim["certainty"];
    readonly evidence: readonly EvidenceReference[];
  }[];
}

export interface GuideStaleness {
  readonly stale: boolean;
  readonly changedClaims: readonly {
    readonly claimId: string;
    readonly changedFactIds: readonly string[];
  }[];
}

export interface RepositoryArea {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly role: string;
  readonly details: string;
  readonly connectsTo: readonly string[];
  readonly sourceUrl: string;
}

export interface RepositoryMap {
  readonly revision: string;
  readonly areas: readonly RepositoryArea[];
}

export interface SiteBuildOptions {
  readonly basePath: string;
  readonly outputDirectory: string;
  readonly manifestPath?: string;
  readonly siteUrl?: string;
  readonly publicationRevision?: string;
}

export interface TraceExport {
  readonly schema_version: 1;
  readonly activegraph_run_id: string;
  readonly guide_id: string;
  readonly stale: boolean;
  readonly nodes: readonly {
    /** SHA-256 identity of its redacted projection and private record address. */
    readonly id: string;
    readonly type: string;
    /** Content address of the fully validated private ActiveGraph record. */
    readonly content_address: string;
    readonly data: Readonly<Record<string, unknown>>;
  }[];
  readonly edges: readonly {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly type: string;
    readonly provenance_kind:
      | "content"
      | "execution"
      | "review"
      | "presentation"
      | "invalidation";
  }[];
}

export interface TraceArtifact {
  readonly kind: "publication" | "representative";
  readonly trace: TraceExport;
  readonly sourcePath: string;
}
