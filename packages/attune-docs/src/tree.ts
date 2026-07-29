import { Mesh, Program, Renderer, RenderTarget, Triangle } from "ogl";
export const TREE_STATES = ["fallback", "initializing", "running", "paused", "static", "lost", "failed"] as const;
export type TreeState = (typeof TREE_STATES)[number];
export type TreeEvent = "initialize" | "render" | "freeze" | "pause" | "resume" | "lose" | "fail" | "reset";
export const TREE_QUERY = "(min-width: 68rem)";
export const FRAME_INTERVAL = 1000 / 30;
const FIELD_COLUMNS = 60,
  FIELD_ROWS = 24;
const MAX_WIDTH = 640,
  MAX_HEIGHT = 512,
  MAX_PIXELS = 327_680,
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
const TREE_FIELD = `#version 300 es
precision highp float; uniform float uTime; in vec2 vUv; out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + 19.19) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) {
  float value = 0.0, weight = 0.5;
  for (int octave = 0; octave < 4; octave++) { value += weight * noise(p); p = p * 2.03 + vec2(17.31, 9.73); weight *= 0.5; } return value;
}
float capsule(vec2 p, vec2 a, vec2 b, float radius) {
  vec2 pa = p - a, ba = b - a; float along = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * along) - radius;
}
float fill(float distance) { return 1.0 - smoothstep(-0.004, 0.010, distance); }
float lobe(vec2 p, vec2 center, float radius) { return length(p - center) - radius; }
void main() {
  vec2 base = vec2((vUv.x - 0.5) * 1.25, vUv.y);
  float lift = smoothstep(0.30, 0.92, base.y); float breeze = sin(uTime * 0.13 + base.y * 5.2);
  breeze += 0.35 * sin(uTime * 0.08 + base.y * 8.0 + 1.7);
  breeze += 0.22 * (noise(vec2(base.y * 2.1 + 41.0, uTime * 0.015)) - 0.5);
  vec2 p = base; p.x -= breeze * lift * 0.012;
  float taper = mix(0.022, 0.006, smoothstep(0.07, 0.67, base.y));
  float trunkDistance = max(abs(base.x) - taper, max(0.055 - base.y, base.y - 0.67));
  float wood = fill(trunkDistance), orientation = 0.5;
  float branch = fill(capsule(base, vec2(-0.02, 0.10), vec2(-0.32, 0.025), 0.018));
  if (branch > wood) { wood = branch; orientation = 0.2; } branch = fill(capsule(base, vec2(0.02, 0.10), vec2(0.32, 0.025), 0.018));
  if (branch > wood) { wood = branch; orientation = 0.8; } branch = fill(capsule(p, vec2(-0.01, 0.36), vec2(-0.30, 0.63), 0.009));
  if (branch > wood) { wood = branch; orientation = 0.8; } branch = fill(capsule(p, vec2(-0.10, 0.48), vec2(-0.30, 0.74), 0.006));
  if (branch > wood) { wood = branch; orientation = 0.8; } branch = fill(capsule(p, vec2(0.01, 0.43), vec2(0.30, 0.70), 0.008));
  if (branch > wood) { wood = branch; orientation = 0.2; } branch = fill(capsule(p, vec2(0.07, 0.57), vec2(0.27, 0.84), 0.006));
  if (branch > wood) { wood = branch; orientation = 0.2; } branch = fill(capsule(p, vec2(-0.02, 0.58), vec2(-0.17, 0.87), 0.006));
  if (branch > wood) { wood = branch; orientation = 0.8; }
  float canopyDistance = lobe(p, vec2(-0.18, 0.68), 0.15);
  canopyDistance = min(canopyDistance, lobe(p, vec2(-0.07, 0.75), 0.18)); canopyDistance = min(canopyDistance, lobe(p, vec2(0.10, 0.76), 0.18));
  canopyDistance = min(canopyDistance, lobe(p, vec2(0.20, 0.69), 0.14)); canopyDistance = min(canopyDistance, lobe(p, vec2(0.04, 0.60), 0.20));
  canopyDistance += (fbm(p * 6.1 + vec2(53.2, 11.7)) - 0.5) * 0.025;
  float leaves = fill(canopyDistance) * smoothstep(0.43, 0.54, p.y); leaves *= smoothstep(0.32, 0.48, fbm(p * 9.0 + vec2(7.4, 29.1)));
  float density = max(wood, leaves), material = step(leaves, wood);
  outColor = vec4(density, material, orientation, density);
}`;
const ASCII_GLYPHS = `#version 300 es
precision highp float; uniform sampler2D tField; uniform vec3 uMuted, uInk, uAccent; in vec2 vUv; out vec4 outColor;
float segment(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a, ba = b - a; float along = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); float distance = length(pa - ba * along); return 1.0 - smoothstep(width, width + 0.035, distance);
}
float disc(vec2 p, vec2 center, float radius) { return 1.0 - smoothstep(radius, radius + 0.035, length(p - center)); }
float glyph(int id, vec2 p) {
  if (id == 0) return disc(p, vec2(0, -0.31), 0.075); // .
  if (id == 1) return max(disc(p, vec2(0, -0.22), 0.065), disc(p, vec2(0, 0.22), 0.065)); // :
  if (id == 2) return max(segment(p, vec2(-0.28, 0), vec2(0.28, 0), 0.055), max(segment(p, vec2(-0.22, -0.28), vec2(0.22, 0.28), 0.05), segment(p, vec2(-0.22, 0.28), vec2(0.22, -0.28), 0.05))); // *
  if (id == 3) return smoothstep(0.075, 0.04, abs(length(p * vec2(1, 0.82)) - 0.27)); // o
  if (id == 4) return max(max(segment(p, vec2(-0.15, -0.4), vec2(-0.08, 0.4), 0.045),
    segment(p, vec2(0.08, -0.4), vec2(0.15, 0.4), 0.045)), max(segment(p, vec2(-0.3, -0.13), vec2(0.3, -0.08), 0.045), segment(p, vec2(-0.3, 0.13), vec2(0.3, 0.08), 0.045))); // #
  if (id == 5) return segment(p, vec2(-0.27, -0.4), vec2(0.27, 0.4), 0.055); // /
  if (id == 6) return segment(p, vec2(0, -0.42), vec2(0, 0.42), 0.055); // |
  if (id == 7) return segment(p, vec2(-0.27, 0.4), vec2(0.27, -0.4), 0.055); // backslash
  return max(segment(p, vec2(0, -0.42), vec2(0, 0.02), 0.055), max(segment(p, vec2(0, 0.02), vec2(-0.25, 0.4), 0.055), segment(p, vec2(0, 0.02), vec2(0.25, 0.4), 0.055))); // Y
}
void main() {
  const vec2 grid = vec2(60.0, 24.0); vec2 cell = floor(vUv * grid);
  vec4 field = texture(tField, (cell + 0.5) / grid); float density = field.r; bool wood = field.g > 0.5;
  int id = density < 0.25 ? 0 : density < 0.42 ? 1 : density < 0.60 ? 2 :
           density < 0.78 ? 3 : 4;
  if (wood) {
    id = field.b < 0.34 ? 5 : field.b > 0.66 ? 7 : 6;
    if (density > 0.9 && abs(field.b - 0.5) < 0.08 && (abs(vUv.y - 0.43) < 0.025 || abs(vUv.y - 0.58) < 0.025)) id = 8;
  }
  bool accentCell = cell.x == 36.0 && cell.y == 19.0;
  bool accent = !wood && density > 0.82 && accentCell; vec3 color = wood ? uInk : accent ? uAccent : uMuted;
  float alpha = wood ? mix(0.36, 0.68, density) :
                accent ? 0.62 : mix(0.14, 0.50, density);
  alpha = density < 0.08 ? 0.0 : min(alpha, 0.72) * glyph(id, fract(vUv * grid) - 0.5);
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
type Color = Float32Array;
type Palette = { muted: Color; ink: Color; accent: Color };
function cssColor(value: string, fallback: readonly number[]): Color {
  const hex = /^#([\da-f]{6})$/iu.exec(value.trim())?.[1];
  if (hex)
    return new Float32Array([
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ]);
  const rgb = value
    .match(/[\d.]+/gu)
    ?.slice(0, 3)
    .map(Number);
  return new Float32Array(rgb?.length === 3 ? rgb.map((part) => part / 255) : fallback);
}
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return {
    muted: cssColor(style.getPropertyValue("--muted"), [0.439, 0.4, 0.365]),
    ink: cssColor(style.getPropertyValue("--ink"), [0.161, 0.137, 0.118]),
    accent: cssColor(style.getPropertyValue("--accent"), [0.443, 0.216, 0.059]),
  };
}
type Gl = Renderer["gl"] & WebGL2RenderingContext;
function releaseParts(
  gl: Gl,
  geometry: Triangle | undefined,
  programs: readonly (Program | undefined)[],
  target?: RenderTarget,
) {
  geometry?.remove();
  for (const program of programs)
    if (program) {
      gl.deleteShader(program.vertexShader);
      gl.deleteShader(program.fragmentShader);
      program.remove();
    }
  if (!target) return;
  for (const texture of target.textures) gl.deleteTexture(texture.texture);
  gl.deleteFramebuffer(target.buffer);
  if (target.depthBuffer) gl.deleteRenderbuffer(target.depthBuffer);
  if (target.stencilBuffer) gl.deleteRenderbuffer(target.stencilBuffer);
  if (target.depthStencilBuffer) gl.deleteRenderbuffer(target.depthStencilBuffer);
}
function createGpu(canvas: HTMLCanvasElement, palette: Palette, size: ReturnType<typeof fitBackingStore>) {
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
  const partial: { geometry?: Triangle; field?: Program; glyph?: Program; target?: RenderTarget } = {};
  try {
    const geometry = (partial.geometry = new Triangle(gl));
    const fieldProgram = (partial.field = new Program(gl, {
      vertex: VERTEX,
      fragment: TREE_FIELD,
      uniforms: { uTime: { value: 0 } },
      cullFace: false,
      depthTest: false,
      depthWrite: false,
    }));
    const target = (partial.target = new RenderTarget(gl, {
      width: FIELD_COLUMNS,
      height: FIELD_ROWS,
      depth: false,
      stencil: false,
      minFilter: gl.NEAREST,
      magFilter: gl.NEAREST,
      format: gl.RGBA,
      internalFormat: gl.RGBA8,
      type: gl.UNSIGNED_BYTE,
    }));
    const glyphProgram = (partial.glyph = new Program(gl, {
      vertex: VERTEX,
      fragment: ASCII_GLYPHS,
      uniforms: {
        tField: { value: target.texture },
        uMuted: { value: palette.muted },
        uInk: { value: palette.ink },
        uAccent: { value: palette.accent },
      },
      transparent: true,
      cullFace: false,
      depthTest: false,
      depthWrite: false,
    }));
    let ready = true;
    for (const program of [fieldProgram, glyphProgram]) {
      const vertexReady = Boolean(gl.getShaderParameter(program.vertexShader, gl.COMPILE_STATUS));
      const fragmentReady = Boolean(gl.getShaderParameter(program.fragmentShader, gl.COMPILE_STATUS));
      const linked = Boolean(gl.getProgramParameter(program.program, gl.LINK_STATUS));
      ready = vertexReady && fragmentReady && linked && ready;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.buffer);
    ready &&= gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const fieldMesh = new Mesh(gl, { geometry, program: fieldProgram });
    const glyphMesh = new Mesh(gl, { geometry, program: glyphProgram });
    return {
      ready,
      renderer,
      gl,
      geometry,
      fieldProgram,
      glyphProgram,
      target,
      fieldDraw: { scene: fieldMesh, target, clear: true, sort: false, frustumCull: false },
      glyphDraw: { scene: glyphMesh, clear: true, sort: false, frustumCull: false },
    };
  } catch (cause) {
    try {
      releaseParts(gl, partial.geometry, [partial.field, partial.glyph], partial.target);
    } catch {}
    throw cause;
  }
}
type Gpu = ReturnType<typeof createGpu>;
function releaseGpu(gpu: Gpu) {
  releaseParts(gpu.gl, gpu.geometry, [gpu.fieldProgram, gpu.glyphProgram], gpu.target);
}
function boot() {
  const host = document.querySelector<HTMLElement>(".tree-flair");
  const fallback = host?.querySelector<HTMLElement>(".tree-fallback");
  const canvas = host?.querySelector<HTMLCanvasElement>(".tree-canvas");
  if (!host || !fallback || !canvas) return;
  const layout = matchMedia(TREE_QUERY);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let state: TreeState = "fallback";
  let gpu: Gpu | null = null;
  let frameRequest: number | null = null;
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
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    previousFrame = null;
  };
  const active = () => layout.matches && intersecting && !document.hidden;
  const measure = () => {
    const bounds = host.getBoundingClientRect();
    return fitBackingStore(bounds.width, bounds.height, devicePixelRatio);
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
      gpu.fieldProgram.uniforms.uTime.value = time;
      gpu.renderer.render(gpu.fieldDraw);
      gpu.renderer.render(gpu.glyphDraw);
      return !gpu.gl.isContextLost() && gpu.gl.getError() === gpu.gl.NO_ERROR;
    } catch {
      return false;
    }
  };
  const schedule = () => {
    if (state === "running" && frameRequest === null) frameRequest = requestAnimationFrame(tick);
  };
  function tick(now: number) {
    frameRequest = null;
    if (state !== "running" || !active()) return;
    if (previousFrame === null) previousFrame = now;
    else if (now - previousFrame >= FRAME_INTERVAL) {
      phase = advancePhase(phase, previousFrame, now);
      previousFrame = now;
      if (!draw(phase)) {
        fail();
        return;
      }
    }
    schedule();
  }
  const initialize = () => {
    move("initialize");
    try {
      const size = measure();
      gpu = createGpu(canvas, readPalette(), size);
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
    if (!layout.matches) {
      cancel();
      dispose();
      showFallback();
      move("reset");
      return;
    }
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
    if (!gpu || !layout.matches) {
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
  layout.addEventListener("change", evaluate);
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
  try {
    boot();
  } catch {
    const host = document.querySelector<HTMLElement>(".tree-flair");
    if (host) host.dataset.treeState = "failed";
  }
}
