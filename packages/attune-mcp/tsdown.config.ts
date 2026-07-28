import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: [
      /^@effect\/platform-node(?:\/|$)/u,
      /^effect(?:\/|$)/u,
      /^fast-check(?:\/|$)/u,
      /^joern-effect(?:\/|$)/u,
      /^yaml(?:\/|$)/u,
    ],
  },
  dts: {
    generator: "tsgo",
    resolver: "oxc",
    sourcemap: true,
    tsconfig: "tsconfig.build.json",
  },
  entry: {
    index: "src/index.ts",
    main: "src/v0/main.ts",
    "property-runner": "src/v0/property-runner.ts",
    "lock-holder": "src/v0/lock-holder.ts",
  },
  format: ["esm"],
  platform: "node",
  sourcemap: true,
  target: "es2023",
});
