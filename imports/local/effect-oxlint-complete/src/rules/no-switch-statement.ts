/**
 * Ban `switch` statements.
 *
 * Use `Match.value`, `Option.match`, `Either.match` instead.
 *
 * Source: biome-effect-linting-rules/no-switch-statement
 */
import { Rule } from "effect-oxlint";

export const noSwitchStatement = Rule.banStatement("SwitchStatement", {
  message: "Avoid switch statements. Use Match.value, Option.match, or Either.match.",
  meta: { type: "suggestion" },
});
