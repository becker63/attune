import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

import { Effect } from "effect";

import {
  canonicalJson,
  loadRuntimeConfig,
  makeInvestigationService,
  makeMcpHandlers,
  WorkspaceStore,
} from "../dist/golden.mjs";

const execute = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "attune-golden-"));
const config = loadRuntimeConfig({
  ...process.env,
  ATTUNE_HOME: join(root, "state"),
});
const remote = join(root, "fixture");
const marker = join(root, "property-started");

const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};
const git = async (...args) =>
  (
    await execute(config.git, ["-C", remote, ...args], { timeout: 30_000 })
  ).stdout.trim();
const successful = async (effect, name) => {
  const result = await Effect.runPromise(effect);
  invariant(
    result.receipt.status === "succeeded",
    `${name} failed: ${JSON.stringify(result.receipt)}`,
  );
  return result;
};
const rejectsWith = async (effect, code) => {
  try {
    await Effect.runPromise(effect);
  } catch (cause) {
    invariant(cause?.code === code, `expected ${code}, got ${String(cause)}`);
    return;
  }
  throw new Error(`expected ${code}`);
};
const artifact = (receipt, suffix) => {
  const match = receipt.artifacts.find(({ uri }) => uri.endsWith(`/${suffix}`));
  invariant(match !== undefined, `missing ${suffix} artifact`);
  return match;
};
const poll = async (path) => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await stat(path);
      return;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
    }
  }
  throw new Error(`timed out waiting for ${path}`);
};

const readResources = async (uris) => {
  const executable = process.env.ATTUNE_MCP_BIN;
  invariant(executable !== undefined, "ATTUNE_MCP_BIN is required");
  const child = spawn(executable, [], {
    env: { ...process.env, ATTUNE_HOME: config.home },
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const close = new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", (code, signal) => resolvePromise({ code, signal }));
  });
  const waitFor = async (count) => {
    const deadline = Date.now() + 30_000;
    while (stdout.split(/\r?\n/u).filter(Boolean).length < count) {
      if (Date.now() > deadline) throw new Error("resource response timed out");
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
    }
  };
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "attune-golden", version: "1" },
      },
    })}\n`,
  );
  await waitFor(1);
  const requests = [
    { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
    ...uris.map((uri, index) => ({
      jsonrpc: "2.0",
      id: index + 2,
      method: "resources/read",
      params: { uri },
    })),
  ];
  child.stdin.write(`${requests.map(JSON.stringify).join("\n")}\n`);
  await waitFor(uris.length + 1);
  child.stdin.end();
  const outcome = await close;
  invariant(
    outcome.code === 0 && outcome.signal === null,
    `resource server failed: ${stderr}`,
  );
  invariant(stderr === "", `resource server wrote stderr: ${stderr}`);
  const responses = stdout.split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  return uris.map((_, index) => {
    const response = responses.find(({ id }) => id === index + 2);
    invariant(response?.error === undefined, JSON.stringify(response));
    return response.result;
  });
};

try {
  await mkdir(join(remote, "src"), { recursive: true });
  await mkdir(join(remote, "rules"), { recursive: true });
  await mkdir(join(remote, "rule-tests/__snapshots__"), { recursive: true });
  await execute(config.git, ["init", "--initial-branch=main", remote]);
  await git("config", "user.name", "Attune Fixture");
  await git("config", "user.email", "fixture@example.invalid");
  await writeFile(
    join(remote, "src/input.ts"),
    "export const unsafe = (value: string) => eval(value) // prohibited\n",
  );
  await writeFile(
    join(remote, "sgconfig.yml"),
    "ruleDirs:\n  - rules\ntestConfigs:\n  - testDir: rule-tests\n",
  );
  await writeFile(
    join(remote, "rules/no-eval.yml"),
    [
      "id: no-eval",
      "language: TypeScript",
      "rule:",
      "  pattern: eval($VALUE)",
      "fix: safeEval($VALUE)",
      "severity: warning",
      "message: Avoid eval",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(remote, "rule-tests/no-eval-test.yml"),
    "id: no-eval\nvalid:\n  - safeEval(value)\ninvalid:\n  - eval(value)\n",
  );
  await writeFile(
    join(remote, "rule-tests/__snapshots__/no-eval-snapshot.yml"),
    [
      "id: no-eval",
      "snapshots:",
      "  eval(value):",
      "    fixed: safeEval(value)",
      "    labels:",
      "    - source: eval(value)",
      "      style: primary",
      "      start: 0",
      "      end: 11",
      "",
    ].join("\n"),
  );
  await git("add", "-A");
  await git("commit", "-m", "fixture pattern");
  const firstCommit = await git("rev-parse", "HEAD");
  await git("tag", "-a", "fixture-v1", "-m", "fixture version one");
  await writeFile(join(remote, "README.md"), "later commit\n");
  await git("add", "-A");
  await git("commit", "-m", "later fixture state");

  const references = [
    { ref: "activegraph://unknown/hypothesis", note: "opaque by design" },
  ];
  const handlers = makeMcpHandlers(makeInvestigationService(config));
  const materializeInput = {
    invocationId: "materialize-1",
    remote,
    revision: "fixture-v1",
    references,
  };
  const materialized = await successful(
    handlers.repository_materialize(materializeInput),
    "materialize",
  );
  invariant(materialized.resolvedCommit === firstCommit, "tag was not peeled");
  const id = materialized.investigationId;
  let snapshot = materialized.resolvedCommit;
  const workspaces = new WorkspaceStore(config);
  const manifest = await workspaces.readManifest(id);
  const baseFile = join(
    config.home,
    "bases",
    manifest.baseKey,
    "repo",
    "src/input.ts",
  );
  const baseBytes = await readFile(baseFile, "utf8");
  await workspaces.withMount(id, undefined, async ({ repositoryPath }) => {
    invariant(
      (await workspaces.gitOutput(repositoryPath, [
        "branch",
        "--show-current",
      ])) === `attune/${id}`,
      "investigation HEAD is detached",
    );
  });

  const joern = await successful(
    handlers.joern_query({
      investigationId: id,
      invocationId: "joern-1",
      expectedSnapshot: snapshot,
      references,
      cpgql:
        'cpg.call.name("eval").map(c => Map("name" -> c.name, "code" -> c.code)).toJson',
      frontend: "jssrc",
      importOptions: { schemaVersion: 1 },
      outputFormat: "json",
      timeoutMilliseconds: 300_000,
    }),
    "joern",
  );
  invariant(
    JSON.stringify(joern.summary).includes("eval"),
    "Joern missed eval",
  );

  const maudeInput = {
    investigationId: id,
    invocationId: "maude-1",
    expectedSnapshot: snapshot,
    references: [{ ref: `attune:joern:${joern.receipt.invocationId}` }],
    moduleSource:
      "mod ONCE is\n sort State .\n ops fresh committed : -> State [ctor] .\n rl [commit] : fresh => committed .\nendm\n",
    commands:
      "rewrite in ONCE : fresh .\nsearch in ONCE : fresh =>* committed .\n",
    timeoutMilliseconds: 30_000,
  };
  const [maude, maudeDuplicate] = await Promise.all([
    successful(handlers.maude_run(maudeInput), "maude"),
    successful(handlers.maude_run(maudeInput), "maude duplicate"),
  ]);
  invariant(
    canonicalJson(maude) === canonicalJson(maudeDuplicate),
    "duplicate did not return exact result",
  );
  invariant(maude.stdoutTail.includes("committed"), "Maude did not execute");

  const changedMaude = {
    ...maudeInput,
    commands: "reduce in ONCE : fresh .\n",
  };
  await rejectsWith(handlers.maude_run(changedMaude), "InvocationConflict");

  const incomplete = {
    ...maudeInput,
    invocationId: "maude-incomplete",
  };
  await workspaces.withMount(id, undefined, async ({ artifactsPath }) => {
    const directory = join(artifactsPath, "maude", incomplete.invocationId);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, "request.json"),
      `${canonicalJson(incomplete)}\n`,
    );
  });
  await rejectsWith(handlers.maude_run(incomplete), "InvocationIncomplete");

  const propertySource = `
    import fc from "fast-check"
    export default fc.property(
      fc.integer({ min: 0, max: 100 }),
      (value) => value < 2,
    )
  `;
  const property = await successful(
    handlers.property_run({
      investigationId: id,
      invocationId: "property-1",
      expectedSnapshot: snapshot,
      references: [{ ref: `attune:maude:${maude.receipt.invocationId}` }],
      propertySource,
      parameters: {
        numRuns: 100,
        seed: 424242,
        timeoutMilliseconds: 30_000,
      },
    }),
    "property",
  );
  invariant(property.outcome === "counterexample", "property did not falsify");
  invariant((property.numShrinks ?? 0) > 0, "counterexample was not shrunk");
  const replay = await successful(
    handlers.property_run({
      investigationId: id,
      invocationId: "property-replay",
      expectedSnapshot: snapshot,
      references,
      propertySource,
      parameters: {
        numRuns: 100,
        seed: property.seed,
        path: property.counterexamplePath,
        timeoutMilliseconds: 30_000,
      },
    }),
    "property replay",
  );
  invariant(
    replay.outcome === "counterexample",
    "counterexample did not replay",
  );

  for (const mode of ["test", "scan", "apply"]) {
    const result = await successful(
      handlers.ast_grep_run({
        investigationId: id,
        invocationId: `ast-${mode}`,
        expectedSnapshot: snapshot,
        references,
        mode,
        configPath: "sgconfig.yml",
        rulePaths: ["rules/no-eval.yml"],
        timeoutMilliseconds: 30_000,
      }),
      `ast-grep ${mode}`,
    );
    if (mode === "scan") invariant(result.findingCount === 1, "scan count");
    if (mode === "apply") {
      invariant(
        result.changedFiles.includes("src/input.ts"),
        "apply changed files",
      );
    }
  }
  const checkpoint = await successful(
    handlers.repository_checkpoint({
      investigationId: id,
      invocationId: "checkpoint-1",
      expectedSnapshot: snapshot,
      references,
      policy: "commit",
      message: "Apply deterministic lowering",
    }),
    "checkpoint",
  );
  snapshot = checkpoint.snapshotId;

  const moduleArtifact = artifact(maude.receipt, "module.maude");
  const promotion = await successful(
    handlers.artifact_promote({
      investigationId: id,
      invocationId: "promote-1",
      expectedSnapshot: snapshot,
      references,
      artifactUri: moduleArtifact.uri,
      destinationPath: ".attune/theories/once.maude",
    }),
    "promote",
  );
  invariant(
    artifact(promotion.receipt, "promotion.patch").bytes > 0,
    "new-file promotion patch is empty",
  );
  const promoted = await successful(
    handlers.repository_checkpoint({
      investigationId: id,
      invocationId: "checkpoint-2",
      expectedSnapshot: snapshot,
      references,
      policy: "commit",
      message: "Promote native theory",
    }),
    "promoted checkpoint",
  );
  snapshot = promoted.snapshotId;

  const resumedHandlers = makeMcpHandlers(makeInvestigationService(config));
  const materializedRetry = await successful(
    resumedHandlers.repository_materialize(materializeInput),
    "materialize retry",
  );
  invariant(
    canonicalJson(materializedRetry) === canonicalJson(materialized),
    "bootstrap retry changed",
  );
  await successful(
    resumedHandlers.repository_checkpoint({
      investigationId: id,
      invocationId: "resume-check",
      expectedSnapshot: snapshot,
      references,
      policy: "require-clean",
    }),
    "resume",
  );

  const slowInput = {
    investigationId: id,
    invocationId: "property-slow",
    expectedSnapshot: snapshot,
    references,
    propertySource: `
      import fc from "fast-check"
      import { writeFileSync } from "node:fs"
      export default fc.asyncProperty(fc.constant(null), async () => {
        writeFileSync(${JSON.stringify(marker)}, "started")
        await new Promise((resolve) => setTimeout(resolve, 300))
        return true
      })
    `,
    parameters: {
      numRuns: 1,
      seed: 9,
      timeoutMilliseconds: 30_000,
    },
  };
  const slowPromise = Effect.runPromise(
    resumedHandlers.property_run(slowInput),
  );
  await poll(marker);
  const finalizePromise = Effect.runPromise(
    resumedHandlers.investigation_finalize({
      investigationId: id,
      invocationId: "finalize-1",
      expectedSnapshot: snapshot,
      references,
    }),
  );
  const [slow, finalized] = await Promise.all([slowPromise, finalizePromise]);
  invariant(
    slow.receipt.status === "succeeded",
    `accepted property failed: ${JSON.stringify(slow.receipt)}`,
  );
  invariant(
    finalized.receipt.status === "succeeded",
    `finalization failed: ${JSON.stringify(finalized.receipt)}`,
  );
  invariant(
    slow.receipt.completedAt <= finalized.receipt.completedAt,
    "finalization did not wait",
  );
  const slowRetry = await successful(
    resumedHandlers.property_run(slowInput),
    "post-finalization retry",
  );
  invariant(canonicalJson(slowRetry) === canonicalJson(slow), "retry changed");
  await rejectsWith(
    resumedHandlers.maude_run({
      ...maudeInput,
      invocationId: "maude-after-finalize",
      expectedSnapshot: snapshot,
    }),
    "Finalized",
  );

  invariant((await readFile(baseFile, "utf8")) === baseBytes, "base changed");
  invariant(
    (
      await execute(config.git, [
        "-C",
        dirname(baseFile),
        "status",
        "--porcelain",
      ])
    ).stdout.trim() === "",
    "base became dirty",
  );

  const receiptUri = `attune://investigations/${id}/receipts/property/property-slow`;
  const [
    metadataResource,
    receiptResource,
    artifactResource,
    contractResource,
  ] = await readResources([
    `attune://investigations/${id}`,
    receiptUri,
    moduleArtifact.uri,
    "attune://contracts",
  ]);
  invariant(
    metadataResource.contents[0].text.includes('"finalizedAt"'),
    "metadata unavailable after finalization",
  );
  invariant(
    receiptResource.contents[0].text.includes('"status":"succeeded"'),
    "receipt unavailable after finalization",
  );
  invariant(
    artifactResource.contents[0].text.includes("mod ONCE"),
    "artifact unavailable after finalization",
  );
  invariant(
    contractResource.contents[0].text.includes('"schemaVersion": 1'),
    "contract resource unavailable",
  );

  process.stderr.write(`golden investigation passed: ${id} at ${snapshot}\n`);
} finally {
  await execute("chmod", ["-R", "u+w", root]).catch(() => undefined);
  await rm(root, { recursive: true, force: true });
}
