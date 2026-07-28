/// <reference lib="dom" />

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import * as Path from "node:path";

import { expect, test } from "@playwright/test";

import {
  API_MANIFEST_SCHEMA_VERSION,
  type ApiExample,
  type ApiManifest,
  type DocumentationText,
  type SourceSpan,
} from "../../src/model.ts";
import { buildSite } from "../../src/site.ts";

const revision = "0123456789abcdef0123456789abcdef01234567";
const repositoryUrl = "https://github.com/example/attune";

const source = (path: string, line: number, endLine = line): SourceSpan => ({
  column: 1,
  digest: "a".repeat(64),
  end: 120,
  endColumn: 1,
  endLine,
  line,
  path,
  start: 0,
  url: `${repositoryUrl}/blob/${revision}/${path}#L${line}${endLine === line ? "" : `-L${endLine}`}`,
});

const docs = (
  summary: string,
  remarks = "",
  returns = "",
): DocumentationText => ({
  failures: [],
  parameters: [],
  remarks,
  returns,
  summary,
});

const attuneSource = source("packages/attune-mcp/src/index.ts", 18, 44);
const materializeSource = source(
  "packages/attune-mcp/src/investigation/service.ts",
  91,
  103,
);
const packageExampleSource = source("packages/attune-mcp/src/index.ts", 4, 13);
const example = (
  id: string,
  title: string,
  code: string,
  principal: string,
  exampleSource: SourceSpan,
): ApiExample => ({
  code,
  files: ["index.ts"],
  id,
  principal,
  source: exampleSource,
  title,
});
const packageExamples = [
  example(
    "package/example/1",
    "Start an investigation",
    `/** Coordinates a typed investigation lifecycle. */
interface Attune {
  readonly materialize: () => void;
}
// ---cut-before---
declare const attune: Attune;
attune.materialize();`,
    "Attune",
    packageExampleSource,
  ),
  example(
    "package/example/2",
    "Keep the service typed",
    `/** Coordinates a typed investigation lifecycle. */
interface Attune {
  readonly materialize: () => void;
}
declare const attune: Attune;
// ---cut-before---
const service: Attune = attune;`,
    "Attune",
    packageExampleSource,
  ),
  example(
    "package/example/3",
    "Hide unrelated setup",
    `/** Coordinates a typed investigation lifecycle. */
interface Attune {
  readonly materialize: () => void;
}
declare const attune: Attune;
// ---cut-start---
attune.materialize();
// ---cut-end---
type Service = Attune;`,
    "Attune",
    packageExampleSource,
  ),
] as const;
const symbolExamples = packageExamples.slice(0, 2);
const memberExamples = [
  example(
    "attune.materialize/example/1",
    "Materialize a snapshot",
    `interface Attune {
  /** Creates a materialized investigation workspace. */
  readonly materialize: () => void;
}
declare const attune: Attune;
// ---cut-before---
attune.materialize();`,
    "materialize",
    materializeSource,
  ),
  example(
    "attune.materialize/example/2",
    "Retain the operation",
    `interface Attune {
  /** Creates a materialized investigation workspace. */
  readonly materialize: () => void;
}
declare const attune: Attune;
// ---cut-before---
const materialize = attune.materialize;`,
    "materialize",
    materializeSource,
  ),
] as const;

const manifest: ApiManifest = {
  declaration: {
    digest: "b".repeat(64),
    path: "packages/attune-mcp/dist/index.d.mts",
    sourceDigest: "c".repeat(64),
  },
  diagnostics: [],
  generator: {
    name: "attune-docs",
    tsMorphCompilerVersion: "7.0.2",
    tsMorphVersion: "28.0.0",
    typescriptVersion: "7.0.2",
    version: "0.0.0",
  },
  package: {
    documentation: docs(
      "A small, lifecycle-ordered investigation API.",
      "Start with {@link Attune}, then follow its documented lifecycle methods.",
    ),
    entryPoint: "packages/attune-mcp/src/index.ts",
    examples: packageExamples,
    name: "attune-mcp",
    provenance: {
      declaration: attuneSource,
      implementation: attuneSource,
      tsdoc: source("packages/attune-mcp/src/index.ts", 1, 13),
    },
    relations: [],
  },
  schemaVersion: API_MANIFEST_SCHEMA_VERSION,
  source: {
    digest: "d".repeat(64),
    ref: revision,
    repositoryUrl,
    revision: `git:${revision}`,
  },
  symbols: [
    {
      declaration: "export interface Attune",
      documentation: docs(
        "Coordinates a typed investigation lifecycle.",
        "Use the methods in source order.",
      ),
      examples: symbolExamples,
      exportName: "Attune",
      id: "attune",
      kind: "interface",
      members: [
        {
          anchor: "materialize",
          documentation: docs(
            "Creates a materialized investigation workspace.",
            "",
            "A capability ready for activation.",
          ),
          examples: memberExamples,
          id: "attune.materialize",
          kind: "function",
          name: "materialize",
          provenance: {
            declaration: materializeSource,
            implementation: materializeSource,
            tsdoc: materializeSource,
          },
          relations: [],
          signature: "readonly materialize: () => void",
          slug: "materialize",
          typeParameters: [],
        },
      ],
      provenance: {
        declaration: attuneSource,
        implementation: attuneSource,
        tsdoc: attuneSource,
      },
      relations: [],
      signature: "interface Attune",
      slug: "attune",
      typeParameters: [],
    },
  ],
};

let outputDirectory = "";
let server: Server | undefined;
let origin = "";

const listen = async (
  site: string,
): Promise<{
  readonly origin: string;
  readonly server: Server;
}> => {
  const instance = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? "/", "http://127.0.0.1").pathname,
      );
      const relative =
        pathname === "/"
          ? "index.html"
          : pathname.replace(/^\/+/u, "").replace(/\/$/u, "/index.html");
      const target = Path.resolve(site, relative);
      if (!target.startsWith(`${Path.resolve(site)}${Path.sep}`)) {
        response.writeHead(400).end("unsafe path");
        return;
      }
      const extension = Path.extname(target);
      const contentType =
        extension === ".html"
          ? "text/html; charset=utf-8"
          : extension === ".css"
            ? "text/css; charset=utf-8"
            : extension === ".js"
              ? "text/javascript; charset=utf-8"
              : "application/octet-stream";
      response.writeHead(200, { "content-type": contentType });
      response.end(await readFile(target));
    } catch {
      if (!response.headersSent) response.writeHead(404);
      response.end("not found");
    }
  });
  await new Promise<void>((resolve, reject) => {
    instance.once("error", reject);
    instance.listen(0, "127.0.0.1", resolve);
  });
  const address = instance.address();
  if (address === null || typeof address === "string") {
    throw new Error("Playwright fixture server has no TCP address");
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    server: instance,
  };
};

test.beforeAll(async () => {
  outputDirectory = await mkdtemp(
    Path.join(tmpdir(), "attune-docs-playwright-"),
  );
  await buildSite(manifest, {
    basePath: "/",
    outputDirectory,
    siteUrl: "https://example.test/",
  });
  const fixture = await listen(outputDirectory);
  origin = fixture.origin;
  server = fixture.server;
});

test.afterAll(async () => {
  if (server !== undefined) {
    await new Promise<void>((resolve, reject) =>
      server!.close((cause) => {
        if (cause === undefined) resolve();
        else reject(cause);
      }),
    );
  }
  if (outputDirectory !== "") {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});

test("links a checked identifier to its API and immutable source", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin,
  });
  await page.route(`${repositoryUrl}/**`, async (route) => {
    await route.fulfill({
      body: "<!doctype html><title>Immutable source fixture</title>",
      contentType: "text/html",
      status: 200,
    });
  });

  const response = await page.goto(origin);
  expect(response?.ok()).toBe(true);
  const examples = page.locator(".page-example");
  await expect(examples).toHaveCount(3);
  const example = examples.first();
  const identifier = example
    .locator(".twoslash-identifier-link", {
      hasText: "Attune",
    })
    .first();
  const popupId = await identifier.getAttribute("aria-describedby");
  expect(popupId).not.toBeNull();
  const popup = example.locator(`[id="${popupId}"]`);

  await identifier.focus();
  await expect(identifier).toHaveAttribute(
    "aria-label",
    "Open API reference for Attune",
  );
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toContainText(
    "Coordinates a typed investigation lifecycle.",
  );
  await expect(popup.locator(".twoslash-api-link")).toHaveAttribute(
    "href",
    "/api/attune.html",
  );
  await expect(popup.locator(".twoslash-source-link")).toHaveAttribute(
    "href",
    attuneSource.url,
  );

  await page.keyboard.press("Escape");
  await expect(popup).toHaveCSS("opacity", "0");
  const identifierBox = await identifier.boundingBox();
  expect(identifierBox).not.toBeNull();
  await page.mouse.move(
    identifierBox!.x + identifierBox!.width / 2,
    identifierBox!.y + identifierBox!.height / 2,
  );
  await expect(popup).toHaveCSS("opacity", "1");

  const copy = example.locator("[data-copy-code]");
  await copy.click();
  await expect(copy).toHaveText("Copied");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          navigator as unknown as {
            readonly clipboard: { readonly readText: () => Promise<string> };
          }
        ).clipboard.readText(),
      ),
    )
    .toBe("declare const attune: Attune;\nattune.materialize();");

  await identifier.focus();
  await popup.locator(".twoslash-api-link").click();
  await expect(page).toHaveURL(`${origin}/api/attune.html`);
  const symbolExample = page.locator(".page-example").first();
  const symbolIdentifier = symbolExample
    .locator(".twoslash-identifier-link", { hasText: "Attune" })
    .first();
  await symbolIdentifier.focus();
  const symbolPopupId = await symbolIdentifier.getAttribute("aria-describedby");
  expect(symbolPopupId).not.toBeNull();
  const symbolSource = symbolExample
    .locator(`[id="${symbolPopupId}"]`)
    .locator(".twoslash-source-link");
  await symbolSource.click();
  await expect(page).toHaveURL(attuneSource.url);
  await expect(page).toHaveTitle("Immutable source fixture");
});
