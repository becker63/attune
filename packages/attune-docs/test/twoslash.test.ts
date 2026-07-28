import { describe, expect, it } from "vitest";

import { renderCodeBlock } from "../src/highlight.ts";
import {
  twoslashTypeScriptVersion,
  type TwoslashIdentifierLink,
} from "../src/twoslash.ts";

const linked = {
  apiHref: "/api/token.html",
  sourceHref:
    "https://github.com/example/attune/blob/0123456789abcdef/src/token.ts#L3-L8",
  target: "Token",
} as const;

const hiddenDeclaration = (cut: string): string => `// @filename: model.ts
/** A documented value retained from the complete virtual project. */
export interface Token {
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

  it("composes cut-after and paired cut regions without losing hovers", () => {
    const paired = renderChecked(`/** A documented checked value. */
interface Token { readonly value: "checked" }
declare const token: Token;
// ---cut-start---
const hidden: Token = token;
// ---cut-end---
token.value;
// ---cut-after---
const alsoHidden: Token = token;
`);

    expect(paired).toContain('data-twoslash-target="Token"');
    expect(paired).toContain("A documented checked value.");
    expect(paired).not.toContain("---cut");
    expect(paired).not.toContain("const hidden");
    expect(paired).not.toContain("alsoHidden");
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

  it("resolves the audited attune-mcp declaration bundle as a package", () => {
    const html = renderCodeBlock(
      'import { Attune } from "attune-mcp";\n// ---cut---\nconst attune = Attune.make();',
      {
        twoslash: {
          idPrefix: "real-declaration-package",
          identifiers: [
            {
              apiHref: "/api/attune.html",
              target: "Attune",
            },
          ],
          requiredTargets: ["Attune"],
        },
      },
    );

    expect(html).toContain('data-twoslash-target="Attune"');
    expect(html).toContain(
      "Performs the complete investigation lifecycle without exposing transport",
    );
    expect(html).not.toContain("@remarks");
    expect(html).not.toContain("@example");
    expect(html).toContain('data-code="const attune = Attune.make();"');
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
