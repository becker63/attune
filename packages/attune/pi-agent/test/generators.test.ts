import { describe, expect, it } from "vitest"

import permissionPolicyGenerator from "../src/generators/permission-policy/generator.js"
import specGenerator from "../src/generators/spec/generator.js"
import taskplaneTaskGenerator from "../src/generators/taskplane-task/generator.js"
import testObligationGenerator from "../src/generators/test-obligation/generator.js"
import type { GeneratorTree } from "../src/generators/internal/tree.js"
import {
  renderImplementationSpecDraft,
  renderPermissionPolicyArtifact,
  stableJson,
} from "../src/index.js"

class MemoryTree implements GeneratorTree {
  readonly files = new Map<string, string>()

  exists(path: string): boolean {
    return this.files.has(path)
  }

  read(path: string): string | null {
    return this.files.get(path) ?? null
  }

  write(path: string, content: string): void {
    this.files.set(path, content)
  }
}

describe("Attune Pi generators", () => {
  it("emits deterministic implementation spec drafts", () => {
    expect(renderImplementationSpecDraft("ATT 50")).toBe(renderImplementationSpecDraft("ATT 50"))
    expect(JSON.parse(renderImplementationSpecDraft("ATT 50")).artifactPolicy.requiredFiles).toContain(
      "evidence-matrix.md",
    )
  })

  it("emits deterministic permission policy artifacts", () => {
    const rendered = renderPermissionPolicyArtifact("ATT 50")
    const parsed = JSON.parse(rendered) as {
      readonly generatedBy: string
      readonly id: string
      readonly profile: {
        readonly rules: ReadonlyArray<{
          readonly decision: string
          readonly id: string
          readonly kind: string
        }>
      }
    }

    expect(rendered).toBe(renderPermissionPolicyArtifact("ATT 50"))
    expect({
      generatedBy: parsed.generatedBy,
      id: parsed.id,
      rules: parsed.profile.rules.map((rule) => ({
        decision: rule.decision,
        id: rule.id,
        kind: rule.kind,
      })),
    }).toMatchInlineSnapshot(`
      {
        "generatedBy": "@attune/pi-agent:permission-policy",
        "id": "att-50",
        "rules": [
          {
            "decision": "deny",
            "id": "deny-env-files",
            "kind": "path",
          },
          {
            "decision": "deny",
            "id": "deny-ssh-paths",
            "kind": "path",
          },
          {
            "decision": "ask",
            "id": "ask-external-directories",
            "kind": "external-directory",
          },
          {
            "decision": "deny",
            "id": "deny-sudo",
            "kind": "command",
          },
          {
            "decision": "deny",
            "id": "deny-ssh-command",
            "kind": "command",
          },
          {
            "decision": "deny",
            "id": "deny-kubectl",
            "kind": "command",
          },
          {
            "decision": "deny",
            "id": "deny-nix-deploy",
            "kind": "command",
          },
          {
            "decision": "deny",
            "id": "deny-rm-rf",
            "kind": "command",
          },
          {
            "decision": "deny",
            "id": "deny-git-reset-hard",
            "kind": "command",
          },
          {
            "decision": "deny",
            "id": "deny-git-clean-fdx",
            "kind": "command",
          },
          {
            "decision": "ask",
            "id": "ask-deploy-commands",
            "kind": "command",
          },
        ],
      }
    `)
  })

  it("runs generator entrypoints idempotently", () => {
    const tree = new MemoryTree()

    specGenerator(tree, { name: "ATT 50" })
    permissionPolicyGenerator(tree, { name: "ATT 50" })
    testObligationGenerator(tree, { name: "ATT 50" })
    taskplaneTaskGenerator(tree, { name: "ATT 50" })
    const first = new Map(tree.files)

    specGenerator(tree, { name: "ATT 50" })
    permissionPolicyGenerator(tree, { name: "ATT 50" })
    testObligationGenerator(tree, { name: "ATT 50" })
    taskplaneTaskGenerator(tree, { name: "ATT 50" })

    expect(tree.files).toEqual(first)
    expect(tree.files.get("specs/pi-agent/att-50.implementation-spec.json")).toContain(
      "\"permissionProfile\"",
    )
    expect(tree.files.get("policies/pi-agent/att-50.pi-policy.json")).toContain(
      "\"deny-env-files\"",
    )
    expect(tree.files.get("obligations/pi-agent/att-50.test-obligation.json")).toContain(
      "\"failureClassification\"",
    )
    expect(tree.files.get("taskplane/pi-agent/att-50.taskplane-task.json")).toContain(
      "\"future-adapter-placeholder\"",
    )
  })

  it("sorts object keys in stable JSON", () => {
    expect(stableJson({ zebra: true, alpha: { beta: 1, aardvark: 2 } })).toBe(`{
  "alpha": {
    "aardvark": 2,
    "beta": 1
  },
  "zebra": true
}
`)
  })
})
