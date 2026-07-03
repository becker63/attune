import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect } from "effect"

import { AttunePiConversationRecipes } from "./spec-conversation.js"

export * from "./spec-conversation.js"

export { AttunePiConversationRecipes }

export const attunePiConversationRecipeIds = (): readonly string[] =>
  AttunePiConversationRecipes.map((recipe) => recipe.id)

export const AttunePiConversationCatalogHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.conversation-catalog.handler",
  recipeId: "attune-pi-agent.implementation-spec",
  sourcePath: "packages/attune/pi-agent/src/pi/index.ts",
  exportName: "attunePiConversationRecipeIds",
  emitsReceipts: ["attune-pi-agent.conversation-catalog.projected"],
  handler: () => Effect.succeed(attunePiConversationRecipeIds()),
})

export const AttunePiConversationRecipeModule = [
  AttunePiConversationCatalogHandler,
] as const
