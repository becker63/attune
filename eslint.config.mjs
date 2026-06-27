import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    ignores: [
      "imports/**",
      "node_modules/**",
      "dist/**",
      "packages/**/dist/**",
      ".nx/**",
      "repomix-output.xml",
      "packages/**/src/generated/**",
      "packages/**/schema/**",
      "packages/**/*.generated.ts",
    ],
  },
  {
    files: ["packages/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      sonarjs,
    },
    rules: {
      "sonarjs/cognitive-complexity": ["error", 15],
    },
  },
];
