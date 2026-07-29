import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: [
    {
      name: "attune",
      specifier: "../attune.ts",
    },
  ],
  rules: {
    "attune/tsdoc": "error",
  },
});
