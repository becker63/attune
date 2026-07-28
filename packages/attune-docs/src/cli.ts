import { mkdir, writeFile } from "node:fs/promises";
import * as Path from "node:path";

import { prettyJson } from "./canonical.ts";
import { extractApiManifest } from "./extract.ts";
import { normalizeBasePath } from "./html.ts";
import { paths } from "./paths.ts";
import { buildSite } from "./site.ts";
import { discoverStaticPages } from "./static-pages.ts";

const command = process.argv[2] ?? "build";
const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const manifest = async () => {
  const extracted = await extractApiManifest();
  const errors = extracted.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  return { extracted, errors };
};

const main = async (): Promise<void> => {
  if (command === "experiments:verify") {
    const pages = await discoverStaticPages(paths.staticPages);
    process.stdout.write(`${pages.length} static publication pages valid.\n`);
    return;
  }

  const { extracted, errors } = await manifest();
  if (command === "manifest") {
    const output =
      argument("--output") ??
      Path.join(paths.package, ".tmp", "api-manifest.json");
    await mkdir(Path.dirname(output), { recursive: true });
    await writeFile(output, prettyJson(extracted));
    process.stdout.write(
      `Wrote ${extracted.symbols.length} symbols to ${Path.relative(paths.repository, output)}.\n`,
    );
    return;
  }
  if (command === "audit") {
    for (const diagnostic of extracted.diagnostics) {
      process.stderr.write(
        `${diagnostic.severity} ${diagnostic.code} ${diagnostic.symbolId}: ${diagnostic.message}\n`,
      );
    }
    process.stdout.write(
      `${extracted.symbols.length} exports; ${errors.length} reference errors.\n`,
    );
    if (errors.length > 0) process.exitCode = 1;
    return;
  }
  if (command === "build") {
    if (errors.length > 0) {
      throw new Error(
        `Reference audit failed:\n${errors.map((issue) => `${issue.symbolId}: ${issue.message}`).join("\n")}`,
      );
    }
    const basePath = normalizeBasePath(
      argument("--base-path") ?? process.env.DOCS_BASE_PATH ?? "/attune/",
    );
    const output = Path.resolve(argument("--output") ?? paths.dist);
    const pages = await discoverStaticPages(paths.staticPages);
    await buildSite(
      extracted,
      {
        basePath,
        outputDirectory: output,
        siteUrl:
          process.env.DOCS_SITE_URL ?? "https://becker63.github.io/attune/",
        ...(process.env.DOCS_SOURCE_COMMIT === undefined
          ? {}
          : {
              sourceCommit: process.env.DOCS_SOURCE_COMMIT,
            }),
      },
      pages,
    );
    process.stdout.write(
      `Built the package reference, ${extracted.symbols.length} API symbols, and ${pages.length} experiment pages at ${Path.relative(paths.repository, output)}.\n`,
    );
    return;
  }
  throw new Error(
    `Unknown command ${command}. Expected build, manifest, audit, or experiments:verify.`,
  );
};

await main();
