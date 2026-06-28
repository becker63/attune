import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = process.cwd();
const packagePrefix = "packages/";

const log = execFileSync(
  "git",
  ["log", "--since=1 year ago", "--numstat", "--format=commit:%H", "--", "packages"],
  { cwd: root, encoding: "utf8" },
);

const stats = new Map();

for (const line of log.split("\n")) {
  if (!line || line.startsWith("commit:")) {
    continue;
  }

  const [addedRaw, deletedRaw, file] = line.split("\t");
  if (!file?.startsWith(packagePrefix)) {
    continue;
  }

  const added = Number.parseInt(addedRaw, 10);
  const deleted = Number.parseInt(deletedRaw, 10);
  const churn = (Number.isFinite(added) ? added : 0) + (Number.isFinite(deleted) ? deleted : 0);
  const current = stats.get(file) ?? { revisions: 0, churn: 0 };
  current.revisions += 1;
  current.churn += churn;
  stats.set(file, current);
}

function codeLines(file) {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("//"))
      .length;
  } catch {
    return 0;
  }
}

const rows = [...stats.entries()]
  .map(([file, stat]) => {
    const loc = codeLines(file);
    return {
      file,
      revisions: stat.revisions,
      churn: stat.churn,
      loc,
      score: stat.revisions * Math.log2(stat.churn + 1) * Math.log2(loc + 1),
    };
  })
  .filter((row) => row.loc > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 25);

console.log("Hotspots by one-year churn x LOC");
console.log("score\trevs\tchurn\tloc\tfile");
for (const row of rows) {
  console.log(
    `${row.score.toFixed(1)}\t${row.revisions}\t${row.churn}\t${row.loc}\t${row.file}`,
  );
}
