import { readFile } from "node:fs/promises";
import Path from "node:path";

import { describe, expect, test } from "vitest";

import { FRAME_INTERVAL, TREE_QUERY, TREE_STATES, advancePhase, fitBackingStore, transitionTree } from "../src/tree.ts";

describe("calm tree shader runtime", () => {
  test("keeps every lifecycle transition inside the closed state set", () => {
    const events = ["initialize", "render", "freeze", "pause", "resume", "lose", "fail", "reset"] as const;

    for (const state of TREE_STATES)
      for (const event of events) expect(TREE_STATES).toContain(transitionTree(state, event));

    expect(transitionTree("fallback", "initialize")).toBe("initializing");
    expect(transitionTree("initializing", "render")).toBe("running");
    expect(transitionTree("running", "pause")).toBe("paused");
    expect(transitionTree("paused", "resume")).toBe("running");
    expect(transitionTree("running", "freeze")).toBe("static");
    expect(transitionTree("static", "lose")).toBe("lost");
    expect(transitionTree("lost", "initialize")).toBe("initializing");
    expect(transitionTree("running", "fail")).toBe("failed");
    expect(transitionTree("failed", "reset")).toBe("fallback");
    expect(transitionTree("fallback", "resume")).toBe("fallback");
  });

  test("bounds DPR, dimensions, and total backing pixels", () => {
    expect(TREE_QUERY).toBe("(min-width: 68rem)");
    expect(FRAME_INTERVAL).toBeCloseTo(1000 / 30);

    for (const [width, height, dpr] of [
      [320, 240, 1],
      [800, 700, 2],
      [8_000, 4_000, 4],
    ] as const) {
      const fit = fitBackingStore(width, height, dpr);
      expect(fit.dpr).toBeLessThanOrEqual(1.5);
      expect(fit.width).toBeLessThanOrEqual(640);
      expect(fit.height).toBeLessThanOrEqual(512);
      expect(fit.width * fit.height).toBeLessThanOrEqual(327_680);
    }

    expect(fitBackingStore(320, 240, 1)).toEqual({
      cssWidth: 320,
      cssHeight: 240,
      dpr: 1,
      width: 320,
      height: 240,
    });
  });

  test("advances only active phase time", () => {
    expect(advancePhase(4.25, null, 90_000)).toBe(4.25);
    expect(advancePhase(4.25, 1_000, 1_250)).toBe(4.5);
    expect(advancePhase(4.25, 1_250, 1_000)).toBe(4.25);
  });

  test("contains the literal two-pass tree and printable-glyph contracts", async () => {
    const source = await readFile(Path.resolve(import.meta.dirname, "..", "src", "tree.ts"), "utf8");
    expect(source.split("\n").length - 1).toBeLessThanOrEqual(450);
    expect(source).toMatch(/import \{ Mesh, Program, Renderer, RenderTarget, Triangle \} from "ogl";/u);
    expect(source).toContain("new RenderTarget");
    expect(source).toMatch(/width:\s*FIELD_COLUMNS,\s*height:\s*FIELD_ROWS/u);
    expect(source).toContain("float capsule(");
    expect(source).toContain("float fbm(");
    expect(source).toContain("float glyph(");
    expect(source).toContain("vec4(color * alpha, alpha)");
    expect(source).toContain("cell.x == 36.0 && cell.y == 19.0");
    expect(source).toContain("min(alpha, 0.72)");
    expect(source).not.toMatch(/Math\.random|fetch\(|import\(/u);
  });
});
