import { describe, expect, it } from "vitest";

import { renderCodeBlock } from "../src/highlight.ts";
import {
  twoslashTypeScriptVersion,
  type TwoslashIdentifierLink,
} from "../src/twoslash.ts";

const linked = {
  apiHref: "/api/token.html",
  documentation:
    "A documented value retained from the complete virtual project.",
  sourceHref:
    "https://github.com/example/attune/blob/0123456789abcdef/src/token.ts#L3-L8",
  target: "Token",
} as const;

const hiddenDeclaration = (cut: string): string => `// @filename: model.ts
/** A documented value retained from the complete virtual project. */
export interface Token {
  /** Checked literal value. */
  readonly value: "checked";
}
// @filename: index.ts
import type { Token } from "./model.js";
${cut}
declare const token: Token;
token.value;
`;

const renderChecked = (
  source: string,
  identifiers: readonly TwoslashIdentifierLink[] = [linked],
): string =>
  renderCodeBlock(source, {
    label: "Checked example",
    twoslash: {
      idPrefix: "token-example",
      identifiers,
      requiredTargets: ["Token"],
    },
  });

const copiedCode = (html: string): string => {
  const encoded = /data-copy-code data-code="([^"]*)"/u.exec(html)?.[1];
  if (encoded === undefined)
    throw new Error("Rendered block has no copy code.");
  return encoded
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
};

describe("linked Twoslash examples", () => {
  it.each([
    ["cut", "// ---cut---"],
    ["cut-before", "// ---cut-before---"],
  ])(
    "checks hidden multi-file setup before applying %s",
    (_name, directive) => {
      const html = renderChecked(hiddenDeclaration(directive));

      expect(html).toContain('data-twoslash-target="Token"');
      expect(html).toContain('href="/api/token.html"');
      expect(html).toContain(
        "A documented value retained from the complete virtual project.",
      );
      expect(html).toContain(linked.sourceHref);
      const linkedTrigger =
        /<span class="twoslash-hover[^"]*twoslash-linked"[^>]*data-twoslash-target="Token"[^>]*>/u.exec(
          html,
        )?.[0];
      expect(linkedTrigger).toBeDefined();
      expect(linkedTrigger).not.toContain("tabindex");
      expect(linkedTrigger).not.toContain('role="button"');
      expect(html).toContain('aria-label="Open API reference for Token"');
      expect(html).toContain('aria-describedby="token-example-token-1"');
      expect(html).not.toContain("@filename");
      expect(html).not.toContain(directive);
      expect(html).not.toContain("export interface Token");
    },
  );

  it("links only the documented declaration when a local name collides", () => {
    const html = renderCodeBlock(
      `interface Service {
  /** Runs documented work. */
  run(): void;
}
const run = "local";
declare const service: Service;
// ---cut-before---
run;
service.run();`,
      {
        twoslash: {
          idPrefix: "colliding-run",
          identifiers: [
            {
              apiHref: "/api/run.html",
              documentation: "Runs documented work.",
              target: "run",
            },
          ],
          requiredTargets: ["run"],
        },
      },
    );

    expect(html.match(/data-twoslash-target="run"/gu)).toHaveLength(1);
    expect(html.match(/<a[^>]*href="\/api\/run\.html"/gu)).toHaveLength(2);
    expect(copiedCode(html)).toBe("run;\nservice.run();");
  });

  it("composes cut-after and multiple paired cut regions without losing hovers", () => {
    const paired = renderChecked(`/**
 * A documented value retained from the complete virtual project.
 * A documented checked value.
 */
interface Token { readonly value: "checked" }
declare const token: Token;
// ---cut-start---
const firstHidden: Token = token;
// ---cut-end---
token.value;
// ---cut-start---
const secondHidden: Token = token;
// ---cut-end---
// ---cut-after---
const alsoHidden: Token = token;
`);

    expect(paired).toContain('data-twoslash-target="Token"');
    expect(paired).toContain("A documented checked value.");
    expect(paired).not.toContain("---cut");
    expect(paired).not.toContain("firstHidden");
    expect(paired).not.toContain("secondHidden");
    expect(paired).not.toContain("alsoHidden");
  });

  it("retains the visible filename marker in a cut multi-file program", () => {
    const html = renderChecked(`// @filename: model.ts
/**
 * A documented value retained from the complete virtual project.
 * Documentation retained from the hidden source file.
 */
export interface Token { readonly value: "checked" }
// ---cut---
// @filename: index.ts
import type { Token } from "./model.js";
declare const token: Token;
token.value;
`);

    expect(copiedCode(html)).toContain("// @filename: index.ts");
    expect(copiedCode(html)).not.toContain("@filename: model.ts");
    expect(html).toContain('data-twoslash-target="Token"');
  });

  it("honors and removes per-example compiler option directives", () => {
    const html = renderCodeBlock(
      `// @noImplicitAny: false
// @target: esnext
// @lib: esnext
const increment = value => value + 1;`,
      {
        twoslash: { idPrefix: "compiler-options" },
      },
    );

    expect(copiedCode(html)).toBe("const increment = value => value + 1;");
    expect(html).not.toContain("@noImplicitAny");
    expect(html).not.toContain("@target");
    expect(html).not.toContain("@lib");
  });

  it.each([
    ["noCheck", "// @noCheck"],
    ["noErrorValidation", "// @noErrorValidation"],
    ["noErrors", "// @noErrors: 2322"],
    ["noErrorsCutted", "// @noErrorsCutted"],
  ])("rejects the @%s validation bypass", (name, directive) => {
    expect(() =>
      renderCodeBlock(
        `${directive}
const broken: string = 42;`,
        {
          twoslash: { idPrefix: `forbidden-${name}` },
        },
      ),
    ).toThrow(
      new RegExp(`validation-bypass directive @${name.replaceAll("$", "\\$")}`),
    );
  });

  it("preserves explicit expected-error annotations", () => {
    const html = renderCodeBlock(
      `// @errors: 2322
const broken: string = 42;`,
      {
        twoslash: { idPrefix: "expected-error" },
      },
    );

    expect(copiedCode(html)).toBe("const broken: string = 42;");
    expect(html).toContain("twoslash-error");
    expect(html).not.toContain("@errors");
  });

  it("renders the JavaScript selected by showEmit", () => {
    const html = renderCodeBlock(
      `// @showEmit
const level: string = 'Danger';
export {};`,
      {
        twoslash: { idPrefix: "show-emit" },
      },
    );

    expect(copiedCode(html)).toBe("const level = 'Danger';\nexport {};\n");
    expect(html).toContain('data-language="javascript"');
    expect(html).toContain('<span class="code-language">JavaScript</span>');
  });

  it("renders declaration and map files selected by showEmittedFile", () => {
    const declaration = renderCodeBlock(
      `// @declaration
// @showEmit
// @showEmittedFile: index.d.ts
export const hello = 'world';`,
      {
        twoslash: { idPrefix: "show-declaration" },
      },
    );
    const sourceMap = renderCodeBlock(
      `// @sourceMap
// @showEmit
// @showEmittedFile: index.js.map
export const hello = 'world';`,
      {
        twoslash: { idPrefix: "show-source-map" },
      },
    );
    const declarationMap = renderCodeBlock(
      `// @declaration
// @declarationMap
// @showEmit
// @showEmittedFile: index.d.ts.map
export const hello: string = 'world';`,
      {
        twoslash: { idPrefix: "show-declaration-map" },
      },
    );

    expect(copiedCode(declaration)).toBe(
      'export declare const hello = "world";\n',
    );
    expect(JSON.parse(copiedCode(sourceMap))).toMatchObject({
      file: "index.js",
      sources: ["index.ts"],
      version: 3,
    });
    expect(declaration).toContain('data-language="typescript"');
    expect(sourceMap).toContain('data-language="json"');
    expect(declarationMap).toContain('data-language="json"');
    expect(JSON.parse(copiedCode(declarationMap))).toMatchObject({
      file: "index.d.ts",
      sources: ["index.ts"],
      version: 3,
    });
  });

  it("renders one selected JavaScript file from a multi-file program", () => {
    const html = renderCodeBlock(
      `// @filename: a.ts
export const helloWorld: string = 'Hi';
// @filename: b.ts
import { helloWorld } from './a.js';
// @showEmit
// @showEmittedFile: b.js
console.log(helloWorld);`,
      {
        twoslash: { idPrefix: "show-multi-file-emit" },
      },
    );

    expect(copiedCode(html)).toBe(
      "// @filename: b.ts\nimport { helloWorld } from './a.js';\nconsole.log(helloWorld);\n",
    );
  });

  it("fails closed on an unexpected TypeScript diagnostic", () => {
    expect(() =>
      renderCodeBlock(
        "const broken: string = 42;\n// ---cut-before---\nbroken;",
        {
          twoslash: {
            idPrefix: "broken-example",
          },
        },
      ),
    ).toThrow(/Type 'number' is not assignable to type 'string'/u);
  });

  it("checks declaration-project files through the isolated boundary", () => {
    const html = renderCodeBlock(
      'import type { External } from "./external.js";\ndeclare const value: External;\nvalue;',
      {
        twoslash: {
          extraFiles: {
            "external.ts":
              "/** Documentation loaded from the declaration project. */\nexport interface External { readonly ok: true }",
          },
          idPrefix: "declaration-project",
          identifiers: [
            {
              apiHref: "/api/external.html",
              documentation:
                "Documentation loaded from the declaration project.",
              target: "External",
            },
          ],
          requiredTargets: ["External"],
        },
      },
    );

    expect(html).toContain(
      "Documentation loaded from the declaration project.",
    );
    expect(html).toContain('href="/api/external.html"');
  });

  it("keeps example directives out of declaration hover documentation", () => {
    const html = renderChecked(`// @filename: model.ts
/**
 * A documented value retained from the complete virtual project.
 * A documented value.
 *
 * @example Reject another value
 * \`\`\`ts
 * // @errors: 2322
 * // ---cut-before---
 * const bad: string = 42;
 * \`\`\`
 */
export interface Token { readonly value: "checked" }
// @filename: index.ts
import type { Token } from "./model.js";
// ---cut-before---
declare const token: Token;
token.value;
`);

    expect(html).toContain("A documented value.");
    expect(html).not.toContain("@errors");
    expect(html).not.toContain("---cut-before---");
  });

  it("resolves the audited attune-mcp declaration bundle as a package", () => {
    const html = renderCodeBlock(
      'import { Attune } from "attune-mcp";\n// ---cut---\nconst attune = Attune.make();',
      {
        twoslash: {
          idPrefix: "real-declaration-package",
          identifiers: [
            {
              apiHref: "/api/attune.html",
              documentation:
                "Performs the complete typed lifecycle from repository revision to durable evidence.",
              target: "Attune",
            },
          ],
          requiredTargets: ["Attune"],
        },
      },
    );

    expect(html).toContain('data-twoslash-target="Attune"');
    expect(html).toContain(
      "Performs the complete typed lifecycle from repository revision to durable evidence",
    );
    expect(html).not.toContain("@remarks");
    expect(html).not.toContain("@example");
    expect(html).toContain('data-code="const attune = Attune.make();"');
  });

  it("matches linked TSDoc when compiler display inserts punctuation space", () => {
    const html = renderCodeBlock(
      `interface Attune {}
/** Durable evidence accepted by {@link Attune}. */
interface Receipt { readonly status: "accepted" }
// ---cut-before---
declare const receipt: Receipt;`,
      {
        twoslash: {
          idPrefix: "linked-doc-punctuation",
          identifiers: [
            {
              apiHref: "/api/receipt.html",
              documentation: "Durable evidence accepted by {@link Attune}.",
              target: "Receipt",
            },
          ],
          requiredTargets: ["Receipt"],
        },
      },
    );

    expect(html).toContain('data-twoslash-target="Receipt"');
  });

  it("resolves Effect types used by source-authored lifecycle examples", () => {
    const html = renderCodeBlock(
      `import { Effect } from "effect";
import type { Tool } from "effect/unstable/ai";
// ---cut-before---
const value = Effect.succeed(1);
type RegisteredTool = Tool.Any;`,
      {
        twoslash: {
          idPrefix: "effect-declaration-packages",
        },
      },
    );

    expect(html).toContain("Effect.succeed");
    expect(html).toContain("RegisteredTool");
  });

  it("fails when a required linked hover has no source documentation", () => {
    expect(() =>
      renderChecked(`interface Token { readonly value: string }
declare const token: Token;
token.value;
`),
    ).toThrow(/Token.*no source TSDoc/u);
  });

  it("rejects a required identifier without destination metadata", () => {
    expect(() =>
      renderCodeBlock("/** Documented. */\ninterface Token {}", {
        twoslash: {
          idPrefix: "missing-destination",
          requiredTargets: ["Token"],
        },
      }),
    ).toThrow(/Token.*no API destination metadata/u);
  });

  it("keeps virtual files isolated between renders", () => {
    const identifiers = [
      linked,
      {
        apiHref: "/api/token.html#member-value",
        documentation: "Checked literal value.",
        target: "value",
      },
    ] as const;
    const alpha = renderChecked(
      hiddenDeclaration("// ---cut-before---").replaceAll(
        '"checked"',
        '"alpha"',
      ),
      identifiers,
    );
    const beta = renderChecked(
      hiddenDeclaration("// ---cut-before---").replaceAll(
        '"checked"',
        '"beta"',
      ),
      identifiers,
    );

    expect(alpha).toContain('"alpha"');
    expect(alpha).not.toContain('"beta"');
    expect(beta).toContain('"beta"');
    expect(beta).not.toContain('"alpha"');
  });

  it("labels strict blocks with the isolated compiler version", () => {
    expect(renderChecked(hiddenDeclaration("// ---cut-before---"))).toContain(
      `TypeScript ${twoslashTypeScriptVersion} checked`,
    );
  });
});
