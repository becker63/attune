/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Cycles make package boundaries harder to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphan modules are often dead code, unregistered entrypoints, or missing tests.",
      from: { orphan: true, pathNot: ["(^|/)index\\.ts$", "\\.test\\.ts$", "vitest\\.config\\.ts$"] },
      to: {},
    },
    {
      name: "no-deprecated-core-imports",
      severity: "warn",
      from: {},
      to: { dependencyTypes: ["deprecated"] },
    },
    {
      name: "no-imports-tree",
      severity: "error",
      comment: "The imported/reference repos are context, not app dependencies.",
      from: { path: "^packages/" },
      to: { path: "^imports/" },
    },
    {
      name: "dispatch-web-no-discovery-internals",
      severity: "error",
      comment: "Dispatch web should cross package boundaries through public package exports.",
      from: { path: "^packages/dispatch-(web|foldkit)/" },
      to: { path: "^packages/attuned-discovery/src/(memory|projection)/" },
    },
    {
      name: "generated-joern-only-via-joern-effect",
      severity: "warn",
      comment: "Generated Joern bindings should stay behind the joern-effect package facade.",
      from: { path: "^packages/(?!joern-effect/)" },
      to: { path: "^packages/joern-effect/src/pure/generated/" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "(^imports/|(^|/)node_modules/|(^|/)dist/|^\\.nx/|repomix-output\\.xml$)",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
      mainFields: ["module", "main", "types"],
    },
    tsConfig: {
      fileName: "tsconfig.base.json",
    },
  },
};
