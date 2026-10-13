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
if (mode === "configure") {
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
      target: ["production"],
    })),
  );
  await api(`/v9/projects/${project}`, "PATCH", { framework: "nextjs" });
  // Retire the obsolete visitor gate and direct-TypeSafe key created by this mission.
  const existing = await api(`/v9/projects/${project}/env`);
  for (const env of existing.envs)
    if (["STUDIO_ACCESS_CODE", "STUDIO_JEV_KEY"].includes(env.key))
      await api(`/v9/projects/${project}/env/${env.id}`, "DELETE");
  console.log(
    "Configured encrypted production variables:",
    Object.keys(values).join(", "),
  );
} else if (mode === "deploy") {
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
} else if (mode === "metadata") {
  const data = await api(`/v9/projects/${project}/env`);
  console.log(data.envs.map(({ key, target }) => ({ key, target })));
} else throw new Error("Use configure, deploy, or metadata.");
