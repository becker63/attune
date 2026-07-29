/// <reference lib="dom" />

import { access } from "node:fs/promises";
import * as Path from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test, type Page } from "@playwright/test";

const indexPath = Path.resolve(import.meta.dirname, "..", "dist", "index.html");
const pageUrl = (hash = "") => {
  const url = pathToFileURL(indexPath);
  url.hash = hash;
  return url.href;
};

type TreeProbe = {
  drawArrays: number;
  hidden: boolean;
  lossEvents: number;
  maxPendingFrames: number;
  pendingFrames: number;
  rafCallbacks: number;
  rafCancels: number;
  rafRequests: number;
  restoreEvents: number;
  revealDraws: number[];
  times: number[];
  webgl2Calls: number;
};

const runtimeProbe = `
  (() => {
    const stats = {
      drawArrays: 0,
      hidden: false,
      lossEvents: 0,
      maxPendingFrames: 0,
      pendingFrames: 0,
      rafCallbacks: 0,
      rafCancels: 0,
      rafRequests: 0,
      restoreEvents: 0,
      revealDraws: [],
      times: [],
      webgl2Calls: 0,
    };
    Object.defineProperty(window, "__attuneTreeProbe", { value: stats });

    const pending = new Set();
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      let id = 0;
      id = request((time) => {
        pending.delete(id);
        stats.pendingFrames = pending.size;
        stats.rafCallbacks += 1;
        callback(time);
      });
      pending.add(id);
      stats.pendingFrames = pending.size;
      stats.maxPendingFrames = Math.max(stats.maxPendingFrames, pending.size);
      stats.rafRequests += 1;
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      if (pending.delete(id)) stats.rafCancels += 1;
      stats.pendingFrames = pending.size;
      cancel(id);
    };

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => stats.hidden,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => stats.hidden ? "hidden" : "visible",
    });

    const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, options) {
      if (kind === "webgl2") stats.webgl2Calls += 1;
      return originalContext.call(this, kind, options);
    };

    const timeLocations = new WeakSet();
    const gl = WebGL2RenderingContext.prototype;
    const getUniformLocation = gl.getUniformLocation;
    gl.getUniformLocation = function (program, name) {
      const location = getUniformLocation.call(this, program, name);
      if (name === "uTime" && location !== null) timeLocations.add(location);
      return location;
    };
    const uniform1f = gl.uniform1f;
    gl.uniform1f = function (location, value) {
      if (location !== null && timeLocations.has(location)) stats.times.push(value);
      return uniform1f.call(this, location, value);
    };
    const drawArrays = gl.drawArrays;
    gl.drawArrays = function (mode, first, count) {
      stats.drawArrays += 1;
      return drawArrays.call(this, mode, first, count);
    };

    const hidden = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidden");
    if (hidden?.get && hidden.set) {
      Object.defineProperty(HTMLElement.prototype, "hidden", {
        configurable: hidden.configurable,
        enumerable: hidden.enumerable,
        get: hidden.get,
        set(value) {
          if (this instanceof HTMLCanvasElement && this.classList.contains("tree-canvas") && !value) {
            stats.revealDraws.push(stats.drawArrays);
          }
          hidden.set.call(this, value);
        },
      });
    }
  })();
`;

const installRuntimeProbe = async (page: Page) => {
  await page.addInitScript(runtimeProbe);
};

const readRuntimeProbe = (page: Page) =>
  page.evaluate<TreeProbe>(
    () =>
      (window as unknown as { __attuneTreeProbe: TreeProbe }).__attuneTreeProbe,
  );

const setDocumentHidden = (page: Page, hidden: boolean) =>
  page.evaluate((next) => {
    (
      window as unknown as { __attuneTreeProbe: TreeProbe }
    ).__attuneTreeProbe.hidden = next;
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

test.beforeEach(async () => {
  await access(indexPath);
});

test("a definition link uses native fragments and browser history", async ({
  page,
}) => {
  await page.goto(pageUrl("complete-investigation"));

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
  expect(
    await page.evaluate(() => {
      const find = (
        window as Window & {
          find?: (
            query: string,
            caseSensitive?: boolean,
            backwards?: boolean,
            wrapAround?: boolean,
          ) => boolean;
        }
      ).find;
      return find?.call(window, "durable receipt", false, false, true) ?? false;
    }),
  ).toBe(true);
});

test("the capable wide layout renders only the transparent ASCII shader", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installRuntimeProbe(page);
  await page.goto(pageUrl());

  const host = page.locator(".tree-flair");
  const fallback = page.locator(".tree-fallback");
  const canvas = page.locator(".tree-canvas");
  await expect(host).toHaveAttribute("data-tree-state", "running");
  await expect(canvas).toBeVisible();
  await expect(fallback).toBeHidden();

  const copyBox = await page.locator(".opening-copy").boundingBox();
  const treeBox = await host.boundingBox();
  expect(copyBox).not.toBeNull();
  expect(treeBox).not.toBeNull();
  expect(treeBox!.x).toBeGreaterThanOrEqual(copyBox!.x + copyBox!.width);

  expect(
    await host.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderStyle,
        filter: style.filter,
        radius: style.borderRadius,
        shadow: style.boxShadow,
        padding: style.padding,
        pointer: style.pointerEvents,
      };
    }),
  ).toEqual({
    background: "rgba(0, 0, 0, 0)",
    border: "none",
    filter: "none",
    radius: "0px",
    shadow: "none",
    padding: "0px",
    pointer: "none",
  });

  expect(
    await canvas.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderStyle,
        radius: style.borderRadius,
        shadow: style.boxShadow,
        padding: style.padding,
      };
    }),
  ).toEqual({
    background: "rgba(0, 0, 0, 0)",
    border: "none",
    radius: "0px",
    shadow: "none",
    padding: "0px",
  });

  await expect
    .poll(async () => (await readRuntimeProbe(page)).times.length)
    .toBeGreaterThan(1);
  const probe = await readRuntimeProbe(page);
  expect(probe.revealDraws[0]).toBe(2);
  expect(probe.maxPendingFrames).toBe(1);
  expect(probe.pendingFrames).toBe(1);
  expect(probe.times[0]).toBe(0);
});

test("an initially constrained layout never requests WebGL or overflows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 800 });
  await page.addInitScript(`
    (() => {
      const original = HTMLCanvasElement.prototype.getContext;
      window.__attuneWebgl2Calls = 0;
      HTMLCanvasElement.prototype.getContext = function (kind, options) {
        if (kind === "webgl2") window.__attuneWebgl2Calls += 1;
        return original.call(this, kind, options);
      };
    })();
  `);
  await page.goto(pageUrl());

  await expect(page.locator(".tree-flair")).toBeHidden();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __attuneWebgl2Calls: number })
          .__attuneWebgl2Calls,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("static fallback preserves the guide without JavaScript or WebGL", async ({
  browser,
  page,
}) => {
  const noScript = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const staticPage = await noScript.newPage();
  await staticPage.goto(pageUrl());
  await expect(staticPage.locator(".tree-fallback")).toBeVisible();
  await expect(staticPage.locator(".tree-canvas")).toBeHidden();
  await expect(staticPage.locator("#the-model")).toContainText("The model");
  await noScript.close();

  await page.setViewportSize({ width: 1440, height: 900 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(`
    HTMLCanvasElement.prototype.getContext = function (kind) {
      return kind === "webgl2" ? null : null;
    };
  `);
  await page.goto(pageUrl());
  await expect(page.locator(".tree-flair")).toHaveAttribute(
    "data-tree-state",
    "failed",
  );
  await expect(page.locator(".tree-fallback")).toBeVisible();
  await expect(page.locator(".tree-canvas")).toBeHidden();
  await expect(page.locator("#the-model")).toContainText("The model");
  expect(pageErrors).toEqual([]);
});

test("reduced motion renders exactly one two-pass frame and no loop", async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await installRuntimeProbe(page);
  await page.goto(pageUrl());
  const host = page.locator(".tree-flair");
  await expect(host).toHaveAttribute("data-tree-state", "static");
  await expect(page.locator(".tree-canvas")).toBeVisible();
  await expect(page.locator(".tree-fallback")).toBeHidden();
  await page.waitForTimeout(250);
  await expect(host).toHaveAttribute("data-tree-state", "static");
  expect(await readRuntimeProbe(page)).toMatchObject({
    drawArrays: 2,
    maxPendingFrames: 0,
    pendingFrames: 0,
    rafCallbacks: 0,
    rafRequests: 0,
    revealDraws: [2],
    times: [0],
  });
  await context.close();
});

test("offscreen and hidden pauses preserve phase and single-loop ownership", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installRuntimeProbe(page);
  await page.goto(pageUrl());
  const host = page.locator(".tree-flair");
  await expect(host).toHaveAttribute("data-tree-state", "running");
  await expect
    .poll(async () => (await readRuntimeProbe(page)).times.length)
    .toBeGreaterThan(2);

  await page.locator("#repository").scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-tree-state", "paused");
  const offscreen = await readRuntimeProbe(page);
  expect(offscreen.pendingFrames).toBe(0);
  await page.waitForTimeout(200);
  expect(await readRuntimeProbe(page)).toMatchObject({
    drawArrays: offscreen.drawArrays,
    pendingFrames: 0,
    times: offscreen.times,
  });

  await page.locator("#top").scrollIntoViewIfNeeded();
  await expect(host).toHaveAttribute("data-tree-state", "running");
  await expect
    .poll(async () => (await readRuntimeProbe(page)).times.length)
    .toBeGreaterThan(offscreen.times.length);
  const onscreen = await readRuntimeProbe(page);
  const offscreenPhase = offscreen.times.at(-1)!;
  const resumedPhase = onscreen.times[offscreen.times.length]!;
  expect(resumedPhase).toBeGreaterThanOrEqual(offscreenPhase);
  expect(resumedPhase - offscreenPhase).toBeLessThan(0.2);
  expect(onscreen.maxPendingFrames).toBe(1);
  expect(onscreen.pendingFrames).toBe(1);

  await setDocumentHidden(page, true);
  await expect(host).toHaveAttribute("data-tree-state", "paused");
  const hidden = await readRuntimeProbe(page);
  expect(hidden.pendingFrames).toBe(0);
  await page.waitForTimeout(200);
  expect(await readRuntimeProbe(page)).toMatchObject({
    drawArrays: hidden.drawArrays,
    pendingFrames: 0,
    times: hidden.times,
  });

  await setDocumentHidden(page, false);
  await expect(host).toHaveAttribute("data-tree-state", "running");
  await expect
    .poll(async () => (await readRuntimeProbe(page)).times.length)
    .toBeGreaterThan(hidden.times.length);
  const visible = await readRuntimeProbe(page);
  const hiddenPhase = hidden.times.at(-1)!;
  const visiblePhase = visible.times[hidden.times.length]!;
  expect(visiblePhase).toBeGreaterThanOrEqual(hiddenPhase);
  expect(visiblePhase - hiddenPhase).toBeLessThan(0.2);
  expect(visible.maxPendingFrames).toBe(1);
  expect(visible.pendingFrames).toBe(1);
});

test("context restoration waits for eligibility and gates canvas reveal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installRuntimeProbe(page);
  await page.goto(pageUrl());
  const host = page.locator(".tree-flair");
  await expect(host).toHaveAttribute("data-tree-state", "running");

  const hasLossExtension = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".tree-canvas");
    const extension = canvas
      ?.getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    if (extension === null || extension === undefined) return false;
    (
      window as unknown as { __attuneLoseContext: WEBGL_lose_context }
    ).__attuneLoseContext = extension;
    canvas?.addEventListener("webglcontextlost", () => {
      (
        window as unknown as { __attuneTreeProbe: TreeProbe }
      ).__attuneTreeProbe.lossEvents += 1;
    });
    canvas?.addEventListener("webglcontextrestored", () => {
      (
        window as unknown as { __attuneTreeProbe: TreeProbe }
      ).__attuneTreeProbe.restoreEvents += 1;
    });
    extension.loseContext();
    return true;
  });
  expect(hasLossExtension).toBe(true);
  await expect(host).toHaveAttribute("data-tree-state", "lost");
  await expect(page.locator(".tree-fallback")).toBeVisible();
  await expect(page.locator(".tree-canvas")).toBeHidden();

  await setDocumentHidden(page, true);
  const beforeRestore = await readRuntimeProbe(page);
  await page.evaluate(() => {
    (
      window as unknown as { __attuneLoseContext: WEBGL_lose_context }
    ).__attuneLoseContext.restoreContext();
  });
  await expect
    .poll(async () => (await readRuntimeProbe(page)).restoreEvents)
    .toBe(1);
  await expect(host).toHaveAttribute("data-tree-state", "lost");
  expect((await readRuntimeProbe(page)).webgl2Calls).toBe(
    beforeRestore.webgl2Calls,
  );
  await expect(page.locator(".tree-fallback")).toBeVisible();

  await setDocumentHidden(page, false);
  await expect(host).toHaveAttribute("data-tree-state", "running");
  await expect(page.locator(".tree-canvas")).toBeVisible();
  await expect(page.locator(".tree-fallback")).toBeHidden();
  const restored = await readRuntimeProbe(page);
  expect(restored.webgl2Calls).toBeGreaterThan(beforeRestore.webgl2Calls);
  expect(restored.revealDraws).toHaveLength(2);
  expect(restored.revealDraws[1]! - beforeRestore.drawArrays).toBe(2);
  expect(restored.maxPendingFrames).toBe(1);
  expect(restored.pendingFrames).toBe(1);
});
