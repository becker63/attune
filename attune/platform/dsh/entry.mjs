// The narrow declared entry point of the hermetic DSH adapter closure.
//
// The installed pinned DSH package ships its CLI as `@deepseek-ai/dsh/lib/bin.js`
// with a Nix-store shebang, and its own bottom-of-file dispatch is guarded by
// `import.meta.main`, which is false whenever the module is imported rather than
// executed as the process entry. This module is therefore the thinnest possible
// wrapper: it imports the package's own exported `runCli` and calls it, so the
// DSH CLI runs with exactly its own argument parsing, profile boot and plugin
// loading. No behaviour is added, removed or reimplemented here.
//
// When `ATTUNE_DSH_EVENTS_OUT` names a path, the wrapper additionally tees the
// CLI's own stdout into that file. That is a byte-for-byte copy of the native
// `--json` event stream the CLI already prints, so a declared Bazel action can
// carry the native event record as a real output; it fabricates, filters and
// restates nothing.
import { openSync, writeSync } from "node:fs";
import { runCli } from "@deepseek-ai/dsh/lib/bin.js";
import { applyPilotTask } from "./pilot_task.mjs";

const eventsOut = process.env.ATTUNE_DSH_EVENTS_OUT;
if (eventsOut) {
  // Synchronous writes, because the CLI exits through `process.exit`, which can
  // truncate an asynchronous stream's pending buffer. The file is created here
  // unconditionally, so the declared output exists even for a probe that prints
  // nothing.
  const fd = openSync(eventsOut, "a");
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, callback) => {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8");
    writeSync(fd, buffer);
    return write(chunk, encoding, callback);
  };
}

// The declared per-task / per-arm observation binding of the gated pilot. When
// `ATTUNE_DSH_PILOT=1` is declared, the ONE positional task argument is replaced
// by the composed review task of this observation, read from the declared input
// files of the runner. The binding is validated FIRST and fails closed before any
// provider call, so a missing or wrong per-task world can never silently serve a
// compiled default. When the marker is absent nothing about the invocation
// changes, so every other declared run of this adapter is byte-for-byte as before.
process.argv = [process.argv[0], process.argv[1], ...applyPilotTask(process.env, process.argv.slice(2))];

await runCli();
