import { Mesh, Program, Renderer, RenderTarget, Texture, Triangle } from "ogl";
export const TREE_STATES = ["fallback", "initializing", "running", "paused", "static", "lost", "failed"] as const;
export type TreeState = (typeof TREE_STATES)[number];
export type TreeEvent = "initialize" | "render" | "freeze" | "pause" | "resume" | "lose" | "fail" | "reset";
export const FRAME_INTERVAL = 1000 / 30;
const FIELD_COLUMNS = 144,
  FIELD_ROWS = 56,
  PRESENTATION_X = 1.24;
const MODES = ["hero", "branches", "roots", "cuttings"] as const;
type TreeMode = (typeof MODES)[number];
const MAX_WIDTH = 1_680,
  MAX_HEIGHT = 1_088,
  MAX_PIXELS = 1_900_000,
  MAX_DPR = 1.5;
export function transitionTree(state: TreeState, event: TreeEvent): TreeState {
  if (event === "reset") return "fallback";
  if (event === "fail") return "failed";
  if (event === "lose") return "lost";
  if (event === "initialize" && (state === "fallback" || state === "lost")) return "initializing";
  if (event === "render" && ["initializing", "paused", "static"].includes(state)) return "running";
  if (event === "freeze" && ["initializing", "running", "paused"].includes(state)) return "static";
  if (event === "pause" && (state === "running" || state === "static")) return "paused";
  if (event === "resume" && state === "paused") return "running";
  return state;
}
export function fitBackingStore(cssWidth: number, cssHeight: number, deviceDpr: number) {
  const width = Math.max(1, Math.floor(cssWidth));
  const height = Math.max(1, Math.floor(cssHeight));
  const requested = Math.min(MAX_DPR, Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1);
  const dpr = Math.min(requested, MAX_WIDTH / width, MAX_HEIGHT / height, Math.sqrt(MAX_PIXELS / (width * height)));
  return {
    cssWidth: width,
    cssHeight: height,
    dpr,
    width: Math.max(1, Math.floor(width * dpr)),
    height: Math.max(1, Math.floor(height * dpr)),
  };
}
export function advancePhase(phase: number, previous: number | null, now: number) {
  return previous === null || now <= previous ? phase : phase + (now - previous) / 1000;
}
const VERTEX = `#version 300 es
precision highp float; in vec2 position, uv; out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
// Static topology derives from OffsetFibTree: https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/tree.py
// Color ranges derive from PyBonsai's per-glyph sampling: https://github.com/Ben-Edwards44/PyBonsai/blob/4e6546e6953f86b6a0494a85fd22714f11dc0e40/draw.py
const TREE_FIELD = `#version 300 es
precision highp float; uniform float uTime; in vec2 vUv; out vec4 outColor;
const float OFFSET_FIB_SCALE = 0.75, OFFSET_FIB_ANGLE = 0.698132, OFFSET_FIB_JITTER = 0.139626;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + 19.19) * 43758.5453123); }
float treeSway() { return sin(uTime * 0.22) * 0.029 + sin(uTime * 0.083) * 0.010; }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y); }
float fbm(vec2 p) {
  float value = 0.0, weight = 0.5; for (int octave = 0; octave < 4; octave++) { value += weight * noise(p); p = p * 2.03 + vec2(17.31, 9.73); weight *= 0.5; } return value;
}
float capsule(vec2 p, vec2 a, vec2 b, float radius) { vec2 pa = p - a, ba = b - a; float along = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * along) - radius; }
float fill(float distance) { return 1.0 - smoothstep(-0.004, 0.010, distance); }
float stroke(float distance) { return 1.0 - smoothstep(-0.001, 0.003, distance); }
vec2 pointOn(vec4 branch, float along) { return branch.xy + branch.w * along * vec2(sin(branch.z), cos(branch.z)); }
vec2 normalizeOffsetTree(vec2 point) { return vec2(point.x * 0.79, 0.06 + (point.y - 0.06) * 1.04); }
void buildOffsetFibonacci(out vec4 branches[53], out vec2 terminals[34]) {
  const int starts[6] = int[6](0, 1, 3, 6, 11, 19), totals[7] = int[7](1, 2, 3, 5, 8, 13, 21), rotations[6] = int[6](0, 1, 0, 0, 3, 4); branches[0] = vec4(0.0, 0.06, 0.0, 0.30); int cursor = 1;
  for (int layer = 0; layer < 6; layer++) {
    int parents = totals[layer], childrenTotal = totals[layer + 1], base = childrenTotal / parents, extra = childrenTotal - base * parents;
    for (int slot = 0; slot < 13; slot++) {
      if (slot >= parents) break; vec4 parent = branches[starts[layer] + slot]; int rank = (slot + rotations[layer]) % parents, children = base + (rank < extra ? 1 : 0);
      for (int child = 0; child < 2; child++) {
        if (child >= children) break; float seed = float(cursor * 17 + layer * 31 + slot * 7 + child * 13); float jitter = (hash(vec2(seed, float(layer + 1))) + hash(vec2(seed + 11.0, float(layer + 7))) - 1.0) * OFFSET_FIB_JITTER; float side = child % 2 == 0 ? 1.0 : -1.0, along = float(child + 1) / float(children);
        branches[cursor++] = vec4(pointOn(parent, along), parent.z + side * (OFFSET_FIB_ANGLE + jitter), parent.w * OFFSET_FIB_SCALE);
  } } }
  int leafCursor = 0; for (int slot = 0; slot < 21; slot++) {
    vec4 parent = branches[32 + slot]; int children = 1 + (((slot + 17) % 21) < 13 ? 1 : 0);
    for (int child = 0; child < 2; child++) { if (child < children) terminals[leafCursor++] = pointOn(parent, float(child + 1) / float(children)); }
  } }
void main() {
  vec2 base = vec2((vUv.x - 0.5) * 1.25, vUv.y);
  float rooted = sqrt(smoothstep(0.055, 0.90, base.y));
  float bend = treeSway() * rooted; vec2 p = base; p.x -= bend;
  vec4 branches[53]; vec2 terminals[34]; buildOffsetFibonacci(branches, terminals);
  float wood = 0.0, orientation = 0.5; for (int index = 0; index < 53; index++) {
    vec2 start = normalizeOffsetTree(branches[index].xy), end = normalizeOffsetTree(pointOn(branches[index], 1.0));
    float radius = index < 1 ? 0.010 : index < 3 ? 0.007 : index < 6 ? 0.005 : index < 11 ? 0.0035 : index < 19 ? 0.0025 : index < 32 ? 0.0025 : 0.0020; float branch = stroke(capsule(p, start, end, radius));
    if (branch > wood) { wood = branch; float direction = end.x - start.x; orientation = abs(direction) < 0.015 ? 0.5 : direction > 0.0 ? 0.2 : 0.8; }
  }
  float shade = hash(floor(vec2((p.x + 0.625) * 115.2, p.y * 56.0)) + vec2(83.0, 37.0)) * 0.98;
  float root = stroke(capsule(base, vec2(0.00, 0.080), vec2(-0.14, 0.045), 0.006)); if (root > wood) { wood = root; orientation = 0.8; shade = 1.0; } root = stroke(capsule(base, vec2(0.00, 0.080), vec2(0.13, 0.050), 0.006));
  if (root > wood) { wood = root; orientation = 0.2; shade = 1.0; }
  float crown = 1.0; for (int index = 0; index < 34; index++) {
    float seed = float(index + 1); vec2 center = normalizeOffsetTree(terminals[index]);
    vec2 drift = vec2(hash(vec2(seed, 17.0)) - 0.5, hash(vec2(29.0, seed)) - 0.5) * vec2(0.022, 0.015), sprig = vec2(hash(vec2(seed, 43.0)) - 0.5, hash(vec2(71.0, seed)) - 0.5) * vec2(0.060, 0.035);
    vec2 q = p - center - drift; float cluster = length(q * vec2(0.82, 1.18)) - 0.067; cluster = min(cluster, length((q - sprig) * vec2(0.92, 1.25)) - 0.044); cluster = min(cluster, length((q + sprig.yx) * vec2(0.96, 1.30)) - 0.039); cluster = min(cluster, length((q + vec2(-sprig.y, sprig.x) * 0.72) * vec2(1.0, 1.35)) - 0.032); crown = min(crown, cluster);
  }
  crown += (fbm(p * 12.0 + vec2(53.2, 11.7)) - 0.5) * 0.008; float attached = fill(crown) * smoothstep(0.20, 0.32, p.y); attached *= mix(0.18, 0.96, smoothstep(0.24, 0.72, fbm(p * 13.4 + vec2(7.4, 29.1))));
  float density = max(wood, attached), material = step(attached, wood) * step(0.04, wood); outColor = vec4(density, material, orientation, shade);
}`;
const ASCII_GLYPHS = `#version 300 es
precision highp float; uniform sampler2D tField; uniform float uTime, uMode; uniform vec2 uGrid; in vec2 vUv; out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + 19.19) * 43758.5453123); }
float treeSway() { return sin(uTime * 0.22) * 0.029 + sin(uTime * 0.083) * 0.010; }
vec2 turn(vec2 p, float angle) { float c = cos(angle), s = sin(angle); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float segment(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a, ba = b - a; float along = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); float distance = length(pa - ba * along); return 1.0 - smoothstep(width, width + 0.055, distance);
}
float disc(vec2 p, vec2 center, float radius) { return 1.0 - smoothstep(radius, radius + 0.035, length(p - center)); }
float glyph(int id, vec2 p) {
  if (id == 0) return disc(p, vec2(0, -0.31), 0.10); // .
  if (id == 1) return max(disc(p, vec2(0, -0.22), 0.085), disc(p, vec2(0, 0.22), 0.085)); // :
  if (id == 2) return max(segment(p, vec2(-0.28, 0), vec2(0.28, 0), 0.095), max(segment(p, vec2(-0.22, -0.28), vec2(0.22, 0.28), 0.085), segment(p, vec2(-0.22, 0.28), vec2(0.22, -0.28), 0.085))); // *
  if (id == 3) return smoothstep(0.105, 0.045, abs(length(p * vec2(1, 0.82)) - 0.27)); // o
  if (id == 4) return max(max(segment(p, vec2(-0.15, -0.4), vec2(-0.08, 0.4), 0.07),
    segment(p, vec2(0.08, -0.4), vec2(0.15, 0.4), 0.07)), max(segment(p, vec2(-0.3, -0.13), vec2(0.3, -0.08), 0.07), segment(p, vec2(-0.3, 0.13), vec2(0.3, 0.08), 0.07))); // #
  if (id == 5) return segment(p, vec2(-0.27, -0.4), vec2(0.27, 0.4), 0.08); // /
  if (id == 6) return segment(p, vec2(0, -0.42), vec2(0, 0.42), 0.08); // |
  if (id == 7) return segment(p, vec2(-0.27, 0.4), vec2(0.27, -0.4), 0.08); // backslash
  return max(segment(p, vec2(0, -0.42), vec2(0, 0.02), 0.08), max(segment(p, vec2(0, 0.02), vec2(-0.25, 0.4), 0.08), segment(p, vec2(0, 0.02), vec2(0.25, 0.4), 0.08))); // Y
}
float fallingLeaf(vec2 cell, float seed, float anchor, float speed) {
  float progress = fract(seed + uTime * speed);
  float sway = sin(uTime * 0.48 + seed * 31.0) * 1.35 + sin(uTime * 0.19 + seed * 47.0) * 0.55;
  vec2 center = vec2(anchor + treeSway() * 115.2 + sway, mix(51.0, 5.0, progress)); return 1.0 - step(0.1, length(cell - floor(center)));
}
void takeLeaf(inout float loose, inout float seed, float candidate, float slot) { if (candidate > loose) { loose = candidate; seed = slot; } }
void main() {
  bool botanical = uMode > 0.5; vec2 gridPoint = vUv * uGrid;
  if (botanical) {
    float height = gridPoint.y / max(uGrid.y - 1.0, 1.0), wind;
    if (uMode < 1.5) {
      float phase = mix(-0.35, 0.65, smoothstep(0.08, 0.92, gridPoint.x / uGrid.x));
      wind = (sin(uTime * 0.22 + phase) - sin(phase)) * 0.52 + (sin(uTime * 0.083 + phase) - sin(phase)) * 0.16;
      gridPoint.x -= wind * smoothstep(0.06, 0.96, height);
    } else if (uMode < 2.5) {
      wind = sin(uTime * 0.22) * 0.42 + sin(uTime * 0.083) * 0.14;
      gridPoint.x -= wind * smoothstep(0.08, 0.94, height);
    } else {
      float angle = sin(uTime * 0.22) * 0.035 + sin(uTime * 0.083) * 0.012;
      vec2 pivot = vec2(uGrid.x * 0.52, uGrid.y * 0.04); gridPoint = pivot + turn(gridPoint - pivot, -angle);
    }
  }
  vec2 cell = floor(gridPoint); bool inside = all(greaterThanEqual(cell, vec2(0))) && all(lessThan(cell, uGrid));
  vec4 field = inside ? texture(tField, (cell + 0.5) / uGrid) : vec4(0);
  float density = botanical ? field.a : field.r; bool wood = field.g > 0.5;
  float loose = 0.0, looseSeed = 0.0;
  if (!botanical) {
    takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.18, 36.0, 0.027), 0.18); takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.27, 51.0, 0.025), 0.27);
    takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.40, 106.5, 0.030), 0.40); takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.51, 94.0, 0.028), 0.51);
    takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.60, 42.0, 0.024), 0.60); takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.73, 100.5, 0.026), 0.73);
    takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.84, 38.0, 0.022), 0.84); takeLeaf(loose, looseSeed, fallingLeaf(cell, 0.33, 113.0, 0.023), 0.33);
  }
  bool detached = !botanical && !wood && loose > 0.08;
  int id = botanical ? int(round(field.r * 8.0)) : density < 0.25 ? 0 : density < 0.42 ? 1 : density < 0.60 ? 2 : density < 0.78 ? 3 : 4;
  if (detached) { density = max(0.55, loose); id = 2; }
  if (!botanical && wood) {
    id = field.b < 0.34 ? 5 : field.b > 0.66 ? 7 : 6;
    if (density > 0.9 && abs(field.b - 0.5) < 0.08 && (abs(vUv.y - 0.43) < 0.025 || abs(vUv.y - 0.58) < 0.025)) id = 8;
  }
  bool accent = detached; float seed = detached ? looseSeed : botanical ? field.b : field.a;
  float red = hash(vec2(seed, 17.0)), green = hash(vec2(seed, 43.0)), leaf = hash(vec2(seed, 71.0));
  const vec3 ink = vec3(41.0, 35.0, 30.0) / 255.0;
  vec3 branchColor = mix(ink, vec3(mix(200.0 / 255.0, 1.0, red), mix(150.0 / 255.0, 1.0, green), 0.0), 0.40);
  vec3 leafColor = mix(ink, vec3(0.0, mix(75.0 / 255.0, 1.0, leaf), 0.0), 0.40);
  vec3 color = uMode > 1.5 && uMode < 2.5 ? vec3(127.0, 123.0, 18.0) / 255.0 : wood && seed > 0.995 ? mix(ink, vec3(1.0, 1.0, 0.0), 0.40) : wood ? branchColor : leafColor;
  float alpha = wood ? mix(0.46, 0.72, density) :
                accent ? 0.68 : mix(0.22, 0.60, density);
  vec2 glyphPoint = fract(gridPoint) - 0.5; float height = cell.y / max(uGrid.y - 1.0, 1.0);
  if (uMode > 1.5 && uMode < 2.5) {
    float distance = 1.0 - height + abs(cell.x / uGrid.x - 0.5) * 0.18;
    float current = sin(uTime * 0.23 - distance * 5.2) - sin(-distance * 5.2);
    alpha *= 1.0 + current * 0.060; color = mix(color, vec3(0.56, 0.40, 0.10), abs(current) * 0.030);
  }
  if (!botanical && wood && seed < 0.995) glyphPoint = turn(glyphPoint, treeSway() * 2.2 * smoothstep(0.055, 0.28, vUv.y));
  alpha = density < 0.08 ? 0.0 : min(alpha, 0.72) * glyph(id, glyphPoint);
  outColor = vec4(color * alpha, alpha);
}`;
const CONTEXT = {
  alpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  powerPreference: "low-power",
} satisfies WebGLContextAttributes;
type Gl = Renderer["gl"] & WebGL2RenderingContext;
function releaseParts(
  gl: Gl,
  geometry: Triangle | undefined,
  programs: readonly (Program | undefined)[],
  target?: RenderTarget,
  mask?: Texture,
) {
  geometry?.remove();
  for (const program of programs)
    if (program) {
      gl.deleteShader(program.vertexShader);
      gl.deleteShader(program.fragmentShader);
      program.remove();
    }
  if (target) {
    for (const texture of target.textures) gl.deleteTexture(texture.texture);
    gl.deleteFramebuffer(target.buffer);
    if (target.depthBuffer) gl.deleteRenderbuffer(target.depthBuffer);
    if (target.stencilBuffer) gl.deleteRenderbuffer(target.stencilBuffer);
    if (target.depthStencilBuffer) gl.deleteRenderbuffer(target.depthStencilBuffer);
  }
  if (mask) gl.deleteTexture(mask.texture);
}
const GLYPHS = ".:*o#/|\\Y";
function makeMask(gl: Gl, fallback: HTMLElement, mode: Exclude<TreeMode, "hero">) {
  const rows = (fallback.textContent ?? "").split("\n");
  const columns = Math.max(...rows.map((row) => row.length));
  if (rows.length < 1 || columns < 1 || rows.some((row) => row.length !== columns)) throw new Error("Invalid mask");
  const image = new Uint8Array(columns * rows.length * 4);
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < columns; x++) {
      const glyph = rows[y]![x]!;
      if (glyph === " ") continue;
      const id = GLYPHS.indexOf(glyph);
      if (id < 0) throw new Error("Invalid mask glyph");
      const at = ((rows.length - y - 1) * columns + x) * 4;
      image[at] = Math.round((id * 255) / 8);
      image[at + 1] = mode === "roots" || /[/\\|Y]/u.test(glyph) ? 255 : 0;
      image[at + 2] = (x * 17 + y * 31 + glyph.charCodeAt(0)) % 256;
      image[at + 3] = 255;
    }
  const texture = new Texture(gl, {
    image,
    width: columns,
    height: rows.length,
    flipY: false,
    generateMipmaps: false,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    format: gl.RGBA,
    internalFormat: gl.RGBA8,
    type: gl.UNSIGNED_BYTE,
  });
  return { columns, rows: rows.length, texture };
}
function createGpu(
  canvas: HTMLCanvasElement,
  size: ReturnType<typeof fitBackingStore>,
  mode: TreeMode,
  fallback: HTMLElement,
) {
  if (canvas.getContext("webgl2", CONTEXT) === null) throw new Error("WebGL2 unavailable");
  const renderer = new Renderer({
    canvas,
    ...CONTEXT,
    webgl: 2,
    width: size.cssWidth,
    height: size.cssHeight,
    dpr: size.dpr,
    autoClear: true,
  });
  if (!renderer.isWebgl2) throw new Error("WebGL2 required");
  const gl = renderer.gl as Gl;
  gl.clearColor(0, 0, 0, 0);
  const partial = {} as {
    geometry?: Triangle;
    field?: Program;
    glyph?: Program;
    target?: RenderTarget;
    mask?: ReturnType<typeof makeMask>;
  };
  try {
    const geometry = (partial.geometry = new Triangle(gl));
    const fieldProgram =
      mode === "hero"
        ? (partial.field = new Program(gl, {
            vertex: VERTEX,
            fragment: TREE_FIELD,
            uniforms: { uTime: { value: 0 } },
            cullFace: false,
            depthTest: false,
            depthWrite: false,
          }))
        : undefined;
    const target =
      mode === "hero"
        ? (partial.target = new RenderTarget(gl, {
            width: FIELD_COLUMNS,
            height: FIELD_ROWS,
            depth: false,
            stencil: false,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            format: gl.RGBA,
            internalFormat: gl.RGBA8,
            type: gl.UNSIGNED_BYTE,
          }))
        : undefined;
    const mask = mode === "hero" ? undefined : (partial.mask = makeMask(gl, fallback, mode));
    const grid = mode === "hero" ? [FIELD_COLUMNS, FIELD_ROWS] : [mask!.columns, mask!.rows];
    const glyphProgram = (partial.glyph = new Program(gl, {
      vertex: VERTEX,
      fragment: ASCII_GLYPHS,
      uniforms: {
        tField: { value: target?.texture ?? mask!.texture },
        uTime: { value: 0 },
        uMode: { value: MODES.indexOf(mode) },
        uGrid: { value: grid },
      },
      transparent: true,
      cullFace: false,
      depthTest: false,
      depthWrite: false,
    }));
    let ready = true;
    for (const program of [fieldProgram, glyphProgram].filter((value): value is Program => value !== undefined)) {
      const vertexReady = Boolean(gl.getShaderParameter(program.vertexShader, gl.COMPILE_STATUS));
      const fragmentReady = Boolean(gl.getShaderParameter(program.fragmentShader, gl.COMPILE_STATUS));
      const linked = Boolean(gl.getProgramParameter(program.program, gl.LINK_STATUS));
      ready = vertexReady && fragmentReady && linked && ready;
    }
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.buffer);
      ready &&= gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    const glyphMesh = new Mesh(gl, { geometry, program: glyphProgram });
    return {
      ready,
      renderer,
      gl,
      geometry,
      fieldProgram,
      glyphProgram,
      target,
      mask,
      fieldDraw:
        fieldProgram && target
          ? {
              scene: new Mesh(gl, { geometry, program: fieldProgram }),
              target,
              clear: true,
              sort: false,
              frustumCull: false,
            }
          : undefined,
      glyphDraw: { scene: glyphMesh, clear: true, sort: false, frustumCull: false },
    };
  } catch (cause) {
    try {
      releaseParts(gl, partial.geometry, [partial.field, partial.glyph], partial.target, partial.mask?.texture);
    } catch {}
    throw cause;
  }
}
type Gpu = ReturnType<typeof createGpu>;
function releaseGpu(gpu: Gpu) {
  releaseParts(gpu.gl, gpu.geometry, [gpu.fieldProgram, gpu.glyphProgram], gpu.target, gpu.mask?.texture);
}
type Frame = (now: number) => void;
const frames = new Set<Frame>();
let frameRequest: number | null = null;
function pump(now: number) {
  frameRequest = null;
  for (const frame of [...frames]) frame(now);
  if (frames.size > 0) frameRequest = requestAnimationFrame(pump);
}
const scheduleFrame = (frame: Frame) => {
  frames.add(frame);
  if (frameRequest === null) frameRequest = requestAnimationFrame(pump);
};
const cancelFrame = (frame: Frame) => {
  frames.delete(frame);
  if (frames.size === 0 && frameRequest !== null) cancelAnimationFrame(frameRequest);
  if (frames.size === 0) frameRequest = null;
};
function boot(host: HTMLElement) {
  const fallback = host.querySelector<HTMLElement>(".ascii-fallback");
  const canvas = host.querySelector<HTMLCanvasElement>(".ascii-canvas");
  const mode = MODES.find((value) => value === host.dataset.treeMode);
  if (!fallback || !canvas || !mode) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let state: TreeState = "fallback";
  let gpu: Gpu | null = null;
  let phase = 0;
  let previousFrame: number | null = null;
  let intersecting = false;
  const move = (event: TreeEvent) => {
    const next = transitionTree(state, event);
    if (next !== state) {
      state = next;
      host.dataset.treeState = next;
    }
  };
  const showFallback = () => {
    if (!canvas.hidden) canvas.hidden = true;
    if (fallback.hidden) fallback.hidden = false;
  };
  const showCanvas = () => {
    if (canvas.hidden) canvas.hidden = false;
    if (!fallback.hidden) fallback.hidden = true;
  };
  const cancel = () => {
    cancelFrame(tick);
    previousFrame = null;
  };
  const active = () => intersecting && !document.hidden;
  const measure = () => {
    const bounds = host.getBoundingClientRect();
    return fitBackingStore(bounds.width, bounds.height, devicePixelRatio * (mode === "hero" ? PRESENTATION_X : 1));
  };
  const dispose = () => {
    if (gpu) {
      try {
        releaseGpu(gpu);
      } catch {
        /* context teardown is best effort */
      }
      gpu = null;
    }
  };
  const fail = () => {
    cancel();
    dispose();
    showFallback();
    move("fail");
  };
  const draw = (time: number) => {
    if (!gpu) return false;
    try {
      if (gpu.fieldProgram) gpu.fieldProgram.uniforms.uTime.value = time;
      gpu.glyphProgram.uniforms.uTime.value = time;
      if (gpu.fieldDraw) gpu.renderer.render(gpu.fieldDraw);
      gpu.renderer.render(gpu.glyphDraw);
      return !gpu.gl.isContextLost() && gpu.gl.getError() === gpu.gl.NO_ERROR;
    } catch {
      return false;
    }
  };
  const schedule = () => {
    if (state === "running") scheduleFrame(tick);
  };
  function tick(now: number) {
    if (state !== "running" || !active()) {
      cancel();
      return;
    }
    if (previousFrame === null) previousFrame = now;
    else if (now - previousFrame >= FRAME_INTERVAL) {
      phase = advancePhase(phase, previousFrame, now);
      previousFrame = now;
      if (!draw(phase)) {
        fail();
        return;
      }
    }
  }
  const initialize = () => {
    move("initialize");
    try {
      const size = measure();
      gpu = createGpu(canvas, size, mode, fallback);
      phase = 0;
      if (!gpu.ready || !draw(0)) {
        fail();
        return;
      }
      showCanvas();
      move(motion.matches ? "freeze" : "render");
      previousFrame = performance.now();
      schedule();
    } catch {
      fail();
    }
  };
  const evaluate = () => {
    if (state === "failed") return;
    if (!active()) {
      cancel();
      if (gpu) move("pause");
      return;
    }
    if (!gpu) {
      initialize();
      return;
    }
    if (motion.matches) {
      if (state === "static") return;
      cancel();
      phase = 0;
      if (!draw(0)) {
        fail();
        return;
      }
      showCanvas();
      move("freeze");
      return;
    }
    move(state === "paused" ? "resume" : "render");
    schedule();
  };
  const resize = () => {
    if (!gpu) {
      evaluate();
      return;
    }
    const size = measure();
    if (gpu.renderer.width === size.cssWidth && gpu.renderer.height === size.cssHeight && gpu.renderer.dpr === size.dpr)
      return;
    gpu.renderer.dpr = size.dpr;
    gpu.renderer.setSize(size.cssWidth, size.cssHeight);
    if (state === "static" && !draw(0)) fail();
  };
  host.dataset.treeState = state;
  showFallback();
  const bounds = host.getBoundingClientRect();
  intersecting = bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancel();
    gpu = null;
    showFallback();
    move("lose");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    if (active()) evaluate();
  });
  motion.addEventListener("change", evaluate);
  document.addEventListener("visibilitychange", evaluate);
  if (typeof IntersectionObserver !== "undefined")
    new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? false;
      evaluate();
    }).observe(host);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(host);
  else addEventListener("resize", resize);
  evaluate();
}
if (typeof document !== "undefined") {
  for (const host of document.querySelectorAll<HTMLElement>(".ascii-flair")) {
    try {
      boot(host);
    } catch {
      host.dataset.treeState = "failed";
    }
  }
}
