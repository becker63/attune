import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as Path from "node:path";

import { Effect } from "effect";

import type { InvocationId } from "../src/contract/schemas.js";
import {
  allocateInvestigationId,
  artifactReference,
  canonicalJson,
  contained,
  makeActivityGates,
  sha256,
} from "../src/platform/core.js";
import { runProcess } from "../src/platform/process.js";
import {
  FIXTURE_INVESTIGATION_ID as INVESTIGATION,
  fixtureRuntimeConfig,
  withTemporaryDirectory,
} from "./fixtures.js";

const INVOCATION = "test-1" as InvocationId;

const config = (home: string, outputLimitBytes = 1024) =>
  fixtureRuntimeConfig(home, { outputLimitBytes, inlineLimitBytes: 64 });

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
    await withTemporaryDirectory("attune-artifact-", async (root) => {
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
    });
  });

  it("captures bounded native output without a shell", async () => {
    await withTemporaryDirectory("attune-process-", async (root) => {
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
    });
  });

  it("interrupts a process tree and preserves captured output", async () => {
    await withTemporaryDirectory("attune-cancel-", async (root) => {
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
      await vi.waitFor(
        async () =>
          expect(
            await readFile(Path.join(directory, "stdout.txt"), "utf8"),
          ).toBe("ready"),
        { timeout: 2_000 },
      );
      controller.abort();
      expect((await running).termination).toBe("cancelled");
      expect(await readFile(Path.join(directory, "stdout.txt"), "utf8")).toBe(
        "ready",
      );
    });
  });

  it("does not spawn a process for an already-aborted request", async () => {
    await withTemporaryDirectory("attune-pre-cancel-", async (root) => {
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
    });
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
