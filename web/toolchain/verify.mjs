import { spawn, spawnSync } from "node:child_process";
const port = 4320;
const server = spawn(
  "pnpm",
  ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  { stdio: "ignore", detached: true },
);
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Production test server exited.");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/studio`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("Production server did not become ready.");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "test/browser.test.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        STUDIO_SKIP_PARITY: "1",
        STUDIO_TEST_URL: `http://127.0.0.1:${port}`,
      },
    },
  );
  if (result.status !== 0)
    throw new Error("Production browser verification failed.");
} finally {
  if (server.pid)
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
}
