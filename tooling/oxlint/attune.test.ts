import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import * as Testing from "effect-oxlint/testing";
import { describe, expect, it } from "vitest";

import config, {
  forbiddenSuppressionLine,
  fencedTsdocFiles,
  generatedRoots,
  handwrittenRoots,
  readerRoots,
  unformattedTsdocFiles,
} from "../../oxlint.config.ts";
import { tsdoc } from "./attune.ts";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const oxlint = resolve(workspaceRoot, "node_modules/.bin/oxlint");
const fixtureConfig = resolve(
  workspaceRoot,
  "tooling/oxlint/fixtures/cli.config.ts",
);

const runOxlint = (...files: ReadonlyArray<string>) =>
  spawnSync(
    oxlint,
    [
      "--disable-nested-config",
      "--config",
      fixtureConfig,
      "--format",
      "json",
      ...files,
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
    },
  );

const programWithInterface = (
  source: string,
  commentValue?: string,
): Testing.ReportedDiagnostic[] => {
  const comment =
    commentValue === undefined
      ? undefined
      : Testing.comment("Block", commentValue);
  const start = comment === undefined ? 0 : comment.end + 1;
  const declaration = {
    type: "TSInterfaceDeclaration",
    id: { type: "Identifier", name: "Evidence" },
    typeParameters: null,
    extends: [],
    body: { type: "TSInterfaceBody", body: [] },
    declare: false,
    start,
    end: source.length,
  };
  const program = Object.assign(
    Testing.program([declaration], comment === undefined ? [] : [comment]),
    { start: 0, end: source.length },
  );
  return [
    ...Testing.runRule(tsdoc, "Program:exit", program, {
      sourceText: source,
      comments: comment === undefined ? [] : [comment],
    }),
  ];
};

describe("attune/tsdoc", () => {
  it("converts a missing comment into a focused diagnostic", () => {
    const result = programWithInterface("interface Evidence {}");
    Testing.expectDiagnostics(result, [
      { message: "document Evidence with TSDoc" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("accepts a meaningful summary on an internal leaf concept", () => {
    const raw = "/** Carries durable operation evidence. */";
    const result = programWithInterface(
      `${raw}\ninterface Evidence {}`,
      "* Carries durable operation evidence. ",
    );
    Testing.expectNoDiagnostics(result);
    expect(result).toHaveLength(0);
  });

  it("turns an internal analysis failure into a source diagnostic", () => {
    const program = { type: "Program", start: 0, end: 1 };
    Object.defineProperty(program, "body", {
      get: () => {
        throw new Error("fixture parser failure");
      },
    });
    const result = Testing.runRule(tsdoc, "Program:exit", program, {
      sourceText: "x",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.diagnostic.message).toContain(
      "attune/tsdoc failed safely: Error: fixture parser failure",
    );
  });

  it("loads through the real Oxlint TypeScript parser", () => {
    const valid = runOxlint("tooling/oxlint/fixtures/valid.ts");
    if (valid.status !== 0) throw new Error(valid.stdout + valid.stderr);
    expect(valid.status).toBe(0);

    const invalid = runOxlint("tooling/oxlint/fixtures/invalid.ts");
    expect(invalid.status).toBe(1);
    const output = JSON.parse(invalid.stdout) as {
      diagnostics: ReadonlyArray<{
        readonly code?: string;
        readonly message: string;
        readonly labels?: ReadonlyArray<{
          readonly span: { readonly line: number };
        }>;
      }>;
    };
    const messages = output.diagnostics
      .filter((diagnostic) => diagnostic.code === "attune(tsdoc)")
      .map((diagnostic) => diagnostic.message);
    expect(messages).toContain("@filename must name a relative virtual path");
    expect(messages).toContain(
      "@example must not suppress TypeScript or Effect diagnostics",
    );
    expect(messages).toContain(
      "Effect error channels use @failure, not @throws",
    );
    expect(messages).toContain(
      "@errors must contain only numeric diagnostic codes",
    );
    expect(messages).toContain("cut-start and cut-end must be balanced");
    expect(messages).toContain(
      "@failure must be `@failure {@link FailureType} - Explanation.`",
    );
    expect(messages).toContain(
      "overload facets need compatible parameter vocabularies",
    );
    expect(messages).toContain(
      "{@inheritDoc} must not mix a second local narrative",
    );
    expect(messages).toContain("Placeholder needs a meaningful summary");
    expect(messages.some((message) => message.includes("@docsIgnore"))).toBe(
      true,
    );
    expect(
      messages.some((message) => message.includes("JSDoc-style '{type}'")),
    ).toBe(true);
    expect(
      messages.some((message) =>
        message.startsWith("TSDoc: The opening backtick for a code fence"),
      ),
    ).toBe(true);
    expect(messages).toContain("document missing with TSDoc");
    expect(messages).toContain("document missingAssigned with TSDoc");
    expect(messages).not.toContain("document nested with TSDoc");
    expect(messages).toContain("run needs substantive @remarks");
    expect(
      output.diagnostics.find(
        (diagnostic) =>
          diagnostic.message === "@filename must name a relative virtual path",
      )?.labels?.[0]?.span.line,
    ).toBe(20);
  });

  it("ignores a nested config when the mandatory CLI boundary is used", () => {
    const result = runOxlint("tooling/oxlint/fixtures/nested/invalid.ts");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("document NestedSuppressionMustNotWin");
  });
});

describe("root discovery and integrity", () => {
  it("uses exact disjoint handwritten and generated root equations", () => {
    expect(readerRoots).toHaveLength(50);
    expect(handwrittenRoots).toHaveLength(46);
    expect(new Set([...handwrittenRoots, ...generatedRoots])).toEqual(
      new Set(readerRoots),
    );
    expect(
      handwrittenRoots.filter((root) => generatedRoots.includes(root)),
    ).toEqual([]);
    expect(generatedRoots).toEqual([
      "packages/effect-joern/src/pure/generated/cpg.ts",
      "packages/effect-joern/src/pure/generated/nodes.ts",
      "packages/effect-joern/src/pure/generated/prop.ts",
      "packages/effect-joern/src/pure/generated/schema.ts",
    ]);

    const documentationOverride = config.overrides?.[0];
    expect(documentationOverride?.files).toEqual(handwrittenRoots);
    expect(documentationOverride?.rules?.["attune/tsdoc"]).toBe("error");
    expect(config.rules?.["attune/tsdoc"]).toBe("off");
    expect(
      (config.rules as Readonly<Record<string, unknown>>)[
        "jsdoc/check-tag-names"
      ],
    ).toBe("off");
    expect(config.jsPlugins).toEqual(["./tooling/oxlint/attune.ts"]);
    expect(config.options).toMatchObject({
      typeAware: true,
      typeCheck: false,
    });
  });

  it("rejects qualified and all-rule disable directives", () => {
    expect(
      forbiddenSuppressionLine(
        "const first = 1\n// oxlint-disable-next-line attune/tsdoc\nconst x = 1",
      ),
    ).toBe(2);
    expect(forbiddenSuppressionLine("/* eslint-disable */\nconst x = 1")).toBe(
      1,
    );
    expect(
      forbiddenSuppressionLine(
        "// oxlint-disable-next-line no-console\nconsole.log('ok')",
      ),
    ).toBeUndefined();
    expect(
      forbiddenSuppressionLine(
        "const x = 1; // eslint-disable-line attune/tsdoc",
      ),
    ).toBe(1);
    expect(
      forbiddenSuppressionLine(
        "/* oxlint-disable no-console, attune/tsdoc -- reason */",
      ),
    ).toBe(1);
    expect(
      forbiddenSuppressionLine(
        "/* eslint-disable no-console,\n * attune/tsdoc\n */",
      ),
    ).toBe(1);
  });

  it("keeps the formatter exception equal to the fenced-TSDoc set", () => {
    const expected = [
      "packages/attune-guide/src/index.ts",
      "tooling/oxlint/fixtures/invalid.ts",
      "tooling/oxlint/fixtures/valid.ts",
    ];
    expect(fencedTsdocFiles).toEqual(expected);
    expect(unformattedTsdocFiles).toEqual(expected);
  });

  it("does not apply the human rule to generated production roots", () => {
    const result = spawnSync(
      oxlint,
      [
        "--disable-nested-config",
        "--config",
        resolve(workspaceRoot, "oxlint.config.ts"),
        "--format",
        "json",
        "packages/effect-joern/src/pure/generated/cpg.ts",
      ],
      { cwd: workspaceRoot, encoding: "utf8" },
    );
    const output = JSON.parse(result.stdout) as {
      diagnostics: ReadonlyArray<{ readonly code?: string }>;
    };
    expect(
      output.diagnostics.some(
        (diagnostic) => diagnostic.code === "attune(tsdoc)",
      ),
    ).toBe(false);
  });
});
