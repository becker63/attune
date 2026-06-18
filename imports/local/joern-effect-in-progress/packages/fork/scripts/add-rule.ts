/**
 * Scaffold a new rule file with boilerplate.
 *
 * Usage: bun run scripts/add-rule.ts <rule-name> [--context]
 *
 * Examples:
 *   bun run scripts/add-rule.ts no-effect-zip
 *   bun run scripts/add-rule.ts no-await-in-effect --context
 */
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const args = process.argv.slice(2);
const contextFlag = args.includes("--context");
const ruleName = args.find((a) => !a.startsWith("--"));
const scriptDir = fileURLToPath(new URL(".", import.meta.url));

if (!ruleName) {
  console.error("Usage: bun run scripts/add-rule.ts <rule-name> [--context]");
  console.error(
    "  --context  Generate an effect-context-aware rule (uses makeEffectContextTracker)",
  );
  process.exit(1);
}

// Convert kebab-case to camelCase
const camelCase = ruleName.replace(/-([a-z])/g, (_match: string, c: string) =>
  c.toUpperCase(),
);

const filePath = join(scriptDir, `../src/rules/${ruleName}.ts`);

if (existsSync(filePath)) {
  console.error(`✗ File already exists: ${filePath}`);
  process.exit(1);
}

const basicTemplate = `/**
 * TODO: Description for ${ruleName}
 */
import type { ESTree } from "effect-oxlint"
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint"
import * as Effect from "effect/Effect"

export const ${camelCase} = Rule.define({
  name: "${ruleName}",
  meta: Rule.meta({
    type: "suggestion",
    description: "TODO: describe what this rule checks.",
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      // TODO: add visitor handlers
    }
  },
})
`;

const contextTemplate = `/**
 * TODO: Description for ${ruleName}
 */
import type { ESTree } from "effect-oxlint"
import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"

import { makeEffectContextTracker } from "./_effect-context.js"

export const ${camelCase} = Rule.define({
  name: "${ruleName}",
  meta: Rule.meta({
    type: "suggestion",
    description: "TODO: describe what this rule checks.",
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const [depth, tracker] = yield* makeEffectContextTracker

    return Visitor.merge(tracker, {
      // TODO: add visitor handlers that check Ref.get(depth) > 0
    })
  },
})
`;

writeFileSync(filePath, contextFlag ? contextTemplate : basicTemplate);
console.log(`✓ Created ${filePath}`);
console.log(`  Export name: ${camelCase}`);
console.log(`  Run \`bun run codegen\` to update src/rules/index.ts`);
