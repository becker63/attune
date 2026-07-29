import type { Element, ElementContent, Root as HastRoot } from "hast";
import type { Code, Heading, Link, Root, RootContent } from "mdast";
import type { Handler } from "mdast-util-to-hast";
import rehypeDocument from "rehype-document";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import type { Highlighter } from "shiki";
import { ts } from "ts-morph";
import { unified, type Plugin } from "unified";
import { lintRule } from "unified-lint-rule";
import { EXIT, visit } from "unist-util-visit";
import { VFile } from "vfile";

import type { AttuneData } from "./read.ts";

export interface DocumentationLanguage {
  readonly resolve: (tree: Root, file: VFile) => Promise<Root | undefined | void>;
}
export interface DocumentationOptions {
  readonly highlighter: Highlighter;
  readonly language: DocumentationLanguage;
  readonly metadata: Readonly<
    Record<"revision" | "typescriptVersion" | "tsgoVersion" | "languageServiceVersion", string>
  >;
}

const chapters =
  "the-model complete-investigation Investigation Attune AttuneReceipt failures AttuneToolkit repository".split(" ");
const required =
  "top the-model complete-investigation Investigation Attune Attune.materialize Attune.activate Attune.acquireActive Attune.execute Attune.finalize Attune.recoverTerminal AttuneReceipt failures InvestigationLifecycleError AttuneToolFailure AttuneToolkit repository".split(
    " ",
  );
const structural = new Set("top the-model complete-investigation failures repository".split(" "));
const data = (node: { readonly data?: unknown }): AttuneData =>
  (node.data as { readonly attune?: AttuneData } | undefined)?.attune ?? {};
const textOf = (node: unknown): string => {
  if (typeof node !== "object" || node === null) return "";
  if ("value" in node && typeof node.value === "string") return node.value;
  return "children" in node && Array.isArray(node.children) ? node.children.map(textOf).join("") : "";
};
const safeId = (id: string) => /^(?!constructor$|prototype$|__proto__$)[A-Za-z][A-Za-z0-9._:-]*$/u.test(id);
const safeHref = (href: string) =>
  (href.startsWith("#") && safeId(href.slice(1))) || /^https:\/\/[^/\s]+\/\S+$/u.test(href);
const safeSourcePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
const immutable = (href: string, path: string) =>
  safeSourcePath(path) &&
  href.includes(`/${path}#L`) &&
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/blob\/[0-9a-f]{40}\/[^#\s]+#L[1-9]\d*(?:-L[1-9]\d*)?$/u.test(href);
const report = (file: VFile, reason: string, node?: RootContent) =>
  void (file.message(reason, node?.position).fatal = true);
const between = (tree: Root, from: string, until: string) => {
  const index = (id: string, after = -1) =>
    tree.children.findIndex((node, at) => at > after && node.type === "heading" && data(node).id === id);
  const start = index(from);
  const end = index(until, start);
  return start < 0 ? [] : tree.children.slice(start + 1, end < 0 ? undefined : end);
};
const completeInvestigation = (code: Code) => {
  const parsed = ts.createSourceFile("complete-investigation.ts", code.value, 99, true);
  const nodes: ts.Node[] = [];
  const walk = (node: ts.Node): void => {
    nodes.push(node);
    ts.forEachChild(node, walk);
  };
  walk(parsed);
  const linked = (node: ts.Node, href: string) =>
    (data(code).links ?? []).some(
      (link) => link.start === node.getStart(parsed) && link.end === node.getEnd() && link.href === href,
    );
  const path = (node: ts.Node | undefined): string =>
    node === undefined
      ? ""
      : ts.isIdentifier(node)
        ? node.text
        : ts.isPropertyAccessExpression(node)
          ? `${path(node.expression)}.${node.name.text}`
          : "";
  const call = (expression: ts.Expression | undefined, member: string) => {
    const value =
      expression !== undefined &&
      ts.isYieldExpression(expression) &&
      expression.asteriskToken !== undefined &&
      expression.expression !== undefined &&
      ts.isCallExpression(expression.expression)
        ? expression.expression
        : undefined;
    return value !== undefined &&
      ts.isPropertyAccessExpression(value.expression) &&
      path(value.expression.expression) === "attune" &&
      value.expression.name.text === member &&
      linked(value.expression.name, `#Attune.${member}`)
      ? value
      : undefined;
  };
  const variable = (name: string) =>
    nodes.find(
      (node): node is ts.VariableDeclaration =>
        ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name,
    );
  const typed = (node: ts.ParameterDeclaration | ts.VariableDeclaration | undefined, name: string) =>
    node?.type !== undefined &&
    ts.isTypeReferenceNode(node.type) &&
    ts.isIdentifier(node.type.typeName) &&
    node.type.typeName.text === name &&
    linked(node.type.typeName, `#${name}`)
      ? node.type
      : undefined;
  const attune = nodes.some(
    (node) =>
      (ts.isParameter(node) || ts.isVariableDeclaration(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "attune" &&
      typed(node, "Attune") !== undefined,
  );
  const materialized = variable("materialized");
  const active = variable("active");
  const execution = variable("execution");
  const receipt = variable("receipt");
  const materialize = call(materialized?.initializer, "materialize");
  const activate = call(active?.initializer, "activate");
  const execute = call(execution?.initializer, "execute");
  const activeType = typed(active, "Investigation");
  const rejected = nodes.find(
    (node): node is ts.IfStatement =>
      ts.isIfStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      path(node.expression.left) === "materialized.status" &&
      ts.isStringLiteral(node.expression.right) &&
      node.expression.right.text === "rejected",
  );
  const inspected = nodes.find((node) => path(node) === "execution.receipt.status");
  const finalization = nodes.find(
    (node): node is ts.ReturnStatement => ts.isReturnStatement(node) && call(node.expression, "finalize") !== undefined,
  );
  const finalize = call(finalization?.expression, "finalize");
  const state = activeType?.typeArguments?.[0];
  const ordered = [materialized, rejected, active, execution, receipt, inspected, finalization];
  return (
    attune &&
    materialize !== undefined &&
    materialize.arguments.length !== 0 &&
    path(activate?.arguments[0]) === "materialized.investigation" &&
    state !== undefined &&
    ts.isLiteralTypeNode(state) &&
    ts.isStringLiteral(state.literal) &&
    state.literal.text === "active" &&
    path(execute?.arguments[0]) === "active" &&
    execute!.arguments.length >= 3 &&
    typed(receipt, "AttuneReceipt") !== undefined &&
    path(receipt?.initializer) === "execution.receipt" &&
    path(finalize?.arguments[0]) === "execution.investigation" &&
    finalize!.arguments[1] !== undefined &&
    path(finalize!.arguments[1]) !== "undefined" &&
    ordered.every(
      (node, index) =>
        node !== undefined && (index === 0 || node.getStart(parsed) > ordered[index - 1]!.getStart(parsed)),
    )
  );
};

const checkDocumentation = lintRule<Root>("attune-docs:document", (tree, file) => {
  const headings: Heading[] = [];
  const codes: Code[] = [];
  const links: Link[] = [];
  visit(tree, (node) => {
    if (node.type === "heading") headings.push(node);
    else if (node.type === "code") codes.push(node);
    else if (node.type === "link") links.push(node);
  });
  const ids = new Map<string, Heading>();
  for (const heading of headings) {
    const metadata = data(heading);
    const id = metadata.id;
    if (id === undefined || !safeId(id)) report(file, "Heading has no safe canonical id", heading);
    else {
      if (ids.has(id)) report(file, `Duplicate canonical id #${id}`, heading);
      ids.set(id, heading);
      if (
        !structural.has(id) &&
        (metadata.sourcePath === undefined ||
          metadata.sourceHref === undefined ||
          !immutable(metadata.sourceHref, metadata.sourcePath))
      )
        report(file, `Declaration #${id} needs a normalized immutable source`, heading);
    }
  }
  if (headings.filter(({ depth }) => depth === 1).length !== 1) report(file, "The document needs exactly one h1");
  let previous = -1;
  for (const id of required) {
    const at = headings.findIndex((heading) => data(heading).id === id);
    if (at < 0) report(file, `Required heading #${id} is missing`);
    else if (at <= previous) report(file, `Required heading #${id} is out of curriculum order`);
    previous = Math.max(previous, at);
  }
  const diagrams = codes.filter(({ lang }) => lang === "text");
  if (
    diagrams.length !== 1 ||
    !between(tree, "the-model", "complete-investigation").includes(diagrams[0]!) ||
    !/materialized[\s\S]*active[\s\S]*receipt[\s\S]*finalized[\s\S]*evidence/u.test(diagrams[0]?.value ?? "")
  )
    report(file, "The model needs its one plain-text lifecycle diagram");
  const examples = between(tree, "complete-investigation", "Investigation").filter(
    (node): node is Code => node.type === "code" && data(node).role === "example",
  );
  if (examples.length !== 1) report(file, "The opening needs exactly one complete investigation");
  else {
    const example = examples[0]!;
    if (!completeInvestigation(example))
      report(file, "The complete investigation does not preserve its causal authority/evidence program", example);
  }
  for (const [id, end] of [
    ["Investigation", "Attune"],
    ["Attune", "AttuneReceipt"],
    ["AttuneReceipt", "failures"],
  ]) {
    let found = false;
    for (const node of between(tree, id!, end!))
      visit(node, "link", (link) => {
        if (link.url === "#complete-investigation") found = true;
      });
    if (!found) report(file, `#${id} must return to #complete-investigation`);
  }
  for (const code of codes) {
    const metadata = data(code);
    if (metadata.id !== undefined) report(file, "Code use sites cannot own fragment ids", code);
    if (["signature", "example"].includes(metadata.role ?? "") && metadata.checked !== true)
      report(file, "Signature/example is not compiler checked", code);
    let end = -1;
    for (const range of [...(metadata.links ?? [])].sort((a, b) => a.start - b.start)) {
      if (
        !Number.isInteger(range.start) ||
        !Number.isInteger(range.end) ||
        range.start < 0 ||
        range.end <= range.start ||
        range.end > code.value.length ||
        range.start < end ||
        !safeHref(range.href)
      )
        report(file, "Invalid resolved definition range", code);
      end = Math.max(end, range.end);
      if (range.href.startsWith("#") && !ids.has(range.href.slice(1)))
        report(file, `Code link ${range.href} has no heading`, code);
    }
  }
  for (const link of links) {
    if (!safeHref(link.url)) report(file, `Unsafe link ${link.url}`, link);
    if (link.url.startsWith("#") && !ids.has(link.url.slice(1)))
      report(file, `Link ${link.url} has no canonical heading`, link);
  }
});

const resolveDocumentation: Plugin<[DocumentationLanguage], Root> = function (language) {
  return async (tree, file) => (await language.resolve(tree, file)) ?? tree;
};
const element = (
  tagName: Element["tagName"],
  properties: Element["properties"] = {},
  children: ElementContent[] = [],
): Element => ({ type: "element", tagName, properties, children });
const text = (value: string): ElementContent => ({ type: "text", value });
const anchor = (href: string, label: string, className?: string, properties = {}): Element =>
  element("a", { href, ...properties, ...(className === undefined ? {} : { className: [className] }) }, [text(label)]);
const codeHandler =
  (highlighter: Highlighter): Handler =>
  (_state, code: Code) => {
    const metadata = data(code);
    const lang = code.lang === "ts" ? "typescript" : code.lang === "js" ? "javascript" : code.lang || "text";
    const root = highlighter.codeToHast(code.value, {
      lang,
      theme: "github-light-default",
      decorations: [...(metadata.links ?? [])]
        .sort((a, b) => a.start - b.start)
        .map(({ start, end, href }) => ({
          start,
          end,
          tagName: "a",
          alwaysWrap: true,
          properties: {
            href,
            className: ["definition-link"],
            ...(href.startsWith("#") ? {} : { rel: ["noreferrer"] }),
          },
        })),
    });
    const pre = root.children.find((child): child is Element => child.type === "element" && child.tagName === "pre");
    if (pre === undefined) throw new Error("Shiki did not return a pre element");
    pre.properties = {
      ...pre.properties,
      className: ["attune-code"],
      dataLanguage: lang,
      ...(metadata.role === undefined ? {} : { dataCodeRole: metadata.role }),
      ...(metadata.checked === true ? { dataAttuneChecked: "true" } : {}),
    };
    return pre;
  };
const headingHandler: Handler = (state, heading: Heading) => {
  const metadata = data(heading);
  const title = element(
    `h${heading.depth}`,
    {
      ...(metadata.id === undefined ? {} : { id: metadata.id }),
      ...(["declaration", "member"].includes(metadata.role ?? "") ? { dataAttuneSymbol: "" } : {}),
    },
    state.all(heading) as ElementContent[],
  );
  return metadata.sourceHref === undefined
    ? title
    : element("div", { className: ["heading-row"] }, [
        title,
        anchor(metadata.sourceHref, "source ↗", "source-link", {
          rel: ["noreferrer"],
          ariaLabel: `View source for ${textOf(heading)}`,
        }),
      ]);
};
const layout =
  (metadata: DocumentationOptions["metadata"]) =>
  (tree: HastRoot): HastRoot => {
    let body: Element | undefined;
    visit(tree, "element", (node) => {
      if (node.tagName === "body") {
        body = node;
        return EXIT;
      }
    });
    if (body === undefined) throw new Error("rehype-document omitted body");
    const code = (value: string) => element("code", {}, [text(value)]);
    body.children = [
      anchor("#main", "Skip to content", "skip-link"),
      element("nav", { className: ["contents"], ariaLabel: "Guide contents" }, [
        anchor("#top", "attune-mcp", "wordmark"),
        element(
          "ol",
          {},
          chapters.map((id) =>
            element("li", {}, [
              anchor(
                `#${id}`,
                id === "the-model"
                  ? "The model"
                  : id === "complete-investigation"
                    ? "A complete investigation"
                    : id[0]!.toUpperCase() + id.slice(1),
              ),
            ]),
          ),
        ),
      ]),
      element("main", { id: "main", className: ["guide"] }, body.children),
      element("footer", { className: ["site-footer"] }, [
        text(`Source ${metadata.revision} · TypeScript `),
        code(metadata.typescriptVersion),
        text(" · @effect/tsgo "),
        code(metadata.tsgoVersion),
        text(" · @effect/language-service "),
        code(metadata.languageServiceVersion),
      ]),
    ];
    return tree;
  };

const schema: typeof defaultSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [...(defaultSchema.tagNames ?? []), ..."html head body title meta link main nav footer".split(" ")],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...((defaultSchema.attributes?.["*"] ?? []) as string[]), "className", "ariaLabel", "dataAttuneSymbol"],
    meta: ["name", "content", "charSet"],
    link: ["rel", "href"],
    a: ["href", "rel", "className", "ariaLabel"],
    pre: ["style", "dataLanguage", "dataCodeRole", "dataAttuneChecked"],
    span: ["style"],
  },
  protocols: { ...defaultSchema.protocols, href: ["http", "https"] },
};
const checkHtml: Plugin<[], HastRoot> = function () {
  return (tree, file) => {
    const ids = new Set<string>();
    const local: string[] = [];
    let charsets = 0;
    visit(tree, "element", (node) => {
      const id = node.properties.id;
      if (typeof id === "string") {
        if (ids.has(id)) report(file, `Sanitized HTML duplicates #${id}`);
        ids.add(id);
      }
      const href = node.properties.href;
      if (node.tagName === "a" && typeof href === "string") {
        if (!safeHref(href)) report(file, `Sanitized HTML has unsafe ${href}`);
        if (href.startsWith("#")) local.push(href.slice(1));
      } else if (node.tagName === "link" && href !== "styles.css")
        report(file, "Sanitized HTML has an unexpected asset");
      if (node.tagName === "meta" && node.properties.charSet === "utf-8") charsets += 1;
    });
    if (charsets !== 1) report(file, "Sanitized HTML needs exactly one UTF-8 charset");
    for (const target of local) if (!ids.has(target)) report(file, `Sanitized HTML link #${target} has no target`);
  };
};

export const makeDocumentationProcessor = (options: DocumentationOptions) =>
  unified()
    .use(resolveDocumentation, options.language)
    .use(checkDocumentation, 2)
    .use(remarkRehype, {
      allowDangerousHtml: false,
      clobberPrefix: "",
      handlers: { code: codeHandler(options.highlighter), heading: headingHandler },
    })
    .use(rehypeDocument, {
      title: "Attune",
      language: "en",
      css: ["styles.css"],
      responsive: true,
      meta: [{ name: "description", content: "Exact repository experiments with durable mechanical evidence." }],
    })
    .use(layout, options.metadata)
    .use(rehypeSanitize, schema)
    .use(checkHtml)
    .use(rehypeStringify);

export const compileDocumentation = async (tree: Root, options: DocumentationOptions) => {
  const file = new VFile({ path: "index.html" });
  const processor = makeDocumentationProcessor(options);
  const hast = await processor.run(tree, file);
  for (const message of file.messages) message.fatal = true;
  if (file.messages.length > 0) throw new Error(file.messages.map(String).join("\n"));
  return { html: `<!doctype html>\n${processor.stringify(hast, file)}`, file };
};
