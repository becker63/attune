import * as fs from "node:fs"
import * as path from "node:path"
import {
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent"

export const ATTUNE_SPEC_COMMAND = "attune-spec"

const orientationCommandRecipeId = "attune-pi-agent.orientation-command"
const orientationWidgetKey = "attune-orientation"
const attuneGuideSentinel = "Attune Codex Agent Guide"
const requiredOrientationDocs = [
  "AGENTS.md",
  "docs/platform/codex-cloud-environment.md",
  "docs/platform/autonomous-codex-workstation.md",
  "docs/attuned/Attune Discovery v0 Technical spec.md",
  "docs/attuned/Attune Atom, Reactivity, and State Philosophy.md",
  "docs/attuned/Attune Discovery v0 Architecture Model.md",
  "docs/attuned/Attune Discovery v0 Joern and Cocoindex.md",
  "docs/attuned/Attune Discovery v0 Performance Model.md",
] as const
const optionalOrientationDocs = [
  "packages/attune/pi-agent/docs/spec-falsification-evidence-loop.md",
] as const

export const AttunePiOrientationInput = Schema.Struct({
  cwd: Schema.String,
  source: Schema.String,
  userPrompt: Schema.optional(Schema.String),
})
export type AttunePiOrientationInput = typeof AttunePiOrientationInput.Type

export const AttunePiOrientationOutput = Schema.Struct({
  attuneRoot: Schema.NullOr(Schema.String),
  queued: Schema.Boolean,
  prompt: Schema.optional(Schema.String),
})
export type AttunePiOrientationOutput = typeof AttunePiOrientationOutput.Type

export interface AttunePiOrientationService {
  readonly orient: (
    input: AttunePiOrientationInput,
  ) => Effect.Effect<AttunePiOrientationOutput>
}

export class AttunePiOrientationServices extends Context.Service<
  AttunePiOrientationServices,
  AttunePiOrientationService
>()("attune-pi-agent/OrientationServices") {}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiOrientationWorkflowResource = defineAlchemyResource({
  id: "attune-pi-agent.orientation-command.workflow-target",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: orientationCommandRecipeId,
  consumedBy: [orientationCommandRecipeId],
  producedBy: [orientationCommandRecipeId],
  addressFields: ["cwd", "source"],
  addressSchema: AttunePiOrientationInput,
  stateSchema: AttunePiOrientationOutput,
  modes: ["invoke", "project", "observe"],
  programmaticResourceExport: "AttunePiOrientationServices",
})

export default function attunePiAgentExtension(pi: ExtensionAPI): void {
  const orientedSessionIds = new Set<string>()

  pi.on("session_start", async (event, ctx) => {
    const attuneRoot = findAttuneRoot(ctx.cwd)

    if (
      attuneRoot === undefined ||
      supportsBackgroundOrientation(ctx) === false ||
      shouldAutoOrient(event, ctx, orientedSessionIds) === false
    ) {
      return
    }

    sendAttuneOrientation(pi, ctx, {
      attuneRoot,
      source: `session:${event.reason}`,
    })
  })

  pi.on("before_agent_start", async (event, ctx) => {
    const attuneRoot = findAttuneRoot(ctx.cwd)

    if (attuneRoot === undefined) {
      return
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\n${formatAttuneSystemGuardrails(attuneRoot)}`,
    }
  })

  pi.registerCommand(ATTUNE_SPEC_COMMAND, {
    description: "Run the Attune project-orientation guardrails now.",
    handler: async (args, ctx) => {
      await runAttuneSpecCommand(pi, ctx, args)
    },
  })
}

export const runAttuneSpecCommand = async (
  pi: Pick<ExtensionAPI, "sendUserMessage">,
  ctx: ExtensionCommandContext,
  args: string,
): Promise<void> => {
  const attuneRoot = findAttuneRoot(ctx.cwd)

  if (attuneRoot === undefined) {
    ctx.ui.notify("/attune-spec only runs inside the Attune repo.", "warning")
    return
  }

  sendAttuneOrientation(pi, ctx, {
    attuneRoot,
    source: "manual",
    userPrompt: args.trim(),
  })
}

export const orientAttuneSession = (
  input: AttunePiOrientationInput,
): AttunePiOrientationOutput => {
  const attuneRoot = findAttuneRoot(input.cwd)

  if (attuneRoot === undefined) {
    return {
      attuneRoot: null,
      queued: false,
    }
  }

  return {
    attuneRoot,
    queued: true,
    prompt: formatAttuneOrientationPrompt(attuneRoot, {
      source: input.source,
      ...(input.userPrompt === undefined ? {} : { userPrompt: input.userPrompt }),
    }),
  }
}

export const attunePiOrientationInvocation = (
  input: AttunePiOrientationInput,
): RecipeInvocation => ({
  recipeId: orientationCommandRecipeId,
  action: "report",
  input,
  source: {
    surface: "cli",
    projectId: "attune-pi-agent",
    target: "/attune-spec",
    cwd: input.cwd,
  },
})

export const findAttuneRoot = (cwd: string): string | undefined => {
  let current = path.resolve(cwd)

  while (true) {
    const guidePath = path.join(current, "AGENTS.md")

    if (
      fs.existsSync(path.join(current, "nx.json")) &&
      fs.existsSync(guidePath) &&
      readTextFile(guidePath).includes(attuneGuideSentinel)
    ) {
      return current
    }

    const parent = path.dirname(current)

    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

export const formatAttuneOrientationPrompt = (
  attuneRoot: string,
  options: {
    readonly source: string
    readonly userPrompt?: string
  },
): string => {
  const docs = orientationDocs(attuneRoot)
  const task = options.userPrompt?.trim()
  const taskLines = task === undefined || task.length === 0
    ? [
        "No task was supplied with this orientation request.",
        "After reading, stop and wait for Taylor's next prompt.",
      ]
    : [
        "Taylor supplied this task context with the orientation request:",
        "",
        task,
        "",
        "After reading, continue with that task using the Attune rules.",
      ]

  return [
    "Attune session orientation guardrail.",
    "",
    `Trigger: ${options.source}.`,
    `Repo root: ${attuneRoot}.`,
    "",
    "Before answering, planning, or editing files, use read/list tools to load these Attune guidelines and docs:",
    ...docs.map((doc) => `- ${doc}`),
    "",
    "Orientation requirements:",
    "- Do not edit files, run generators, or change git state during orientation.",
    "- Do not claim a document was read unless you actually read it.",
    "- Inspect `openspec/changes/` before material product changes and identify the active change when one applies.",
    "- Treat `AGENTS.md` as the controlling project contract.",
    "- Use `NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx ...` for targeted JS/Nx validation.",
    "- Do not deploy, SSH, mutate secrets, touch `.env*`, push to main, or hide generated artifacts.",
    "",
    "When orientation is complete, reply with:",
    "- `Attune orientation loaded`",
    "- documents read",
    "- relevant package boundaries",
    "- required validation shape",
    "- human-review or safety constraints",
    "",
    ...taskLines,
  ].join("\n")
}

const formatAttuneSystemGuardrails = (attuneRoot: string): string => [
  "## Attune Project Guardrails",
  "",
  `This session is inside the Attune repo at ${attuneRoot}.`,
  "Follow AGENTS.md and the active OpenSpec/change guidance before implementation.",
  "For each new Attune session, complete the Attune orientation guardrail before substantive work.",
  "Repo artifacts, git status, tests, typechecks, generated artifacts, and review evidence are the execution truth.",
  "Do not deploy, SSH, mutate secrets, touch `.env*`, push to main, or hide generated artifacts.",
].join("\n")

const sendAttuneOrientation = (
  pi: Pick<ExtensionAPI, "sendUserMessage">,
  ctx: Pick<ExtensionContext, "isIdle" | "ui">,
  options: {
    readonly attuneRoot: string
    readonly source: string
    readonly userPrompt?: string
  },
): void => {
  const message = formatAttuneOrientationPrompt(options.attuneRoot, options)

  ctx.ui.setStatus(orientationWidgetKey, "Attune orientation queued")
  ctx.ui.setWidget(orientationWidgetKey, [
    "Attune orientation",
    "",
    "The agent has been asked to read project guidelines before work starts.",
    "",
    "Manual rerun:",
    "/attune-spec",
  ])

  if (ctx.isIdle()) {
    sendUserMessageSafely(pi, ctx, message)
    return
  }

  sendUserMessageSafely(pi, ctx, message, { deliverAs: "followUp" })
}

const supportsBackgroundOrientation = (
  ctx: Pick<ExtensionContext, "mode">,
): boolean => ctx.mode === "tui" || ctx.mode === "rpc"

const sendUserMessageSafely = (
  pi: Pick<ExtensionAPI, "sendUserMessage">,
  ctx: Pick<ExtensionContext, "ui">,
  message: string,
  options?: { readonly deliverAs: "followUp" },
): void => {
  try {
    pi.sendUserMessage(message, options)
  } catch (error) {
    ctx.ui.notify(
      `Attune orientation could not start: ${error instanceof Error ? error.message : String(error)}`,
      "warning",
    )
  }
}

const shouldAutoOrient = (
  event: SessionStartEvent,
  ctx: Pick<ExtensionContext, "sessionManager">,
  orientedSessionIds: Set<string>,
): boolean => {
  if (event.reason === "reload" || event.reason === "resume") {
    return false
  }

  if (hasConversationEntries(ctx)) {
    return false
  }

  const sessionId = ctx.sessionManager.getSessionFile() ?? `ephemeral:${event.reason}`

  if (orientedSessionIds.has(sessionId)) {
    return false
  }

  orientedSessionIds.add(sessionId)
  return true
}

const hasConversationEntries = (
  ctx: Pick<ExtensionContext, "sessionManager">,
): boolean => ctx.sessionManager
  .getEntries()
  .some((entry) => {
    if (entry.type === "message" || entry.type === "custom_message") {
      return true
    }

    return false
  })

const orientationDocs = (attuneRoot: string): readonly string[] => [
  ...requiredOrientationDocs,
  ...optionalOrientationDocs,
].filter((doc) => fs.existsSync(path.join(attuneRoot, doc)))

const readTextFile = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath, "utf8")
  } catch {
    return ""
  }
}

export const AttunePiOrientationLive = Layer.succeed(AttunePiOrientationServices, {
  orient: (input) => Effect.sync(() => orientAttuneSession(input)),
})

export const AttunePiOrientationLayer = defineRecipeLayer({
  id: "attune-pi-agent.orientation-command.layer",
  sourcePath: "packages/attune/pi-agent/src/pi-extension.ts",
  exportName: "AttunePiOrientationLive",
  layer: AttunePiOrientationLive,
  provides: [{
    id: "attune-pi-agent.orientation-command.services",
    service: AttunePiOrientationServices,
  }],
})

export const AttunePiOrientationCommandRecipe = defineInvocationRecipe({
  id: "attune-pi-agent.orientation-command",
  projectId: "attune-pi-agent",
  title: "Queue Attune Pi orientation guardrails as a recipe invocation",
  inputSchema: AttunePiOrientationInput,
  outputSchema: AttunePiOrientationOutput,
  nxTarget: "attune-pi-agent:test",
  entrypoints: ["packages/attune/pi-agent/src/pi-extension.ts"],
  allowedFiles: [
    "packages/attune/pi-agent/src/pi-extension.ts",
    "AGENTS.md",
    "docs/platform/codex-cloud-environment.md",
    "docs/platform/autonomous-codex-workstation.md",
    "docs/attuned/**",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:typecheck"],
  io: {
    inputSchema: AttunePiOrientationInput,
    outputSchema: AttunePiOrientationOutput,
    inputResources: [AttunePiOrientationWorkflowResource],
    outputResources: [AttunePiOrientationWorkflowResource],
  },
  handler: defineRecipeHandler<
    AttunePiOrientationInput,
    AttunePiOrientationOutput,
    never,
    AttunePiOrientationServices
  >({
    id: "attune-pi-agent.orientation-command.handler",
    recipeId: orientationCommandRecipeId,
    sourcePath: "packages/attune/pi-agent/src/pi-extension.ts",
    exportName: "orientAttuneSession",
    layer: AttunePiOrientationLayer,
    emitsReceipts: ["attune-pi-agent.orientation.queued"],
    handler: (input) =>
      Effect.gen(function* orientPiSession() {
        const services = yield* AttunePiOrientationServices
        return yield* services.orient(input)
      }),
  }),
})

export const AttunePiExtensionRecipes = [
  AttunePiOrientationCommandRecipe,
] as const
