import { defineConfig } from "tsup"

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    "src/index.ts",
    "src/pi-extension.ts",
    "src/generators/spec/generator.ts",
    "src/generators/permission-policy/generator.ts",
    "src/generators/test-obligation/generator.ts",
    "src/generators/taskplane-task/generator.ts",
  ],
  format: ["esm", "cjs"],
  noExternal: ["effect"],
  sourcemap: true,
})
