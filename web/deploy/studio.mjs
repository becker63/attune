// Secrets enter only this publisher. Build tools never receive the .env values.
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const web = path.resolve(import.meta.dirname, "..");
const checkout = path.resolve(web, "..");
const secretFile = path.join(checkout, ".env");
const secrets = fs.existsSync(secretFile)
  ? parseEnv(fs.readFileSync(secretFile, "utf8"))
  : {};
const token = process.env.VERCEL_TOKEN ?? secrets.VERCEL_TOKEN;
if (!token) throw new Error("VERCEL_TOKEN is unavailable.");
const team = "team_rzeYKohSpmJuZgKrKh1A4MEY",
  project = "prj_gP9ChzrOUf3dmZQV7WpelQr6Au3E";
async function api(route, method = "GET", body) {
  const response = await fetch(
    `https://api.vercel.com${route}${route.includes("?") ? "&" : "?"}teamId=${team}`,
    {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!response.ok)
    throw new Error(`Vercel ${method} returned HTTP ${response.status}.`);
  if (response.status === 204) return {};
  return response.json();
}
const mode = process.argv[2];
if (mode === "configure" || mode === "configure-preview") {
  if (
    !fs.existsSync(
      path.join(
        web,
        ".vercel/output/functions/api/inference.func/.vc-config.json",
      ),
    )
  )
    throw new Error(
      "Build and verify the inference function before configuring it.",
    );
  const values = {
    STUDIO_OPENROUTER_KEY: secrets.OPENROUTER_API_KEY,
  };
  if (Object.values(values).some((v) => !v))
    throw new Error("The configured .env is missing a provider key.");
  await api(
    `/v10/projects/${project}/env?upsert=true`,
    "POST",
    Object.entries(values).map(([key, value]) => ({
      key,
      value,
      type: "encrypted",
      target: [mode === "configure-preview" ? "preview" : "production"],
    })),
  );
  await api(`/v9/projects/${project}`, "PATCH", { framework: "nextjs" });
  // Retire the obsolete visitor gate and direct-TypeSafe key created by this mission.
  const existing = await api(`/v9/projects/${project}/env`);
  for (const env of existing.envs)
    if (["STUDIO_ACCESS_CODE", "STUDIO_JEV_KEY"].includes(env.key))
      await api(`/v9/projects/${project}/env/${env.id}`, "DELETE");
  console.log(
    "Configured encrypted runtime variables:",
    Object.keys(values).join(", "),
  );
} else if (mode === "deploy" || mode === "preview") {
  const output = path.join(web, ".vercel/output");
  const manifest = fs.readFileSync(
    path.join(output, "static/runtime/manifest.json"),
  );
  const nextBuild = fs
    .readFileSync(path.join(web, ".next/BUILD_ID"), "utf8")
    .trim();
  const revision = `studio-${nextBuild}-${createHash("sha256").update(manifest).digest("hex").slice(0, 16)}`;
  // Reuse the existing prebuilt publisher and project. It receives only its
  // deployment token; provider credentials remain in Vercel runtime settings.
  const result = spawnSync(
    process.execPath,
    [
      path.join(web, "deploy/deploy.mjs"),
      ...(mode === "preview" ? ["--preview"] : []),
      "--output",
      output,
      "--build-revision",
      revision,
    ],
    {
      cwd: web,
      env: {
        ...process.env,
        VERCEL_TOKEN: token,
        ATTUNE_VERCEL_CLI: path.join(web, "node_modules/.bin/vercel"),
      },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) throw new Error("Publishing failed.");
} else if (["verify-preview", "probe-preview", "logs-preview"].includes(mode)) {
  const url = new URL(process.argv[3]);
  if (
    url.protocol !== "https:" ||
    !/^atlas-live-[a-z0-9]+-becker63s-projects\.vercel\.app$/.test(url.hostname)
  )
    throw new Error("Expected this project's immutable preview URL.");
  if (mode === "logs-preview") {
    const logs = spawnSync(path.join(web, "node_modules/.bin/vercel"),
      ["logs", url.origin, "--scope", "becker63s-projects", "--since", "30m", "--limit", "10", "--expand"],
      { cwd: web, encoding: "utf8", env: { ...process.env, VERCEL_TOKEN: token } });
    for (const output of [logs.stdout, logs.stderr]) console.log((output ?? "").split(token).join("[redacted]"));
    process.exit(logs.status ?? 1);
  }
  let settings = await api(`/v9/projects/${project}`);
  let bypass = Object.keys(settings.protectionBypass ?? {}).find(
    (k) => settings.protectionBypass[k].scope === "automation-bypass",
  );
  if (!bypass) {
    settings = await api(
      `/v1/projects/${project}/protection-bypass`,
      "PATCH",
      {},
    );
    bypass = Object.keys(settings.protectionBypass ?? {}).find(
      (k) => settings.protectionBypass[k].scope === "automation-bypass",
    );
  }
  if (!bypass) throw new Error("Preview test authentication unavailable.");
  const probe = await fetch(`${url.origin}/api/extraction`, {
    method: "POST",
    headers: {
      origin: url.origin,
      "content-type": "application/json",
      "x-vercel-protection-bypass": bypass,
    },
    body: JSON.stringify({ operation: "fixture" }),
  });
  const answer = await probe.text();
  console.log(
    "Preview extraction:",
    probe.status,
    probe.headers.get("content-type"),
  );
  if (!probe.ok) throw new Error(answer.slice(0, 160));
  const receipt = JSON.parse(answer);
  console.log("Verified fixture files:", receipt.files?.length);
  if (mode === "probe-preview") process.exit(0);
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "test/network.test.ts",
      "test/browser.test.ts",
    ],
    {
      cwd: web,
      stdio: "inherit",
      env: {
        ...process.env,
        STUDIO_TEST_URL: url.origin,
        STUDIO_PREVIEW_BYPASS: bypass,
        STUDIO_SKIP_PARITY: "1",
        STUDIO_NETWORK_TEST: "1",
      },
    },
  );
  if (result.status !== 0) throw new Error("Preview verification failed.");
} else if (mode === "metadata") {
  const data = await api(`/v9/projects/${project}/env`);
  console.log(data.envs.map(({ key, target }) => ({ key, target })));
  const target = (await api(`/v9/projects/${project}`)).targets?.production;
  console.log({ productionDeployment: target?.id, url: target?.url });
} else
  throw new Error(
    "Use configure, configure-preview, deploy, preview, verify-preview, or metadata.",
  );
