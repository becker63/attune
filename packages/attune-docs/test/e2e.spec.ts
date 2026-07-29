/// <reference lib="dom" />

import { access } from "node:fs/promises";
import * as Path from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test } from "@playwright/test";

const indexPath = Path.resolve(import.meta.dirname, "..", "dist", "index.html");

test("a definition link uses native fragments and browser history", async ({
  page,
}) => {
  await access(indexPath);
  const url = pathToFileURL(indexPath);
  url.hash = "complete-investigation";
  await page.goto(url.href);

  const program = page.locator('pre[data-code-role="example"]').first();
  await expect(program).toBeVisible();
  const definition = program.locator('a[href="#Investigation"]').first();
  await expect(definition).toBeVisible();
  await definition.click();

  await expect.poll(() => new URL(page.url()).hash).toBe("#Investigation");
  const target = page.locator("#Investigation");
  await expect(target).toBeVisible();
  expect(
    await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        style.outlineStyle === "solid" && parseFloat(style.outlineWidth) > 0
      );
    }),
  ).toBe(true);

  const sourceHref = await target
    .locator("..")
    .locator("a.source-link")
    .getAttribute("href");
  expect(sourceHref).toMatch(
    /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[0-9a-f]{40}\//u,
  );

  await page.goBack();
  await expect
    .poll(() => new URL(page.url()).hash)
    .toBe("#complete-investigation");
  await expect(definition).toBeInViewport();
});
