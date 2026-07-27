import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: [/^effect(?:\/|$)/u],
  },
  dts: {
    generator: "tsgo",
    resolver: "oxc",
    sourcemap: true,
    tsconfig: "tsconfig.build.json",
  },
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "neutral",
  sourcemap: true,
  target: "es2023",
});
