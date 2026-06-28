import * as Effect from "effect/Effect";
import { Rule, RuleContext, type ESTree } from "effect-oxlint";
import { report } from "./helpers.js";

export const privateLedgerMessage =
  "Private ledger detected without linkage to the framework_* recipe receipt spine. Express this as a recipe receipt, metric, diagnostic, repair, health row, or observation before adding a private store.";

const sourceFilePattern = /(?:^|\/)packages\/.+\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;

const ledgerLikeNamePattern =
  /(?:EventLog|ReceiptStore|Ledger|Journal|RunStore|SessionStore|ObservationStore|MetricStore|Outbox)\b/u;

const sharedSpineReferencePattern =
  /\b(?:RecipeReceiptStore|recipe_id|recipeId|run_id|runId|receipt_id|receiptId|observation_id|observationId|framework_core|framework_event|framework_view)\b/u;

const fixturePathPattern =
  /(?:^|\/)(?:test|tests|__tests__|fixtures?|__fixtures__)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/u;

const isSourceFile = (filename: string): boolean =>
  sourceFilePattern.test(filename.replaceAll("\\", "/"));

const isFixtureOnly = (filename: string, sourceText: string): boolean =>
  fixturePathPattern.test(filename.replaceAll("\\", "/")) ||
  /\bfixture(?:Only)?\b/i.test(sourceText);

const hasLedgerLikeName = (sourceText: string): boolean =>
  ledgerLikeNamePattern.test(sourceText);

const hasSharedSpineReference = (sourceText: string): boolean =>
  sharedSpineReferencePattern.test(sourceText);

export const noPrivateLedger = Rule.define({
  name: "no-private-ledger",
  meta: Rule.meta({
    type: "problem",
    description:
      "Require ledger-like stores to link to the shared recipe receipt spine.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Program: (node: ESTree.Node) => {
        if (!isSourceFile(ctx.filename)) return Effect.void;
        const sourceText = ctx.sourceCode.text;
        if (!hasLedgerLikeName(sourceText)) return Effect.void;
        if (hasSharedSpineReference(sourceText)) return Effect.void;
        if (isFixtureOnly(ctx.filename, sourceText)) return Effect.void;
        return report(ctx, node, privateLedgerMessage);
      },
    };
  },
});
