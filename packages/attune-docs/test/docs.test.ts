import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { assertApiManifestSchema, auditManifest } from "../src/audit.ts";
import { apiManifestDigest, canonicalJson, digest } from "../src/canonical.ts";
import { assessTypeDocCompatibility } from "../src/compatibility.ts";
import { extractApiManifest } from "../src/extract.ts";
import {
  normalizeBasePath,
  renderApiMember,
  renderApiSymbol,
  renderPackageReference,
} from "../src/html.ts";
import type {
  ApiManifest,
  DocumentationPolicy,
  SourceSpan,
} from "../src/model.ts";
import { buildSite, resolveOutputPath } from "../src/site.ts";
import { discoverStaticPages, type StaticPage } from "../src/static-pages.ts";

const fixtureRoot = Path.join(import.meta.dirname, "fixtures", "api");
const schemaPath = Path.join(
  import.meta.dirname,
  "..",
  "schema",
  "api-manifest.schema.json",
);
const policy: DocumentationPolicy = {
  requiredDocumentation: [
    {
      name: "fixture-api",
      exportNamePattern: "^(Investigation|Attune|ExampleFailure)$",
      minMatches: 3,
      rationale: "The complete fixture API is documented.",
    },
  ],
  allowedRelationTargets: [],
};

const extractFixture = (
  overrides: Partial<Parameters<typeof extractApiManifest>[0]> = {},
) =>
  extractApiManifest({
    buildUpstream: false,
    declarationEntryPoint: Path.join(fixtureRoot, "src", "index.ts"),
    entryPoint: Path.join(fixtureRoot, "src", "index.ts"),
    packageName: "fixture",
    packageRoot: fixtureRoot,
    policy,
    repositoryUrl: "https://example.test/repository",
    sourceRef: "0123456789abcdef0123456789abcdef01234567",
    sourceRevision: "fixture-revision",
    tsConfigPath: Path.join(fixtureRoot, "tsconfig.json"),
    ...overrides,
  });

let manifest: ApiManifest;
const outputs: string[] = [];

beforeAll(async () => {
  manifest = await extractFixture();
});

afterAll(async () => {
  await Promise.all(
    outputs.map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

const verifySpan = async (source: SourceSpan): Promise<void> => {
  const path = Path.resolve(import.meta.dirname, "..", "..", "..", source.path);
  const bytes = await readFile(path, "utf8");
  expect(digest(bytes.slice(source.start, source.end))).toBe(source.digest);
  expect(source.url).toContain(
    `#L${source.line}${source.endLine === source.line ? "" : `-L${source.endLine}`}`,
  );
};

const htmlBelow = async (root: string): Promise<readonly string[]> => {
  const files: string[] = [];
  for (const name of await readdir(root)) {
    const path = Path.join(root, name);
    if ((await stat(path)).isDirectory())
      files.push(...(await htmlBelow(path)));
    else if (path.endsWith(".html")) files.push(path);
  }
  return files;
};

describe("reference extraction", () => {
  test("preserves package, symbol, and member lifecycle order", () => {
    expect(manifest.schemaVersion).toBe("4.0.0");
    expect(manifest.package.documentation.summary).toContain(
      "small lifecycle package",
    );
    expect(manifest.symbols.map((symbol) => symbol.exportName)).toEqual([
      "Investigation",
      "Attune",
      "ExampleFailure",
    ]);
    expect(manifest.symbols[0]?.typeParameters).toEqual([
      {
        default: '"active"',
        description: "State carried by the capability.",
        constraint: "string",
        name: "State",
      },
    ]);
    const attune = manifest.symbols[1]!;
    expect(attune.members.map((member) => member.name)).toEqual([
      "materialize",
      "finalize",
    ]);
    expect(attune.members[0]?.documentation).toMatchObject({
      parameters: [
        {
          name: "input",
          description: "Revision requested by the caller.",
        },
      ],
      returns: "A materialized investigation.",
      failures: ["`ExampleFailure` when the revision cannot be read."],
    });
    expect(attune.members[0]?.typeParameters).toEqual([
      {
        constraint: "string",
        description: "Revision identifier supplied by the caller.",
        name: "Revision",
      },
    ]);
    expect(attune.members[0]?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "throws",
          target: "ExampleFailure",
          targetSymbolId: "fixture#ExampleFailure",
        }),
      ]),
    );
  });

  test("extracts complete multi-file and cut-bearing example programs", () => {
    const examples = manifest.package.examples;
    expect(
      manifest.symbols.map((symbol) => [
        symbol.exportName,
        symbol.examples.length,
      ]),
    ).toEqual([
      ["Investigation", 2],
      ["Attune", 2],
      ["ExampleFailure", 2],
    ]);
    expect(examples.map((example) => example.title)).toEqual([
      "A complete multi-file program",
      "Narrow a materialized capability",
      "Hide unrelated capability work",
    ]);
    expect(examples[0]!.files).toEqual(["model.ts", "index.ts"]);
    expect(examples[0]!.code).toContain("// ---cut-before---");
    expect(examples[0]!.code).toContain("// ---cut-after---");
    expect(examples[0]!.code).toContain("import type { Investigation }");
    expect(examples[1]!.code).toContain("// ---cut-before---");
    expect(examples[2]!.code).toContain("// ---cut-start---");
    expect(examples[2]!.code).toContain("// ---cut-end---");
    expect(
      examples.every((example) => example.principal === "Investigation"),
    ).toBe(true);
    expect(examples.every((example) => !example.code.includes("```"))).toBe(
      true,
    );
  });

  test("records exact local spans, immutable links, and merged provenance", async () => {
    const attune = manifest.symbols.find(
      (symbol) => symbol.exportName === "Attune",
    )!;
    await Promise.all([
      verifySpan(manifest.package.provenance.tsdoc!),
      verifySpan(attune.provenance.declaration),
      verifySpan(attune.provenance.implementation),
      verifySpan(attune.members[0]!.examples[0]!.source),
    ]);
    expect(attune.provenance.declaration.digest).not.toBe(
      attune.provenance.implementation.digest,
    );
    expect(attune.provenance.declaration.path).toBe(
      attune.provenance.implementation.path,
    );
  });

  test("binds extraction to the current declaration digest", async () => {
    expect(manifest.declaration.sourceDigest).toBe(manifest.source.digest);
    expect(manifest.declaration.digest).toMatch(/^[a-f0-9]{64}$/u);
    await expect(
      extractFixture({ expectedDeclarationDigest: "0".repeat(64) }),
    ).rejects.toThrow("Stale declaration digest");
  });

  test("produces deterministic manifests and schema-valid records", async () => {
    const second = await extractFixture();
    expect(apiManifestDigest(second)).toBe(apiManifestDigest(manifest));
    await expect(
      assertApiManifestSchema(manifest, schemaPath),
    ).resolves.toBeUndefined();
  });

  test("audits closed exports and source-owned example floors", () => {
    expect(
      manifest.diagnostics.filter(
        (diagnostic) => diagnostic.code === "missing-example",
      ),
    ).toEqual([]);
    const diagnostics = auditManifest(manifest, {
      ...policy,
      publicNames: ["Attune"],
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-documentation",
          symbolId: "package",
        }),
      ]),
    );
    expect(
      manifest.symbols.every(
        (symbol) =>
          symbol.examples.length >= 2 &&
          symbol.examples.every(
            (example) => example.principal === symbol.exportName,
          ),
      ),
    ).toBe(true);
    expect(
      manifest.symbols
        .flatMap((symbol) => symbol.members)
        .every(
          (member) =>
            member.examples.length >= 2 &&
            member.examples.every(
              (example) => example.principal === member.name,
            ),
        ),
    ).toBe(true);
    expect("pageExample" in manifest.package).toBe(false);

    const attune = manifest.symbols[1]!;
    const materialize = attune.members[0]!;
    const missingSources: ApiManifest = {
      ...manifest,
      package: {
        ...manifest.package,
        examples: manifest.package.examples.slice(0, 2),
      },
      symbols: manifest.symbols.map((symbol) =>
        symbol.id === attune.id
          ? {
              ...symbol,
              examples: symbol.examples.slice(0, 1),
              members: symbol.members.map((member) =>
                member.id === materialize.id
                  ? { ...member, examples: [] }
                  : member,
              ),
            }
          : symbol,
      ),
    };
    expect(auditManifest(missingSources, policy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-example",
          symbolId: "package",
        }),
        expect.objectContaining({
          code: "missing-example",
          symbolId: attune.id,
        }),
        expect.objectContaining({
          code: "missing-example",
          symbolId: materialize.id,
        }),
      ]),
    );

    const wrongPrincipal: ApiManifest = {
      ...manifest,
      symbols: manifest.symbols.map((symbol) =>
        symbol.id === attune.id
          ? {
              ...symbol,
              examples: symbol.examples.map((example, index) =>
                index === 0
                  ? { ...example, principal: "Investigation" }
                  : example,
              ),
            }
          : symbol,
      ),
    };
    expect(auditManifest(wrongPrincipal, policy)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-example",
          symbolId: attune.id,
        }),
      ]),
    );
  });

  test("keeps TypeDoc compatibility explicit", () => {
    expect(assessTypeDocCompatibility("0.28.0", "7.0.2")).toMatchObject({
      compatible: false,
    });
  });
});

describe("reference rendering", () => {
  const pages: readonly StaticPage[] = [];

  test("makes the package reference root and removes parallel learning routes", () => {
    const html = renderPackageReference(manifest, pages, "/attune/");
    expect(html).toContain('data-page-id="package:fixture"');
    expect(html).toContain('data-page-principal="Investigation"');
    expect(html.match(/class="page-example"/gu)).toHaveLength(3);
    expect(html.match(/class="code-block checked-code"/gu)).toHaveLength(3);
    expect(html).toContain("twoslash-hover");
    expect(html.indexOf(">Investigation<")).toBeLessThan(
      html.indexOf(">Attune<"),
    );
    expect(html).not.toMatch(/Onboarding|DocumentationPage/u);
  });

  test("gives every symbol and member its own checked principal and source", () => {
    for (const symbol of manifest.symbols) {
      const html = renderApiSymbol(symbol, manifest, pages, "/attune/");
      expect(html).toContain(`data-page-id="${symbol.id}"`);
      expect(html).toContain(`data-page-principal="${symbol.exportName}"`);
      expect(html.match(/class="page-example"/gu)).toHaveLength(3);
      expect(html.match(/class="code-block checked-code"/gu)).toHaveLength(3);
      expect(html).toContain("twoslash-hover");
      expect(html).toContain(symbol.provenance.declaration.url);
      for (const member of symbol.members) {
        const memberHtml = renderApiMember(
          member,
          symbol,
          manifest,
          pages,
          "/attune/",
        );
        expect(memberHtml).toContain(`data-page-id="${member.id}"`);
        expect(memberHtml).toContain(`data-page-principal="${member.name}"`);
        expect(memberHtml.match(/class="page-example"/gu)).toHaveLength(3);
        expect(
          memberHtml.match(/class="code-block checked-code"/gu),
        ).toHaveLength(3);
        expect(memberHtml).toContain("twoslash-hover");
        expect(memberHtml).toContain(member.provenance.declaration.url);
      }
    }
    const investigation = manifest.symbols.find(
      (symbol) => symbol.exportName === "Investigation",
    )!;
    const investigationHtml = renderApiSymbol(
      investigation,
      manifest,
      pages,
      "/attune/",
    );
    expect(investigationHtml).toContain("<h2>Type parameters</h2>");
    expect(investigationHtml).toContain("State carried by the capability.");

    const attune = manifest.symbols.find(
      (symbol) => symbol.exportName === "Attune",
    )!;
    const materialize = attune.members.find(
      (member) => member.name === "materialize",
    )!;
    const materializeHtml = renderApiMember(
      materialize,
      attune,
      manifest,
      pages,
      "/attune/",
    );
    expect(materializeHtml).toContain("<h2>Type parameters</h2>");
    expect(materializeHtml).toContain(
      "Revision identifier supplied by the caller.",
    );
  });

  test("requires a hover-bearing example owned by the page", () => {
    const symbol = manifest.symbols[0]!;
    const emitted = {
      ...symbol,
      examples: symbol.examples.map((example) => ({
        ...example,
        code: `// @showEmit\n${example.code}`,
      })),
    };
    expect(() => renderApiSymbol(emitted, manifest, pages, "/attune/")).toThrow(
      /no hover-bearing source example/u,
    );
  });

  test("emits only reference routes plus independent evidence pages", async () => {
    const output = await mkdtemp(Path.join(tmpdir(), "attune-reference-"));
    outputs.push(output);
    await buildSite(
      manifest,
      {
        basePath: "/attune/",
        outputDirectory: output,
        siteUrl: "https://example.test/attune/",
      },
      [
        {
          slug: "fixture-evidence",
          title: "Fixture evidence",
          markdown: "# Fixture evidence\n\n```ts\ntype Evidence = true;\n```\n",
        },
      ],
    );
    await expect(stat(Path.join(output, "index.html"))).resolves.toBeDefined();
    await expect(
      stat(Path.join(output, "api", "attune", "materialize.html")),
    ).resolves.toBeDefined();
    await expect(
      stat(Path.join(output, "experiments", "fixture-evidence.html")),
    ).resolves.toBeDefined();
    for (const path of await htmlBelow(output)) {
      const html = await readFile(path, "utf8");
      expect(html).toContain("data-page-example");
      expect(html).toContain("twoslash-linked");
      expect(html).toContain("twoslash-api-link");
      expect(html).toContain("twoslash-source-link");
      expect(html).toContain("Twoslash TypeScript");
      expect(
        html.match(/class="page-example"/gu)?.length,
      ).toBeGreaterThanOrEqual(3);
      expect(html.match(/data-example-id=/gu)?.length).toBeGreaterThanOrEqual(
        3,
      );
      expect(html).not.toMatch(/interface\s+\w+Page\b/u);
      expect(html).not.toContain("readonly materialize: unknown");
      expect(html).not.toMatch(/NotFoundPage|ExperimentPage/u);
    }
  });

  test("rejects unsafe paths and mismatched publication revisions", async () => {
    expect(() => resolveOutputPath("/tmp/reference", "../escape")).toThrow(
      "escapes",
    );
    expect(() => normalizeBasePath("/../bad")).toThrow("Unsafe");
    const output = await mkdtemp(Path.join(tmpdir(), "attune-publication-"));
    outputs.push(output);
    await expect(
      buildSite(manifest, {
        basePath: "/attune/",
        outputDirectory: output,
        sourceCommit: "f".repeat(40),
        siteUrl: "https://example.test/attune/",
      }),
    ).rejects.toThrow("immutable extracted source revision");
  });
});

describe("independent static evidence", () => {
  const publicDigest = (
    value: Readonly<Record<string, unknown>>,
    field: string,
  ): string => {
    const copy = { ...value };
    delete copy[field];
    return `sha256:${digest(canonicalJson(copy))}`;
  };

  test("keeps closed experiment publications independent of API prose", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "attune-evidence-"));
    outputs.push(root);
    const directory = Path.join(root, "experiment");
    await mkdir(directory);
    const manifestRecord: Record<string, unknown> = {
      experiment_id: "experiment",
      manifest_digest: "",
    };
    manifestRecord.manifest_digest = publicDigest(
      manifestRecord,
      "manifest_digest",
    );
    const report: Record<string, unknown> = {
      title: "Independent evidence",
      report_digest: "",
    };
    report.report_digest = publicDigest(report, "report_digest");
    const approval: Record<string, unknown> = {
      manifest_digest: manifestRecord.manifest_digest,
      report_digest: report.report_digest,
      approval_digest: "",
    };
    approval.approval_digest = publicDigest(approval, "approval_digest");
    const publication = {
      schema_version: 1,
      experiment_id: "experiment",
      manifest_digest: manifestRecord.manifest_digest,
      report_digest: report.report_digest,
      evidence_digest: "sha256:evidence",
      approval_digest: approval.approval_digest,
      activegraph_publication_address: "sha256:publication",
      exporter_version: "fixture",
      prior_revision: null,
      publication_digest: "sha256:bundle",
    };
    await Promise.all([
      writeFile(
        Path.join(directory, "manifest.json"),
        JSON.stringify(manifestRecord),
      ),
      writeFile(Path.join(directory, "report.json"), JSON.stringify(report)),
      writeFile(
        Path.join(directory, "approval.json"),
        JSON.stringify(approval),
      ),
      writeFile(
        Path.join(directory, "publication.json"),
        JSON.stringify(publication),
      ),
      writeFile(Path.join(directory, "index.md"), "# Independent evidence\n"),
    ]);
    await expect(discoverStaticPages(root)).resolves.toEqual([
      {
        slug: "experiment",
        title: "Independent evidence",
        markdown: "# Independent evidence\n",
      },
    ]);
  });
});
