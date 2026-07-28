import * as Path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = Path.resolve(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const paths = {
  package: packageDirectory,
  repository: Path.resolve(packageDirectory, "..", ".."),
  mcp: Path.resolve(packageDirectory, "..", "attune-mcp"),
  policy: Path.join(packageDirectory, "docs-policy.json"),
  content: Path.join(packageDirectory, "content", "guides"),
  approvals: Path.join(packageDirectory, "content", "approvals"),
  schema: Path.join(packageDirectory, "schema"),
  static: Path.join(packageDirectory, "static"),
  dist: Path.join(packageDirectory, "dist"),
};
