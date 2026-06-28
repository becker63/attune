import { Data } from "effect"

export class FuzzConfigError extends Data.TaggedError("FuzzConfigError")<{
  readonly message: string
}> {}

export class FuzzPipelineError extends Data.TaggedError("FuzzPipelineError")<{
  readonly message: string
  readonly stage: string
}> {}

export class FuzzTemplateError extends Data.TaggedError("FuzzTemplateError")<{
  readonly message: string
  readonly templateId: string
}> {}
