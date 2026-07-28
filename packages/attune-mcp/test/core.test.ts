import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  allocateInvestigationId,
  artifactReference,
  canonicalJson,
  contained,
  makeActivityGates,
  runProcess,
  sha256,
  type InvestigationId,
  type InvocationId,
  type RuntimeConfig,
} from "attune-mcp";
import { Effect } from "effect";

const INVESTIGATION = "01K00000000000000000000000" as InvestigationId;
const INVOCATION = "test-1" as InvocationId;

const config = (home: string, outputLimitBytes = 1024): RuntimeConfig => ({
  home,
  agentFs: "agentfs",
  fusermount: "fusermount3",
  git: "git",
  node: process.execPath,
  joern: "joern",
  maude: "maude",
  astGrep: "ast-grep",
  flock: "flock",
  lockHolder: fileURLToPath(
    new URL("../dist/lock-holder.mjs", import.meta.url),
  ),
  propertyRunner: fileURLToPath(
    new URL("../dist/property-runner.mjs", import.meta.url),
  ),
  contractBundle: fileURLToPath(
    new URL("../../../contracts/attune-tools.schema.json", import.meta.url),
  ),
  contractDigest: fileURLToPath(
    new URL("../../../contracts/attune-tools.sha256", import.meta.url),
  ),
  toolchainDigest: sha256("test"),
  outputLimitBytes,
  inlineLimitBytes: 64,
});

describe("small mechanical core", () => {
  it("canonicalizes recursively and allocates branded identities", () => {
    expect(canonicalJson({ z: [2, { b: true, a: null }], a: -0 })).toBe(
      '{"a":0,"z":[2,{"a":null,"b":true}]}',
    );
    expect(allocateInvestigationId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/u);
    expect(sha256("same")).toBe(sha256("same"));
  });

  it("rejects lexical containment escapes", () => {
    expect(contained("/tmp/root", "a/b")).toBe("/tmp/root/a/b");
    expect(() => contained("/tmp/root", "../outside")).toThrow("path escapes");
  });

  it("hashes honest artifact metadata", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "attune-artifact-"));
    try {
      await writeFile(Path.join(root, "value.txt"), "exact");
      const reference = await artifactReference(
        INVESTIGATION,
        "maude",
        INVOCATION,
        root,
        "value.txt",
      );
      expect(reference.bytes).toBe(5);
      expect(reference.complete).toBe(true);
      expect(reference.sha256).toBe(sha256("exact"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("captures bounded native output without a shell", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "attune-process-"));
    try {
      const directory = Path.join(root, "run");
      await mkdir(directory);
      const result = await runProcess(config(root, 32), {
        command: process.execPath,
        args: ["-e", "process.stdout.write('x'.repeat(128))"],
        cwd: root,
        artifactDirectory: directory,
        timeoutMilliseconds: 5_000,
      });
      expect(result.termination).toBe("resource-limited");
      expect(result.command).toBe(process.execPath);
      expect(result.args).toEqual([
        "-e",
        "process.stdout.write('x'.repeat(128))",
      ]);
      expect(result.stdoutComplete).toBe(false);
      expect(
        (await readFile(Path.join(directory, "stdout.txt"))).byteLength,
      ).toBe(32);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("interrupts a process tree and preserves captured output", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "attune-cancel-"));
    try {
      const controller = new AbortController();
      const directory = Path.join(root, "run");
      await mkdir(directory);
      const running = runProcess(
        config(root),
        {
          command: process.execPath,
          args: [
            "-e",
            "process.stdout.write('ready');setInterval(()=>{},1000)",
          ],
          cwd: root,
          artifactDirectory: directory,
          timeoutMilliseconds: 10_000,
        },
        controller.signal,
      );
      setTimeout(() => controller.abort(), 50);
      expect((await running).termination).toBe("cancelled");
      expect(await readFile(Path.join(directory, "stdout.txt"), "utf8")).toBe(
        "ready",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not spawn a process for an already-aborted request", async () => {
    const root = await mkdtemp(Path.join(tmpdir(), "attune-pre-cancel-"));
    try {
      const controller = new AbortController();
      controller.abort();
      const directory = Path.join(root, "run");
      const result = await runProcess(
        config(root),
        {
          command: Path.join(root, "must-not-be-spawned"),
          args: [],
          cwd: root,
          artifactDirectory: directory,
          timeoutMilliseconds: 10_000,
        },
        controller.signal,
      );
      expect(result.termination).toBe("cancelled");
      expect(await readFile(Path.join(directory, "stdout.txt"), "utf8")).toBe(
        "",
      );
      expect(await readFile(Path.join(directory, "stderr.txt"), "utf8")).toBe(
        "",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("makes finalization wait for accepted shared activity", async () => {
    const gate = makeActivityGates()(INVESTIGATION);
    const events: string[] = [];
    const shared = Effect.sleep("30 millis").pipe(
      Effect.tap(() => Effect.sync(() => events.push("shared"))),
      gate.shared,
    );
    const exclusive = Effect.sync(() => events.push("exclusive")).pipe(
      gate.exclusive,
    );
    await Effect.runPromise(
      Effect.all([shared, exclusive], { concurrency: "unbounded" }),
    );
    expect(events).toEqual(["shared", "exclusive"]);
  });
});
