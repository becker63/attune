export type FeedbackTemplate = Readonly<{
  readonly id: string
  readonly title: string
  readonly tags: readonly string[]
}>

export const feedbackTemplates: readonly FeedbackTemplate[] = [
  {
    id: "axiom-underexplored-query-feedback",
    tags: ["axiom", "query-selection", "feedback-guided"],
    title: "Prefer underexplored generated query fingerprints",
  },
]
