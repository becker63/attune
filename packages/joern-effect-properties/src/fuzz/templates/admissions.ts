export type AdmissionTemplate = Readonly<{
  readonly id: string
  readonly title: string
  readonly tags: readonly string[]
}>

export const admissionTemplates: readonly AdmissionTemplate[] = [
  {
    id: "oxc-module-parse",
    tags: ["syntax", "admission", "oxc"],
    title: "OXC module parser admission",
  },
]
