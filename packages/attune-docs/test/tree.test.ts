import { readFile } from "node:fs/promises";
import Path from "node:path";

import { describe, expect, test } from "vitest";

import { bundleTreeRuntime } from "../src/main.ts";
import { FRAME_INTERVAL, TREE_STATES, advancePhase, fitBackingStore, transitionTree } from "../src/tree.ts";

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
    expect(FRAME_INTERVAL).toBeCloseTo(1000 / 30);

    for (const [width, height, dpr] of [
      [320, 240, 1],
      [800, 700, 2],
      [8_000, 4_000, 4],
    ] as const) {
      const fit = fitBackingStore(width, height, dpr);
      expect(fit.dpr).toBeLessThanOrEqual(1.5);
      expect(fit.width).toBeLessThanOrEqual(1_680);
      expect(fit.height).toBeLessThanOrEqual(1_088);
      expect(fit.width * fit.height).toBeLessThanOrEqual(1_900_000);
    }

    expect(fitBackingStore(320, 240, 1)).toEqual({
      cssWidth: 320,
      cssHeight: 240,
      dpr: 1,
      width: 320,
      height: 240,
    });
    expect(fitBackingStore(1_092.015625, 613.84375, 1.24)).toEqual({
      cssWidth: 1_092,
      cssHeight: 613,
      dpr: 1.24,
      width: 1_354,
      height: 760,
    });
    expect(fitBackingStore(1_092.015625, 613.84375, 1.5 * 1.24)).toEqual({
      cssWidth: 1_092,
      cssHeight: 613,
      dpr: 1.5,
      width: 1_638,
      height: 919,
    });
    expect(fitBackingStore(634.015625, 356.421875, 1.24)).toEqual({
      cssWidth: 634,
      cssHeight: 356,
      dpr: 1.24,
      width: 786,
      height: 441,
    });
  });

  test("advances only active phase time", () => {
    expect(advancePhase(4.25, null, 90_000)).toBe(4.25);
    expect(advancePhase(4.25, 1_000, 1_250)).toBe(4.5);
    expect(advancePhase(4.25, 1_250, 1_000)).toBe(4.25);
  });

  test("contains the literal two-pass tree and printable-glyph contracts", async () => {
    const source = await readFile(Path.resolve(import.meta.dirname, "..", "src", "tree.ts"), "utf8");
    expect(source.split("\n").length - 1).toBeLessThanOrEqual(560);
    expect(source).toMatch(/import \{ Mesh, Program, Renderer, RenderTarget, Texture, Triangle \} from "ogl";/u);
    expect(source).toContain("new RenderTarget");
    expect(source).toMatch(/width:\s*FIELD_COLUMNS,\s*height:\s*FIELD_ROWS/u);
    expect(source).toContain("float capsule(");
    expect(source).toContain("float fbm(");
    expect(source).toContain("float glyph(");
    expect(source).toContain("vec4(color * alpha, alpha)");
    expect(source).toContain("min(alpha, 0.72)");
    expect(source).toContain("PRESENTATION_X = 1.24");
    expect(source).toContain('devicePixelRatio * (mode === "hero" ? PRESENTATION_X : 1)');
    expect(source).not.toMatch(/Math\.random|fetch\(|import\(/u);
    expect(source).toContain(
      "// Static topology derives from OffsetFibTree: https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/tree.py",
    );
    expect(source).toContain(
      "// Color ranges derive from PyBonsai's per-glyph sampling: https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/draw.py",
    );
    expect(await bundleTreeRuntime()).not.toMatch(/https?:\/\/|github\.com/iu);
  });

  test("uses Offset Fibonacci topology, one root-anchored bend, and eight loose leaves", async () => {
    const source = await readFile(Path.resolve(import.meta.dirname, "..", "src", "tree.ts"), "utf8");
    const field = /const TREE_FIELD = `([\s\S]*?)`;\nconst ASCII_GLYPHS/u.exec(source)?.[1];
    const glyphs = /const ASCII_GLYPHS = `([\s\S]*?)`;\nconst CONTEXT/u.exec(source)?.[1];

    expect(field).toBeDefined();
    expect(glyphs).toBeDefined();
    expect(field).toContain("const float OFFSET_FIB_SCALE = 0.75");
    expect(field).toContain("void buildOffsetFibonacci(out vec4 branches[53], out vec2 terminals[34])");
    expect(field).toContain("totals[7] = int[7](1, 2, 3, 5, 8, 13, 21)");
    expect(field).toContain("rotations[6] = int[6](0, 1, 0, 0, 3, 4)");
    expect(field).toContain("for (int index = 0; index < 53; index++)");
    expect(field).toContain("for (int index = 0; index < 34; index++)");
    expect(field?.match(/uTime/gu)).toHaveLength(3);
    expect(field).toContain("float rooted = sqrt(smoothstep(0.055, 0.90, base.y));");
    expect(field).toContain("float treeSway() { return sin(uTime * 0.22) * 0.029 + sin(uTime * 0.083) * 0.010; }");
    expect(field).toContain("float bend = treeSway() * rooted; vec2 p = base; p.x -= bend;");
    expect(field?.match(/capsule\(base/gu)).toHaveLength(2);
    expect(field).not.toMatch(/lobe\(base|fbm\(base/u);
    expect(glyphs).toContain("uniform float uTime, uMode");
    expect(glyphs?.match(/fallingLeaf\(cell,/gu)).toHaveLength(8);
    expect(glyphs).toContain("anchor + treeSway() * 115.2 + sway");
    expect(glyphs).toContain("vec2 turn(vec2 p, float angle)");
    expect(glyphs).toContain(
      "if (!botanical && wood && seed < 0.995) glyphPoint = turn(glyphPoint, treeSway() * 2.2 * smoothstep(0.055, 0.28, vUv.y));",
    );
    expect(glyphs).toContain("uniform vec2 uGrid");
    expect(glyphs).toContain("bool detached = !botanical && !wood && loose > 0.08");
    expect(glyphs).toContain("if (detached) { density = max(0.55, loose); id = 2; }");
    expect(glyphs).toContain("bool accent = detached;");
    expect(field).toContain("outColor = vec4(density, material, orientation, shade)");
    expect(glyphs).toContain("botanical ? field.b : field.a");
    expect(glyphs).toContain("mix(200.0 / 255.0, 1.0, red)");
    expect(glyphs).toContain("mix(150.0 / 255.0, 1.0, green)");
    expect(glyphs).toContain("mix(75.0 / 255.0, 1.0, leaf)");
    expect(glyphs).toContain("const vec3 ink = vec3(41.0, 35.0, 30.0) / 255.0");
    expect(glyphs?.match(/mix\(ink,[^\n]+0\.40\)/gu)).toHaveLength(3);
    expect(glyphs).toContain("wood && seed > 0.995 ? mix(ink, vec3(1.0, 1.0, 0.0), 0.40)");
    expect(glyphs).not.toMatch(/uMuted|uInk|uAccent/u);
    expect(source).toContain("const FIELD_COLUMNS = 144");
    expect(source).toContain("FIELD_ROWS = 56");
    expect(source).toContain('const MODES = ["hero", "branches", "roots", "cuttings"] as const;');
    expect(source).toContain("new Texture(gl");
    expect(source).toContain('image[at + 1] = mode === "roots" || /[/\\\\|Y]/u.test(glyph) ? 255 : 0');
    expect(source).toContain("const frames = new Set<Frame>()");
    expect(source).toContain("for (const frame of [...frames]) frame(now)");
    expect(glyphs).toContain("bool botanical = uMode > 0.5; vec2 gridPoint = vUv * uGrid");
    expect(glyphs).toContain("if (uMode < 1.5)");
    expect(glyphs).toContain("gridPoint.x -= wind * smoothstep(0.06, 0.96, height)");
    expect(glyphs).toContain("gridPoint.x -= wind * smoothstep(0.08, 0.94, height)");
    expect(glyphs).toContain("gridPoint = pivot + turn(gridPoint - pivot, -angle)");
    expect(glyphs).toContain("bool inside = all(greaterThanEqual(cell, vec2(0)))");
    expect(glyphs).toContain("uMode > 1.5 && uMode < 2.5");
    expect(glyphs).toContain("alpha *= 1.0 + current * 0.060");
    expect(glyphs).toContain("abs(current) * 0.030");
    expect(source).toContain("const draw = (time: number)");
    expect(source).toContain("if (gpu.fieldDraw) gpu.renderer.render(gpu.fieldDraw)");
    expect(source).toContain("gpu.renderer.render(gpu.glyphDraw)");
    expect(source).toContain("if (!draw(phase))");
    expect(source).not.toContain("TREE_QUERY");
    expect(source).toContain("const active = () => intersecting && !document.hidden");
  });

  test("balances every Offset Fibonacci layer and derives all 34 terminal origins", async () => {
    const source = await readFile(Path.resolve(import.meta.dirname, "..", "src", "tree.ts"), "utf8");
    const field = /const TREE_FIELD = `([\s\S]*?)`;\nconst ASCII_GLYPHS/u.exec(source)?.[1] ?? "";
    const totals = [1, 2, 3, 5, 8, 13, 21];
    const rotations = [0, 1, 0, 0, 3, 4];
    let branches = 1;

    for (let layer = 0; layer < rotations.length; layer += 1) {
      const parents = totals[layer]!;
      const childrenTotal = totals[layer + 1]!;
      const base = Math.floor(childrenTotal / parents);
      const extra = childrenTotal - base * parents;
      const counts = Array.from({ length: parents }, (_, slot) => {
        const rank = (slot + rotations[layer]!) % parents;
        return base + Number(rank < extra);
      });
      expect(counts.reduce((sum, count) => sum + count, 0)).toBe(childrenTotal);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      expect(counts.every((count) => count === 1 || count === 2)).toBe(true);
      branches += childrenTotal;
    }
    expect(branches).toBe(53);

    const terminalCounts = Array.from({ length: totals.at(-1)! }, (_, slot) => 1 + Number((slot + 17) % 21 < 13));
    expect(terminalCounts.filter((count) => count === 2)).toHaveLength(13);
    expect(terminalCounts.reduce((sum, count) => sum + count, 0)).toBe(34);

    const constants = /OFFSET_FIB_SCALE = ([\d.]+), OFFSET_FIB_ANGLE = ([\d.]+), OFFSET_FIB_JITTER = ([\d.]+)/u.exec(
      field,
    );
    expect(constants?.slice(1).map(Number)).toEqual([0.75, 0.698132, 0.139626]);
    expect(field).toMatch(/along\s*=\s*float\(child \+ 1\)\s*\/\s*float\(children\)/u);
    expect(field).toMatch(/side\s*=\s*child % 2 == 0 \? 1\.0 : -1\.0/u);
    expect(field).toMatch(/parent\.z \+ side \* \(OFFSET_FIB_ANGLE \+ jitter\)/u);
    expect(field).toMatch(/parent\.w \* OFFSET_FIB_SCALE/u);
    expect(field).toMatch(/float jitter = \(hash\([^;]+?\) \+ hash\([^;]+?\) - 1\.0\) \* OFFSET_FIB_JITTER;/u);
    expect(field).toMatch(/children = 1 \+ \(\(\(slot \+ 17\) % 21\) < 13 \? 1 : 0\)/u);
    expect(field).toMatch(/pointOn\(parent, float\(child \+ 1\) \/ float\(children\)\)/u);
  });
});
