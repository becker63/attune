import { defaultFuzzResources } from "../config/resources.js"

export type WorkspaceTemplate = Readonly<{
  readonly id: string
  readonly tags: readonly string[]
  readonly tmpfsSize: string
  readonly title: string
}>

export const workspaceTemplates: readonly WorkspaceTemplate[] = [
  {
    id: "nix2container-arion-dev-shm",
    tags: ["nix", "arion", "oci", "tmpfs"],
    tmpfsSize: defaultFuzzResources.tmpfsSize,
    title: "Arion/nix2container memory-backed property workspace",
  },
]
