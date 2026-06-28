import { describe, expect, it } from "vitest"

import {
  checkCommandPermission,
  checkPathPermission,
  defaultAttunePiPermissionProfile,
  normalizePermissionSubject,
  strongestPermissionDecision,
} from "../src/index.js"

describe("Attune Pi permission decisions", () => {
  it("denies secret-adjacent env files after normalization", () => {
    for (const subject of [
      ".env",
      "./.env.local",
      "packages/app/service.env",
      "packages\\app\\service.env.local",
      "packages/app/../app/.env.production",
    ]) {
      expect(checkPathPermission(subject).decision).toBe("deny")
    }
  })

  it("denies SSH material paths", () => {
    expect(checkPathPermission("~/.ssh/id_rsa").matchedRuleIds).toContain("deny-ssh-paths")
    expect(checkPathPermission("/home/taylor/.ssh/config").decision).toBe("deny")
  })

  it("ask-gates external absolute paths when a repo root is known", () => {
    expect(checkPathPermission("/home/becker/projects/attune/packages/a.ts", {
      repoRoot: "/home/becker/projects/attune",
    }).decision).toBe("ask")
    expect(checkPathPermission("/tmp/outside.txt", {
      repoRoot: "/home/becker/projects/attune",
    }).matchedRuleIds).toContain("ask-external-directories")
  })

  it("denies dangerous commands and ask-gates deployment-like commands", () => {
    for (const command of [
      "sudo true",
      "ssh host",
      "kubectl get pods",
      "nix deploy .#host",
      "rm -rf .tmp",
      "git reset --hard",
      "git clean -fdx",
    ]) {
      expect(checkCommandPermission(command).decision).toBe("deny")
    }

    expect(checkCommandPermission("pnpm run deploy:preview").decision).toBe("ask")
  })

  it("keeps deny stronger than ask and allow", () => {
    expect(strongestPermissionDecision(["allow", "ask", "deny"])).toBe("deny")
    expect(strongestPermissionDecision(["allow", "ask"])).toBe("ask")
  })

  it("normalizes path spelling without hiding secret filenames", () => {
    expect(normalizePermissionSubject("packages\\app//../app/.env.local")).toBe(
      "packages/app/.env.local",
    )
  })

  it("decodes the default profile shape", () => {
    expect(defaultAttunePiPermissionProfile.rules.map((rule) => rule.id)).toEqual(
      expect.arrayContaining(["deny-env-files", "deny-ssh-paths", "deny-rm-rf"]),
    )
  })
})
