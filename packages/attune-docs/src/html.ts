import type {
  ApiManifest,
  ApiSymbol,
  ProseDraft,
  RepositoryMap,
  TraceArtifact,
} from "./model.ts";

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const normalizeBasePath = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return "/";

  const path = trimmed.replace(/^\/+|\/+$/gu, "");
  const segments = path.split("/");
  const unsafe = segments.some(
    (segment) =>
      segment === "" ||
      segment === "." ||
      segment === ".." ||
      !/^[a-zA-Z0-9._~-]+$/u.test(segment),
  );
  if (unsafe) {
    throw new Error(`Unsafe documentation base path: ${JSON.stringify(value)}`);
  }

  return `/${segments.join("/")}/`;
};

export const withBase = (basePath: string, path = ""): string =>
  `${normalizeBasePath(basePath)}${path.replace(/^\/+/u, "")}`;

const symbolHref = (basePath: string, symbol: ApiSymbol): string =>
  escapeHtml(withBase(basePath, `api/${symbol.slug}.html`));

const sourceModule = (symbol: ApiSymbol): string => {
  const pathSegments = symbol.source.path.replaceAll("\\", "/").split("/");
  const sourceIndex = pathSegments.lastIndexOf("src");
  const sourceSegments =
    sourceIndex === -1 ? pathSegments : pathSegments.slice(sourceIndex + 1);
  const fileName = sourceSegments.at(-1) ?? symbol.source.path;
  const moduleName = fileName.replace(/\.tsx?$/u, "");
  const directories = sourceSegments.slice(0, -1);

  if (directories[0] === "tools") {
    const toolName =
      directories[1] ?? (moduleName === "index" ? undefined : moduleName);
    return toolName === undefined ? "tools" : `tools / ${toolName}`;
  }

  if (moduleName !== "index") {
    return [...directories, moduleName].join(" / ");
  }

  return directories.join(" / ") || moduleName;
};

const groupSymbols = (
  symbols: readonly ApiSymbol[],
): ReadonlyMap<string, readonly ApiSymbol[]> => {
  const groups = new Map<string, ApiSymbol[]>();
  for (const symbol of symbols) {
    const moduleName = sourceModule(symbol);
    const group = groups.get(moduleName) ?? [];
    group.push(symbol);
    groups.set(moduleName, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) =>
      left.exportName.localeCompare(right.exportName),
    );
  }
  return groups;
};

const renderInline = (value: string): string =>
  value
    .split(/(`[^`]+`)/gu)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`")
        ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
        : escapeHtml(part),
    )
    .join("");

interface LayoutOptions {
  readonly basePath: string;
  readonly title: string;
  readonly description: string;
  readonly currentPath: string;
  readonly manifest: ApiManifest;
  readonly guides: readonly ProseDraft[];
  readonly body: string;
}

const guideNavigation = (
  basePath: string,
  guides: readonly ProseDraft[],
  currentPath: string,
): string =>
  guides
    .map((guide) => {
      const path = `guides/${guide.slug}.html`;
      const current = path === currentPath;
      return `<a href="${escapeHtml(withBase(basePath, path))}"${current ? ' aria-current="page"' : ""}>${escapeHtml(guide.title)}</a>`;
    })
    .join("");

const symbolNavigation = (
  basePath: string,
  symbols: readonly ApiSymbol[],
  currentPath: string,
): string => {
  const groups = groupSymbols(symbols);
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([moduleName, entries]) => `<details>
        <summary>${escapeHtml(moduleName)} <span>${entries.length}</span></summary>
        <div class="nav-symbols">
          ${entries
            .map((symbol) => {
              const path = `api/${symbol.slug}.html`;
              return `<a href="${symbolHref(basePath, symbol)}"${path === currentPath ? ' aria-current="page"' : ""}>${escapeHtml(symbol.exportName)}</a>`;
            })
            .join("")}
        </div>
      </details>`,
    )
    .join("");
};

export const layout = (options: LayoutOptions): string => {
  const revision = options.manifest.source.revision.replace(
    /^(?:git|sha256):/u,
    "",
  );
  const shortRevision =
    revision.length > 18 ? `${revision.slice(0, 12)}…` : revision;
  return `<!doctype html>
<html lang="en" data-base-path="${escapeHtml(normalizeBasePath(options.basePath))}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(options.description)}">
    <title>${escapeHtml(options.title)} · Attune docs</title>
    <link rel="stylesheet" href="${escapeHtml(withBase(options.basePath, "assets/styles.css"))}">
    <script type="module" src="${escapeHtml(withBase(options.basePath, "assets/site.js"))}"></script>
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="mobile-header">
      <button type="button" class="menu-button" aria-controls="docs-sidebar" aria-expanded="false">Menu</button>
      <a href="${escapeHtml(withBase(options.basePath))}">Attune docs</a>
    </header>
    <aside class="sidebar" id="docs-sidebar">
      <div class="site-name">
        <a href="${escapeHtml(withBase(options.basePath))}">Attune</a>
        <span>Repository guide</span>
      </div>
      <div class="search">
        <label for="doc-search">Search documentation</label>
        <input id="doc-search" type="search" autocomplete="off" placeholder="Search symbols and guides">
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <nav aria-label="Documentation">
        <div class="nav-section">
          <h2>Repository</h2>
          <a href="${escapeHtml(withBase(options.basePath))}"${options.currentPath === "" ? ' aria-current="page"' : ""}>Overview and package map</a>
        </div>
        <div class="nav-section">
          <h2>Onboarding</h2>
          ${guideNavigation(options.basePath, options.guides, options.currentPath)}
        </div>
        <div class="nav-section api-navigation">
          <h2>API reference</h2>
          <a href="${escapeHtml(withBase(options.basePath, "api/index.html"))}"${options.currentPath === "api/index.html" ? ' aria-current="page"' : ""}>All exports</a>
          ${symbolNavigation(options.basePath, options.manifest.symbols, options.currentPath)}
        </div>
      </nav>
      <div class="revision">
        <span>Source revision</span>
        <code title="${escapeHtml(options.manifest.source.revision)}">${escapeHtml(shortRevision)}</code>
      </div>
    </aside>
    <main id="content" class="content">
      ${options.body}
    </main>
  </body>
</html>
`;
};

const pageHeader = (
  title: string,
  summary: string,
  meta?: string,
): string => `<header class="page-header">
  ${meta === undefined ? "" : `<p class="page-meta">${escapeHtml(meta)}</p>`}
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(summary)}</p>
</header>`;

export const renderRepositoryOverview = (
  manifest: ApiManifest,
  repository: RepositoryMap,
  guides: readonly ProseDraft[],
  basePath: string,
): string => {
  const byId = new Map(repository.areas.map((area) => [area.id, area]));
  const guideOrder = [
    "investigation-quickstart",
    "investigation-lifecycle",
    "choosing-a-tool",
    "changing-a-tool-safely",
  ];
  const readingGuides = [...guides].sort(
    (left, right) =>
      (guideOrder.indexOf(left.slug) === -1
        ? guideOrder.length
        : guideOrder.indexOf(left.slug)) -
      (guideOrder.indexOf(right.slug) === -1
        ? guideOrder.length
        : guideOrder.indexOf(right.slug)),
  );
  const row = (from: string, relation: string, to: string) => {
    const source = byId.get(from);
    const target = byId.get(to);
    if (source === undefined || target === undefined) return "";
    return `<tr><td><a href="#${escapeHtml(source.id)}">${escapeHtml(source.name)}</a></td><td>${escapeHtml(relation)}</td><td><a href="#${escapeHtml(target.id)}">${escapeHtml(target.name)}</a></td></tr>`;
  };
  const body = `${pageHeader(
    "Attune repository",
    "A typed, reproducible investigation runtime: Effect owns mechanical truth, ActiveGraph owns traceable research, and this site keeps the path between them visible.",
  )}
  <section>
    <h2>Start reading</h2>
    <ol class="reading-path">
      ${readingGuides
        .map(
          (guide) =>
            `<li><a href="${escapeHtml(withBase(basePath, `guides/${guide.slug}.html`))}">${escapeHtml(guide.title)}</a><span>${escapeHtml(guide.summary)}</span></li>`,
        )
        .join("")}
    </ol>
  </section>
  <section>
    <h2>How the pieces connect</h2>
    <p>The arrows below are ownership boundaries. They are the shortest reliable route through the repository when a change crosses packages.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Source</th><th>Relationship</th><th>Consumer</th></tr></thead>
        <tbody>
          ${row("effect-joern", "provides typed analysis to", "attune-mcp")}
          ${row("attune-mcp", "generates", "contracts")}
          ${row("contracts", "projects into", "activegraph")}
          ${row("attune-mcp", "feeds mechanical facts to", "docs")}
          ${row("activegraph", "records trace hooks for", "docs")}
          ${row("nix", "pins executable reality for", "attune-mcp")}
          ${row("openspec", "records intended changes to", "attune-mcp")}
        </tbody>
      </table>
    </div>
  </section>
  <section>
    <h2>Package map</h2>
    <div class="package-map">
      ${repository.areas
        .map(
          (area) => `<article id="${escapeHtml(area.id)}">
            <h3><a href="${escapeHtml(area.sourceUrl)}">${escapeHtml(area.name)}</a></h3>
            <p class="path"><code>${escapeHtml(area.path)}</code></p>
            <p><strong>${escapeHtml(area.role)}</strong></p>
            <p>${escapeHtml(area.details)}</p>
            <p class="connections">Connects to: ${area.connectsTo
              .map((id) => {
                const target = byId.get(id);
                return target === undefined
                  ? escapeHtml(id)
                  : `<a href="#${escapeHtml(target.id)}">${escapeHtml(target.name)}</a>`;
              })
              .join(", ")}</p>
          </article>`,
        )
        .join("")}
    </div>
  </section>
  <section>
    <h2>Mechanical reference</h2>
    <p>The API reference is generated from <code>${escapeHtml(manifest.package.entryPoint)}</code> at <code>${escapeHtml(manifest.source.revision)}</code>. It contains ${manifest.symbols.length} exported symbols and does not use model-written prose.</p>
    <p><a class="text-action" href="${escapeHtml(withBase(basePath, "api/index.html"))}">Browse all exported symbols →</a></p>
  </section>`;
  return layout({
    basePath,
    title: "Repository overview",
    description:
      "Architecture map and onboarding path for the Attune repository.",
    currentPath: "",
    manifest,
    guides,
    body,
  });
};

const evidenceForSection = (
  section: ProseDraft["sections"][number],
  manifest: ApiManifest,
  basePath: string,
): string => {
  const symbols = new Map(
    manifest.symbols.map((symbol) => [symbol.id, symbol]),
  );
  const cited = [
    ...new Set(
      section.claims.flatMap((claim) =>
        claim.evidence.map((reference) => reference.symbolId),
      ),
    ),
  ];
  if (cited.length === 0) return "";
  return `<div class="grounding">
    <h3>Grounded in</h3>
    <ul>${cited
      .map((id) => {
        const symbol = symbols.get(id);
        return symbol === undefined
          ? `<li><code>${escapeHtml(id)}</code></li>`
          : `<li><a href="${symbolHref(basePath, symbol)}">${escapeHtml(symbol.exportName)}</a><span>${escapeHtml(symbol.kind)}</span></li>`;
      })
      .join("")}</ul>
  </div>`;
};

export const renderGuide = (
  draft: ProseDraft,
  manifest: ApiManifest,
  allGuides: readonly ProseDraft[],
  basePath: string,
): string => {
  const guideBySlug = new Map(allGuides.map((guide) => [guide.slug, guide]));
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${escapeHtml(withBase(basePath))}">Repository</a><span>/</span><span>Onboarding</span></nav>
  ${pageHeader(draft.title, draft.summary)}
  <p class="audience"><strong>For:</strong> ${escapeHtml(draft.audience)}</p>
  ${draft.sections
    .map(
      (section) => `<section id="${escapeHtml(section.id)}">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.claims
          .map(
            (claim) => `<div class="claim" id="${escapeHtml(claim.id)}">
              <p>${renderInline(claim.text)}${claim.certainty === "inference" ? ' <span class="certainty">Inference</span>' : ""}</p>
              <a class="trace-link" data-trace-hook="activegraph" data-claim-id="${escapeHtml(claim.id)}" data-run-id="${escapeHtml(draft.provenance.runId ?? "")}" href="${escapeHtml(withBase(basePath, `traces/${draft.slug}.html#${claim.id}`))}">Why this is here</a>
            </div>`,
          )
          .join("")}
        ${evidenceForSection(section, manifest, basePath)}
      </section>`,
    )
    .join("")}
  <section class="next-pages">
    <h2>Continue reading</h2>
    <ul>${draft.nextPages
      .map((slug) => {
        const guide = guideBySlug.get(slug);
        return guide === undefined
          ? ""
          : `<li><a href="${escapeHtml(withBase(basePath, `guides/${guide.slug}.html`))}">${escapeHtml(guide.title)}</a><span>${escapeHtml(guide.summary)}</span></li>`;
      })
      .join("")}</ul>
  </section>
  <footer class="review-record">
    <p>Grounded against <code>${escapeHtml(draft.sourceRevision)}</code> · review <code>${escapeHtml(draft.review.decisionId)}</code></p>
  </footer>`;
  return layout({
    basePath,
    title: draft.title,
    description: draft.summary,
    currentPath: `guides/${draft.slug}.html`,
    manifest,
    guides: allGuides,
    body,
  });
};

export const renderApiIndex = (
  manifest: ApiManifest,
  guides: readonly ProseDraft[],
  basePath: string,
): string => {
  const groups = groupSymbols(manifest.symbols);
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${escapeHtml(withBase(basePath))}">Repository</a><span>/</span><span>API reference</span></nav>
  ${pageHeader(
    "API reference",
    `A deterministic projection of ${manifest.symbols.length} exports from the supported attune-mcp entry point.`,
  )}
  ${
    manifest.diagnostics.length === 0
      ? ""
      : `<div class="diagnostic-summary"><strong>${manifest.diagnostics.length} documentation policy issue${manifest.diagnostics.length === 1 ? "" : "s"}</strong><p>The reference remains readable while the separate audit command reports missing TSDoc or descriptor metadata.</p></div>`
  }
  ${[...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([moduleName, symbols]) => `<section>
        <h2>${escapeHtml(moduleName)}</h2>
        <ul class="symbol-list">
          ${symbols
            .map(
              (symbol) =>
                `<li><a href="${symbolHref(basePath, symbol)}"><code>${escapeHtml(symbol.exportName)}</code></a><span>${escapeHtml(symbol.summary || "Exact signature and source location.")}</span></li>`,
            )
            .join("")}
        </ul>
      </section>`,
    )
    .join("")}`;
  return layout({
    basePath,
    title: "API reference",
    description: "Mechanical TypeScript API reference for attune-mcp.",
    currentPath: "api/index.html",
    manifest,
    guides,
    body,
  });
};

const relationTargetHtml = (
  relation: ApiSymbol["relations"][number],
  manifest: ApiManifest,
  basePath: string,
): string => {
  const target = manifest.symbols.find(
    (symbol) => symbol.id === relation.targetSymbolId,
  );
  return target === undefined
    ? `<code>${escapeHtml(relation.target)}</code>`
    : `<a href="${symbolHref(basePath, target)}"><code>${escapeHtml(target.exportName)}</code></a>`;
};

export const renderApiSymbol = (
  symbol: ApiSymbol,
  manifest: ApiManifest,
  guides: readonly ProseDraft[],
  basePath: string,
): string => {
  const descriptorRelations = symbol.relations.filter(
    (relation) => relation.source === "descriptor",
  );
  const tsdocRelations = symbol.relations.filter(
    (relation) => relation.source === "tsdoc",
  );
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${escapeHtml(withBase(basePath))}">Repository</a><span>/</span><a href="${escapeHtml(withBase(basePath, "api/index.html"))}">API reference</a><span>/</span><span>${escapeHtml(symbol.exportName)}</span></nav>
  ${pageHeader(
    symbol.exportName,
    symbol.summary || "Exported API symbol.",
    symbol.kind,
  )}
  <p class="source-link"><a href="${escapeHtml(symbol.source.url)}">${escapeHtml(symbol.source.path)}:${symbol.source.line}</a></p>
  <section>
    <h2>Declaration</h2>
    <pre class="signature"><code>${escapeHtml(symbol.declaration)}</code></pre>
    ${
      symbol.signature === symbol.declaration
        ? ""
        : `<details class="full-signature">
      <summary>Full inferred type</summary>
      <p>The exact compiler projection is available here when you need every inferred detail.</p>
      <pre><code>${escapeHtml(symbol.signature)}</code></pre>
    </details>`
    }
  </section>
  ${
    symbol.remarks.length === 0
      ? ""
      : `<section><h2>Remarks</h2><div class="prose">${symbol.remarks
          .split(/\n{2,}/u)
          .map((paragraph) => `<p>${renderInline(paragraph)}</p>`)
          .join("")}</div></section>`
  }
  ${
    symbol.typeParameters.length === 0
      ? ""
      : `<section><h2>Type parameters</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Constraint</th><th>Default</th><th>Description</th></tr></thead><tbody>${symbol.typeParameters
          .map(
            (parameter) =>
              `<tr><td><code>${escapeHtml(parameter.name)}</code></td><td>${escapeHtml(parameter.constraint ?? "—")}</td><td>${escapeHtml(parameter.default ?? "—")}</td><td>${escapeHtml(parameter.description ?? "—")}</td></tr>`,
          )
          .join("")}</tbody></table></div></section>`
  }
  ${
    symbol.relations.length === 0
      ? ""
      : `<section><h2>Lifecycle relations</h2>
        ${
          descriptorRelations.length === 0
            ? ""
            : `<p>Descriptor metadata is the machine-authoritative lifecycle record.</p><div class="relation-list">${descriptorRelations
                .map(
                  (relation) =>
                    `<div><code>${escapeHtml(relation.kind)}</code>${relationTargetHtml(relation, manifest, basePath)}<span>descriptor</span></div>`,
                )
                .join("")}</div>`
        }
        ${
          tsdocRelations.length === 0
            ? ""
            : `<h3>Explanatory TSDoc links</h3><div class="relation-list advisory">${tsdocRelations
                .map(
                  (relation) =>
                    `<div><code>${escapeHtml(relation.kind)}</code>${relationTargetHtml(relation, manifest, basePath)}<span>TSDoc</span></div>`,
                )
                .join("")}</div>`
        }
      </section>`
  }
  ${
    symbol.members.length === 0
      ? ""
      : `<section><h2>Members</h2><div class="members">${symbol.members
          .map(
            (member) => `<article id="member-${escapeHtml(member.name)}">
              <h3><code>${escapeHtml(member.name)}</code></h3>
              ${member.summary.length === 0 ? "" : `<p>${renderInline(member.summary)}</p>`}
              <pre><code>${escapeHtml(member.signature)}</code></pre>
            </article>`,
          )
          .join("")}</div></section>`
  }
  ${
    symbol.examples.length === 0
      ? ""
      : `<section><h2>Examples</h2>${symbol.examples.map((example) => `<pre><code>${escapeHtml(example)}</code></pre>`).join("")}</section>`
  }
  <footer class="fact-record"><p>${symbol.facts.length} deterministic facts · source digest <code>${escapeHtml(manifest.source.digest.slice(0, 16))}</code></p></footer>`;
  return layout({
    basePath,
    title: symbol.exportName,
    description: symbol.summary || `${symbol.exportName} API reference.`,
    currentPath: `api/${symbol.slug}.html`,
    manifest,
    guides,
    body,
  });
};

export const renderTracePage = (
  draft: ProseDraft,
  manifest: ApiManifest,
  allGuides: readonly ProseDraft[],
  basePath: string,
  traceArtifact?: TraceArtifact,
): string => {
  const symbols = new Map(
    manifest.symbols.map((symbol) => [symbol.id, symbol]),
  );
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${escapeHtml(withBase(basePath))}">Repository</a><span>/</span><a href="${escapeHtml(withBase(basePath, `guides/${draft.slug}.html`))}">${escapeHtml(draft.title)}</a><span>/</span><span>Evidence trace</span></nav>
  ${pageHeader(
    `${draft.title}: evidence trace`,
    "Static content provenance for every claim on this guide. ActiveGraph may attach execution and approval records to the exposed trace hooks.",
  )}
  <dl class="trace-meta">
    <div><dt>Manifest revision</dt><dd><code>${escapeHtml(draft.sourceRevision)}</code></dd></div>
    <div><dt>Manifest digest</dt><dd><code>${escapeHtml(draft.sourceDigest)}</code></dd></div>
    <div><dt>Documentation run</dt><dd><code>${escapeHtml(draft.provenance.runId ?? "maintainer-authored")}</code></dd></div>
    <div><dt>Review decision</dt><dd><code>${escapeHtml(draft.review.decisionId)}</code></dd></div>
  </dl>
  ${
    traceArtifact === undefined
      ? `<section><h2>ActiveGraph trace</h2><p>No exported runtime trace is attached to this guide revision. The content evidence below is still complete and the page remains fully static.</p></section>`
      : traceArtifact.kind === "representative"
        ? `<section class="representative-trace">
        <h2>Representative ActiveGraph trace</h2>
        <p><strong>Representative example—not this guide’s publication trace.</strong> It demonstrates the static export shape only; the claim evidence below remains the source of truth for this page.</p>
        <p>Example run <code>${escapeHtml(traceArtifact.trace.activegraph_run_id)}</code> · ${traceArtifact.trace.nodes.length} nodes · ${traceArtifact.trace.edges.length} edges</p>
        <div class="table-wrap"><table><thead><tr><th>From</th><th>Edge</th><th>To</th><th>Provenance</th></tr></thead><tbody>${traceArtifact.trace.edges
          .map(
            (edge) =>
              `<tr><td><code>${escapeHtml(edge.source)}</code></td><td>${escapeHtml(edge.type)}</td><td><code>${escapeHtml(edge.target)}</code></td><td>${escapeHtml(edge.provenance_kind)}</td></tr>`,
          )
          .join("")}</tbody></table></div>
        <p><a href="${escapeHtml(withBase(basePath, `traces/examples/${draft.slug}.json`))}">Open the representative TraceExport JSON</a></p>
      </section>`
        : `<section>
        <h2>Publication trace</h2>
        <p>Run <code>${escapeHtml(traceArtifact.trace.activegraph_run_id)}</code> · ${traceArtifact.trace.stale ? "stale" : "current"} · ${traceArtifact.trace.nodes.length} nodes · ${traceArtifact.trace.edges.length} edges</p>
        <div class="table-wrap"><table><thead><tr><th>From</th><th>Edge</th><th>To</th><th>Provenance</th></tr></thead><tbody>${traceArtifact.trace.edges
          .map(
            (edge) =>
              `<tr><td><code>${escapeHtml(edge.source)}</code></td><td>${escapeHtml(edge.type)}</td><td><code>${escapeHtml(edge.target)}</code></td><td>${escapeHtml(edge.provenance_kind)}</td></tr>`,
          )
          .join("")}</tbody></table></div>
        <p><a href="${escapeHtml(withBase(basePath, `traces/data/${draft.slug}.json`))}">Open the bound publication TraceExport JSON</a></p>
      </section>`
  }
  ${draft.sections
    .flatMap((section) => section.claims)
    .map(
      (
        claim,
      ) => `<section class="trace-claim" id="${escapeHtml(claim.id)}" data-activegraph-run-id="${escapeHtml(draft.provenance.runId ?? "")}" data-claim-id="${escapeHtml(claim.id)}">
        <h2>${escapeHtml(claim.id)}</h2>
        <p>${renderInline(claim.text)}</p>
        <div class="table-wrap"><table><thead><tr><th>Symbol</th><th>Facts</th></tr></thead><tbody>${claim.evidence
          .map((evidence) => {
            const symbol = symbols.get(evidence.symbolId);
            return `<tr><td>${symbol === undefined ? `<code>${escapeHtml(evidence.symbolId)}</code>` : `<a href="${symbolHref(basePath, symbol)}"><code>${escapeHtml(symbol.exportName)}</code></a>`}</td><td>${evidence.facts.map((fact) => `<code title="${escapeHtml(fact.digest)}">${escapeHtml(fact.id.split("/").slice(-1)[0] ?? fact.id)}</code>`).join(" ")}</td></tr>`;
          })
          .join("")}</tbody></table></div>
      </section>`,
    )
    .join("")}`;
  return layout({
    basePath,
    title: `${draft.title}: evidence trace`,
    description: `Content provenance for ${draft.title}.`,
    currentPath: `traces/${draft.slug}.html`,
    manifest,
    guides: allGuides,
    body,
  });
};

export const renderNotFound = (
  manifest: ApiManifest,
  guides: readonly ProseDraft[],
  basePath: string,
): string =>
  layout({
    basePath,
    title: "Page not found",
    description: "The requested Attune documentation page does not exist.",
    currentPath: "404.html",
    manifest,
    guides,
    body: `${pageHeader(
      "Page not found",
      "That documentation path does not exist in this revision.",
    )}<p><a class="text-action" href="${escapeHtml(withBase(basePath))}">Return to the repository overview →</a></p>`,
  });
