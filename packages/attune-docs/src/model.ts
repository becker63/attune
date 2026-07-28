export const API_MANIFEST_SCHEMA_VERSION = "3.0.0" as const;

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

/** Exact half-open source span plus an immutable line-oriented repository URL. */
export interface SourceSpan {
  readonly path: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly digest: string;
  readonly url: string;
}

export interface DocumentationText {
  readonly summary: string;
  readonly remarks: string;
  readonly parameters: readonly {
    readonly name: string;
    readonly description: string;
  }[];
  readonly returns: string;
  readonly failures: readonly string[];
}

export interface TypeParameterDoc {
  readonly name: string;
  readonly constraint?: string;
  readonly default?: string;
  readonly description?: string;
}

/** A complete source-authored TypeScript program extracted from `@example`. */
export interface ApiExample {
  readonly id: string;
  readonly title: string;
  readonly code: string;
  readonly files: readonly string[];
  readonly principal: string;
  readonly source: SourceSpan;
}

/** The checked block owned by one generated package, symbol, or member page. */
export interface PageExample {
  readonly code: string;
  readonly principal: string;
  readonly source: SourceSpan;
  readonly sourceExampleId?: string;
}

export interface LifecycleRelation {
  readonly kind: LifecycleRelationKind;
  readonly target: string;
  readonly targetSymbolId?: string;
  readonly source: SourceSpan;
}

export interface ApiProvenance {
  readonly tsdoc?: SourceSpan;
  readonly declaration: SourceSpan;
  readonly implementation: SourceSpan;
}

export interface ApiMember {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly anchor: string;
  readonly kind: ApiSymbolKind;
  readonly signature: string;
  readonly documentation: DocumentationText;
  readonly examples: readonly ApiExample[];
  readonly relations: readonly LifecycleRelation[];
  readonly provenance: ApiProvenance;
  readonly pageExample: PageExample;
}

export interface ApiSymbol {
  readonly id: string;
  readonly exportName: string;
  readonly slug: string;
  readonly kind: ApiSymbolKind;
  readonly declaration: string;
  readonly signature: string;
  readonly documentation: DocumentationText;
  readonly typeParameters: readonly TypeParameterDoc[];
  readonly members: readonly ApiMember[];
  readonly examples: readonly ApiExample[];
  readonly relations: readonly LifecycleRelation[];
  readonly provenance: ApiProvenance;
  readonly pageExample: PageExample;
}

export interface ApiPackage {
  readonly name: string;
  readonly entryPoint: string;
  readonly documentation: DocumentationText;
  readonly examples: readonly ApiExample[];
  readonly relations: readonly LifecycleRelation[];
  readonly provenance: ApiProvenance;
  readonly pageExample: PageExample;
}

export interface DocumentationDiagnostic {
  readonly code:
    | "invalid-relation"
    | "missing-documentation"
    | "missing-example"
    | "missing-provenance";
  readonly severity: "error" | "warning";
  readonly symbolId: string;
  readonly message: string;
}

export interface ApiManifest {
  readonly schemaVersion: typeof API_MANIFEST_SCHEMA_VERSION;
  readonly package: ApiPackage;
  readonly source: {
    readonly revision: string;
    readonly ref: string;
    readonly digest: string;
    readonly repositoryUrl: string;
  };
  readonly declaration: {
    readonly path: string;
    readonly digest: string;
    readonly sourceDigest: string;
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
  readonly publicNames?: readonly string[];
  readonly requiredDocumentation: readonly {
    readonly name: string;
    readonly exportNamePattern: string;
    readonly minMatches: number;
    readonly rationale: string;
  }[];
  readonly allowedRelationTargets: readonly string[];
}

export interface SiteBuildOptions {
  readonly basePath: string;
  readonly outputDirectory: string;
  readonly manifestPath?: string;
  readonly siteUrl?: string;
  readonly sourceCommit?: string;
}
