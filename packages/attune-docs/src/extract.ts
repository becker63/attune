import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Node,
  Project,
  type JSDoc,
  type JSDocTag,
  type Node as MorphNode,
  type SourceFile,
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
  type ApiExample,
  type ApiManifest,
  type ApiMember,
  type ApiProvenance,
  type ApiSymbol,
  type ApiSymbolKind,
  type DocumentationPolicy,
  type DocumentationText,
  type LifecycleRelation,
  type LifecycleRelationKind,
  type PageExample,
  type SourceSpan,
  type TypeParameterDoc,
} from "./model.ts";
import { paths } from "./paths.ts";

const RELATIONS: Readonly<Record<string, LifecycleRelationKind | undefined>> = {
  produces: "produces",
  requires: "requires",
  throws: "throws",
  transitionsTo: "transitionsTo",
};

const git = (arguments_: readonly string[], fallback = ""): string => {
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

const packageRelative = (path: string): string =>
  Path.relative(paths.repository, path).replaceAll(Path.sep, "/");

const slug = (name: string): string =>
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

const repositoryUrl = (
  base: string,
  ref: string,
  path: string,
  line: number,
  endLine: number,
): string =>
  `${base}/blob/${ref}/${path}#L${line}${endLine === line ? "" : `-L${endLine}`}`;

const spanRange = (
  file: SourceFile,
  start: number,
  end: number,
  base: string,
  ref: string,
): SourceSpan => {
  const startPosition = file.getLineAndColumnAtPos(start);
  const endPosition = file.getLineAndColumnAtPos(end);
  const path = packageRelative(file.getFilePath());
  return {
    path,
    start,
    end,
    line: startPosition.line,
    column: startPosition.column,
    endLine: endPosition.line,
    endColumn: endPosition.column,
    digest: digest(file.getFullText().slice(start, end)),
    url: repositoryUrl(base, ref, path, startPosition.line, endPosition.line),
  };
};

const span = (node: MorphNode, base: string, ref: string): SourceSpan =>
  spanRange(node.getSourceFile(), node.getStart(), node.getEnd(), base, ref);

const fileSpan = (file: SourceFile, base: string, ref: string): SourceSpan => {
  const text = file.getFullText();
  const path = packageRelative(file.getFilePath());
  const end = file.getLineAndColumnAtPos(text.length);
  return {
    path,
    start: 0,
    end: text.length,
    line: 1,
    column: 1,
    endLine: end.line,
    endColumn: end.column,
    digest: digest(text),
    url: repositoryUrl(base, ref, path, 1, end.line),
  };
};

const jsDocsFor = (node: MorphNode): readonly JSDoc[] => {
  if (Node.isVariableDeclaration(node)) {
    return node.getVariableStatement()?.getJsDocs() ?? [];
  }
  const documented = node as MorphNode & {
    readonly getJsDocs?: () => readonly JSDoc[];
  };
  return documented.getJsDocs?.() ?? [];
};

const tagComment = (tag: JSDocTag): string => {
  const candidate = tag as JSDocTag & {
    readonly getCommentText?: () => string | undefined;
    readonly getComment?: () => string | readonly MorphNode[] | undefined;
  };
  const value = candidate.getCommentText?.() ?? candidate.getComment?.();
  if (typeof value === "string") return value.trim();
  return Array.isArray(value)
    ? value
        .map((part) => part?.getText() ?? "")
        .join("")
        .trim()
    : "";
};

interface ParsedDocs {
  readonly text: DocumentationText;
  readonly docs: readonly JSDoc[];
  readonly tags: readonly JSDocTag[];
}

const parsedDocs = (docs: readonly JSDoc[]): ParsedDocs => {
  const tags = docs.flatMap((doc) => doc.getTags());
  const tagged = (names: readonly string[]): readonly string[] =>
    tags
      .filter((tag) => names.includes(tag.getTagName()))
      .map(tagComment)
      .filter(Boolean);
  const parameters = tags
    .filter((tag) => tag.getTagName() === "param")
    .map((tag) => {
      const named = tag as JSDocTag & { readonly getName?: () => string };
      const name = named.getName?.() ?? tagComment(tag).split(/\s+/u)[0] ?? "";
      const description = tagComment(tag)
        .replace(new RegExp(`^${name}\\s*-?\\s*`, "u"), "")
        .replace(/^-\s*/u, "")
        .trim();
      return { name, description };
    })
    .filter((parameter) => parameter.name !== "");
  return {
    text: {
      summary:
        docs
          .map((doc) => doc.getDescription().trim())
          .find((description) => description !== "") ?? "",
      remarks: tagged(["remarks"]).join("\n\n"),
      parameters,
      returns: tagged(["return", "returns"]).join("\n\n"),
      failures: tagged(["throws"]),
    },
    docs,
    tags,
  };
};

const docsFor = (nodes: readonly MorphNode[]): ParsedDocs =>
  parsedDocs(nodes.flatMap(jsDocsFor));

const typeParameters = (
  nodes: readonly MorphNode[],
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
  return nodes
    .flatMap((node) => {
      const typed = node as MorphNode & {
        readonly getTypeParameters?: () => readonly TypeParameterDeclaration[];
      };
      return typed.getTypeParameters?.() ?? [];
    })
    .map((parameter) => ({
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

const signature = (node: MorphNode, name?: string): string => {
  if (Node.isVariableDeclaration(node)) {
    const type =
      node.getTypeNode()?.getText() ??
      node
        .getType()
        .getText(
          node,
          ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
            ts.TypeFormatFlags.NoTruncation,
        );
    return `export const ${name ?? node.getName()}: ${type};`;
  }
  if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
    const body = node.getBody();
    const text = node.getText();
    return body === undefined
      ? text
      : `${text.slice(0, body.getStart() - node.getStart()).trimEnd()};`;
  }
  return node.getText().trim();
};

const implementation = (node: MorphNode): MorphNode => {
  if (Node.isVariableDeclaration(node)) return node.getInitializer() ?? node;
  if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
    return node.getBody() ?? node;
  }
  return node;
};

const provenance = (
  nodes: readonly MorphNode[],
  docs: readonly JSDoc[],
  base: string,
  ref: string,
): ApiProvenance => {
  const declaration =
    nodes.find(
      (node) =>
        Node.isInterfaceDeclaration(node) ||
        Node.isTypeAliasDeclaration(node) ||
        Node.isClassDeclaration(node),
    ) ?? nodes[0]!;
  const implemented =
    nodes.find(
      (node) =>
        (Node.isVariableDeclaration(node) &&
          node.getInitializer() !== undefined) ||
        ((Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) &&
          node.getBody() !== undefined),
    ) ?? declaration;
  return {
    ...(docs[0] === undefined ? {} : { tsdoc: span(docs[0], base, ref) }),
    declaration: span(declaration, base, ref),
    implementation: span(implementation(implemented), base, ref),
  };
};

const relationTarget = (comment: string): string =>
  (
    /^\{@link\s+([^|\s}]+)/u.exec(comment)?.[1] ??
    comment.split(/\r?\n|\||\s+-\s+|\s{2,}/u)[0]!
  ).trim();

const relations = (
  tags: readonly JSDocTag[],
  base: string,
  ref: string,
): readonly LifecycleRelation[] =>
  tags.flatMap((tag) => {
    const kind = RELATIONS[tag.getTagName()];
    const target = relationTarget(tagComment(tag));
    return kind === undefined || target === ""
      ? []
      : [{ kind, target, source: span(tag, base, ref) }];
  });

const examplePrograms = (
  docs: readonly JSDoc[],
  principal: string,
  id: string,
  base: string,
  ref: string,
): readonly ApiExample[] =>
  docs.flatMap((doc) => {
    const raw = doc.getText();
    const declaredExamples = [...raw.matchAll(/@example\b/gu)].length;
    const matches = [
      ...raw.matchAll(
        /@example(?:[ \t]+([^\r\n]*))?\r?\n[ \t]*\*[ \t]*```(?:ts|typescript)(?:[ \t]+[^\r\n]*)?\r?\n([\s\S]*?)\r?\n[ \t]*\*[ \t]*```/gu,
      ),
    ];
    if (matches.length !== declaredExamples) {
      throw new Error(`${id} has an @example without a TypeScript fence.`);
    }
    return matches.map((match, index) => {
      const code = (match[2] ?? "")
        .split(/\r?\n/u)
        .map((line) => line.replace(/^\s*\*\s?/u, ""))
        .join("\n")
        .replaceAll(String.raw`*\/`, "*/")
        .replace(/\s+$/u, "");
      if (code === "") throw new Error(`${id} has an empty @example fence.`);
      const files = [
        ...code.matchAll(/^\s*\/\/\s*@filename(?::|\s)\s*(\S+)\s*$/gmu),
      ].map((candidate) => candidate[1]!);
      return {
        id: `${id}/example/${index + 1}`,
        title: match[1]?.trim() ?? `Example ${index + 1}`,
        code,
        files: files.length === 0 ? ["index.ts"] : files,
        principal,
        source: spanRange(
          doc.getSourceFile(),
          doc.getStart() + match.index!,
          doc.getStart() + match.index! + match[0].length,
          base,
          ref,
        ),
      };
    });
  });

const containsIdentifier = (code: string, principal: string): boolean =>
  new RegExp(`\\b${principal.replaceAll("$", String.raw`\\$`)}\\b`, "u").test(
    code,
  );

const symbolExample = (
  symbolName: string,
  kind: ApiSymbolKind,
  packageName: string,
  examples: readonly ApiExample[],
  source: SourceSpan,
): PageExample => {
  const authored = examples.find((example) =>
    containsIdentifier(example.code, symbolName),
  );
  if (authored !== undefined) {
    return {
      code: authored.code,
      principal: symbolName,
      source: authored.source,
      sourceExampleId: authored.id,
    };
  }
  const code =
    kind === "interface" || kind === "type"
      ? `import type { ${symbolName} } from ${JSON.stringify(packageName)};\ntype Current = ${symbolName};`
      : `import { ${symbolName} } from ${JSON.stringify(packageName)};\nconst current = ${symbolName};`;
  return { code, principal: symbolName, source };
};

const memberExample = (
  owner: string,
  member: string,
  examples: readonly ApiExample[],
  source: SourceSpan,
  summary: string,
): PageExample => {
  const authored = examples.find((example) =>
    containsIdentifier(example.code, member),
  );
  return authored === undefined
    ? {
        code: `interface ${owner}Page {\n  /** ${summary.replaceAll("*/", "* /")} */\n  readonly ${member}: unknown;\n}\ndeclare const api: ${owner}Page;\napi.${member};`,
        principal: member,
        source,
      }
    : {
        code: authored.code,
        principal: member,
        source: authored.source,
        sourceExampleId: authored.id,
      };
};

const visibleMembers = (nodes: readonly MorphNode[]): readonly MorphNode[] =>
  nodes.flatMap((node) => {
    const membered = node as MorphNode & {
      readonly getMembers?: () => readonly MorphNode[];
    };
    return (membered.getMembers?.() ?? []).filter((member) => {
      const named = member as MorphNode & {
        readonly getName?: () => string;
        readonly hasModifier?: (kind: ts.SyntaxKind) => boolean;
      };
      const name = named.getName?.() ?? "";
      return (
        name !== "" &&
        !name.startsWith("#") &&
        !name.startsWith("[") &&
        named.hasModifier?.(ts.SyntaxKind.PrivateKeyword) !== true &&
        named.hasModifier?.(ts.SyntaxKind.ProtectedKeyword) !== true
      );
    });
  });

const members = (
  owner: string,
  ownerSlug: string,
  sourceNodes: readonly MorphNode[],
  declarationNodes: readonly MorphNode[],
  packageName: string,
  base: string,
  ref: string,
): readonly ApiMember[] => {
  const sourceByName = new Map<string, MorphNode[]>();
  for (const member of visibleMembers(sourceNodes)) {
    const name = (
      member as MorphNode & { readonly getName: () => string }
    ).getName();
    sourceByName.set(name, [...(sourceByName.get(name) ?? []), member]);
  }
  const declarationByName = new Map<string, MorphNode[]>();
  for (const member of visibleMembers(declarationNodes)) {
    const name = (
      member as MorphNode & { readonly getName: () => string }
    ).getName();
    declarationByName.set(name, [
      ...(declarationByName.get(name) ?? []),
      member,
    ]);
  }
  return [...sourceByName].map(([name, nodes]) => {
    const docs = docsFor(nodes);
    const memberId = `${packageName}#${owner}.${name}`;
    const source = span(nodes[0]!, base, ref);
    const examples = examplePrograms(docs.docs, name, memberId, base, ref);
    const declared = declarationByName.get(name) ?? nodes;
    const memberSignature = declared.map((node) => signature(node)).join("\n");
    return {
      id: memberId,
      name,
      slug: slug(name),
      anchor: `member-${slug(name)}`,
      kind: nodeKind(nodes[0]!),
      signature: memberSignature,
      documentation: docs.text,
      examples,
      relations: relations(docs.tags, base, ref),
      provenance: provenance(nodes, docs.docs, base, ref),
      pageExample: memberExample(
        owner,
        name,
        examples,
        source,
        docs.text.summary,
      ),
    };
  });
};

const sourceOrder = (
  entry: SourceFile,
  exported: ReadonlyMap<string, readonly MorphNode[]>,
): readonly string[] => {
  const names: string[] = [];
  for (const declaration of entry.getExportDeclarations()) {
    for (const specifier of declaration.getNamedExports()) {
      names.push(
        specifier.getAliasNode()?.getText() ??
          specifier.getNameNode().getText(),
      );
    }
  }
  return [...new Set([...names, ...exported.keys()])];
};

const sourceDigest = async (project: Project, root: string): Promise<string> =>
  digestValue(
    await Promise.all(
      project
        .getSourceFiles()
        .filter((file) => file.getFilePath().startsWith(root))
        .sort((left, right) =>
          left.getFilePath().localeCompare(right.getFilePath()),
        )
        .map(async (file) => ({
          path: packageRelative(file.getFilePath()),
          bytes: await readFile(file.getFilePath(), "utf8"),
        })),
    ),
  );

const validateProject = (tsConfigPath: string): void => {
  const compiler = Path.join(
    Path.dirname(fileURLToPath(import.meta.resolve("typescript/package.json"))),
    "bin",
    "tsc",
  );
  try {
    execFileSync(process.execPath, [compiler, "--noEmit", "-p", tsConfigPath], {
      cwd: paths.repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (cause) {
    const stderr =
      typeof cause === "object" &&
      cause !== null &&
      "stderr" in cause &&
      typeof cause.stderr === "string"
        ? cause.stderr
        : String(cause);
    throw new Error(
      `TypeScript ${TypeScript.version} rejected the documentation project:\n${stderr}`,
    );
  }
};

const buildDeclarations = (): void => {
  try {
    execFileSync("pnpm", ["--filter", "attune-mcp...", "build"], {
      cwd: paths.repository,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (cause) {
    const stderr =
      typeof cause === "object" &&
      cause !== null &&
      "stderr" in cause &&
      typeof cause.stderr === "string"
        ? cause.stderr
        : String(cause);
    throw new Error(
      `Failed to build current attune-mcp declarations:\n${stderr}`,
    );
  }
};

const assertSpans = async (manifest: ApiManifest): Promise<void> => {
  const spans = [
    manifest.package.provenance.tsdoc,
    manifest.package.provenance.declaration,
    manifest.package.provenance.implementation,
    manifest.package.pageExample.source,
    ...manifest.package.examples.map((example) => example.source),
    ...manifest.package.relations.map((relation) => relation.source),
    ...manifest.symbols.flatMap((symbol) => [
      symbol.provenance.tsdoc,
      symbol.provenance.declaration,
      symbol.provenance.implementation,
      symbol.pageExample.source,
      ...symbol.examples.map((example) => example.source),
      ...symbol.relations.map((relation) => relation.source),
      ...symbol.members.flatMap((member) => [
        member.provenance.tsdoc,
        member.provenance.declaration,
        member.provenance.implementation,
        member.pageExample.source,
        ...member.examples.map((example) => example.source),
        ...member.relations.map((relation) => relation.source),
      ]),
    ]),
  ].filter((value): value is SourceSpan => value !== undefined);
  for (const source of spans) {
    const path = Path.resolve(paths.repository, source.path);
    if (!path.startsWith(`${Path.resolve(paths.repository)}${Path.sep}`)) {
      throw new Error(`Source span escapes the repository: ${source.path}`);
    }
    await access(path);
    const bytes = await readFile(path, "utf8");
    if (
      source.end > bytes.length ||
      digest(bytes.slice(source.start, source.end)) !== source.digest
    ) {
      throw new Error(`Stale source span: ${source.path}:${source.line}`);
    }
  }
};

export interface ExtractManifestOptions {
  readonly buildUpstream?: boolean;
  readonly declarationEntryPoint?: string;
  readonly entryPoint?: string;
  readonly expectedDeclarationDigest?: string;
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
  const packageRoot = options.packageRoot ?? paths.mcp;
  const entryPoint =
    options.entryPoint ?? Path.join(packageRoot, "src", "index.ts");
  const declarationEntryPoint =
    options.declarationEntryPoint ??
    (options.entryPoint === undefined
      ? Path.join(packageRoot, "dist", "index.d.mts")
      : entryPoint);
  const tsConfigPath =
    options.tsConfigPath ?? Path.join(packageRoot, "tsconfig.json");
  const packageName = options.packageName ?? "attune-mcp";
  const remote = options.repositoryUrl ?? "https://github.com/becker63/attune";
  const sourceRef =
    options.sourceRef ??
    process.env.DOCS_SOURCE_REF ??
    git(["rev-parse", "HEAD"], "main");

  if (options.buildUpstream ?? options.entryPoint === undefined) {
    buildDeclarations();
  }
  validateProject(tsConfigPath);
  const project = new Project({
    tsConfigFilePath: tsConfigPath,
    skipAddingFilesFromTsConfig: false,
  });
  const entry = project.getSourceFile(entryPoint);
  if (entry === undefined)
    throw new Error(`API entry point not found: ${entryPoint}`);
  const contentDigest = await sourceDigest(project, packageRoot);
  const declarationBytes = await readFile(declarationEntryPoint, "utf8");
  const declarationDigest = digest(declarationBytes);
  if (
    options.expectedDeclarationDigest !== undefined &&
    options.expectedDeclarationDigest !== declarationDigest
  ) {
    throw new Error(
      `Stale declaration digest: expected ${options.expectedDeclarationDigest}, received ${declarationDigest}.`,
    );
  }
  const declarationProject = new Project({
    compilerOptions: { skipLibCheck: true },
    skipAddingFilesFromTsConfig: true,
  });
  const declarationEntry =
    declarationEntryPoint === entryPoint
      ? entry
      : declarationProject.addSourceFileAtPath(declarationEntryPoint);
  const exported = entry.getExportedDeclarations();
  const declared = declarationEntry.getExportedDeclarations();

  const symbols: ApiSymbol[] = [];
  for (const exportName of sourceOrder(entry, exported)) {
    const sourceNodes = (exported.get(exportName) ?? []).filter((node) =>
      node.getSourceFile().getFilePath().startsWith(packageRoot),
    );
    if (sourceNodes.length === 0) continue;
    const declarationNodes = declared.get(exportName) ?? sourceNodes;
    const docs = docsFor(sourceNodes);
    const id = `${packageName}#${exportName}`;
    const symbolSource = span(sourceNodes[0]!, remote, sourceRef);
    const examples = examplePrograms(
      docs.docs,
      exportName,
      id,
      remote,
      sourceRef,
    );
    symbols.push({
      id,
      exportName,
      slug: slug(exportName),
      kind: nodeKind(sourceNodes[0]!),
      declaration: declarationNodes
        .map((node) => signature(node, exportName))
        .join("\n\n"),
      signature: declarationNodes
        .map((node) => signature(node, exportName))
        .join("\n\n"),
      documentation: docs.text,
      typeParameters: typeParameters(sourceNodes, docs.tags),
      members: members(
        exportName,
        slug(exportName),
        sourceNodes,
        declarationNodes,
        packageName,
        remote,
        sourceRef,
      ),
      examples,
      relations: relations(docs.tags, remote, sourceRef),
      provenance: provenance(sourceNodes, docs.docs, remote, sourceRef),
      pageExample: symbolExample(
        exportName,
        nodeKind(sourceNodes[0]!),
        packageName,
        examples,
        symbolSource,
      ),
    });
  }
  const duplicates = symbols.filter(
    (symbol, index) =>
      symbols.findIndex((candidate) => candidate.slug === symbol.slug) !==
      index,
  );
  if (duplicates.length > 0) {
    throw new Error(
      `Public names collide as documentation slugs: ${duplicates.map((symbol) => symbol.exportName).join(", ")}`,
    );
  }

  const resolve = (relation: LifecycleRelation): LifecycleRelation => {
    const targetName = relationTarget(relation.target).replaceAll("`", "");
    const target = symbols.find(
      (symbol) => symbol.exportName === targetName || symbol.id === targetName,
    );
    return target === undefined
      ? relation
      : { ...relation, targetSymbolId: target.id };
  };
  const resolvedSymbols = symbols.map((symbol) => ({
    ...symbol,
    relations: symbol.relations.map(resolve),
    members: symbol.members.map((member) => ({
      ...member,
      relations: member.relations.map(resolve),
    })),
  }));
  const packageDoc = entry
    .getDescendantsOfKind(ts.SyntaxKind.JSDoc)
    .find((doc) =>
      doc.getTags().some((tag) => tag.getTagName() === "packageDocumentation"),
    );
  const packageDocs = parsedDocs(packageDoc === undefined ? [] : [packageDoc]);
  const packageExamples = examplePrograms(
    packageDocs.docs,
    resolvedSymbols[0]?.exportName ?? packageName,
    `package:${packageName}`,
    remote,
    sourceRef,
  );
  const packageSource =
    packageDoc === undefined
      ? fileSpan(entry, remote, sourceRef)
      : span(packageDoc, remote, sourceRef);
  const packagePage =
    packageExamples[0] === undefined
      ? symbolExample(
          resolvedSymbols[0]?.exportName ?? "unknown",
          resolvedSymbols[0]?.kind ?? "type",
          packageName,
          [],
          packageSource,
        )
      : {
          code: packageExamples[0].code,
          principal: packageExamples[0].principal,
          source: packageExamples[0].source,
          sourceExampleId: packageExamples[0].id,
        };
  const dirty =
    options.sourceRevision === undefined &&
    git(["status", "--porcelain", "--", packageRelative(packageRoot)]) !== "";
  const sourceRevision =
    options.sourceRevision ??
    (dirty
      ? `local:${sourceRef}:${contentDigest.slice(0, 12)}`
      : `git:${sourceRef}`);
  const packageProvenance: ApiProvenance = {
    ...(packageDoc === undefined
      ? {}
      : { tsdoc: span(packageDoc, remote, sourceRef) }),
    declaration: packageSource,
    implementation: packageSource,
  };
  const base: ApiManifest = {
    schemaVersion: API_MANIFEST_SCHEMA_VERSION,
    package: {
      name: packageName,
      entryPoint: packageRelative(entryPoint),
      documentation: packageDocs.text,
      examples: packageExamples,
      relations: relations(packageDocs.tags, remote, sourceRef).map(resolve),
      provenance: packageProvenance,
      pageExample: packagePage,
    },
    source: {
      revision: sourceRevision,
      ref: sourceRef,
      digest: contentDigest,
      repositoryUrl: remote,
    },
    declaration: {
      path: packageRelative(declarationEntryPoint),
      digest: declarationDigest,
      sourceDigest: contentDigest,
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
  const manifest = { ...base, diagnostics: auditManifest(base, policy) };
  await assertSpans(manifest);
  await assertApiManifestSchema(
    manifest,
    Path.join(paths.schema, "api-manifest.schema.json"),
  );
  return manifest;
};
