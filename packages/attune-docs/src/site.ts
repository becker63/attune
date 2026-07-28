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

import { apiManifestDigest, digest, prettyJson } from "./canonical.ts";
import {
  normalizeBasePath,
  renderApiIndex,
  renderApiSymbol,
  renderGuide,
  renderNotFound,
  renderRepositoryOverview,
  renderTracePage,
} from "./html.ts";
import { renderGuideMarkdown } from "./markdown.ts";
import type {
  ApiManifest,
  EvidenceManifest,
  ProseDraft,
  RepositoryMap,
  SiteBuildOptions,
  TraceArtifact,
} from "./model.ts";
import { parseEvidenceManifest } from "./parse.ts";
import { paths } from "./paths.ts";
import { renderStaticPage } from "./static-markdown.ts";
import type { StaticPage } from "./static-pages.ts";
import { validatePublicationTraceBinding } from "./traces.ts";
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
    throw new Error(
      `Documentation output path escapes ${resolvedRoot}: ${relative}`,
    );
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
    if ((await stat(path)).isDirectory()) {
      files.push(...(await filesBelow(path)));
    } else {
      files.push(path);
    }
  }
  return files;
};

export const checkInternalLinks = async (
  outputDirectory: string,
  basePath: string,
): Promise<void> => {
  const normalizedBase = normalizeBasePath(basePath);
  const htmlFiles = (await filesBelow(outputDirectory)).filter((file) =>
    file.endsWith(".html"),
  );
  const missing: string[] = [];
  for (const file of htmlFiles) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/(?:href|src)="([^"]+)"/gu)) {
      const target = match[1];
      if (target === undefined || !target.startsWith(normalizedBase)) continue;
      let relative = decodeURIComponent(
        target.slice(normalizedBase.length).split(/[?#]/u)[0] ?? "",
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

const evidenceManifest = (draft: ProseDraft): EvidenceManifest => ({
  schemaVersion: "1.0.0",
  guideId: draft.id,
  sourceRevision: draft.sourceRevision,
  sourceDigest: draft.sourceDigest,
  review: draft.review,
  provenance: draft.provenance,
  claims: draft.sections.flatMap((section) =>
    section.claims.map((claim) => ({
      id: claim.id,
      certainty: claim.certainty,
      evidence: claim.evidence,
    })),
  ),
});

const searchIndex = (
  manifest: ApiManifest,
  repository: RepositoryMap,
  guides: readonly ProseDraft[],
  staticPages: readonly StaticPage[],
  basePath: string,
) => [
  {
    title: "Repository overview",
    kind: "page",
    summary: "Architecture, package map, and recommended reading path.",
    href: basePath,
    keywords: repository.areas.map((area) => area.name).join(" "),
  },
  ...repository.areas.map((area) => ({
    title: area.name,
    kind: "repository",
    summary: area.role,
    href: `${basePath}#${area.id}`,
    keywords: `${area.path} ${area.connectsTo.join(" ")}`,
  })),
  ...guides.map((guide) => ({
    title: guide.title,
    kind: "guide",
    summary: guide.summary,
    href: `${basePath}guides/${guide.slug}.html`,
    keywords: guide.sections.map((section) => section.heading).join(" "),
  })),
  ...staticPages.map((page) => ({
    title: page.title,
    kind: "page",
    summary: "Approved static publication page.",
    href: `${basePath}experiments/${page.slug}.html`,
    keywords: "experiment publication",
  })),
  ...manifest.symbols.map((symbol) => ({
    title: symbol.exportName,
    kind: symbol.kind,
    summary: symbol.summary || symbol.declaration,
    href: `${basePath}api/${symbol.slug}.html`,
    keywords: `${symbol.kind} ${symbol.members.map((member) => member.name).join(" ")}`,
  })),
];

const assertUnique = (values: readonly string[], label: string): void => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
};

export const buildSite = async (
  manifest: ApiManifest,
  repository: RepositoryMap,
  guides: readonly ProseDraft[],
  options: SiteBuildOptions,
  traces: readonly TraceArtifact[] = [],
  staticPages: readonly StaticPage[] = [],
): Promise<void> => {
  assertUnique(
    guides.map((guide) => guide.id),
    "guide id",
  );
  assertUnique(
    guides.map((guide) => guide.slug),
    "guide slug",
  );
  const traceBindings = traces.map((artifact) => {
    const matches = guides.filter(
      (guide) =>
        artifact.trace.guide_id === guide.id ||
        artifact.trace.guide_id === guide.slug,
    );
    if (matches.length !== 1) {
      throw new Error(
        `TraceExport ${artifact.sourcePath} must reference exactly one guide; found ${matches.length} for ${artifact.trace.guide_id}.`,
      );
    }
    return { artifact, guide: matches[0]! };
  });
  assertUnique(
    traceBindings.map(({ guide }) => guide.id),
    "trace guide",
  );
  const currentManifestDigest = apiManifestDigest(manifest);
  for (const guide of guides) {
    const publicationTraces = traceBindings.filter(
      ({ artifact, guide: owner }) =>
        artifact.kind === "publication" && owner.id === guide.id,
    );
    const requiresPublicationTrace =
      guide.provenance.kind === "prose-agent" ||
      guide.review.sourceRevision !== manifest.source.revision ||
      guide.review.manifestDigest !== currentManifestDigest;
    if (requiresPublicationTrace && publicationTraces.length !== 1) {
      throw new Error(
        `Guide ${guide.id} requires exactly one validated publication trace for its prose-agent or approval carry-forward provenance; found ${publicationTraces.length}.`,
      );
    }
  }
  const resolvedOutput = Path.resolve(options.outputDirectory);
  const resolvedRepository = Path.resolve(paths.repository);
  const resolvedDefaultOutput = Path.resolve(paths.dist);
  const [canonicalOutput, canonicalRepository, canonicalDefaultOutput] =
    await Promise.all([
      canonicalPotentialPath(resolvedOutput),
      realpath(resolvedRepository),
      canonicalPotentialPath(resolvedDefaultOutput),
    ]);
  const normalizedBasePath = normalizeBasePath(options.basePath);
  const siteUrl = new URL(
    options.siteUrl ?? "https://becker63.github.io/attune/",
  );
  if (
    siteUrl.protocol !== "https:" ||
    `${siteUrl.pathname.replace(/\/+$/u, "")}/` !== normalizedBasePath ||
    siteUrl.search.length > 0 ||
    siteUrl.hash.length > 0
  ) {
    throw new Error(
      `Documentation site URL must be an HTTPS origin at ${normalizedBasePath}: ${siteUrl.href}`,
    );
  }
  const outputIsInsideRepository = resolvedOutput.startsWith(
    `${resolvedRepository}${Path.sep}`,
  );
  const canonicalOutputIsInsideRepository = canonicalOutput.startsWith(
    `${canonicalRepository}${Path.sep}`,
  );
  if (
    resolvedOutput === Path.parse(resolvedOutput).root ||
    resolvedOutput === Path.resolve(paths.package) ||
    resolvedOutput === resolvedRepository ||
    resolvedRepository.startsWith(`${resolvedOutput}${Path.sep}`) ||
    canonicalOutput === canonicalRepository ||
    canonicalRepository.startsWith(`${canonicalOutput}${Path.sep}`) ||
    (outputIsInsideRepository && resolvedOutput !== resolvedDefaultOutput) ||
    (canonicalOutputIsInsideRepository &&
      canonicalOutput !== canonicalDefaultOutput)
  ) {
    throw new Error(
      `Refusing to replace broad documentation output directory: ${resolvedOutput}`,
    );
  }
  for (const artifact of traces.filter(
    (candidate) => candidate.kind === "publication",
  )) {
    const guide = traceBindings.find(
      (binding) => binding.artifact === artifact,
    )!.guide;
    const renderedGuide = renderGuide(
      guide,
      manifest,
      guides,
      options.basePath,
    );
    validatePublicationTraceBinding(artifact, guide, manifest, {
      path: `guides/${guide.slug}.html`,
      digest: digest(renderedGuide),
      basePath: normalizedBasePath,
      siteUrl: siteUrl.href,
      publicationRevision: options.publicationRevision ?? manifest.source.ref,
    });
  }
  await rm(options.outputDirectory, { recursive: true, force: true });
  await mkdir(options.outputDirectory, { recursive: true });
  await cp(paths.static, Path.join(options.outputDirectory, "assets"), {
    recursive: true,
  });
  await cp(
    twoslashRichStylePath,
    Path.join(options.outputDirectory, "assets", "twoslash.css"),
  );
  await cp(paths.schema, Path.join(options.outputDirectory, "schemas"), {
    recursive: true,
  });

  await Promise.all([
    write(
      options.outputDirectory,
      "index.html",
      renderRepositoryOverview(manifest, repository, guides, options.basePath),
    ),
    write(
      options.outputDirectory,
      "404.html",
      renderNotFound(manifest, guides, options.basePath),
    ),
    write(
      options.outputDirectory,
      "api/index.html",
      renderApiIndex(manifest, guides, options.basePath),
    ),
    write(options.outputDirectory, "api-manifest.json", prettyJson(manifest)),
    write(
      options.outputDirectory,
      "repository-map.json",
      prettyJson(repository),
    ),
    write(
      options.outputDirectory,
      "search-index.json",
      prettyJson(
        searchIndex(
          manifest,
          repository,
          guides,
          staticPages,
          options.basePath,
        ),
      ),
    ),
    write(options.outputDirectory, ".nojekyll", ""),
  ]);

  await Promise.all(
    manifest.symbols.map((symbol) =>
      write(
        options.outputDirectory,
        `api/${symbol.slug}.html`,
        renderApiSymbol(symbol, manifest, guides, options.basePath),
      ),
    ),
  );
  await Promise.all(
    staticPages.flatMap((page) => [
      write(
        options.outputDirectory,
        `experiments/${page.slug}.md`,
        page.markdown,
      ),
      write(
        options.outputDirectory,
        `experiments/${page.slug}.html`,
        renderStaticPage(page, manifest, guides, options.basePath),
      ),
    ]),
  );
  await Promise.all(
    guides.flatMap((guide) => [
      write(
        options.outputDirectory,
        `guides/${guide.slug}.html`,
        renderGuide(guide, manifest, guides, options.basePath),
      ),
      write(
        options.outputDirectory,
        `guides/${guide.slug}.md`,
        renderGuideMarkdown(guide, manifest, options.basePath),
      ),
      write(
        options.outputDirectory,
        `traces/${guide.slug}.html`,
        renderTracePage(
          guide,
          manifest,
          guides,
          options.basePath,
          traceBindings.find((binding) => binding.guide.id === guide.id)
            ?.artifact,
        ),
      ),
      write(
        options.outputDirectory,
        `evidence/${guide.slug}.json`,
        prettyJson(parseEvidenceManifest(evidenceManifest(guide))),
      ),
      ...traceBindings
        .filter((binding) => binding.guide.id === guide.id)
        .map(({ artifact }) =>
          write(
            options.outputDirectory,
            `traces/${artifact.kind === "representative" ? "examples" : "data"}/${guide.slug}.json`,
            prettyJson(artifact.trace),
          ),
        ),
    ]),
  );

  const styles = await readFile(
    Path.join(options.outputDirectory, "assets", "styles.css"),
    "utf8",
  );
  if (
    styles.includes("linear-gradient") ||
    styles.includes("backdrop-filter")
  ) {
    throw new Error("Static site CSS violates the no-gradient/glass policy.");
  }
  await checkInternalLinks(options.outputDirectory, options.basePath);
};
