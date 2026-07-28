import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Node,
  Project,
  type JSDoc,
  type JSDocTag,
  type Node as MorphNode,
  type Type,
  type TypeParameterDeclaration,
  ts,
} from "ts-morph";
import * as TypeScript from "typescript";

import {
  assertApiManifestSchema,
  auditManifest,
  readDocumentationPolicy,
} from "./audit.ts";
import { digest, digestValue } from "./canonical.ts";
import {
  API_MANIFEST_SCHEMA_VERSION,
  type ApiFact,
  type ApiManifest,
  type ApiMember,
  type ApiSymbol,
  type ApiSymbolKind,
  type DocumentationPolicy,
  type LifecycleRelation,
  type LifecycleRelationKind,
  type SourceLocation,
  type TypeParameterDoc,
} from "./model.ts";
import { paths } from "./paths.ts";

const RELATION_TAGS: Readonly<
  Record<string, LifecycleRelationKind | undefined>
> = {
  produces: "produces",
  requires: "requires",
  throws: "throws",
  transitionsTo: "transitionsTo",
};

const getGitValue = (
  arguments_: readonly string[],
  fallback: string,
): string => {
  try {
    return execFileSync("git", arguments_, {
      cwd: paths.repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
};

const validateWithTypeScriptSeven = (tsConfigPath: string): void => {
  const packagePath = fileURLToPath(
    import.meta.resolve("typescript/package.json"),
  );
  const compiler = Path.join(Path.dirname(packagePath), "bin", "tsc");
  try {
    execFileSync(process.execPath, [compiler, "--noEmit", "-p", tsConfigPath], {
      cwd: paths.repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (cause) {
    const output =
      typeof cause === "object" &&
      cause !== null &&
      "stderr" in cause &&
      typeof cause.stderr === "string"
        ? cause.stderr
        : String(cause);
    throw new Error(
      `TypeScript ${TypeScript.version} rejected the documentation source project:\n${output}`,
    );
  }
};

const packageRelative = (absolutePath: string): string =>
  Path.relative(paths.repository, absolutePath).replaceAll(Path.sep, "/");

const symbolSlug = (name: string): string =>
  name
    .replace(/([a-z\d])([A-Z])/gu, "$1-$2")
    .replace(/[^a-zA-Z\d]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();

const nodeKind = (node: MorphNode): ApiSymbolKind => {
  if (Node.isClassDeclaration(node)) return "class";
  if (Node.isEnumDeclaration(node)) return "enum";
  if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
    return "function";
  }
  if (Node.isInterfaceDeclaration(node)) return "interface";
  if (Node.isModuleDeclaration(node)) return "namespace";
  if (Node.isTypeAliasDeclaration(node)) return "type";
  if (
    Node.isVariableDeclaration(node) ||
    Node.isPropertyDeclaration(node) ||
    Node.isPropertySignature(node)
  ) {
    return "variable";
  }
  return "unknown";
};

const jsDocsFor = (node: MorphNode): readonly JSDoc[] => {
  if (
    Node.isVariableDeclaration(node) &&
    node.getVariableStatement() !== undefined
  ) {
    return node.getVariableStatement()!.getJsDocs();
  }
  if ("getJsDocs" in node) {
    return (
      node as MorphNode & {
        readonly getJsDocs: () => readonly JSDoc[];
      }
    ).getJsDocs();
  }
  return [];
};

const tagComment = (tag: JSDocTag): string => {
  const candidate = tag as JSDocTag & {
    readonly getCommentText?: () => string | undefined;
    readonly getComment?: () => string | readonly MorphNode[] | undefined;
  };
  const text = candidate.getCommentText?.() ?? candidate.getComment?.();
  if (typeof text === "string") return text.trim();
  if (Array.isArray(text)) {
    return (text as readonly (MorphNode | undefined)[])
      .map((part) => part?.getText() ?? "")
      .join("")
      .trim();
  }
  return "";
};

const docsText = (
  declarations: readonly MorphNode[],
): {
  readonly summary: string;
  readonly remarks: string;
  readonly examples: readonly string[];
  readonly tags: readonly JSDocTag[];
} => {
  const docs = declarations.flatMap(jsDocsFor);
  const descriptions = docs
    .map((doc) => doc.getDescription().trim())
    .filter(Boolean);
  const tags = docs.flatMap((doc) => doc.getTags());
  const remarks = tags
    .filter((tag) => tag.getTagName() === "remarks")
    .map(tagComment)
    .filter(Boolean);
  const examples = tags
    .filter((tag) => tag.getTagName() === "example")
    .map(tagComment)
    .filter(Boolean);
  return {
    summary: descriptions[0] ?? "",
    remarks: remarks.join("\n\n"),
    examples,
    tags,
  };
};

const sourceLocation = (
  node: MorphNode,
  repositoryUrl: string,
  sourceRef: string,
): SourceLocation => {
  const path = packageRelative(node.getSourceFile().getFilePath());
  const line = node.getStartLineNumber();
  const endLine = node.getEndLineNumber();
  return {
    path,
    line,
    endLine,
    url: `${repositoryUrl}/blob/${sourceRef}/${path}#L${line}`,
  };
};

const declarationSignature = (node: MorphNode, exportName: string): string => {
  if (Node.isVariableDeclaration(node)) {
    const typeNode = node.getTypeNode();
    const typeText =
      typeNode?.getText() ??
      node
        .getType()
        .getText(
          node,
          ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
            ts.TypeFormatFlags.NoTruncation,
        );
    const declarationKind =
      node.getVariableStatement()?.getDeclarationKind() ?? "const";
    return `export ${declarationKind} ${exportName}: ${typeText};`;
  }
  if (Node.isFunctionDeclaration(node)) {
    const body = node.getBody();
    const text = node.getText();
    if (body === undefined) return text;
    return `${text.slice(0, body.getStart() - node.getStart()).trimEnd()};`;
  }
  if (Node.isClassDeclaration(node)) {
    const typeParameters = node
      .getTypeParameters()
      .map((parameter) => parameter.getText())
      .join(", ");
    const extended = node.getExtends();
    const heritage = [
      ...(extended === undefined ? [] : [`extends ${extended.getText()}`]),
      ...(node.getImplements().length > 0
        ? [
            `implements ${node
              .getImplements()
              .map((item) => item.getText())
              .join(", ")}`,
          ]
        : []),
    ].join(" ");
    return `export class ${exportName}${typeParameters.length > 0 ? `<${typeParameters}>` : ""}${heritage.length > 0 ? ` ${heritage}` : ""}`;
  }
  return node.getText().trim();
};

const sourceDeclaration = (node: MorphNode, exportName: string): string => {
  if (Node.isVariableDeclaration(node)) {
    return (
      node.getVariableStatement()?.getText().trim() ??
      declarationSignature(node, exportName)
    );
  }
  return declarationSignature(node, exportName);
};

const memberSignature = (node: MorphNode): string => {
  if (Node.isMethodDeclaration(node)) {
    const body = node.getBody();
    const text = node.getText();
    if (body === undefined) return text;
    return `${text.slice(0, body.getStart() - node.getStart()).trimEnd()};`;
  }
  return node.getText().trim();
};

const typeParameterDocs = (
  declarations: readonly MorphNode[],
  tags: readonly JSDocTag[],
): readonly TypeParameterDoc[] => {
  const descriptions = new Map<string, string>();
  for (const tag of tags.filter((candidate) =>
    ["template", "typeParam"].includes(candidate.getTagName()),
  )) {
    const [name, ...description] = tagComment(tag).split(/\s+/u);
    if (name !== undefined) {
      descriptions.set(name, description.join(" ").replace(/^-\s*/u, ""));
    }
  }
  const parameters = declarations.flatMap((declaration) => {
    if ("getTypeParameters" in declaration) {
      return (
        declaration as MorphNode & {
          readonly getTypeParameters: () => readonly TypeParameterDeclaration[];
        }
      ).getTypeParameters();
    }
    return [];
  });
  return parameters.map((parameter) => ({
    name: parameter.getName(),
    ...(parameter.getConstraint() === undefined
      ? {}
      : { constraint: parameter.getConstraint()!.getText() }),
    ...(parameter.getDefault() === undefined
      ? {}
      : { default: parameter.getDefault()!.getText() }),
    ...(descriptions.get(parameter.getName()) === undefined
      ? {}
      : { description: descriptions.get(parameter.getName())! }),
  }));
};

const relationTarget = (comment: string): string =>
  comment
    .replace(/^\{@link\s+/u, "")
    .replace(/\}$/u, "")
    .split(/\r?\n/u)[0]!
    .split("|")[0]!
    .trim()
    .split(/\s+-\s+|\s{2,}/u)[0]!
    .trim();

const extractRelations = (
  declarations: readonly MorphNode[],
  tags: readonly JSDocTag[],
): readonly LifecycleRelation[] => {
  const relations: LifecycleRelation[] = [];
  for (const tag of tags) {
    const kind = RELATION_TAGS[tag.getTagName()];
    const target = relationTarget(tagComment(tag));
    if (kind !== undefined && target.length > 0) {
      relations.push({ kind, target, source: "tsdoc" });
    }
  }

  const literalStrings = (type: Type): readonly string[] => {
    const candidates = type.isUnion() ? type.getUnionTypes() : [type];
    return [
      ...new Set(
        candidates.flatMap((candidate) => {
          const value = candidate.getLiteralValue();
          return typeof value === "string" ? [value] : [];
        }),
      ),
    ];
  };
  for (const declaration of declarations.filter(Node.isVariableDeclaration)) {
    if (declaration.getName() !== "ATTUNE_OPERATIONS") continue;
    for (const operation of declaration.getType().getProperties()) {
      const operationType = operation.getTypeAtLocation(declaration);
      const transition = operationType.getProperty("transition");
      if (transition === undefined) continue;
      for (const target of literalStrings(
        transition.getTypeAtLocation(declaration),
      )) {
        relations.push({ kind: "transitionsTo", target, source: "registry" });
      }
    }
  }

  return relations
    .filter(
      (relation, index, source) =>
        source.findIndex(
          (candidate) =>
            candidate.kind === relation.kind &&
            candidate.target === relation.target &&
            candidate.source === relation.source,
        ) === index,
    )
    .sort((left, right) =>
      `${left.kind}:${left.target}`.localeCompare(
        `${right.kind}:${right.target}`,
      ),
    );
};

const extractMembers = (
  declarations: readonly MorphNode[],
  repositoryUrl: string,
  sourceRef: string,
): readonly ApiMember[] => {
  const members: ApiMember[] = [];
  for (const declaration of declarations) {
    if (!("getMembers" in declaration)) continue;
    const candidates = (
      declaration as MorphNode & {
        readonly getMembers: () => readonly MorphNode[];
      }
    ).getMembers();
    for (const member of candidates) {
      const named = member as MorphNode & {
        readonly getName?: () => string;
      };
      const name = named.getName?.();
      if (name === undefined || name.length === 0) continue;
      const modifierAware = member as MorphNode & {
        readonly hasModifier?: (kind: ts.SyntaxKind) => boolean;
      };
      if (
        name.startsWith("#") ||
        modifierAware.hasModifier?.(ts.SyntaxKind.PrivateKeyword) === true ||
        modifierAware.hasModifier?.(ts.SyntaxKind.ProtectedKeyword) === true
      ) {
        continue;
      }
      members.push({
        name,
        kind: nodeKind(member),
        signature: memberSignature(member),
        summary: docsText([member]).summary,
        source: sourceLocation(member, repositoryUrl, sourceRef),
      });
    }
  }
  return members.sort((left, right) => left.name.localeCompare(right.name));
};

const buildFacts = (
  symbolId: string,
  declaration: string,
  signature: string,
  summary: string,
  remarks: string,
  members: readonly ApiMember[],
  relations: readonly LifecycleRelation[],
  source: SourceLocation,
): readonly ApiFact[] => {
  const facts: ApiFact[] = [
    {
      id: `${symbolId}/declaration`,
      kind: "declaration",
      digest: digest(declaration),
      value: declaration,
    },
    {
      id: `${symbolId}/signature`,
      kind: "signature",
      digest: digest(signature),
      value: signature,
    },
    {
      id: `${symbolId}/source`,
      kind: "source",
      // A deploy ref changes when the documentation commit is created. Keep
      // source evidence semantic so that an identical path/span is not made
      // stale merely because its clickable URL now targets the final SHA.
      digest: digestValue({
        path: source.path,
        line: source.line,
        endLine: source.endLine,
      }),
      value: `${source.path}:${source.line}`,
    },
  ];
  const documentation = [summary, remarks].filter(Boolean).join("\n\n");
  if (documentation.length > 0) {
    facts.push({
      id: `${symbolId}/documentation`,
      kind: "documentation",
      digest: digest(documentation),
      value: documentation,
    });
  }
  for (const member of members) {
    const { url: _, ...semanticSource } = member.source;
    facts.push({
      id: `${symbolId}/member/${symbolSlug(member.name)}`,
      kind: "member",
      digest: digestValue({ ...member, source: semanticSource }),
      value: member.signature,
    });
  }
  for (const relation of relations) {
    facts.push({
      id: `${symbolId}/relation/${relation.source}/${relation.kind}/${symbolSlug(relation.target)}`,
      kind: "relation",
      digest: digestValue(relation),
      value: `${relation.kind}:${relation.target}`,
    });
  }
  return facts.sort((left, right) => left.id.localeCompare(right.id));
};

const sourceDigest = async (
  project: Project,
  packageRoot: string,
): Promise<string> => {
  const source = await Promise.all(
    project
      .getSourceFiles()
      .filter((file) => file.getFilePath().startsWith(packageRoot))
      .sort((left, right) =>
        left.getFilePath().localeCompare(right.getFilePath()),
      )
      .map(async (file) => ({
        path: packageRelative(file.getFilePath()),
        bytes: await readFile(file.getFilePath(), "utf8"),
      })),
  );
  return digestValue(source);
};

export interface ExtractManifestOptions {
  readonly entryPoint?: string;
  readonly packageName?: string;
  readonly packageRoot?: string;
  readonly policy?: DocumentationPolicy;
  readonly repositoryUrl?: string;
  readonly sourceRef?: string;
  readonly sourceRevision?: string;
  readonly tsConfigPath?: string;
}

export const extractApiManifest = async (
  options: ExtractManifestOptions = {},
): Promise<ApiManifest> => {
  const tsConfigPath =
    options.tsConfigPath ?? Path.join(paths.mcp, "tsconfig.json");
  const packageRoot = options.packageRoot ?? paths.mcp;
  const entryPoint =
    options.entryPoint ?? Path.join(paths.mcp, "src", "index.ts");
  const packageName = options.packageName ?? "attune-mcp";
  const repositoryUrl =
    options.repositoryUrl ?? "https://github.com/becker63/attune";
  const sourceRef =
    options.sourceRef ??
    process.env.DOCS_SOURCE_REF ??
    getGitValue(["rev-parse", "HEAD"], "main");

  const project = new Project({
    tsConfigFilePath: tsConfigPath,
    skipAddingFilesFromTsConfig: false,
  });
  const entry = project.getSourceFile(entryPoint);
  if (entry === undefined) {
    throw new Error(`Supported API entry point not found: ${entryPoint}`);
  }
  validateWithTypeScriptSeven(tsConfigPath);
  const contentDigest = await sourceDigest(project, packageRoot);
  const sourceRevision =
    options.sourceRevision ??
    process.env.DOCS_SOURCE_REVISION ??
    `sha256:${contentDigest}`;

  const exported = entry.getExportedDeclarations();
  const symbols: ApiSymbol[] = [];
  for (const [exportName, sourceDeclarations] of [...exported.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const declarations = sourceDeclarations.filter((declaration) =>
      declaration.getSourceFile().getFilePath().startsWith(packageRoot),
    );
    if (declarations.length === 0) continue;
    const docs = docsText(declarations);
    const signature = declarations
      .map((declaration) => declarationSignature(declaration, exportName))
      .filter((value, index, source) => source.indexOf(value) === index)
      .join("\n\n");
    const declaration = declarations
      .map((declarationNode) => sourceDeclaration(declarationNode, exportName))
      .filter((value, index, source) => source.indexOf(value) === index)
      .join("\n\n");
    const source = sourceLocation(declarations[0]!, repositoryUrl, sourceRef);
    const members = extractMembers(declarations, repositoryUrl, sourceRef);
    const memberTags = declarations.flatMap((declaration) => {
      if (!("getMembers" in declaration)) return [];
      return (
        declaration as MorphNode & {
          readonly getMembers: () => readonly MorphNode[];
        }
      )
        .getMembers()
        .flatMap((member) => docsText([member]).tags);
    });
    const relations = extractRelations(declarations, [
      ...docs.tags,
      ...memberTags,
    ]);
    const id = `${packageName}#${exportName}`;
    symbols.push({
      id,
      exportName,
      slug: symbolSlug(exportName),
      kind: nodeKind(declarations[0]!),
      declaration,
      signature,
      summary: docs.summary,
      remarks: docs.remarks,
      examples: docs.examples,
      typeParameters: typeParameterDocs(declarations, docs.tags),
      members,
      relations,
      source,
      facts: buildFacts(
        id,
        declaration,
        signature,
        docs.summary,
        docs.remarks,
        members,
        relations,
        source,
      ),
    });
  }

  const symbolsByBaseSlug = new Map<string, ApiSymbol[]>();
  for (const symbol of symbols) {
    const group = symbolsByBaseSlug.get(symbol.slug) ?? [];
    group.push(symbol);
    symbolsByBaseSlug.set(symbol.slug, group);
  }
  const uniqueSymbols = symbols.map((symbol) => {
    const collisions = symbolsByBaseSlug.get(symbol.slug) ?? [];
    return collisions.length < 2
      ? symbol
      : { ...symbol, slug: `${symbol.slug}-${digest(symbol.id).slice(0, 8)}` };
  });
  if (
    new Set(uniqueSymbols.map((symbol) => symbol.slug)).size !== symbols.length
  ) {
    throw new Error("Stable symbol slug generation produced a collision.");
  }

  const resolvedSymbols = uniqueSymbols.map((symbol) => ({
    ...symbol,
    relations: symbol.relations.map((relation) => {
      const targetName = relationTarget(relation.target).replaceAll("`", "");
      const target = uniqueSymbols.find(
        (candidate) =>
          candidate.exportName === targetName || candidate.id === targetName,
      );
      return target === undefined
        ? relation
        : { ...relation, targetSymbolId: target.id };
    }),
  }));

  const manifestWithoutDiagnostics: ApiManifest = {
    schemaVersion: API_MANIFEST_SCHEMA_VERSION,
    package: {
      name: packageName,
      entryPoint: packageRelative(entryPoint),
    },
    source: {
      revision: sourceRevision,
      ref: sourceRef,
      digest: contentDigest,
      repositoryUrl,
    },
    generator: {
      name: "attune-docs",
      version: "0.0.0",
      typescriptVersion: TypeScript.version,
      tsMorphVersion: "28.0.0",
      tsMorphCompilerVersion: ts.version,
    },
    symbols: resolvedSymbols,
    diagnostics: [],
  };
  const policy =
    options.policy ?? (await readDocumentationPolicy(paths.policy));
  const manifest: ApiManifest = {
    ...manifestWithoutDiagnostics,
    diagnostics: auditManifest(manifestWithoutDiagnostics, policy),
  };
  await assertApiManifestSchema(
    manifest,
    Path.join(paths.schema, "api-manifest.schema.json"),
  );
  return manifest;
};
