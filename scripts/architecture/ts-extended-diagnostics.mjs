import { execFileSync } from "node:child_process";

const packageTsconfigs = execFileSync("git", ["ls-files", "packages/*/tsconfig.json"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .sort();

let failed = false;

for (const tsconfig of packageTsconfigs) {
  const packageDir = tsconfig.slice(0, -"/tsconfig.json".length);
  console.log(`\n== ${packageDir} ==`);
  try {
    const output = execFileSync(
      "pnpm",
      ["exec", "tsc", "--noEmit", "--extendedDiagnostics", "--project", "tsconfig.json"],
      { cwd: packageDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    console.log(output.trim());
  } catch (error) {
    failed = true;
    const stdout = error.stdout?.toString() ?? "";
    const stderr = error.stderr?.toString() ?? "";
    console.log(`${stdout}${stderr}`.trim());
  }
}

if (failed) {
  process.exitCode = 1;
}
