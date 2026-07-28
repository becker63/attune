/// <reference lib="dom" />

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import * as Path from "node:path";

import { expect, test } from "@playwright/test";

import { extractApiManifest } from "../../src/extract.ts";
import type { DocumentationPolicy, RepositoryMap } from "../../src/model.ts";
import { buildSite } from "../../src/site.ts";

const fixtureRoot = Path.resolve(import.meta.dirname, "..", "fixtures", "api");
const policy: DocumentationPolicy = {
  allowedRelationTargets: ["active", "preserve"],
  requiredDocumentation: [],
  requiredRelations: [],
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
      const bytes = await readFile(target);
      response.writeHead(200, { "content-type": contentType });
      response.end(bytes);
    } catch {
      if (!response.headersSent) {
        response.writeHead(404);
      }
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
  const manifest = await extractApiManifest({
    entryPoint: Path.join(fixtureRoot, "src", "index.ts"),
    packageName: "fixture",
    packageRoot: fixtureRoot,
    policy,
    repositoryUrl: "https://example.test/repository",
    sourceRef: "fixture-ref",
    sourceRevision: "fixture-revision",
    tsConfigPath: Path.join(fixtureRoot, "tsconfig.json"),
  });
  const repository: RepositoryMap = {
    areas: [],
    revision: manifest.source.revision,
  };
  outputDirectory = await mkdtemp(
    Path.join(tmpdir(), "attune-docs-playwright-"),
  );
  await buildSite(manifest, repository, [], {
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

test("renders and opens a Shiki/Twoslash hover", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin,
  });
  const response = await page.goto(`${origin}/api/investigation.html`);
  expect(response?.ok()).toBe(true);
  await expect(page.locator("main#content")).toBeVisible();
  await expect(page.locator("pre.shiki.attune-code").first()).toBeVisible();
  await expect(
    page.locator("pre.shiki .line span[style*='color']").first(),
  ).toBeVisible();

  const lens = page.locator(".page-type-lens");
  await lens.locator("summary").click();
  const hover = lens.locator(".twoslash-hover").first();
  await expect(hover).toBeVisible();
  const popup = hover.locator(".twoslash-popup-container");
  await hover.focus();
  await expect(hover).toHaveAttribute("aria-label", "Show inferred type");
  await expect(popup).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await lens.locator("summary").focus();
  await expect(popup).toHaveCSS("opacity", "0");

  const hoverBox = await hover.boundingBox();
  expect(hoverBox).not.toBeNull();
  await page.mouse.move(
    hoverBox!.x + Math.min(4, hoverBox!.width / 2),
    hoverBox!.y + hoverBox!.height / 2,
  );
  await expect(popup).toHaveCSS("opacity", "1");
  await expect(popup).toContainText("DocumentationPage");
  const popupBox = await popup.boundingBox();
  expect(popupBox).not.toBeNull();
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest(".twoslash-popup-container") !== null,
      {
        x: popupBox!.x + popupBox!.width / 2,
        y: popupBox!.y + popupBox!.height / 2,
      },
    ),
  ).toBe(true);

  const copy = lens.locator("[data-copy-code]");
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
    .toContain("type DocumentationPage");
});
