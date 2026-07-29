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

const source = `declare const attune: Attune
const program = Effect.gen(function* () {

const materialized = yield* attune.materialize({
  remote,
  revision: "main",
})
if (materialized.status === "rejected") {
  return yield* Effect.fail(materialized.error)
}

const active: Investigation<"active"> =
  yield* attune.activate(materialized.investigation)
const execution = yield* attune.execute(active, "joern_query", query)
const receipt: AttuneReceipt = execution.receipt

if (execution.receipt.status === "succeeded") {
  yield* inspect(receipt)
}

return yield* attune.finalize(execution.investigation, {
  disposition: "accepted",
})
})`;

const resolvedMember = (name: string, href: string) => {
  const match = resolved(source, `.${name}`, href);
  return { ...match, start: match.start + 1 };
};

const exampleLinks = [
  resolved(source, "Attune", "#Attune"),
  resolvedMember("materialize", "#Attune.materialize"),
  resolved(source, "Investigation", "#Investigation"),
  resolvedMember("activate", "#Attune.activate"),
  resolvedMember("execute", "#Attune.execute"),
  resolved(source, "AttuneReceipt", "#AttuneReceipt"),
  resolvedMember("finalize", "#Attune.finalize"),
] as const;

const example: Code = {
  type: "code",
  lang: "typescript",
  value: source,
  data: data({ role: "example", checked: true, links: exampleLinks }),
};

const declaration = (
  depth: Heading["depth"],
  label: string,
  id: string,
  value: string,
  links: readonly unknown[] = [],
): RootContent[] => [heading(depth, label, id, true), signature(value, links)];

const fixture = (): Root => ({
  type: "root",
  children: [
    heading(1, "Attune", "top"),
    paragraph({
      type: "text",
      value:
        "Attune materializes an exact repository state, issues typed authority to operate on it, and preserves every accepted operation as a durable receipt.",
    }),
    heading(2, "The model", "the-model"),
    paragraph({
      type: "text",
      value:
        "Investigation carries authority. Attune changes or uses it. A receipt preserves evidence.",
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
    heading(2, "A complete investigation", "complete-investigation"),
    paragraph({
      type: "text",
      value: "One program carries the same authority through the lifecycle.",
    }),
    example,
    ...declaration(
      2,
      "Investigation<State>",
      "Investigation",
      "export interface Investigation<State extends InvestigationState> {}",
    ),
    paragraph(
      { type: "text", value: "Follow the active authority in " },
      reference("the complete investigation", "#complete-investigation"),
      { type: "text", value: "." },
    ),
    ...declaration(2, "Attune", "Attune", "export interface Attune {}"),
    paragraph(
      { type: "text", value: "The lifecycle is exercised by " },
      reference("the complete investigation", "#complete-investigation"),
      { type: "text", value: "." },
    ),
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
    paragraph(
      { type: "text", value: "Inspect the evidence produced in " },
      reference("the complete investigation", "#complete-investigation"),
      { type: "text", value: "." },
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
  ],
});

let highlighter: Highlighter;
let options: DocumentationOptions;

beforeAll(async () => {
  highlighter = await createHighlighter({
    langs: ["typescript", "javascript", "text"],
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

    const headings = first.children.filter(
      (node): node is Heading => node.type === "heading",
    );
    expect(headings.slice(0, 17).map((node) => node.children[0])).toEqual(
      [
        "Attune",
        "The model",
        "A complete investigation",
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
    expect(headings).toHaveLength(541);
    expect(codes).toHaveLength(538);
    const examples = codes.filter(
      (node) => node.data?.attune?.role === "example",
    );
    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({ lang: "ts" });
    expect(examples[0]!.value).toContain("// @filename: inputs.ts");
    expect(examples[0]!.value).toContain("// @filename: investigation.ts");
    expect(examples[0]!.value).toContain("// ---cut---");
    expect(examples[0]!.value).not.toContain("```");
    expect(codes.filter((node) => node.lang === "text")).toHaveLength(1);

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
      [...paths].filter((path) => path.startsWith("packages/effect-joern/")),
    ).toHaveLength(17);
    expect(
      [...paths].filter((path) => path.includes("/pure/generated/")),
    ).toHaveLength(4);
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
      "the-model",
      "complete-investigation",
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
    expect(html.match(/data-language="text"/gu)).toHaveLength(1);
    expect(html.match(/data-code-role="example"/gu)).toHaveLength(1);
    expect(html).toContain('data-attune-checked="true"');
    expect(html).toContain('href="#Investigation"');
    expect(html).toContain('class="definition-link"');
    expect(html).toContain(
      '<meta name="description" content="Exact repository experiments with durable mechanical evidence.">',
    );
    expect(html.match(/<meta charset="utf-8">/gu)).toHaveLength(1);
    expect(html).toContain('href="styles.css"');
    expect(html).not.toMatch(/card|search-index|sidebar/iu);

    const summary =
      "Attune materializes an exact repository state, issues typed authority to operate on it, and preserves every accepted operation as a durable receipt.";
    const opening = /<div class="opening">([\s\S]*?)<h2 id="the-model">/u.exec(
      html,
    )?.[1];
    const host =
      /<div class="tree-flair" aria-hidden="true" data-tree-state="fallback">([\s\S]*?)<\/div>/u.exec(
        opening ?? "",
      )?.[1];
    const fallback = /<pre class="tree-fallback">([\s\S]*?)<\/pre>/u.exec(
      host ?? "",
    )?.[1];
    const art = (fallback ?? "").replace(/<[^>]+>/gu, "");
    const rows = art.split("\n");
    expect(opening).toContain(
      `<div class="opening-copy"><h1 id="top">Attune</h1><p>${summary}</p></div>`,
    );
    expect(opening?.indexOf("opening-copy")).toBeLessThan(
      opening?.indexOf("tree-flair") ?? -1,
    );
    expect(html.match(/class="tree-flair"/gu)).toHaveLength(1);
    expect(html.match(/class="tree-fallback"/gu)).toHaveLength(1);
    expect(html.match(/class="tree-canvas"/gu)).toHaveLength(1);
    expect(host).toContain('<canvas class="tree-canvas"></canvas>');
    expect(host).not.toMatch(/tabindex|<a\b|<button\b|<h[1-6]\b/iu);
    expect(rows).toHaveLength(24);
    expect(
      rows.every((row) => row.length === 60 && /^[\x20-\x7e]+$/u.test(row)),
    ).toBe(true);
    expect(fallback).toContain('class="tree-wood"');
    const hashes = art.match(/#/gu)?.length ?? 0;
    expect(fallback?.match(/class="tree-accent"/gu)).toHaveLength(
      Math.floor(hashes / 10),
    );
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

  test("projects only the eight conceptual contents links", async () => {
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
      "#the-model",
      "#complete-investigation",
      "#Investigation",
      "#Attune",
      "#AttuneReceipt",
      "#failures",
      "#AttuneToolkit",
      "#repository",
    ]);
    expect(contents).not.toContain("Attune.execute");
    expect(contents).not.toContain("AttuneToolFailure");
  });

  test("is byte deterministic", async () => {
    const first = await compileDocumentation(fixture(), options);
    const second = await compileDocumentation(fixture(), options);
    expect(second.html).toBe(first.html);
    expect(first.file.messages).toHaveLength(0);
  });

  test("preserves source line wrapping in the checked causal summary", async () => {
    const wrapped = fixture();
    const summary = wrapped.children[1];
    if (summary?.type !== "paragraph" || summary.children[0]?.type !== "text")
      throw new Error("Fixture opening drifted");
    summary.children[0].value = summary.children[0].value.replace(
      "authority to operate",
      "authority to\noperate",
    );
    const { html } = await compileDocumentation(wrapped, options);
    expect(html).toContain("authority to\noperate");
    expect(html).toContain(
      '<div class="opening-copy"><h1 id="top">Attune</h1><p>',
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
    expect(Buffer.byteLength(first)).toBeLessThanOrEqual(70 * 1024);
    expect(gzipSync(first, { level: 9 }).byteLength).toBeLessThanOrEqual(
      20 * 1024,
    );
    expect(source.trimEnd().split(/\r?\n/u).length).toBeLessThanOrEqual(450);
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

  test("keeps the technical-book stylesheet inside its hard boundary", async () => {
    const styles = await readFile(
      Path.resolve(import.meta.dirname, "..", "static", "styles.css"),
      "utf8",
    );
    expect(styles.split("\n").length - 1).toBeLessThanOrEqual(350);
    expect(styles).toMatch(/--prose:\s*46rem/u);
    expect(styles).toMatch(/pre\.attune-code[\s\S]*overflow-x:\s*auto/u);
    expect(styles).toContain("[data-attune-symbol]:target");
    expect(styles).toContain("ui-monospace");
    expect(styles).toContain(
      ".guide > :not(pre, .heading-row, table, .opening)",
    );
    expect(styles).toMatch(
      /@media \(min-width: 68rem\)[\s\S]*\.opening \{[\s\S]*display:\s*flex/iu,
    );
    expect(styles).toMatch(
      /\.tree-flair,[\s\S]*width:\s*60ch;\s*height:\s*24em/iu,
    );
    expect(styles).toMatch(
      /\.tree-flair \{[\s\S]*display:\s*none;[\s\S]*pointer-events:\s*none;[\s\S]*user-select:\s*none/iu,
    );
    const treeStyles = styles.slice(
      styles.indexOf(".tree-flair"),
      styles.indexOf("\nh1,"),
    );
    expect(treeStyles).not.toMatch(
      /\b(?:background|border|border-radius|outline|box-shadow|text-shadow|filter|backdrop-filter|mix-blend-mode|padding)\s*:/iu,
    );
    expect(styles).not.toMatch(
      /display:\s*grid|gradient\(|\.card\b|@keyframes|animation:/iu,
    );
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

  test("proves the running program from syntax and resolved call sites", async () => {
    const forged = fixture();
    const example = forged.children.find(
      (node): node is Code =>
        node.type === "code" && node.data?.attune?.role === "example",
    )!;
    example.value =
      example.value.replace(
        "execution.investigation",
        "materialized.investigation",
      ) + "\n// .finalize(execution.investigation,";
    await expect(compileDocumentation(forged, options)).rejects.toThrow(
      /does not preserve its causal authority\/evidence program/u,
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
