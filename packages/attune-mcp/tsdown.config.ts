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
    "contract-bundle": "src/contract/bundle.ts",
    golden: "src/server/golden.ts",
    index: "src/index.ts",
    main: "src/server/main.ts",
    "property-runner": "src/tools/property/runner.ts",
    "lock-holder": "src/platform/lock-holder.ts",
  },
  format: ["esm"],
  platform: "node",
  sourcemap: true,
  target: "es2023",
});
