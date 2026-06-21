import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent"
import { describe, expect, it, vi } from "vitest"

import attunePiAgentExtension, {
  ATTUNE_SPEC_COMMAND,
  findAttuneRoot,
  formatAttuneOrientationPrompt,
  runAttuneSpecCommand,
} from "../src/pi-extension.js"

const rawPrompt = "Model Pi permission policies in Regofile and generate Pi policy artifacts."

type SendUserMessage = ExtensionAPI["sendUserMessage"]
type RegisterCommand = (
  name: string,
  command: Parameters<ExtensionAPI["registerCommand"]>[1],
) => void
type Notify = (message: string, type?: "info" | "warning" | "error") => void
type SetStatus = (key: string, text: string | undefined) => void
type SetWidget = (key: string, content: string[] | undefined) => void
type On = (event: string, handler: (event: never, ctx: ExtensionContext) => Promise<unknown> | unknown) => void

describe("Pi extension", () => {
  it("registers /attune-spec as a manual Attune orientation guardrail", async () => {
    const commands = new Map<string, Parameters<ExtensionAPI["registerCommand"]>[1]>()
    const sendUserMessage = vi.fn<SendUserMessage>()
    const pi = {
      on: vi.fn<On>(),
      registerCommand: vi.fn<RegisterCommand>((name, command) => {
        commands.set(name, command)
      }),
      sendUserMessage,
    } as unknown as ExtensionAPI
    const { ctx, ui } = fakeCommandContext()

    attunePiAgentExtension(pi)

    const command = commands.get(ATTUNE_SPEC_COMMAND)

    expect(command).toBeDefined()
    await command?.handler(rawPrompt, ctx)

    expect(sendUserMessage).toHaveBeenCalledTimes(1)
    expect(ui.setWidget).toHaveBeenCalledWith(
      "attune-orientation",
      expect.arrayContaining(["Attune orientation"]),
    )

    const [message] = sendUserMessage.mock.calls[0] ?? []

    expect(message).toContain("Attune session orientation guardrail.")
    expect(message).toContain("AGENTS.md")
    expect(message).toContain("Do not edit files")
    expect(message).toContain(rawPrompt)
  })

  it("automatically sends orientation on a new empty Attune session", async () => {
    const sendUserMessage = vi.fn<SendUserMessage>()
    const sessionStartHandlers: Array<(event: SessionStartEvent, ctx: ExtensionContext) => Promise<unknown> | unknown> = []
    const pi = {
      on: vi.fn<On>((event, handler) => {
        if (event === "session_start") {
          sessionStartHandlers.push(handler as (event: SessionStartEvent, ctx: ExtensionContext) => Promise<unknown> | unknown)
        }
      }),
      registerCommand: vi.fn<RegisterCommand>(),
      sendUserMessage,
    } as unknown as ExtensionAPI
    const { ctx } = fakeCommandContext()

    attunePiAgentExtension(pi)

    await sessionStartHandlers[0]?.({ type: "session_start", reason: "new" }, ctx)

    expect(sendUserMessage).toHaveBeenCalledTimes(1)
    expect(sendUserMessage.mock.calls[0]?.[0]).toContain("Trigger: session:new.")
  })

  it("does not auto-orient resumed sessions or sessions with conversation entries", async () => {
    const sendUserMessage = vi.fn<SendUserMessage>()
    const sessionStartHandlers: Array<(event: SessionStartEvent, ctx: ExtensionContext) => Promise<unknown> | unknown> = []
    const pi = {
      on: vi.fn<On>((event, handler) => {
        if (event === "session_start") {
          sessionStartHandlers.push(handler as (event: SessionStartEvent, ctx: ExtensionContext) => Promise<unknown> | unknown)
        }
      }),
      registerCommand: vi.fn<RegisterCommand>(),
      sendUserMessage,
    } as unknown as ExtensionAPI
    const resumed = fakeCommandContext()
    const activeConversation = fakeCommandContext({
      entries: [{ type: "message" }],
      sessionFile: "/tmp/attune-active-session.jsonl",
    })

    attunePiAgentExtension(pi)

    await sessionStartHandlers[0]?.({ type: "session_start", reason: "resume" }, resumed.ctx)
    await sessionStartHandlers[0]?.({ type: "session_start", reason: "new" }, activeConversation.ctx)

    expect(sendUserMessage).not.toHaveBeenCalled()
  })

  it("does not auto-orient non-interactive sessions", async () => {
    const sendUserMessage = vi.fn<SendUserMessage>()
    const sessionStartHandlers: Array<(event: SessionStartEvent, ctx: ExtensionContext) => Promise<unknown> | unknown> = []
    const pi = {
      on: vi.fn<On>((event, handler) => {
        if (event === "session_start") {
          sessionStartHandlers.push(handler as (event: SessionStartEvent, ctx: ExtensionContext) => Promise<unknown> | unknown)
        }
      }),
      registerCommand: vi.fn<RegisterCommand>(),
      sendUserMessage,
    } as unknown as ExtensionAPI
    const { ctx } = fakeCommandContext({ hasUI: false })

    attunePiAgentExtension(pi)

    await sessionStartHandlers[0]?.({ type: "session_start", reason: "new" }, ctx)

    expect(sendUserMessage).not.toHaveBeenCalled()
  })

  it("warns when the orientation message cannot be sent", async () => {
    const error = new Error("missing model")
    const sendUserMessage = vi.fn<SendUserMessage>(() => {
      throw error
    })
    const { ctx, ui } = fakeCommandContext()

    await runAttuneSpecCommand({ sendUserMessage } as Pick<ExtensionAPI, "sendUserMessage">, ctx, rawPrompt)

    expect(ui.notify).toHaveBeenCalledWith(
      "Attune orientation could not start: missing model",
      "warning",
    )
  })

  it("warns when /attune-spec runs outside the Attune repo", async () => {
    const sendUserMessage = vi.fn<SendUserMessage>()
    const { ctx, ui } = fakeCommandContext({ cwd: "/tmp" })

    await runAttuneSpecCommand({ sendUserMessage } as Pick<ExtensionAPI, "sendUserMessage">, ctx, rawPrompt)

    expect(sendUserMessage).not.toHaveBeenCalled()
    expect(ui.notify).toHaveBeenCalledWith(
      "/attune-spec only runs inside the Attune repo.",
      "warning",
    )
  })

  it("formats the orientation prompt with the controlling Attune docs", () => {
    const attuneRoot = findAttuneRoot(process.cwd())

    expect(attuneRoot).toBeDefined()

    const prompt = formatAttuneOrientationPrompt(attuneRoot ?? process.cwd(), {
      source: "test",
      userPrompt: rawPrompt,
    })

    expect(prompt).toContain("AGENTS.md")
    expect(prompt).toContain("docs/platform/codex-cloud-environment.md")
    expect(prompt).toContain("Attune orientation loaded")
    expect(prompt).toContain(rawPrompt)
  })
})

const fakeCommandContext = (
  options: {
    readonly cwd?: string
    readonly entries?: readonly unknown[]
    readonly hasUI?: boolean
    readonly isIdle?: boolean
    readonly sessionFile?: string
  } = {},
): {
  readonly ctx: ExtensionCommandContext
  readonly ui: {
    readonly notify: ReturnType<typeof vi.fn<Notify>>
    readonly setStatus: ReturnType<typeof vi.fn<SetStatus>>
    readonly setWidget: ReturnType<typeof vi.fn<SetWidget>>
  }
} => {
  const ui = {
    notify: vi.fn<Notify>(),
    setStatus: vi.fn<SetStatus>(),
    setWidget: vi.fn<SetWidget>(),
  }

  return {
    ctx: {
      cwd: options.cwd ?? findAttuneRoot(process.cwd()) ?? process.cwd(),
      hasUI: options.hasUI ?? true,
      isIdle: () => options.isIdle ?? true,
      mode: (options.hasUI ?? true) ? "tui" : "json",
      sessionManager: {
        getEntries: () => [...(options.entries ?? [])],
        getSessionFile: () => options.sessionFile ?? "/tmp/attune-session.jsonl",
      },
      ui,
    } as unknown as ExtensionCommandContext,
    ui,
  }
}
