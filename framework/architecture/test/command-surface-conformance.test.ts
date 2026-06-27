import { describe, expect, it } from "vitest"
import { checkCommandSurfaceConformance } from "../src/command-surface-conformance.js"

describe("command surface conformance", () => {
  it("rejects arbitrary run-commands tool invocations", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "packages/example/project.json",
        content: JSON.stringify({
          targets: {
            test: {
              executor: "nx:run-commands",
              options: { command: "pnpm exec vitest run" },
            },
          },
        }),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: "attune/command-surface/raw-run-command",
      filePath: "packages/example/project.json",
    }))
  })

  it("rejects run-commands object arrays and direct Nix/tool invocations", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "packages/example/project.json",
        content: JSON.stringify({
          targets: {
            build: {
              executor: "nx:run-commands",
              options: {
                commands: [
                  { command: "nix develop -c pnpm exec nx run example:typecheck" },
                  { command: ["bash", "scripts/local-wrapper.sh"] },
                ],
              },
            },
          },
        }),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "attune/command-surface/raw-run-command",
          message: expect.stringContaining("nix develop"),
        }),
        expect.objectContaining({
          ruleId: "attune/command-surface/raw-run-command",
          message: expect.stringContaining("bash scripts/local-wrapper.sh"),
        }),
      ]),
    )
  })

  it("allows run-command internals only when explicitly marked internal", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "project.json",
        content: JSON.stringify({
          targets: {
            "policy-architecture": {
              executor: "nx:run-commands",
              options: {
                command: "pnpm exec nx run attune-architecture:test",
              },
              metadata: {
                description: "Internal aggregate retained during migration.",
              },
            },
          },
        }),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("allows typed Attune executors to describe toolchain intent without shell", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "packages/example/project.json",
        content: JSON.stringify({
          targets: {
            deploy: {
              executor: "attune:toolchain",
              options: {
                tool: "alchemy",
                action: "plan",
                resourceTier: "external",
              },
            },
          },
        }),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("allows public docs that name Nx targets instead of raw tools", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "AGENTS.md",
        content: [
          "Run workspace:attune-check first.",
          "Run workspace:attune-repair when diagnostics offer a safe repair.",
          "Use project:typecheck and project:test for focused validation.",
        ].join("\n"),
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toEqual([])
  })

  it("rejects stale policy-architecture public guidance", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "docs/platform/example.md",
        content: "Run workspace:policy-architecture before opening a PR.",
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: "attune/command-surface/stale-policy-architecture",
    }))
  })

  it("rejects stale policy-architecture config fixtures unless marked internal", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "packages/example/project.json",
        content: JSON.stringify({
          targets: {
            check: {
              executor: "nx:run-commands",
              options: {
                command: "nx run workspace:policy-architecture",
              },
            },
          },
        }),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: "attune/command-surface/stale-policy-architecture",
      message: expect.stringContaining("$.targets.check.options.command"),
    }))
  })

  it("rejects public docs that teach raw package-manager or Nix workflows", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "docs/platform/example.md",
        content: [
          "Run nix run .#attune -- policy fast.",
          "Run pnpm exec nx run attuned-discovery:test.",
        ].join("\n"),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "attune/command-surface/raw-tool-doc",
          message: expect.stringContaining("Line 1"),
        }),
        expect.objectContaining({
          ruleId: "attune/command-surface/raw-tool-doc",
          message: expect.stringContaining("Line 2"),
        }),
      ]),
    )
  })

  it("warns when public docs teach direct generator invocation before diagnostics", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "docs/attuned/example.md",
        content: "Run nx generate @attune/nx:effect-service to fix the package.",
      }],
    })

    expect(result.exitCode).toBe(0)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: "attune/command-surface/direct-generator-doc",
      severity: "warning",
    }))
  })

  it("allows raw bootstrap or inside-dev-shell details when classified internal", () => {
    const result = checkCommandSurfaceConformance({
      files: [
        {
          path: "docs/platform/bootstrap.md",
          classification: "bootstrap",
          content: "Bootstrap may use nix only to install the workspace substrate.",
        },
        {
          path: "docs/platform/internal.md",
          classification: "internal",
          content: "Inside the dev shell, pnpm exec nx is an implementation detail.",
        },
      ],
    })

    expect(result.exitCode).toBe(0)
  })

  it("rejects package-local scripts after final ratchet", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "packages/example/package.json",
        content: JSON.stringify({ scripts: { test: "vitest run" } }),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: "attune/command-surface/package-script",
    }))
  })

  it("rejects root wrapper scripts after final ratchet", () => {
    const result = checkCommandSurfaceConformance({
      files: [{
        path: "package.json",
        content: JSON.stringify({ scripts: { policy: "nx run workspace:policy-fast" } }),
      }],
    })

    expect(result.exitCode).toBe(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      ruleId: "attune/command-surface/package-script",
      message: expect.stringContaining("policy"),
    }))
  })
})
