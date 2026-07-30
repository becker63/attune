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
const waitForDocumentFonts = async (page: Page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
};
const fieldColumns = 144;
const fieldRows = 56;

type TreeProbe = {
  botanicalCapture: string | null;
  botanicalSampleCount: number;
  captureNext: boolean;
  drawArrays: number;
  fieldDraws: number;
  forcedTime: number | null;
  glyphDraws: number;
  hidden: boolean;
  lossEvents: number;
  maxPendingFrames: number;
  modeDraws: Record<string, number>;
  modeTimes: Record<string, number[]>;
  pendingFrames: number;
  rafCallbacks: number;
  rafCancels: number;
  rafRequests: number;
  restoreEvents: number;
  revealDraws: number[];
  sampleCount: number;
  times: number[];
  webgl2Calls: number;
};

const runtimeProbe = `
  (() => {
    const stats = {
      botanicalCapture: null,
      botanicalSampleCount: 0,
      captureNext: true,
      drawArrays: 0,
      fieldDraws: 0,
      forcedTime: null,
      glyphDraws: 0,
      hidden: false,
      lossEvents: 0,
      maxPendingFrames: 0,
      modeDraws: {},
      modeTimes: {},
      pendingFrames: 0,
      rafCallbacks: 0,
      rafCancels: 0,
      rafRequests: 0,
      restoreEvents: 0,
      revealDraws: [],
      sampleCount: 0,
      times: [],
      webgl2Calls: 0,
    };
    const samples = [];
    const botanicalSamples = [];
    Object.defineProperty(window, "__attuneTreeProbe", { value: stats });
    Object.defineProperty(window, "__attuneTreeSamples", { value: samples });
    Object.defineProperty(window, "__attuneBotanicalSamples", { value: botanicalSamples });

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

    const contexts = new WeakMap();
    const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, options) {
      if (kind === "webgl2") stats.webgl2Calls += 1;
      const context = originalContext.call(this, kind, options);
      if (kind === "webgl2" && context !== null)
        contexts.set(context, this.closest("[data-tree-mode]")?.dataset.treeMode ?? "unknown");
      return context;
    };

    const timeLocations = new WeakSet();
    let currentTime = 0;
    let fieldFramebuffer = null;
    let pendingField = null;
    const gl = WebGL2RenderingContext.prototype;
    const getUniformLocation = gl.getUniformLocation;
    gl.getUniformLocation = function (program, name) {
      const location = getUniformLocation.call(this, program, name);
      if (name === "uTime" && location !== null) timeLocations.add(location);
      return location;
    };
    const uniform1f = gl.uniform1f;
    gl.uniform1f = function (location, value) {
      if (location !== null && timeLocations.has(location)) {
        currentTime = stats.forcedTime ?? value;
        stats.times.push(currentTime);
        const role = contexts.get(this) ?? "unknown";
        (stats.modeTimes[role] ??= []).push(currentTime);
        return uniform1f.call(this, location, currentTime);
      }
      return uniform1f.call(this, location, value);
    };
    const drawArrays = gl.drawArrays;
    gl.drawArrays = function (mode, first, count) {
      stats.drawArrays += 1;
      const role = contexts.get(this) ?? "unknown";
      stats.modeDraws[role] = (stats.modeDraws[role] ?? 0) + 1;
      const framebuffer = this.getParameter(this.FRAMEBUFFER_BINDING);
      const result = drawArrays.call(this, mode, first, count);

      const viewport = this.getParameter(this.VIEWPORT);
      const width = viewport[2];
      const height = viewport[3];
      if (framebuffer !== null && width === ${fieldColumns} && height === ${fieldRows}) {
        stats.fieldDraws += 1;
        fieldFramebuffer = framebuffer;
        if (!stats.captureNext) return result;
        const pixels = new Uint8Array(width * height * 4);
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
        pendingField = { pixels };
        return result;
      }
      if (framebuffer === null && fieldFramebuffer !== null) stats.glyphDraws += 1;
      if (
        framebuffer === null &&
        role !== "hero" &&
        stats.botanicalCapture === role
      ) {
        const pixels = new Uint8Array(width * height * 4);
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
        botanicalSamples.push({ height, mode: role, pixels, time: currentTime, width });
        stats.botanicalCapture = null;
        stats.botanicalSampleCount = botanicalSamples.length;
        stats.forcedTime = null;
        return result;
      }
      if (
        !stats.captureNext ||
        framebuffer !== null ||
        fieldFramebuffer === null ||
        width < ${fieldColumns} ||
        height < ${fieldRows}
      ) return result;

      if (pendingField === null) {
        const field = new Uint8Array(${fieldColumns} * ${fieldRows} * 4);
        this.bindFramebuffer(this.FRAMEBUFFER, fieldFramebuffer);
        this.readPixels(0, 0, ${fieldColumns}, ${fieldRows}, this.RGBA, this.UNSIGNED_BYTE, field);
        this.bindFramebuffer(this.FRAMEBUFFER, framebuffer);
        pendingField = { pixels: field };
      }

      const pixels = new Uint8Array(width * height * 4);
      this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
      const rendered = new Uint32Array(${fieldColumns} * ${fieldRows} * 5);
      for (let y = 0; y < height; y += 1)
        for (let x = 0; x < width; x += 1) {
          const cell =
            Math.floor(((y + 0.5) * ${fieldRows}) / height) * ${fieldColumns} +
            Math.floor(((x + 0.5) * ${fieldColumns}) / width);
          const pixel = (y * width + x) * 4;
          if (pixels[pixel + 3] > 0) rendered[cell * 5] += 1;
          for (let channel = 0; channel < 4; channel += 1)
            rendered[cell * 5 + channel + 1] += pixels[pixel + channel];
        }
      samples.push({
        canvas: pixels,
        field: pendingField.pixels,
        height,
        rendered,
        time: currentTime,
        width,
      });
      pendingField = null;
      stats.captureNext = false;
      stats.forcedTime = null;
      stats.sampleCount = samples.length;
      return result;
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

const captureTreeSample = async (page: Page, phase: number) => {
  const before = await page.evaluate((time) => {
    const probe = (window as unknown as { __attuneTreeProbe: TreeProbe })
      .__attuneTreeProbe;
    probe.forcedTime = time;
    probe.captureNext = true;
    return probe.sampleCount;
  }, phase);
  await expect
    .poll(async () => (await readRuntimeProbe(page)).sampleCount)
    .toBeGreaterThan(before);
};

const captureBotanicalSample = async (
  page: Page,
  mode: "branches" | "roots" | "cuttings",
  phase: number,
) => {
  const before = await page.evaluate(
    ({ nextMode, time }) => {
      const probe = (window as unknown as { __attuneTreeProbe: TreeProbe })
        .__attuneTreeProbe;
      probe.botanicalCapture = nextMode;
      probe.forcedTime = time;
      return probe.botanicalSampleCount;
    },
    { nextMode: mode, time: phase },
  );
  await expect
    .poll(async () => (await readRuntimeProbe(page)).botanicalSampleCount)
    .toBeGreaterThan(before);
};

type BotanicalMotionEvidence = {
  bottomChange: number;
  massRatio: number;
  mode: string;
  overallChange: number;
  topChange: number;
};

const readBotanicalMotionEvidence = (page: Page) =>
  page.evaluate<BotanicalMotionEvidence[]>(() => {
    type Sample = {
      height: number;
      mode: string;
      pixels: Uint8Array;
      time: number;
      width: number;
    };
    const samples = (
      window as unknown as { __attuneBotanicalSamples: Sample[] }
    ).__attuneBotanicalSamples;
    const change = (
      first: Sample,
      second: Sample,
      minimumY: number,
      maximumY: number,
    ) => {
      let delta = 0;
      let mass = 0;
      const start = Math.floor(first.height * minimumY);
      const end = Math.ceil(first.height * maximumY);
      for (let y = start; y < end; y += 1)
        for (let x = 0; x < first.width; x += 1) {
          const alpha = (y * first.width + x) * 4 + 3;
          delta += Math.abs(first.pixels[alpha]! - second.pixels[alpha]!);
          mass += first.pixels[alpha]!;
        }
      return delta / Math.max(1, mass);
    };
    return ["branches", "roots", "cuttings"].map((mode) => {
      const [first, second] = samples.filter((sample) => sample.mode === mode);
      if (first === undefined || second === undefined)
        throw new Error(`Missing controlled ${mode} frames`);
      if (
        first.width !== second.width ||
        first.height !== second.height ||
        first.time !== 0 ||
        second.time !== 8
      )
        throw new Error(`Incomparable controlled ${mode} frames`);
      let firstMass = 0;
      let secondMass = 0;
      for (let at = 3; at < first.pixels.length; at += 4) {
        firstMass += first.pixels[at]!;
        secondMass += second.pixels[at]!;
      }
      return {
        bottomChange: change(first, second, 0, 0.2),
        massRatio: secondMass / firstMass,
        mode,
        overallChange: change(first, second, 0, 1),
        topChange: change(first, second, 0.48, 1),
      };
    });
  });

type TreeSampleEvidence = {
  samples: {
    crownShift: number;
    height: number;
    leafMaxAnchorShift: number;
    leafOverlays: number;
    leafUniqueCells: number;
    leafWoodOcclusions: number;
    looseCells: number;
    looseComponents: number;
    looseOutsideAnchors: number;
    looseSignature: string;
    maxX: number;
    minX: number;
    occupied: number;
    renderedOccupied: number;
    time: number;
    windDrift: number;
    width: number;
  }[];
  transitions: {
    centroidMaxError: number;
    centroidMeanError: number;
    centroidRows: number;
    changedField: number;
    changedRendered: number;
    coreComparisons: number;
    densityMeanError: number;
    materialAgreement: number;
    maxExpectedShift: number;
    oppositeDensityMeanError: number;
    orientationAgreement: number;
    rootChanged: number;
    uncompensatedDensityMeanError: number;
  }[];
};

const readTreeSampleEvidence = (page: Page) =>
  page.evaluate<TreeSampleEvidence>(() => {
    type Sample = {
      canvas: Uint8Array;
      field: Uint8Array;
      height: number;
      rendered: Uint32Array;
      time: number;
      width: number;
    };
    const samples = (window as unknown as { __attuneTreeSamples: Sample[] })
      .__attuneTreeSamples;
    const columns = 144;
    const rows = 56;
    const cellCount = columns * rows;
    const visible = (sample: Sample, cell: number) =>
      sample.field[cell * 4]! >= 21;
    const rendered = (sample: Sample, cell: number) =>
      sample.rendered[cell * 5]! > 0;
    const loose = (sample: Sample, cell: number) =>
      rendered(sample, cell) && !visible(sample, cell);
    const components = (sample: Sample) => {
      const remaining = new Set<number>();
      for (let cell = 0; cell < cellCount; cell += 1)
        if (loose(sample, cell)) remaining.add(cell);
      let total = 0;
      while (remaining.size > 0) {
        total += 1;
        const first = remaining.values().next().value;
        if (first === undefined) break;
        remaining.delete(first);
        const pending = [first];
        while (pending.length > 0) {
          const cell = pending.pop()!;
          const x = cell % columns;
          const y = Math.floor(cell / columns);
          for (let offsetY = -1; offsetY <= 1; offsetY += 1)
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
              const nextX = x + offsetX;
              const nextY = y + offsetY;
              const next = nextY * columns + nextX;
              if (
                nextX >= 0 &&
                nextX < columns &&
                nextY >= 0 &&
                nextY < rows &&
                remaining.delete(next)
              )
                pending.push(next);
            }
        }
      }
      return total;
    };
    const bend = (time: number) =>
      Math.sin(time * 0.22) * 0.029 + Math.sin(time * 0.083) * 0.01;
    const weight = (y: number) => {
      const at = Math.max(0, Math.min(1, (y - 0.055) / (0.9 - 0.055)));
      return Math.sqrt(at * at * (3 - 2 * at));
    };
    const orientation = (value: number) =>
      value < 85 ? 0 : value > 170 ? 2 : 1;
    const metrics = samples.map((sample) => {
      const structural: number[] = [];
      const loosePositions: number[] = [];
      let looseCells = 0;
      let renderedOccupied = 0;
      for (let cell = 0; cell < cellCount; cell += 1) {
        if (visible(sample, cell)) structural.push(cell);
        if (loose(sample, cell)) {
          looseCells += 1;
          loosePositions.push(cell);
        }
        if (rendered(sample, cell)) renderedOccupied += 1;
      }
      const xs = structural.map((cell) => cell % columns);
      const ys = structural.map((cell) => Math.floor(cell / columns));
      const leaves = [
        [0.18, 36, 0.027],
        [0.27, 51, 0.025],
        [0.4, 106.5, 0.03],
        [0.51, 94, 0.028],
        [0.6, 42, 0.024],
        [0.73, 100.5, 0.026],
        [0.84, 38, 0.022],
        [0.33, 113, 0.023],
      ] as const;
      const windDrift = bend(sample.time) * (columns / 1.25);
      const leafCells = leaves.map(([seed, anchor, speed]) => {
        const progress = (seed + sample.time * speed) % 1;
        const sway =
          Math.sin(sample.time * 0.48 + seed * 31) * 1.35 +
          Math.sin(sample.time * 0.19 + seed * 47) * 0.55;
        const x = Math.floor(anchor + windDrift + sway);
        const y = Math.floor(51 * (1 - progress) + 5 * progress);
        return { cell: y * columns + x, sway };
      });
      const anchors = leaves.map(([, anchor]) => anchor + windDrift);
      return {
        crownShift: Math.abs(bend(sample.time)) * (columns / 1.25),
        height: Math.max(...ys) - Math.min(...ys) + 1,
        leafMaxAnchorShift: Math.max(
          ...leafCells.map(({ sway }) => Math.abs(sway)),
        ),
        leafOverlays: leafCells.filter(
          ({ cell }) =>
            rendered(sample, cell) && sample.field[cell * 4 + 1]! <= 127,
        ).length,
        leafUniqueCells: new Set(leafCells.map(({ cell }) => cell)).size,
        leafWoodOcclusions: leafCells.filter(
          ({ cell }) => sample.field[cell * 4 + 1]! > 127,
        ).length,
        looseCells,
        looseComponents: components(sample),
        looseOutsideAnchors: loosePositions.filter((cell) => {
          const x = cell % columns;
          return anchors.every((anchor) => Math.abs(x - anchor) > 4);
        }).length,
        looseSignature: loosePositions.join(","),
        maxX: Math.max(...xs),
        minX: Math.min(...xs),
        occupied: structural.length,
        renderedOccupied,
        time: sample.time,
        windDrift,
        width: Math.max(...xs) - Math.min(...xs) + 1,
      };
    });
    const transitions = samples.slice(1).map((sample, index) => {
      const previous = samples[index]!;
      let changedField = 0;
      let changedRendered = 0;
      let rootChanged = 0;
      for (let cell = 0; cell < cellCount; cell += 1) {
        let fieldChanged = false;
        for (let channel = 0; channel < 4; channel += 1)
          fieldChanged ||=
            previous.field[cell * 4 + channel] !==
            sample.field[cell * 4 + channel];
        if (fieldChanged) {
          changedField += 1;
          if (Math.floor(cell / columns) < 3) rootChanged += 1;
        }
        let renderedChanged = false;
        for (let channel = 0; channel < 5; channel += 1)
          renderedChanged ||=
            previous.rendered[cell * 5 + channel] !==
            sample.rendered[cell * 5 + channel];
        if (renderedChanged) changedRendered += 1;
      }
      const shiftAt = (row: number) =>
        (bend(sample.time) - bend(previous.time)) *
        weight((row + 0.5) / rows) *
        (columns / 1.25);
      const densityErrorAt = (scale: number) => {
        let error = 0;
        let comparisons = 0;
        for (let row = 0; row < rows; row += 1)
          for (let x = 0; x < columns; x += 1) {
            const sourceX = x - shiftAt(row) * scale;
            const left = Math.floor(sourceX);
            const right = left + 1;
            if (left < 0 || right >= columns) continue;
            const mix = sourceX - left;
            const currentCell = row * columns + x;
            const expectedDensity =
              previous.field[(row * columns + left) * 4]! * (1 - mix) +
              previous.field[(row * columns + right) * 4]! * mix;
            const currentDensity = sample.field[currentCell * 4]!;
            if (currentDensity < 21 && expectedDensity < 21) continue;
            error += Math.abs(currentDensity - expectedDensity);
            comparisons += 1;
          }
        return error / comparisons / 255;
      };
      const centroidErrors: number[] = [];
      let coreComparisons = 0;
      let materialMatches = 0;
      let orientationMatches = 0;
      for (let row = 0; row < rows; row += 1) {
        let previousMass = 0;
        let previousMoment = 0;
        let currentMass = 0;
        let currentMoment = 0;
        for (let x = 0; x < columns; x += 1) {
          const cell = row * columns + x;
          const previousDensity = previous.field[cell * 4]!;
          const currentDensity = sample.field[cell * 4]!;
          previousMass += previousDensity;
          previousMoment += x * previousDensity;
          currentMass += currentDensity;
          currentMoment += x * currentDensity;
        }
        const shift = shiftAt(row);
        if (previousMass > 5_000 && currentMass > 5_000)
          centroidErrors.push(
            Math.abs(
              currentMoment / currentMass -
                previousMoment / previousMass -
                shift,
            ),
          );
        for (let x = 0; x < columns; x += 1) {
          const sourceX = x - shift;
          const nearestX = Math.round(sourceX);
          if (nearestX < 0 || nearestX >= columns) continue;
          const currentCell = row * columns + x;
          const currentDensity = sample.field[currentCell * 4]!;
          const nearest = row * columns + nearestX;
          if (currentDensity < 160 || previous.field[nearest * 4]! < 160)
            continue;
          coreComparisons += 1;
          if (
            sample.field[currentCell * 4 + 1]! > 127 ===
            previous.field[nearest * 4 + 1]! > 127
          )
            materialMatches += 1;
          if (
            orientation(sample.field[currentCell * 4 + 2]!) ===
            orientation(previous.field[nearest * 4 + 2]!)
          )
            orientationMatches += 1;
        }
      }
      return {
        centroidMaxError: Math.max(...centroidErrors),
        centroidMeanError:
          centroidErrors.reduce((sum, error) => sum + error, 0) /
          centroidErrors.length,
        centroidRows: centroidErrors.length,
        changedField,
        changedRendered,
        coreComparisons,
        densityMeanError: densityErrorAt(1),
        materialAgreement: materialMatches / coreComparisons,
        maxExpectedShift: Math.max(
          ...Array.from({ length: rows }, (_, row) => Math.abs(shiftAt(row))),
        ),
        oppositeDensityMeanError: densityErrorAt(-1),
        orientationAgreement: orientationMatches / coreComparisons,
        rootChanged,
        uncompensatedDensityMeanError: densityErrorAt(0),
      };
    });
    return { samples: metrics, transitions };
  });

test.beforeEach(async () => {
  await access(indexPath);
});

test("the publication uses its pinned semantic type system without mobile overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl());
  await waitForDocumentFonts(page);

  const evidence = await page.evaluate(() => {
    const styleOf = (selector: string, pseudo?: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element === null)
        throw new Error(`Missing typography fixture: ${selector}`);
      const style = getComputedStyle(element, pseudo);
      return {
        firstFamily: style.fontFamily.split(",")[0]!.trim().replaceAll('"', ""),
        fontSize: parseFloat(style.fontSize),
        lineHeight: parseFloat(style.lineHeight),
        backgroundColor: style.backgroundColor,
        textTransform: style.textTransform,
      };
    };
    const loadedFaces: { family: string; status: FontFaceLoadStatus }[] = [];
    document.fonts.forEach((face) => {
      loadedFaces.push({
        family: face.family.replaceAll('"', ""),
        status: face.status,
      });
    });

    const guide = document.querySelector<HTMLElement>(".guide");
    const prose = document.querySelector<HTMLElement>(
      "#the-model + p.model-prose",
    );
    if (guide === null) throw new Error("Missing guide fixture");
    if (prose === null) throw new Error("Missing direct guide prose fixture");
    const proseRatio =
      prose.getBoundingClientRect().width / guide.getBoundingClientRect().width;

    const openingCopy = document.querySelector<HTMLElement>(".opening-copy");
    const thesisHeading = document.querySelector<HTMLElement>("#the-thesis");
    const modelHeading = document.querySelector<HTMLElement>("#the-model");
    const thesisProse = [
      ...document.querySelectorAll<HTMLElement>(
        ":is(p, blockquote).thesis-prose",
      ),
    ];
    const heroItems = [
      ...document.querySelectorAll<HTMLLIElement>(".opening-copy > ul > li"),
    ];
    if (openingCopy === null)
      throw new Error("Missing source-authored opening copy");
    if (
      thesisHeading === null ||
      modelHeading === null ||
      thesisProse.length === 0
    )
      throw new Error("Missing thesis fixtures");
    const thesis = thesisProse[0]!.getBoundingClientRect();
    const guideBox = guide.getBoundingClientRect();
    let thesisCanvases = 0;
    for (
      let node = thesisHeading.nextElementSibling;
      node !== null && node !== modelHeading;
      node = node.nextElementSibling
    )
      thesisCanvases +=
        (node.matches("canvas") ? 1 : 0) +
        node.querySelectorAll("canvas").length;
    const thesisStyle = getComputedStyle(thesisProse[0]!);

    return {
      loadedFaces,
      proseRatio,
      opening: {
        childTags: [...openingCopy.children].map((element) => element.tagName),
        itemCount: heroItems.length,
        leads: heroItems.map(
          (item) => item.querySelector("strong")?.textContent?.trim() ?? "",
        ),
        thesisFollows:
          document.querySelector("#main > .opening + #the-thesis") !== null,
      },
      thesis: {
        background: thesisStyle.backgroundColor,
        border: thesisStyle.borderStyle,
        canvases: thesisCanvases,
        leftGap: thesis.left - guideBox.left,
        radius: thesisStyle.borderRadius,
        rightGap: guideBox.right - thesis.right,
        shadow: thesisStyle.boxShadow,
        widthRatio: thesis.width / guideBox.width,
      },
      roles: {
        body: styleOf("body"),
        chapterLink: styleOf(".contents a:not(.wordmark)"),
        conceptualHeading: styleOf("h2:not([data-attune-symbol])"),
        declarationHeading: styleOf("h2[data-attune-symbol]"),
        heroList: styleOf(".opening-copy > ul"),
        heroMarker: styleOf(".opening-copy > ul > li", "::marker"),
        wordmark: styleOf(".contents .wordmark"),
        memberHeading: styleOf("h3[data-attune-symbol]"),
        nestedMemberHeading: styleOf("h4[data-attune-symbol]"),
        code: styleOf('pre.attune-code[data-code-role="artifact-layout"]'),
        sourceLink: styleOf(".source-link"),
        footer: styleOf(".site-footer"),
        tree: styleOf(".tree-flair"),
      },
    };
  });

  expect(evidence.loadedFaces).toEqual(
    expect.arrayContaining([
      { family: "Attune Serif", status: "loaded" },
      { family: "Attune Mono", status: "loaded" },
    ]),
  );
  for (const role of [
    evidence.roles.body,
    evidence.roles.chapterLink,
    evidence.roles.conceptualHeading,
    evidence.roles.declarationHeading,
    evidence.roles.heroList,
    evidence.roles.memberHeading,
    evidence.roles.nestedMemberHeading,
  ])
    expect(role.firstFamily).toBe("Attune Serif");
  for (const role of [
    evidence.roles.wordmark,
    evidence.roles.code,
    evidence.roles.sourceLink,
    evidence.roles.footer,
    evidence.roles.tree,
  ])
    expect(role.firstFamily).toBe("Attune Mono");

  expect(evidence.opening).toEqual({
    childTags: ["H1", "UL"],
    itemCount: 3,
    leads: [
      "Follow every branch.",
      "Keep the work rooted.",
      "Propagate what survives.",
    ],
    thesisFollows: true,
  });
  expect(evidence.thesis.canvases).toBe(0);
  expect(evidence.thesis.widthRatio).toBeGreaterThanOrEqual(0.98);
  expect(evidence.thesis.widthRatio).toBeLessThanOrEqual(1.01);
  expect(Math.abs(evidence.thesis.leftGap)).toBeLessThanOrEqual(1);
  expect(Math.abs(evidence.thesis.rightGap)).toBeLessThanOrEqual(1);
  expect(["none", "none none none none"]).toContain(evidence.thesis.border);
  expect(evidence.thesis.background).toBe("rgba(0, 0, 0, 0)");
  expect(evidence.thesis.shadow).toBe("none");
  expect(evidence.thesis.radius).toBe("0px");
  expect(evidence.roles.chapterLink.textTransform).toBe("none");
  expect(evidence.roles.body.fontSize).toBeCloseTo(17, 5);
  expect(
    evidence.roles.body.lineHeight / evidence.roles.body.fontSize,
  ).toBeCloseTo(1.58, 2);
  expect(evidence.roles.body.backgroundColor).toBe("rgb(250, 247, 241)");
  expect(evidence.roles.code.backgroundColor).toBe("rgb(245, 240, 232)");
  expect(evidence.roles.heroList.fontSize).toBeCloseTo(16, 5);
  expect(
    evidence.roles.heroList.lineHeight / evidence.roles.heroList.fontSize,
  ).toBeCloseTo(1.5, 2);
  expect(evidence.roles.heroMarker.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(
    await page
      .locator(".opening-copy > ul > li")
      .first()
      .evaluate((element) => getComputedStyle(element, "::marker").color),
  ).toBe("rgb(113, 55, 15)");
  expect(evidence.roles.code.fontSize).toBeCloseTo(14, 5);
  expect(evidence.roles.memberHeading.fontSize).toBeCloseTo(20, 5);
  expect(evidence.roles.nestedMemberHeading.fontSize).toBeCloseTo(18, 5);
  expect(
    evidence.roles.code.lineHeight / evidence.roles.code.fontSize,
  ).toBeCloseTo(1.52, 2);
  expect(evidence.proseRatio).toBeGreaterThanOrEqual(0.98);
  expect(evidence.proseRatio).toBeLessThanOrEqual(1.01);

  await page.setViewportSize({ width: 390, height: 844 });
  await waitForDocumentFonts(page);
  const narrow = await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>(".guide");
    const thesis = document.querySelector<HTMLElement>("p.thesis-prose");
    if (guide === null || thesis === null)
      throw new Error("Missing narrow thesis fixture");
    const guideBox = guide.getBoundingClientRect();
    const thesisBox = thesis.getBoundingClientRect();
    return {
      left: thesisBox.left - guideBox.left,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      ratio: thesisBox.width / guideBox.width,
      right: guideBox.right - thesisBox.right,
    };
  });
  expect(narrow.overflow).toBe(0);
  expect(narrow.ratio).toBeGreaterThanOrEqual(0.98);
  expect(narrow.ratio).toBeLessThanOrEqual(1.01);
  expect(Math.abs(narrow.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(narrow.right)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1440, height: 900 });
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setPageScaleFactor", {
      pageScaleFactor: 1.25,
    });
    const zoomed = await page.evaluate(() => {
      const guide = document.querySelector<HTMLElement>(".guide");
      const thesis = [
        ...document.querySelectorAll<HTMLElement>(
          ":is(p, blockquote).thesis-prose",
        ),
      ];
      if (guide === null || thesis.length === 0)
        throw new Error("Missing zoomed thesis fixture");
      const guideBox = guide.getBoundingClientRect();
      return {
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        scale: visualViewport?.scale,
        thesis: thesis.map((element) => {
          const box = element.getBoundingClientRect();
          return {
            leftGap: box.left - guideBox.left,
            rightGap: guideBox.right - box.right,
            widthRatio: box.width / guideBox.width,
          };
        }),
      };
    });
    expect(zoomed).toMatchObject({ overflow: 0, scale: 1.25 });
    for (const thesis of zoomed.thesis) {
      expect(thesis.widthRatio).toBeGreaterThanOrEqual(0.98);
      expect(thesis.widthRatio).toBeLessThanOrEqual(1.01);
      expect(Math.abs(thesis.leftGap)).toBeLessThanOrEqual(1);
      expect(Math.abs(thesis.rightGap)).toBeLessThanOrEqual(1);
    }
    expect(
      await page.locator(".tree-flair").evaluate((element) => {
        return element.getBoundingClientRect().right;
      }),
    ).toBeLessThanOrEqual(1440);
  } finally {
    await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
    await session.detach();
  }
});

test("a definition link uses native fragments and browser history", async ({
  page,
}) => {
  await page.goto(pageUrl("the-tools"));

  const investigation = page.locator('pre[data-code-role="investigation"]');
  await expect(investigation).toHaveCount(7);
  const activeGraphDeclaration = page.locator(
    'pre[data-code-role="activegraph-declaration"]',
  );
  await expect(activeGraphDeclaration).toHaveCount(1);
  await expect(activeGraphDeclaration).toHaveAttribute(
    "data-language",
    "python",
  );
  await expect(activeGraphDeclaration).toContainText("def make_research_pack");
  await expect(activeGraphDeclaration).toContainText(
    "def make_interpretation_tool",
  );
  await expect(activeGraphDeclaration).toContainText(
    "input_model=InterpretationLedger",
  );
  await expect(activeGraphDeclaration).toContainText(
    "output_model=LedgerReference",
  );
  await expect(activeGraphDeclaration).toContainText("deterministic=True");
  await expect(activeGraphDeclaration).toContainText(
    "ledger.case_id != case_id",
  );
  await expect(
    page.locator('pre[data-code-role="interpretation"]'),
  ).toHaveCount(0);
  expect(
    await investigation.evaluateAll((blocks) =>
      blocks.every(
        (block) =>
          block.getAttribute("data-attune-checked") === "true" &&
          block.querySelector("a.definition-link") !== null,
      ),
    ),
  ).toBe(true);
  const publication = await page.locator("body").textContent();
  for (const path of [
    "joern-output.json",
    "stdout.txt",
    "run-details.json",
    "counterexample.json",
    "inputs/rules/review-retryable-payment-without-operation-key.yml",
    "findings.jsonl",
  ])
    expect(publication).toContain(path);
  expect(publication).not.toMatch(
    /joern\.summary|attune:(?:joern|maude|property):|ToolCall|PAYMENT_(?:MODEL|PROPERTY|RULE)_(?:CALL|LEDGER_REF)|query_ref|output_ref|findings_ref|<exact ActiveGraph run id>/u,
  );
  const operation = investigation
    .locator(
      'a[href="#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--JoernQueryTool"]',
    )
    .first();
  await expect(operation).toHaveText("joern_query");
  const local = investigation.locator('a[href^="#tools-definition-"]').first();
  const localHref = await local.getAttribute("href");
  expect(localHref).toMatch(/^#tools-definition-\d+-\d+$/u);
  await expect(page.locator(localHref!)).toHaveCount(1);

  await operation.click();
  await expect
    .poll(() => new URL(page.url()).hash)
    .toBe(
      "#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--JoernQueryTool",
    );
  const target = page.locator(
    "#attune-mcp--packages-attune-mcp-src-contract-schemas\\.ts--JoernQueryTool",
  );
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
  await expect.poll(() => new URL(page.url()).hash).toBe("#the-tools");
  await expect(page.locator("#the-tools")).toBeInViewport();
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
  await page.setViewportSize({ width: 1440, height: 700 });
  await installRuntimeProbe(page);
  await page.goto(pageUrl());
  await waitForDocumentFonts(page);

  const host = page.locator(".tree-flair");
  const fallback = page.locator(".tree-fallback");
  const canvas = page.locator(".tree-canvas");
  await expect(host).toHaveAttribute("data-tree-state", "running");
  await expect(canvas).toBeVisible();
  await expect(fallback).toBeHidden();

  const copyBox = await page.locator(".opening-copy").boundingBox();
  const guideBox = await page.locator(".guide").boundingBox();
  const treeBox = await host.boundingBox();
  expect(copyBox).not.toBeNull();
  expect(guideBox).not.toBeNull();
  expect(treeBox).not.toBeNull();
  expect(treeBox!.x).toBeGreaterThanOrEqual(copyBox!.x + copyBox!.width);
  expect(treeBox!.width / guideBox!.width).toBeGreaterThan(0.65);
  expect(treeBox!.width / guideBox!.width).toBeLessThan(0.78);
  expect(treeBox!.width / treeBox!.height).toBeCloseTo(1.775, 2);
  expect(treeBox!.x + treeBox!.width).toBeLessThanOrEqual(
    guideBox!.x + guideBox!.width + 1,
  );
  const backing = await canvas.evaluate((element) => {
    const value = element as HTMLCanvasElement;
    return {
      cssHeight: value.clientHeight,
      cssWidth: value.clientWidth,
      height: value.height,
      width: value.width,
    };
  });
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(Math.abs(backing.cssWidth * 1.24 - treeBox!.width)).toBeLessThan(2);
  expect(Math.abs(backing.cssHeight - treeBox!.height)).toBeLessThan(1);
  expect(backing.width).toBeGreaterThanOrEqual(backing.cssWidth);
  expect(backing.height).toBeGreaterThanOrEqual(backing.cssHeight);
  expect(backing.width).toBeLessThanOrEqual(1_680);
  expect(backing.height).toBeLessThanOrEqual(1_088);
  expect(Math.abs(canvasBox!.width - treeBox!.width)).toBeLessThan(1);
  expect(Math.abs(canvasBox!.height - treeBox!.height)).toBeLessThan(1);
  expect(
    await fallback.evaluate((element) => getComputedStyle(element).transform),
  ).not.toBe("none");
  expect(
    await canvas.evaluate((element) => getComputedStyle(element).transform),
  ).not.toBe("none");
  expect(
    await host.evaluate((element) => getComputedStyle(element).overflow),
  ).toBe("hidden");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);

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
  expect(probe.fieldDraws).toBeGreaterThan(1);
  expect(probe.glyphDraws).toBeGreaterThan(1);
  expect(probe.fieldDraws).toBe(probe.glyphDraws);
  expect(probe.drawArrays).toBe(probe.fieldDraws + probe.glyphDraws);
  expect(probe.maxPendingFrames).toBe(1);
  expect(probe.pendingFrames).toBe(1);
  expect(probe.times[0]).toBe(0);
});

test("inline botanical shaders let the introductory prose wrap and reclaim the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installRuntimeProbe(page);
  await page.goto(pageUrl());
  await waitForDocumentFonts(page);

  const modes = ["branches", "roots", "cuttings"] as const;
  await expect(page.locator("#branches, #roots, #cuttings")).toHaveCount(3);
  const anchors = page.locator("p.model-prose.botanical-anchor");
  await expect(anchors).toHaveCount(3);
  await expect(
    page.locator(
      ".botanical-field, .botanical-item, .botanical-label, .botanical-prose",
    ),
  ).toHaveCount(0);
  const layout = await anchors.evaluateAll((paragraphs) => {
    const lineBoxes = (
      start: Element,
      stop: Element | null,
      omitted: Element,
    ) => {
      const fragments: DOMRect[] = [];
      for (
        let element: Element | null = start;
        element !== null && element !== stop;
        element = element.nextElementSibling
      ) {
        if (!element.matches("p, ul, blockquote")) continue;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node !== null) {
          if (!omitted.contains(node) && node.textContent?.trim()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            fragments.push(
              ...[...range.getClientRects()].filter(
                (rect) => rect.width > 1 && rect.height > 1,
              ),
            );
          }
          node = walker.nextNode();
        }
      }
      const lines: {
        bottom: number;
        left: number;
        right: number;
        top: number;
      }[] = [];
      for (const fragment of fragments) {
        const line = lines.find(
          (candidate) => Math.abs(candidate.top - fragment.top) < 2,
        );
        if (line === undefined)
          lines.push({
            bottom: fragment.bottom,
            left: fragment.left,
            right: fragment.right,
            top: fragment.top,
          });
        else {
          line.bottom = Math.max(line.bottom, fragment.bottom);
          line.left = Math.min(line.left, fragment.left);
          line.right = Math.max(line.right, fragment.right);
        }
      }
      return lines;
    };
    const guide = document.querySelector<HTMLElement>(".guide");
    if (guide === null) throw new Error("Missing guide");
    const guideBox = guide.getBoundingClientRect();
    return paragraphs.map((paragraph) => {
      const host = paragraph.firstElementChild as HTMLElement | null;
      if (host === null || !host.classList.contains("botanical-flair"))
        throw new Error(
          "Botanical shader is not the first child of its prose paragraph",
        );
      const mode = host.dataset.treeMode;
      const heading =
        mode === undefined
          ? null
          : document.querySelector<HTMLElement>(`h3#${mode}`);
      if (heading === null || heading.nextElementSibling !== paragraph)
        throw new Error("Botanical prose does not immediately follow its h3");
      let boundary = paragraph.nextElementSibling;
      while (boundary !== null && !boundary.matches("h2, h3"))
        boundary = boundary.nextElementSibling;
      if (boundary === null)
        throw new Error("Botanical section has no following heading");
      const paragraphBox = paragraph.getBoundingClientRect();
      const headingBox = heading.getBoundingClientRect();
      const previousBox =
        heading.previousElementSibling?.getBoundingClientRect();
      const boundaryBox = boundary.getBoundingClientRect();
      const art = host.getBoundingClientRect();
      const style = getComputedStyle(host);
      const lines = lineBoxes(paragraph, boundary, host);
      const wrapped = lines.filter(
        (line) => line.top < art.bottom - 1 && line.bottom > art.top + 1,
      );
      const reclaimed = lines.filter((line) => line.top >= art.bottom - 1);
      return {
        classes: [...paragraph.classList],
        boundaryTop: boundaryBox.top,
        display: getComputedStyle(paragraph).display,
        headingGap:
          previousBox === undefined
            ? null
            : headingBox.top - previousBox.bottom,
        headingId: heading.id,
        headingTag: heading.tagName,
        headingText: heading.textContent?.trim(),
        hostTag: host.tagName,
        fallbackTag: host.firstElementChild?.tagName,
        canvasTag: host.lastElementChild?.tagName,
        mode,
        artRatio: art.width / guideBox.width,
        artBottom: art.bottom,
        artOffset: art.top - paragraphBox.top,
        paragraphRatio: paragraphBox.width / guideBox.width,
        paragraphGap: paragraphBox.top - headingBox.bottom,
        paragraphLeft: paragraphBox.left,
        rightGap: paragraphBox.right - art.right,
        cssFloat: style.cssFloat,
        position: style.position,
        frame: [
          style.backgroundColor,
          style.borderStyle,
          style.boxShadow,
          style.borderRadius,
        ],
        wrappedLines: wrapped.length,
        wrappedLeft: Math.min(...wrapped.map((line) => line.left)),
        wrappedRight: Math.max(...wrapped.map((line) => line.right)),
        reclaimedLines: reclaimed.length,
        reclaimedLeft: Math.min(...reclaimed.map((line) => line.left)),
        reclaimedRight: Math.max(...reclaimed.map((line) => line.right)),
        artLeft: art.left,
      };
    });
  });
  expect(layout.map(({ mode }) => mode)).toEqual([
    "branches",
    "roots",
    "cuttings",
  ]);
  for (const study of layout) {
    expect(study.classes).toEqual(
      expect.arrayContaining([
        "model-prose",
        "botanical-anchor",
        `botanical-${study.mode}`,
      ]),
    );
    expect(study.headingTag).toBe("H3");
    expect(study.headingId).toBe(study.mode);
    expect(study.headingText).toBe(
      `${study.mode![0]!.toUpperCase()}${study.mode!.slice(1)}`,
    );
    expect(study.hostTag).toBe("SPAN");
    expect(study.fallbackTag).toBe("SPAN");
    expect(study.canvasTag).toBe("CANVAS");
    expect(study.display).toBe("block");
    expect(study.headingGap).toBeGreaterThanOrEqual(40);
    expect(study.paragraphGap).toBeGreaterThanOrEqual(10);
    expect(study.paragraphGap).toBeLessThanOrEqual(32);
    expect(study.artRatio).toBeGreaterThanOrEqual(0.2);
    expect(study.artRatio).toBeLessThanOrEqual(0.25);
    expect(study.artOffset).toBeGreaterThanOrEqual(0);
    expect(study.artOffset).toBeLessThanOrEqual(5);
    expect(study.paragraphRatio).toBeGreaterThanOrEqual(0.98);
    expect(study.paragraphRatio).toBeLessThanOrEqual(1.01);
    expect(Math.abs(study.rightGap)).toBeLessThanOrEqual(1);
    expect(["inline-end", "right"]).toContain(study.cssFloat);
    expect(study.position).not.toBe("sticky");
    expect(study.frame).toEqual(["rgba(0, 0, 0, 0)", "none", "none", "0px"]);
    expect(study.wrappedLines).toBeGreaterThan(0);
    expect(
      Math.abs(study.wrappedLeft - study.paragraphLeft),
    ).toBeLessThanOrEqual(1);
    expect(study.wrappedRight).toBeLessThanOrEqual(study.artLeft + 1);
    expect(study.reclaimedLines).toBeGreaterThan(0);
    expect(
      Math.abs(study.reclaimedLeft - study.paragraphLeft),
    ).toBeLessThanOrEqual(1);
    expect(study.reclaimedRight).toBeGreaterThan(study.artLeft + 12);
    expect(study.boundaryTop).toBeGreaterThanOrEqual(study.artBottom - 1);
  }

  for (const mode of modes) {
    const host = page.locator(`[data-tree-mode="${mode}"]`);
    await host.scrollIntoViewIfNeeded();
    await expect(host).toHaveAttribute("data-tree-state", "running");
    await expect(host.locator(".botanical-canvas")).toBeVisible();
    await expect(host.locator(".botanical-fallback")).toBeHidden();
    await expect
      .poll(async () => (await readRuntimeProbe(page)).modeDraws[mode] ?? 0)
      .toBeGreaterThan(2);
    const before = (await readRuntimeProbe(page)).modeDraws[mode]!;
    await expect
      .poll(async () => (await readRuntimeProbe(page)).modeDraws[mode] ?? 0)
      .toBeGreaterThan(before);
    await captureBotanicalSample(
      page,
      mode as "branches" | "roots" | "cuttings",
      0,
    );
    await captureBotanicalSample(
      page,
      mode as "branches" | "roots" | "cuttings",
      8,
    );
  }
  const probe = await readRuntimeProbe(page);
  for (const mode of ["branches", "roots", "cuttings"]) {
    expect(probe.modeDraws[mode]).toBeGreaterThan(2);
    expect(new Set(probe.modeTimes[mode] ?? []).size).toBeGreaterThan(1);
  }
  const motion = await readBotanicalMotionEvidence(page);
  expect(motion.map(({ mode }) => mode)).toEqual([
    "branches",
    "roots",
    "cuttings",
  ]);
  for (const study of motion) {
    expect(study.massRatio).toBeGreaterThan(0.82);
    expect(study.massRatio).toBeLessThan(1.18);
    expect(study.overallChange).toBeGreaterThan(0.08);
    expect(study.topChange).toBeGreaterThan(study.bottomChange * 1.35);
  }
  expect(probe.maxPendingFrames).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBe(0);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const host of await page.locator(".botanical-flair").all()) {
    await host.scrollIntoViewIfNeeded();
    const mobile = await host.evaluate((element) => {
      const paragraph = element.parentElement;
      if (paragraph === null)
        throw new Error("Botanical shader lost its paragraph");
      const heading = paragraph.previousElementSibling;
      const art = element.getBoundingClientRect();
      const parent = paragraph.getBoundingClientRect();
      const range = document.createRange();
      range.setStartAfter(element);
      range.setEnd(paragraph, paragraph.childNodes.length);
      const firstText = [...range.getClientRects()].find(
        (rect) => rect.width > 1 && rect.height > 1,
      );
      return {
        cssFloat: getComputedStyle(element).cssFloat,
        firstChild: paragraph.firstElementChild === element,
        headingTag: heading?.tagName,
        headingText: heading?.textContent?.trim(),
        height: art.height,
        left: art.left,
        right: art.right,
        width: art.width,
        parentLeft: parent.left,
        parentRight: parent.right,
        textTop: firstText?.top,
        artBottom: art.bottom,
      };
    });
    expect(mobile.cssFloat).toBe("none");
    expect(mobile.firstChild).toBe(true);
    expect(mobile.headingTag).toBe("H3");
    expect(["Branches", "Roots", "Cuttings"]).toContain(mobile.headingText);
    expect(mobile.left).toBeGreaterThanOrEqual(mobile.parentLeft - 1);
    expect(mobile.right).toBeLessThanOrEqual(mobile.parentRight + 1);
    expect(mobile.left).toBeGreaterThanOrEqual(0);
    expect(mobile.right).toBeLessThanOrEqual(390);
    expect(mobile.width).toBeGreaterThan(1);
    expect(mobile.height).toBeGreaterThan(1);
    expect(mobile.width / mobile.height).toBeCloseTo(1.69, 1);
    expect(mobile.textTop).toBeGreaterThanOrEqual(mobile.artBottom - 1);
    await expect(host).toHaveAttribute("data-tree-state", "running");
    await expect(host.locator(".botanical-canvas")).toBeVisible();
    await expect(host.locator(".botanical-fallback")).toBeHidden();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBe(0);
});

test("ActiveGraph clears the botanical floats into one full-width mechanical chapter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl("activegraph"));
  await waitForDocumentFonts(page);

  await expect(page.locator('.contents a[href="#activegraph"]')).toHaveText(
    "ActiveGraph",
  );
  await expect(
    page
      .locator(
        '#activegraph ~ p a[href="#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--FreeFormReference"]',
      )
      .first(),
  ).toHaveText("FreeFormReference");

  const evidence = await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>(".guide");
    const heading = document.querySelector<HTMLElement>("#activegraph");
    const artifacts = document.querySelector<HTMLElement>("#the-artifacts");
    const cutting = document.querySelector<HTMLElement>(
      ".botanical-cuttings .botanical-flair",
    );
    if (
      guide === null ||
      heading === null ||
      artifacts === null ||
      cutting === null
    )
      throw new Error("Missing ActiveGraph layout fixture");
    const nodes: HTMLElement[] = [];
    for (
      let node = heading.nextElementSibling;
      node !== null && node !== artifacts;
      node = node.nextElementSibling
    )
      if (node instanceof HTMLElement) nodes.push(node);
    const guideBox = guide.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const cuttingBox = cutting.getBoundingClientRect();
    return {
      clear: getComputedStyle(heading).clear,
      cuttingsGap: headingBox.top - cuttingBox.bottom,
      foreign: nodes.filter(
        (node) =>
          node.matches("canvas, ul, ol, blockquote") ||
          (node.matches("pre") &&
            node.dataset.codeRole !== "activegraph-declaration"),
      ).length,
      declarations: nodes.filter(
        (node) =>
          node.matches("pre") &&
          node.dataset.codeRole === "activegraph-declaration",
      ).length,
      paragraphs: nodes
        .filter((node) => node.tagName === "P")
        .map((node) => {
          const box = node.getBoundingClientRect();
          return {
            classes: [...node.classList],
            leftGap: box.left - guideBox.left,
            rightGap: guideBox.right - box.right,
            widthRatio: box.width / guideBox.width,
          };
        }),
    };
  });
  expect(evidence.clear).toBe("both");
  expect(evidence.cuttingsGap).toBeGreaterThanOrEqual(-1);
  expect(evidence.foreign).toBe(0);
  expect(evidence.declarations).toBe(1);
  expect(evidence.paragraphs.length).toBeGreaterThanOrEqual(3);
  for (const paragraph of evidence.paragraphs) {
    expect(paragraph.classes).not.toEqual(
      expect.arrayContaining([
        "thesis-prose",
        "model-prose",
        "botanical-anchor",
      ]),
    );
    expect(paragraph.widthRatio).toBeGreaterThanOrEqual(0.98);
    expect(paragraph.widthRatio).toBeLessThanOrEqual(1.01);
    expect(Math.abs(paragraph.leftGap)).toBeLessThanOrEqual(1);
    expect(Math.abs(paragraph.rightGap)).toBeLessThanOrEqual(1);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBe(0);
});

test("the public artifact tree stays readable without widening the viewport", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(pageUrl("the-artifacts"));
    await waitForDocumentFonts(page);

    await expect(page.locator('.contents a[href="#the-artifacts"]')).toHaveText(
      "The artifacts",
    );
    const layout = page.locator(
      'pre[data-code-role="artifact-layout"][data-language="text"]',
    );
    await expect(layout).toHaveCount(1);
    await expect(layout).toContainText("<investigation>/");
    await expect(layout).toContainText("artifacts/");
    await expect(layout).toContainText("receipt.json");
    await expect(
      page.locator(
        '#the-artifacts ~ p a[href="#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--ArtifactReference"]',
      ),
    ).toHaveText("ArtifactReference");

    const geometry = await layout.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const parent = element.parentElement?.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        left: box.left,
        right: box.right,
        parentLeft: parent?.left,
        parentRight: parent?.right,
        overflowX: style.overflowX,
        whiteSpace: style.whiteSpace,
      };
    });
    expect(geometry.documentOverflow).toBe(0);
    expect(geometry.left).toBeGreaterThanOrEqual(
      (geometry.parentLeft ?? 0) - 1,
    );
    expect(geometry.right).toBeLessThanOrEqual(
      (geometry.parentRight ?? viewport.width) + 1,
    );
    expect(geometry.overflowX).toBe("auto");
    expect(geometry.whiteSpace).toBe("pre");
    await expect(page.locator("#complete-investigation")).toHaveCount(0);
  }
});

test("the mature tree flexes above its fixed ground flare while eight loose leaves fall", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await installRuntimeProbe(page);
  await page.goto(pageUrl());
  await waitForDocumentFonts(page);
  await expect(page.locator(".tree-flair")).toHaveAttribute(
    "data-tree-state",
    "running",
  );
  await expect
    .poll(async () => (await readRuntimeProbe(page)).sampleCount)
    .toBe(1);

  for (const phase of [8, 30, 42]) await captureTreeSample(page, phase);

  const evidence = await readTreeSampleEvidence(page);
  console.log(JSON.stringify(evidence));
  expect(evidence.samples).toHaveLength(4);
  for (const sample of evidence.samples) {
    expect(sample.leafOverlays).toBeGreaterThanOrEqual(6);
    expect(sample.leafOverlays + sample.leafWoodOcclusions).toBe(8);
    expect(sample.leafUniqueCells).toBe(8);
    expect(sample.leafMaxAnchorShift).toBeLessThanOrEqual(1.91);
    expect(sample.looseComponents).toBeLessThanOrEqual(8);
    expect(sample.looseCells).toBeGreaterThanOrEqual(sample.looseComponents);
    expect(sample.looseCells).toBeLessThanOrEqual(8);
    expect(sample.looseOutsideAnchors).toBe(0);
    expect(sample.crownShift).toBeLessThanOrEqual(4.51);
    expect(Math.abs(sample.windDrift)).toBeCloseTo(sample.crownShift, 5);
    expect(sample.width).toBeGreaterThanOrEqual(108);
    expect(sample.width).toBeLessThanOrEqual(120);
    expect(sample.minX).toBeGreaterThanOrEqual(10);
    expect(sample.maxX).toBeLessThanOrEqual(133);
    expect(sample.height).toBeGreaterThanOrEqual(50);
    expect(sample.occupied).toBeGreaterThan(1_650);
    expect(sample.renderedOccupied).toBeGreaterThan(1_650);
  }
  expect(
    new Set(evidence.samples.map((sample) => sample.looseSignature)).size,
  ).toBeGreaterThanOrEqual(3);
  for (const transition of evidence.transitions) {
    expect(transition.rootChanged).toBe(0);
    expect(transition.changedField).toBeGreaterThan(0);
    expect(transition.changedRendered).toBeGreaterThan(0);
    expect(transition.maxExpectedShift).toBeGreaterThan(0.2);
    expect(transition.maxExpectedShift).toBeLessThanOrEqual(4.51);
    // Font rasterization changes the eligible row count; the motion accuracy checks below remain strict.
    expect(transition.centroidRows).toBeGreaterThanOrEqual(20);
    expect(transition.centroidMeanError).toBeLessThan(0.7);
    expect(transition.centroidMaxError).toBeLessThan(5);
    expect(transition.coreComparisons).toBeGreaterThan(500);
    expect(transition.densityMeanError).toBeLessThan(0.06);
    expect(transition.densityMeanError).toBeLessThan(
      transition.uncompensatedDensityMeanError * 0.3,
    );
    expect(transition.densityMeanError).toBeLessThan(
      transition.oppositeDensityMeanError * 0.25,
    );
    expect(transition.materialAgreement).toBeGreaterThan(0.96);
    expect(transition.orientationAgreement).toBeGreaterThan(0.98);
  }
  const probe = await readRuntimeProbe(page);
  expect(probe.fieldDraws).toBeGreaterThan(evidence.samples.length);
  expect(probe.fieldDraws).toBe(probe.glyphDraws);
  expect(probe.glyphDraws).toBeGreaterThan(evidence.samples.length);
  expect(probe.drawArrays).toBe(probe.fieldDraws + probe.glyphDraws);
});

test("the hero and inline glyphs remain flexible across the responsive and effective-zoom matrix", async ({
  page,
}) => {
  const viewports = [
    ["phone-320", 320, 568],
    ["phone-360", 360, 640],
    ["phone-390", 390, 844],
    ["phone-430", 430, 932],
    ["phone-landscape", 568, 320],
    ["phone-landscape-wide", 640, 360],
    ["tablet-portrait", 768, 1024],
    ["tablet-large", 820, 1180],
    ["tablet-landscape", 844, 390],
    ["transition-low", 927, 700],
    ["transition-high", 928, 700],
    ["notebook", 1024, 768],
    ["desktop", 1280, 720],
    ["wide", 1440, 900],
    ["wider", 1920, 1080],
    ["zoom-80", 1800, 1125],
    ["zoom-125", 1152, 720],
    ["zoom-150", 960, 600],
    ["zoom-200", 720, 450],
  ] as const;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pageUrl());
  await waitForDocumentFonts(page);

  for (const [label, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    const host = page.locator(".tree-flair");
    await expect(host, label).toBeVisible();
    await host.scrollIntoViewIfNeeded();
    await expect(host, label).toHaveAttribute("data-tree-state", "running");
    await expect(host.locator(".tree-canvas"), label).toBeVisible();
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (element === null) throw new Error(`Missing ${selector}`);
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          height: box.height,
          left: box.left,
          right: box.right,
          top: box.top,
          width: box.width,
        };
      };
      const botanical = [
        ...document.querySelectorAll<HTMLElement>(".botanical-flair"),
      ].map((element) => {
        const art = element.getBoundingClientRect();
        const prose = element.parentElement!.getBoundingClientRect();
        return {
          artLeft: art.left,
          artRight: art.right,
          artWidth: art.width,
          cssFloat: getComputedStyle(element).cssFloat,
          proseLeft: prose.left,
          proseRight: prose.right,
          proseWidth: prose.width,
        };
      });
      const opening = document.querySelector<HTMLElement>(".opening");
      const canvas = document.querySelector<HTMLCanvasElement>(".tree-canvas");
      const thesisProse = document.querySelector<HTMLElement>("p.thesis-prose");
      if (opening === null || canvas === null || thesisProse === null)
        throw new Error("Missing responsive opening");
      const thesisBox = thesisProse.getBoundingClientRect();
      return {
        botanical,
        canvas: rect(".tree-canvas"),
        canvasBacking: {
          height: canvas.height,
          width: canvas.width,
        },
        copy: rect(".opening-copy"),
        display: getComputedStyle(opening).display,
        fallback: rect(".tree-fallback"),
        guide: rect(".guide"),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        thesis: {
          left: thesisBox.left,
          right: thesisBox.right,
          width: thesisBox.width,
        },
        tree: rect(".tree-flair"),
      };
    });
    expect(layout.overflow, label).toBe(0);
    expect(layout.tree.width, label).toBeGreaterThan(40);
    expect(layout.tree.height, label).toBeGreaterThan(20);
    expect(layout.tree.width / layout.tree.height, label).toBeCloseTo(1.775, 2);
    expect(layout.tree.left, label).toBeGreaterThanOrEqual(
      layout.guide.left - 1,
    );
    expect(layout.tree.right, label).toBeLessThanOrEqual(
      layout.guide.right + 1,
    );
    expect(Math.abs(layout.canvas.left - layout.tree.left), label).toBeLessThan(
      1,
    );
    expect(
      Math.abs(layout.canvas.right - layout.tree.right),
      label,
    ).toBeLessThan(1);
    expect(
      Math.abs(layout.fallback.left - layout.tree.left),
      label,
    ).toBeLessThan(2);
    expect(
      Math.abs(layout.fallback.right - layout.tree.right),
      label,
    ).toBeLessThan(2);
    expect(layout.canvasBacking.width, label).toBeLessThanOrEqual(1_680);
    expect(layout.canvasBacking.height, label).toBeLessThanOrEqual(1_088);
    if (layout.display === "grid")
      expect(layout.tree.left, label).toBeGreaterThanOrEqual(layout.copy.right);
    else
      expect(layout.tree.top, label).toBeGreaterThanOrEqual(layout.copy.bottom);
    expect(layout.thesis.left, label).toBeGreaterThanOrEqual(
      layout.guide.left - 1,
    );
    expect(layout.thesis.right, label).toBeLessThanOrEqual(
      layout.guide.right + 1,
    );
    expect(
      layout.thesis.width / layout.guide.width,
      label,
    ).toBeGreaterThanOrEqual(0.98);
    expect(layout.thesis.width / layout.guide.width, label).toBeLessThanOrEqual(
      1.01,
    );
    for (const glyph of layout.botanical) {
      expect(glyph.artLeft, label).toBeGreaterThanOrEqual(glyph.proseLeft - 1);
      expect(glyph.artRight, label).toBeLessThanOrEqual(glyph.proseRight + 1);
      if (width >= 768) {
        expect(["inline-end", "right"], label).toContain(glyph.cssFloat);
        expect(glyph.artWidth / glyph.proseWidth, label).toBeGreaterThanOrEqual(
          0.2,
        );
        expect(glyph.artWidth / glyph.proseWidth, label).toBeLessThanOrEqual(
          0.25,
        );
      } else {
        expect(glyph.cssFloat, label).toBe("none");
      }
    }
  }
});

test("responsive canvases stay bounded at DPR 1 and 2", async ({ browser }) => {
  for (const deviceScaleFactor of [1, 2])
    for (const viewport of [
      { height: 844, width: 390 },
      { height: 900, width: 1440 },
    ]) {
      const context = await browser.newContext({
        deviceScaleFactor,
        viewport,
      });
      const page = await context.newPage();
      await page.goto(pageUrl());
      const host = page.locator(".tree-flair");
      await host.scrollIntoViewIfNeeded();
      await expect(host).toHaveAttribute("data-tree-state", "running");
      const evidence = await page.evaluate(() => {
        const canvas =
          document.querySelector<HTMLCanvasElement>(".tree-canvas");
        if (canvas === null) throw new Error("Missing tree canvas");
        return {
          height: canvas.height,
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          width: canvas.width,
        };
      });
      expect(evidence.overflow).toBe(0);
      expect(evidence.width).toBeLessThanOrEqual(1_680);
      expect(evidence.height).toBeLessThanOrEqual(1_088);
      await context.close();
    }
});

test("text scaling cannot collapse the editorial copy or overflow its shaders", async ({
  page,
}) => {
  await page.goto(pageUrl());
  for (const viewport of [
    { height: 768, width: 1024 },
    { height: 900, width: 1440 },
  ])
    for (const fontSize of [20, 24, 32]) {
      await page.setViewportSize(viewport);
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = `${size}px`;
        scrollTo(0, 0);
      }, fontSize);
      const host = page.locator(".tree-flair");
      await expect(host).toBeVisible();
      await host.scrollIntoViewIfNeeded();
      await expect(host).toHaveAttribute("data-tree-state", "running");
      const evidence = await page.evaluate(() => {
        const box = (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (element === null) throw new Error(`Missing ${selector}`);
          return element.getBoundingClientRect();
        };
        const copy = box(".opening-copy");
        const guide = box(".guide");
        const thesis = box("p.thesis-prose");
        const tree = box(".tree-flair");
        const botanical = [
          ...document.querySelectorAll<HTMLElement>(".botanical-flair"),
        ].map((element) => {
          const art = element.getBoundingClientRect();
          return {
            left: art.left,
            right: art.right,
            width: art.width,
          };
        });
        return {
          botanical,
          copyWidth: copy.width,
          guideLeft: guide.left,
          guideRight: guide.right,
          guideWidth: guide.width,
          openingHeight: box(".opening").height,
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          thesisLeft: thesis.left,
          thesisRight: thesis.right,
          thesisWidth: thesis.width,
          treeLeft: tree.left,
          treeRight: tree.right,
          treeWidth: tree.width,
        };
      });
      expect(evidence.overflow).toBe(0);
      expect(evidence.copyWidth).toBeGreaterThan(250);
      expect(evidence.treeWidth).toBeGreaterThan(120);
      expect(evidence.treeLeft).toBeGreaterThanOrEqual(evidence.guideLeft - 1);
      expect(evidence.treeRight).toBeLessThanOrEqual(evidence.guideRight + 1);
      expect(evidence.thesisWidth).toBeGreaterThan(250);
      expect(evidence.thesisLeft).toBeGreaterThanOrEqual(
        evidence.guideLeft - 1,
      );
      expect(evidence.thesisRight).toBeLessThanOrEqual(evidence.guideRight + 1);
      expect(evidence.thesisWidth / evidence.guideWidth).toBeGreaterThanOrEqual(
        0.98,
      );
      expect(evidence.thesisWidth / evidence.guideWidth).toBeLessThanOrEqual(
        1.01,
      );
      for (const glyph of evidence.botanical) {
        expect(glyph.left).toBeGreaterThanOrEqual(evidence.guideLeft - 1);
        expect(glyph.right).toBeLessThanOrEqual(evidence.guideRight + 1);
        expect(glyph.width / evidence.guideWidth).toBeGreaterThanOrEqual(0.2);
        expect(glyph.width / evidence.guideWidth).toBeLessThanOrEqual(0.25);
      }
      expect(evidence.openingHeight).toBeLessThan(1_200);
    }
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("font-size");
  });
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
  await expect(staticPage.locator("#the-thesis")).toContainText("The thesis");
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
  await expect(page.locator("#the-thesis")).toContainText("The thesis");
  await expect(page.locator("#the-model")).toContainText("The model");
  expect(pageErrors).toEqual([]);
});

test("reduced motion renders exactly one two-pass frame and no loop", async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 700 },
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
    fieldDraws: 1,
    glyphDraws: 1,
    maxPendingFrames: 0,
    pendingFrames: 0,
    rafCallbacks: 0,
    rafRequests: 0,
    revealDraws: [2],
    times: [0, 0],
  });
  await context.close();
});

test("offscreen and hidden pauses preserve phase and single-loop ownership", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
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
  await page.setViewportSize({ width: 1440, height: 700 });
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
  expect(restored.fieldDraws).toBeGreaterThan(beforeRestore.fieldDraws);
  expect(restored.fieldDraws).toBe(restored.glyphDraws);
  expect(restored.revealDraws).toHaveLength(2);
  expect(restored.revealDraws[1]! - beforeRestore.drawArrays).toBe(2);
  expect(restored.maxPendingFrames).toBe(1);
  expect(restored.pendingFrames).toBe(1);
});
