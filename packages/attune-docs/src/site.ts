import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import * as Path from "node:path";

import { prettyJson } from "./canonical.ts";
import {
  normalizeBasePath,
  renderApiMember,
  renderApiSymbol,
  renderNotFound,
  renderPackageReference,
} from "./html.ts";
import type { ApiManifest, SiteBuildOptions } from "./model.ts";
import { paths } from "./paths.ts";
import { renderStaticPage } from "./static-markdown.ts";
import type { StaticPage } from "./static-pages.ts";
import { twoslashRichStylePath } from "./twoslash.ts";

export const resolveOutputPath = (root: string, relative: string): string => {
  if (
    relative.length === 0 ||
    Path.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.includes("\0")
  ) {
    throw new Error(`Unsafe documentation output path: ${relative}`);
  }
  const resolvedRoot = Path.resolve(root);
  const target = Path.resolve(resolvedRoot, relative);
  if (!target.startsWith(`${resolvedRoot}${Path.sep}`)) {
    throw new Error(`Documentation output path escapes ${resolvedRoot}.`);
  }
  return target;
};

const write = async (
  root: string,
  relative: string,
  bytes: string,
): Promise<void> => {
  const target = resolveOutputPath(root, relative);
  await mkdir(Path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
};

const canonicalPotentialPath = async (path: string): Promise<string> => {
  let existing = Path.resolve(path);
  const missing: string[] = [];
  for (;;) {
    try {
      return Path.join(await realpath(existing), ...missing.reverse());
    } catch (cause) {
      if (
        typeof cause !== "object" ||
        cause === null ||
        !("code" in cause) ||
        cause.code !== "ENOENT"
      ) {
        throw cause;
      }
      const parent = Path.dirname(existing);
      if (parent === existing) throw cause;
      missing.push(Path.basename(existing));
      existing = parent;
    }
  }
};

const filesBelow = async (directory: string): Promise<readonly string[]> => {
  const files: string[] = [];
  for (const name of await readdir(directory)) {
    const path = Path.join(directory, name);
    files.push(
      ...((await stat(path)).isDirectory() ? await filesBelow(path) : [path]),
    );
  }
  return files;
};

export const checkInternalLinks = async (
  outputDirectory: string,
  basePath: string,
): Promise<void> => {
  const base = normalizeBasePath(basePath);
  const missing: string[] = [];
  for (const file of (await filesBelow(outputDirectory)).filter((candidate) =>
    candidate.endsWith(".html"),
  )) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/(?:href|src)="([^"]+)"/gu)) {
      const target = match[1];
      if (target === undefined || !target.startsWith(base)) continue;
      let relative = decodeURIComponent(
        target.slice(base.length).split(/[?#]/u)[0] ?? "",
      );
      if (relative === "" || relative.endsWith("/")) relative += "index.html";
      try {
        await access(resolveOutputPath(outputDirectory, relative));
      } catch {
        missing.push(`${Path.relative(outputDirectory, file)} → ${target}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Static documentation has broken links:\n${missing.join("\n")}`,
    );
  }
};

const searchIndex = (
  manifest: ApiManifest,
  pages: readonly StaticPage[],
  basePath: string,
) => [
  {
    title: manifest.package.name,
    kind: "package",
    summary: manifest.package.documentation.summary,
    href: basePath,
    keywords: manifest.symbols.map((symbol) => symbol.exportName).join(" "),
  },
  ...manifest.symbols.flatMap((symbol) => [
    {
      title: symbol.exportName,
      kind: symbol.kind,
      summary: symbol.documentation.summary,
      href: `${basePath}api/${symbol.slug}.html`,
      keywords: symbol.members.map((member) => member.name).join(" "),
    },
    ...symbol.members.map((member) => ({
      title: `${symbol.exportName}.${member.name}`,
      kind: "member",
      summary: member.documentation.summary,
      href: `${basePath}api/${symbol.slug}/${member.slug}.html`,
      keywords: `${symbol.exportName} ${member.signature}`,
    })),
  ]),
  ...pages.map((page) => ({
    title: page.title,
    kind: "experiment",
    summary: "Independent static evidence publication.",
    href: `${basePath}experiments/${page.slug}.html`,
    keywords: "experiment evidence",
  })),
];

const assertSafeOutput = async (outputDirectory: string): Promise<void> => {
  const output = Path.resolve(outputDirectory);
  const repository = Path.resolve(paths.repository);
  const defaultOutput = Path.resolve(paths.dist);
  const [canonicalOutput, canonicalRepository, canonicalDefault] =
    await Promise.all([
      canonicalPotentialPath(output),
      realpath(repository),
      canonicalPotentialPath(defaultOutput),
    ]);
  const nested = output.startsWith(`${repository}${Path.sep}`);
  const canonicalNested = canonicalOutput.startsWith(
    `${canonicalRepository}${Path.sep}`,
  );
  if (
    output === Path.parse(output).root ||
    output === Path.resolve(paths.package) ||
    output === repository ||
    repository.startsWith(`${output}${Path.sep}`) ||
    canonicalOutput === canonicalRepository ||
    canonicalRepository.startsWith(`${canonicalOutput}${Path.sep}`) ||
    (nested && output !== defaultOutput) ||
    (canonicalNested && canonicalOutput !== canonicalDefault)
  ) {
    throw new Error(`Refusing to replace broad output directory: ${output}`);
  }
};

export const buildSite = async (
  manifest: ApiManifest,
  options: SiteBuildOptions,
  staticPages: readonly StaticPage[] = [],
): Promise<void> => {
  await assertSafeOutput(options.outputDirectory);
  const basePath = normalizeBasePath(options.basePath);
  const siteUrl = new URL(
    options.siteUrl ?? "https://becker63.github.io/attune/",
  );
  if (
    siteUrl.protocol !== "https:" ||
    `${siteUrl.pathname.replace(/\/+$/u, "")}/` !== basePath ||
    siteUrl.search !== "" ||
    siteUrl.hash !== ""
  ) {
    throw new Error(`Documentation site URL must be HTTPS at ${basePath}.`);
  }
  if (
    options.sourceCommit !== undefined &&
    (!/^[a-f0-9]{40}$/u.test(options.sourceCommit) ||
      options.sourceCommit !== manifest.source.ref ||
      manifest.source.revision !== `git:${options.sourceCommit}`)
  ) {
    throw new Error(
      `Source commit ${options.sourceCommit} is not the immutable extracted source revision.`,
    );
  }
  await rm(options.outputDirectory, { recursive: true, force: true });
  await mkdir(options.outputDirectory, { recursive: true });
  await Promise.all([
    cp(paths.static, Path.join(options.outputDirectory, "assets"), {
      recursive: true,
    }),
    cp(paths.schema, Path.join(options.outputDirectory, "schemas"), {
      recursive: true,
    }),
  ]);
  await cp(
    twoslashRichStylePath,
    Path.join(options.outputDirectory, "assets", "twoslash.css"),
  );

  const files: readonly (readonly [string, string])[] = [
    [
      "index.html",
      renderPackageReference(manifest, staticPages, options.basePath),
    ],
    ["404.html", renderNotFound(manifest, staticPages, options.basePath)],
    ["api-manifest.json", prettyJson(manifest)],
    [
      "search-index.json",
      prettyJson(searchIndex(manifest, staticPages, basePath)),
    ],
    [".nojekyll", ""],
    ...manifest.symbols.flatMap(
      (symbol): readonly (readonly [string, string])[] => [
        [
          `api/${symbol.slug}.html`,
          renderApiSymbol(symbol, manifest, staticPages, options.basePath),
        ],
        ...symbol.members.map(
          (member) =>
            [
              `api/${symbol.slug}/${member.slug}.html`,
              renderApiMember(
                member,
                symbol,
                manifest,
                staticPages,
                options.basePath,
              ),
            ] as const,
        ),
      ],
    ),
    ...staticPages.flatMap((page): readonly (readonly [string, string])[] => [
      [`experiments/${page.slug}.md`, page.markdown],
      [
        `experiments/${page.slug}.html`,
        renderStaticPage(page, manifest, options.basePath),
      ],
    ]),
  ];
  await Promise.all(
    files.map(([relative, bytes]) =>
      write(options.outputDirectory, relative, bytes),
    ),
  );
  await checkInternalLinks(options.outputDirectory, options.basePath);
};
