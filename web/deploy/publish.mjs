import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
// The existing project's non-secret identity; a fresh clone needs no link wizard.
fs.mkdirSync(".vercel", { recursive: true });
fs.writeFileSync(
  ".vercel/project.json",
  JSON.stringify({
    orgId: "team_rzeYKohSpmJuZgKrKh1A4MEY",
    projectId: "prj_gP9ChzrOUf3dmZQV7WpelQr6Au3E",
    projectName: "atlas-live",
    settings: {
      framework: "nextjs",
      nodeVersion: "24.x",
      buildCommand: "pnpm build",
      installCommand: "pnpm install --frozen-lockfile --ignore-scripts",
    },
  }),
);
// One Bazel graph produces and verifies the runtime; Vercel packages Next.
for (const [command, ...args] of [
  ["pnpm", "artifacts"],
  ["nix", "run", ".#test"],
  ["pnpm", "check"],
  ["pnpm", "exec", "vercel", "build", "--prod", "--standalone"],
  ["pnpm", "verify"],
  ["node", "deploy/studio.mjs", "configure"],
  ["node", "deploy/studio.mjs", "deploy"],
]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed; deployment stopped.`);
}
