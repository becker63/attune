import { semanticMutationRules } from "../services/mutator.js"

export type MutationTemplate = Readonly<{
  readonly id: string
  readonly title: string
  readonly tags: readonly string[]
}>

export const mutationTemplates: readonly MutationTemplate[] = semanticMutationRules.map((rule) => ({
  id: rule.kind,
  tags: ["ts-morph", "mutation", rule.kind],
  title: rule.description,
}))
