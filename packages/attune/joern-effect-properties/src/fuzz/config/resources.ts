export type FuzzResourceConfig = Readonly<{
  readonly cpus: number
  readonly cpusPerWorker: number
  readonly tmpfsSize: string
  readonly workers: number
}>

export const defaultFuzzResources: FuzzResourceConfig = {
  cpus: 4,
  cpusPerWorker: 2,
  tmpfsSize: "10g",
  workers: 2,
}
