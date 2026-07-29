import { createHash } from "node:crypto";
import { glob, readFile } from "node:fs/promises";
import * as Path from "node:path";

import * as TSDoc from "@microsoft/tsdoc";
import { TSDocConfigFile } from "@microsoft/tsdoc-config";
import type * as Mdast from "mdast";
import remarkParse from "remark-parse";
import { Node, Project, type Node as MorphNode, type SourceFile, ts } from "ts-morph";
import { unified } from "unified";
import { visit } from "unist-util-visit";

type SourceRange = Readonly<{ start: number; end: number; lineStart: number; lineEnd: number }>;
type DefinitionRange = Readonly<{ sourcePath: string; sourceRange: SourceRange }>;
type ResolvedRange = Readonly<{ start: number; end: number; href: string }>;
type Interval = readonly [visibleStart: number, visibleEnd: number, sourceStart: number, sourceEnd: number];
export type AttuneData = {
  readonly role?: "declaration" | "member" | "signature" | "example" | "reference";
  readonly id?: string;
  readonly ownerId?: string;
  readonly packageName?: string;
  readonly reference?: string;
  readonly referenceKind?: "link" | "failure" | "inherit";
  readonly explanation?: string;
  readonly callable?: true;
  readonly sourcePath?: string;
  readonly sourceRange?: SourceRange;
  readonly definitionRanges?: readonly DefinitionRange[];
  readonly sourceHref?: string;
  readonly signatureDigest?: string;
  readonly documentationDigest?: string;
  readonly links?: readonly ResolvedRange[];
  readonly checked?: true;
  readonly intervals?: readonly Interval[];
};
declare module "mdast" {
  interface Data {
    attune?: AttuneData;
  }
}

type ParsedDoc = { readonly comment: TSDoc.DocComment; readonly node: MorphNode };
type Decl = Readonly<{ name: string; symbol: string; packageName: string; facets: MorphNode[] }>;

const markdown = unified().use(remarkParse);
const failures = new Set(["InvestigationLifecycleError", "AttuneToolFailure"]);
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const rel = (root: string, path: string) => {
  const relative = Path.relative(root, Path.resolve(path));
  if (relative === "" || Path.isAbsolute(relative) || relative.split(Path.sep).includes(".."))
    throw new Error(`Production source ${path} is outside repository ${root}.`);
  return relative.replaceAll(Path.sep, "/");
};
const key = (node: MorphNode) => `${node.getSourceFile().getFilePath()}\0${node.getStart()}\0${node.getEnd()}`;
const span = (node: MorphNode, start = node.getStart(), end = node.getEnd()): SourceRange => ({
  start,
  end,
  lineStart: node.getSourceFile().getLineAndColumnAtPos(start).line,
  lineEnd: node.getSourceFile().getLineAndColumnAtPos(end).line,
});
const pathOf = (root: string, node: MorphNode) => rel(root, node.getSourceFile().getFilePath());
const origin = (root: string, node: MorphNode) => ({
  sourcePath: pathOf(root, node),
  sourceRange: span(node),
});
const definitionOrigin = (root: string, node: MorphNode) => {
  const name = (node as MorphNode & { getNameNode?: () => MorphNode | undefined }).getNameNode?.();
  return origin(root, name ?? node.getFirstChildByKind(ts.SyntaxKind.ConstructorKeyword) ?? node);
};
const sourceHref = (revision: string, path: string, node: MorphNode) => {
  const { lineStart, lineEnd } = span(node);
  const lines = lineStart === lineEnd ? lineStart : `${lineStart}-L${lineEnd}`;
  return `https://github.com/becker63/attune/blob/${revision}/${path}#L${lines}`;
};
const slug = (text: string) => text.replace(/\.[cm]?tsx?$/u, "").replace(/[^\p{L}\p{N}_.-]+/gu, "-");
const idFor = (root: string, declaration: Decl) =>
  slug(`${declaration.packageName}--${pathOf(root, declaration.facets[0]!)}--${declaration.symbol}`);
const text = (value: string): Mdast.Text => ({ type: "text", value });
const paragraph = (children: Mdast.PhrasingContent[]): Mdast.Paragraph => ({ type: "paragraph", children });
const link = (url: string, label: string): Mdast.Link => ({ type: "link", url, children: [text(label)] });

const projects = async (root: string) => {
  const configs: string[] = [];
  for await (const path of glob("packages/*/tsconfig.build.json", { cwd: root })) configs.push(path);
  const loaded = await Promise.all(
    configs.map(async (configPath) => {
      const config = Path.join(root, configPath);
      const packageRoot = Path.dirname(config);
      const manifest = JSON.parse(await readFile(Path.join(packageRoot, "package.json"), "utf8")) as {
        readonly name?: unknown;
      };
      if (typeof manifest.name !== "string") throw new Error(`Missing package name beside ${configPath}.`);
      const read = ts.readConfigFile(config, (path) => ts.sys.readFile(path));
      if (read.error !== undefined) throw new Error(`Cannot read ${configPath}.`);
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, packageRoot);
      if (parsed.errors.length > 0) throw new Error(`Cannot parse ${configPath}.`);
      const project = new Project({ tsConfigFilePath: config });
      const roots = parsed.fileNames
        .map((path) => {
          rel(root, path);
          return project.getSourceFileOrThrow(Path.resolve(path));
        })
        .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()));
      return { name: manifest.name, roots };
    }),
  );
  return loaded.sort((a, b) => a.name.localeCompare(b.name));
};

const makeParser = (root: string) => {
  const file = TSDocConfigFile.loadFile(Path.join(root, "tsdoc.json"));
  if (file.fileNotFound || file.hasErrors) throw new Error(file.getErrorSummary() || "tsdoc.json was not found.");
  const configuration = new TSDoc.TSDocConfiguration();
  file.configureParser(configuration);
  return new TSDoc.TSDocParser(configuration);
};
const docText = (node: TSDoc.DocNode, role?: "link" | "failure"): string => {
  if (node instanceof TSDoc.DocExcerpt) return node.content.toString();
  if (node instanceof TSDoc.DocLinkTag && role !== undefined) {
    const target = node.codeDestination?.emitAsTsdoc() ?? node.urlDestination;
    if (target === undefined) throw new Error("TSDoc link has no target.");
    const url = node.codeDestination === undefined ? target : `tsdoc:${role}:${encodeURIComponent(target)}`;
    const label = (node.linkText ?? target).replaceAll("\\", "\\\\").replaceAll("]", "\\]");
    return `[${label}](<${url}>)`;
  }
  return node
    .getChildNodes()
    .map((child) => docText(child, role))
    .join("");
};
const commonmark = (value: string) => {
  const lines = value.replace(/^\r?\n/u, "").split(/\r?\n/u);
  const indent = Math.min(...lines.filter((line) => line.trim() !== "").map((line) => /^\s*/u.exec(line)![0].length));
  return lines.map((line) => line.slice(Math.min(indent, line.length))).join("\n");
};
const section = (value: TSDoc.DocSection, role: "link" | "failure" = "link") => {
  const tree = markdown.parse(commonmark(docText(value, role))) as Mdast.Root;
  const explanation =
    role === "failure"
      ? commonmark(docText(value))
          .replace(/^[^}]*\}\s*-\s*/u, "")
          .trim()
      : undefined;
  visit(tree, (node) => {
    if (["html", "image", "definition", "thematicBreak"].includes(node.type))
      throw new Error(`Unsupported CommonMark node: ${node.type}`);
    delete node.position;
    if (node.type === "link" && explanation !== undefined) node.data = { attune: { explanation } };
  });
  return tree;
};
const parseDoc = (parser: TSDoc.TSDocParser, node: MorphNode): ParsedDoc => {
  const parsed = parser.parseString(node.getText());
  const errors = parsed.log.messages.map((message) => `${node.getSourceFile().getFilePath()}: ${message.text}`);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return { comment: parsed.docComment, node };
};
const docsFor = (parser: TSDoc.TSDocParser, node: MorphNode) => {
  const owner = Node.isVariableDeclaration(node) ? node.getVariableStatement() : node;
  const doc = (owner as MorphNode & { getJsDocs?: () => readonly MorphNode[] }).getJsDocs?.().at(-1);
  return doc === undefined ? undefined : parseDoc(parser, doc);
};
const annotate = (
  children: Mdast.RootContent[],
  docs: ParsedDoc,
  ownerId: string,
  packageName: string,
  repository: string,
) => {
  visit({ type: "root", children } satisfies Mdast.Root, "link", (link) => {
    if (!link.url.startsWith("tsdoc:")) return;
    const match = /^tsdoc:(link|failure|inherit):(.*)$/u.exec(link.url);
    if (match?.[1] === undefined || match[2] === undefined) throw new Error(`Malformed TSDoc reference ${link.url}.`);
    link.data = {
      attune: {
        ...link.data?.attune,
        role: "reference",
        ownerId,
        packageName,
        reference: decodeURIComponent(match[2]),
        referenceKind: match[1] as "link" | "failure" | "inherit",
        ...origin(repository, docs.node),
      },
    };
  });
  return children;
};

const nodeName = (node: MorphNode) => {
  if (Node.isConstructorDeclaration(node)) return "constructor";
  if (Node.isCallSignatureDeclaration(node)) return "call";
  if (Node.isConstructSignatureDeclaration(node)) return "construct";
  if (Node.isIndexSignatureDeclaration(node)) return "index";
  return Node.hasName(node) ? node.getName() : undefined;
};
const objectMembers = (node: MorphNode) => {
  if (!Node.isVariableDeclaration(node) || !node.getVariableStatement()?.isExported()) return [];
  const value = node.getInitializer();
  if (Node.isObjectLiteralExpression(value)) return [...value.getProperties()];
  if (!Node.isCallExpression(value) || value.getExpression().getText() !== "Object.assign") return [];
  return value
    .getArguments()
    .filter(Node.isObjectLiteralExpression)
    .flatMap((object) => object.getProperties());
};
const members = (node: MorphNode): MorphNode[] => {
  if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node) || Node.isEnumDeclaration(node))
    return [...node.getMembers()];
  if (Node.isTypeAliasDeclaration(node)) {
    const type = node.getTypeNode();
    return Node.isTypeLiteral(type) ? [...type.getMembers()] : [];
  }
  if (Node.isModuleDeclaration(node)) {
    const body = node.getBody();
    return Node.isModuleBlock(body) ? [...body.getStatements()] : body === undefined ? [] : [body];
  }
  return objectMembers(node);
};
const declarations = (nodes: readonly MorphNode[], packageName: string, parent = "", output: Decl[] = []) => {
  const grouped = new Map<string, MorphNode[]>();
  for (const value of nodes)
    for (const node of Node.isVariableStatement(value) ? value.getDeclarationList().getDeclarations() : [value]) {
      const name = nodeName(node);
      if (name !== undefined) grouped.set(name, [...(grouped.get(name) ?? []), node]);
    }
  const groups = [...grouped]
    .map(([name, facets]) => [name, facets.sort((a, b) => a.getStart() - b.getStart())] as const)
    .sort((a, b) => a[1][0]!.getStart() - b[1][0]!.getStart());
  for (const [name, facets] of groups) {
    const declaration = { name, symbol: parent === "" ? name : `${parent}.${name}`, packageName, facets };
    output.push(declaration);
    declarations(
      facets.flatMap((facet) => members(facet)),
      packageName,
      declaration.symbol,
      output,
    );
  }
  return output;
};
const body = (node: MorphNode) => (node as MorphNode & { getBody?: () => MorphNode | undefined }).getBody?.();
const signature = (declaration: Decl, id: string, path: string): Mdast.Code => {
  const contracts = declaration.facets.filter((facet) => body(facet) === undefined);
  const overloaded =
    contracts.length > 0 &&
    contracts.length < declaration.facets.length &&
    declaration.facets.every((facet) => Node.isFunctionLikeDeclaration(facet));
  const facets = overloaded ? contracts : declaration.facets;
  let value = "";
  const intervals: [number, number, number, number][] = [];
  for (const facet of facets) {
    if (value !== "") value += "\n\n";
    const source = facet.getSourceFile();
    const cuts = facet
      .getDescendantsOfKind(ts.SyntaxKind.JSDoc)
      .map((comment) => ({ start: comment.getStart(), end: comment.getEnd() }));
    for (const block of facet.getDescendantsOfKind(ts.SyntaxKind.Block))
      if (block.getEnd() - block.getStart() > 2) cuts.push({ start: block.getStart() + 1, end: block.getEnd() - 1 });
    for (const member of objectMembers(facet)) {
      const object = member.getParentIfKind(ts.SyntaxKind.ObjectLiteralExpression);
      if (object !== undefined) cuts.push({ start: object.getStart() + 1, end: object.getEnd() - 1 });
    }
    cuts.sort((a, b) => a.start - b.start);
    let cursor = facet.getStart();
    const keep = (end: number) => {
      if (end <= cursor) return;
      const visible = value.length;
      value += source.getFullText().slice(cursor, end);
      intervals.push([visible, value.length, cursor, end]);
    };
    for (const cut of cuts) {
      if (cut.end <= cursor || cut.start >= facet.getEnd()) continue;
      keep(Math.min(cut.start, facet.getEnd()));
      cursor = Math.max(cursor, Math.min(cut.end, facet.getEnd()));
    }
    keep(facet.getEnd());
  }
  const digest = hash(value);
  return {
    type: "code",
    lang: "ts",
    value,
    data: {
      attune: {
        role: "signature",
        ownerId: id,
        packageName: declaration.packageName,
        ...(isCallable(declaration) ? { callable: true } : {}),
        sourcePath: path,
        sourceRange: span(facets[0]!, facets[0]!.getStart(), facets.at(-1)!.getEnd()),
        signatureDigest: digest,
        intervals,
      },
    },
  };
};
const callableNode = (facet: MorphNode) => {
  const type = Node.isTyped(facet) ? facet.getTypeNode() : undefined;
  const value = (facet as MorphNode & { getInitializer?: () => MorphNode | undefined }).getInitializer?.();
  return [facet, value, type].find(
    (node): node is MorphNode =>
      node !== undefined && (Node.isFunctionLikeDeclaration(node) || Node.isFunctionTypeNode(node)),
  );
};
const isCallable = (declaration: Decl) => declaration.facets.some((facet) => callableNode(facet) !== undefined);
const narrative = (declaration: Decl, parser: TSDoc.TSDocParser) => {
  const documented = declaration.facets.flatMap((facet) => {
    const docs = docsFor(parser, facet);
    return docs === undefined ? [] : [{ owner: facet, docs }];
  });
  return (
    documented.find(({ docs }) => docs.comment.remarksBlock !== undefined) ??
    documented[0] ?? { owner: declaration.facets[0]!, docs: undefined }
  );
};
const generatedIssues = (declaration: Decl, parser: TSDoc.TSDocParser, repository: string) => {
  const path = pathOf(repository, declaration.facets[0]!);
  if (!path.includes("/generated/")) return [];
  const owned = declaration.facets.flatMap((facet) => {
    const docs = docsFor(parser, facet);
    return docs === undefined ? [] : [docs];
  });
  const prefix = `${path}#${declaration.symbol}`;
  if (owned.length !== 1) return [`${prefix} needs exactly one generated documentation owner.`];
  const comment = owned[0]!.comment;
  const issues: string[] = [];
  if (commonmark(docText(comment.summarySection)).trim() === "") issues.push(`${prefix} needs a generated summary.`);
  const call = declaration.facets.map(callableNode).find((node) => node !== undefined);
  if (call === undefined) return issues;
  const callable = call as MorphNode & {
    getParameters(): readonly { getName(): string }[];
    getTypeParameters(): readonly { getName(): string }[];
    getReturnTypeNode(): MorphNode | undefined;
  };
  const expectedParams = callable.getParameters().map((parameter) => parameter.getName());
  const expectedTypes = callable.getTypeParameters().map((parameter) => parameter.getName());
  const actualParams = comment.params.blocks.map((block) => block.parameterName);
  const actualTypes = comment.typeParams.blocks.map((block) => block.parameterName);
  if (expectedParams.join("\0") !== actualParams.join("\0"))
    issues.push(`${prefix} @param order must be ${expectedParams.join(", ") || "(empty)"}.`);
  if (expectedTypes.join("\0") !== actualTypes.join("\0"))
    issues.push(`${prefix} @typeParam order must be ${expectedTypes.join(", ") || "(empty)"}.`);
  const returned = callable.getReturnTypeNode();
  if (!Node.isConstructorDeclaration(call) && !Node.isSetAccessorDeclaration(call) && returned === undefined)
    issues.push(`${prefix} needs an explicit generated return annotation.`);
  else if (returned !== undefined && returned.getText() !== "void" && comment.returnsBlock === undefined)
    issues.push(`${prefix} needs generated @returns.`);
  return issues;
};

const bold = (value: string): Mdast.PhrasingContent => ({ type: "strong", children: [text(value)] });
const listItem = (label: Mdast.PhrasingContent[], content: Mdast.Root): Mdast.ListItem => {
  const first = content.children[0];
  if (first?.type !== "paragraph") throw new Error("A semantic TSDoc block must begin with prose.");
  first.children.unshift(...label, text(" — "));
  return { type: "listItem", children: content.children as Mdast.ListItem["children"] };
};
const example = (block: TSDoc.DocBlock, docs: ParsedDoc, repository: string) => {
  const title = commonmark(docText(block.content)).split("\n", 1)[0]!.trim();
  const tree = section(block.content);
  tree.children.shift();
  const codes: Mdast.Code[] = [];
  visit(tree, "code", (node) => codes.push(node));
  if (title === "" || codes.length !== 1) throw new Error("Each @example requires one title and fenced program.");
  codes[0]!.data = { attune: { role: "example", ...origin(repository, docs.node) } };
  return { title, children: tree.children };
};
const documentation = (
  docs: ParsedDoc | undefined,
  repository: string,
  packageName: string,
  id: string,
  chapter = false,
) => {
  if (docs === undefined) return [];
  const { comment } = docs;
  const output: Mdast.RootContent[] = [
    ...section(comment.summarySection).children,
    ...(comment.remarksBlock === undefined ? [] : section(comment.remarksBlock.content).children),
  ];
  if (!chapter) {
    const inherited = comment.inheritDocTag?.declarationReference?.emitAsTsdoc();
    if (inherited !== undefined)
      output.push(paragraph([link(`tsdoc:inherit:${encodeURIComponent(inherited)}`, inherited)]));
    const items: Mdast.ListItem[] = [];
    const add = (label: string, block: TSDoc.DocBlock, role: "link" | "failure" = "link", inline = false) => {
      const content = section(block.content, role);
      items.push(listItem([inline ? { type: "inlineCode", value: label } : bold(label)], content));
    };
    for (const block of comment.typeParams.blocks) add(block.parameterName, block);
    for (const block of comment.params.blocks) add(block.parameterName, block, "link", true);
    if (comment.returnsBlock !== undefined) add("Returns", comment.returnsBlock);
    for (const block of comment.customBlocks)
      if (block.blockTag.tagName === "@failure") add("Can fail with", block, "failure");
      else if (block.blockTag.tagName === "@throws") add("Throws", block);
    for (const block of comment.seeBlocks) add("See also", block);
    if (items.length > 0) output.push({ type: "list", ordered: false, children: items });
  }
  for (const block of comment.customBlocks.filter(({ blockTag }) => blockTag.tagName === "@example")) {
    const rendered = example(block, docs, repository);
    const anchor =
      rendered.title === "A complete investigation" ? "complete-investigation" : slug(rendered.title).toLowerCase();
    output.push(
      chapter ? heading(2, rendered.title, { id: anchor }) : paragraph([bold(`Example: ${rendered.title}`)]),
      ...rendered.children,
    );
  }
  return annotate(output, docs, id, packageName, repository);
};
const heading = (depth: Mdast.Heading["depth"], label: string, data: AttuneData): Mdast.Heading => ({
  type: "heading",
  depth,
  children: [text(label)],
  data: { attune: data },
});
const renderer =
  (repository: string, revision: string, parser: TSDoc.TSDocParser) =>
  (declaration: Decl, depth: Mdast.Heading["depth"], id: string, title: string) => {
    const { owner, docs } = narrative(declaration, parser);
    const path = pathOf(repository, owner);
    if (declaration.facets.some((facet) => pathOf(repository, facet) !== path))
      throw new Error(`${declaration.symbol} merges across source files.`);
    const code = signature(declaration, id, path);
    return [
      heading(depth, title, {
        role: declaration.symbol === declaration.name ? "declaration" : "member",
        id,
        packageName: declaration.packageName,
        sourcePath: path,
        sourceRange: span(owner),
        definitionRanges: declaration.facets.map((facet) => definitionOrigin(repository, facet)),
        sourceHref: sourceHref(revision, path, owner),
        signatureDigest: code.data!.attune!.signatureDigest!,
        documentationDigest: hash(docs?.node.getText() ?? ""),
      }),
      code,
      ...documentation(docs, repository, declaration.packageName, id),
    ];
  };
const packageDoc = (entry: SourceFile, parser: TSDoc.TSDocParser) => {
  const docs = entry
    .getDescendantsOfKind(ts.SyntaxKind.JSDoc)
    .filter((node) => node.getText().includes("@packageDocumentation"))
    .map((node) => parseDoc(parser, node))
    .filter(({ comment }) => comment.modifierTagSet.isPackageDocumentation());
  if (docs.length !== 1) throw new Error(`${entry.getFilePath()} must own one package comment.`);
  return docs[0]!;
};

export const read = async (repositoryRoot: string, revision: string): Promise<Mdast.Root> => {
  const repository = Path.resolve(repositoryRoot);
  const parser = makeParser(repository);
  const inputs = await projects(repository);
  const all = inputs.flatMap(({ name, roots }) => roots.flatMap((file) => declarations(file.getStatements(), name)));
  const generated = all.flatMap((declaration) => generatedIssues(declaration, parser, repository));
  if (generated.length > 0) throw new Error(generated.join("\n"));
  const byNode = new Map<string, Decl>();
  for (const declaration of all) for (const facet of declaration.facets) byNode.set(key(facet), declaration);
  const guide = inputs.find(({ name }) => name === "attune-mcp");
  const entry = guide?.roots.find((file) => file.getFullText().includes("@packageDocumentation"));
  if (guide === undefined || entry === undefined) throw new Error("The Attune package entry point is missing.");
  const packageDocs = packageDoc(entry, parser);
  const publicOrder = entry.getExportDeclarations().flatMap((exported) =>
    exported.getNamedExports().map((specifier) => {
      const name = specifier.getAliasNode()?.getText() ?? specifier.getNameNode().getText();
      const targets = specifier
        .getLocalTargetDeclarations()
        .map((target) => byNode.get(key(target)))
        .filter((target): target is Decl => target !== undefined);
      if (targets.length === 0 || targets.some((target) => target !== targets[0]))
        throw new Error(`${name} has no unique documentation owner.`);
      return { name, declaration: targets[0]! };
    }),
  );
  const children: Mdast.RootContent[] = [
    heading(1, "Attune", { id: "top" }),
    ...documentation(packageDocs, repository, guide.name, "top", true),
  ];
  const model = children.find((node) => node.type === "heading" && node.depth === 2);
  if (model?.type === "heading") model.data = { attune: { id: "the-model" } };
  const visited = new Set<Decl>();
  const render = renderer(repository, revision, parser);
  const emit = (declaration: Decl, depth: Mdast.Heading["depth"], id: string, title = id) =>
    children.push(...render(declaration, depth, id, title));
  for (const { name, declaration } of publicOrder) {
    if (name === "InvestigationLifecycleError") children.push(heading(2, "Failures", { id: "failures" }));
    const title = name === "Investigation" ? "Investigation<State>" : name;
    emit(declaration, failures.has(name) ? 3 : 2, name, title);
    visited.add(declaration);
    if (name !== "Attune") continue;
    const owner = declaration.facets.find(Node.isInterfaceDeclaration);
    if (owner === undefined) throw new Error("Attune has no interface facet.");
    for (const facet of owner.getMembers()) {
      const member = byNode.get(key(facet));
      if (member === undefined) throw new Error("Attune member was not read.");
      emit(member, 3, `Attune.${member.name}`);
      visited.add(member);
    }
  }
  children.push(heading(2, "Repository", { id: "repository" }));
  let previous = "";
  for (const declaration of all) {
    if (visited.has(declaration)) continue;
    const path = pathOf(repository, declaration.facets[0]!);
    const label = `${declaration.packageName}\0${path}`;
    if (label !== previous) {
      children.push(paragraph([bold(declaration.packageName), text(" · "), { type: "inlineCode", value: path }]));
      previous = label;
    }
    const depth = Math.min(2 + declaration.symbol.split(".").length, 6) as Mdast.Heading["depth"];
    emit(declaration, depth, idFor(repository, declaration), declaration.symbol);
  }
  return { type: "root", children };
};
