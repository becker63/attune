import { renderCodeBlock } from "./highlight.ts";
import type {
  ApiManifest,
  ApiMember,
  ApiSymbol,
  DocumentationText,
  LifecycleRelation,
  PageExample,
  SourceSpan,
} from "./model.ts";
import type { StaticPage } from "./static-pages.ts";

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
  const segments = trimmed.replace(/^\/+|\/+$/gu, "").split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        !/^[a-zA-Z0-9._~-]+$/u.test(segment),
    )
  ) {
    throw new Error(`Unsafe documentation base path: ${JSON.stringify(value)}`);
  }
  return `/${segments.join("/")}/`;
};

export const withBase = (basePath: string, path = ""): string =>
  `${normalizeBasePath(basePath)}${path.replace(/^\/+/u, "")}`;

const href = (basePath: string, symbol: ApiSymbol): string =>
  escapeHtml(withBase(basePath, `api/${symbol.slug}.html`));

const memberHref = (
  basePath: string,
  symbol: ApiSymbol,
  member: ApiMember,
): string =>
  escapeHtml(withBase(basePath, `api/${symbol.slug}/${member.slug}.html`));

const inline = (
  value: string,
  manifest: ApiManifest,
  basePath: string,
): string =>
  value
    .split(/(\{@link\s+[^}]+\}|`[^`]+`)/gu)
    .map((part) => {
      const linked = /^\{@link\s+([^|\s}]+)(?:\s*\|[^}]*)?\}$/u.exec(part);
      const code =
        linked?.[1] ??
        (part.startsWith("`") && part.endsWith("`")
          ? part.slice(1, -1)
          : undefined);
      if (code === undefined) return escapeHtml(part);
      const [symbolName, memberName] = code.split(/[.#]/u);
      const symbol = manifest.symbols.find(
        (candidate) =>
          candidate.exportName === symbolName || candidate.id === code,
      );
      if (symbol === undefined) {
        return `<code class="inline-code">${escapeHtml(code)}</code>`;
      }
      const member = symbol.members.find(
        (candidate) => candidate.name === memberName,
      );
      const destination =
        member === undefined
          ? href(basePath, symbol)
          : memberHref(basePath, symbol, member);
      return `<a class="inline-type" href="${destination}"><code>${escapeHtml(code)}</code></a>`;
    })
    .join("");

const prose = (text: string, manifest: ApiManifest, basePath: string): string =>
  text
    .split(/\n{2,}/u)
    .filter(Boolean)
    .map((paragraph) => `<p>${inline(paragraph, manifest, basePath)}</p>`)
    .join("");

interface LayoutOptions {
  readonly basePath: string;
  readonly title: string;
  readonly description: string;
  readonly currentPath: string;
  readonly pageId: string;
  readonly manifest: ApiManifest;
  readonly staticPages: readonly StaticPage[];
  readonly body: string;
}

export const layout = (options: LayoutOptions): string => {
  const revision = options.manifest.source.revision.replace(
    /^(?:git|sha256):/u,
    "",
  );
  return `<!doctype html>
<html lang="en" data-base-path="${escapeHtml(normalizeBasePath(options.basePath))}" data-page-id="${escapeHtml(options.pageId)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(options.description)}">
    <title>${escapeHtml(options.title)} · Attune reference</title>
    <link rel="stylesheet" href="${escapeHtml(withBase(options.basePath, "assets/styles.css"))}">
    <link rel="stylesheet" href="${escapeHtml(withBase(options.basePath, "assets/twoslash.css"))}">
    <script type="module" src="${escapeHtml(withBase(options.basePath, "assets/site.js"))}"></script>
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="mobile-header">
      <button type="button" class="menu-button" aria-controls="docs-sidebar" aria-expanded="false">Menu</button>
      <a href="${escapeHtml(withBase(options.basePath))}">Attune reference</a>
    </header>
    <aside class="sidebar" id="docs-sidebar">
      <div class="site-name">
        <a href="${escapeHtml(withBase(options.basePath))}">attune-mcp</a>
        <span>API reference</span>
      </div>
      <div class="search">
        <label for="doc-search">Search reference</label>
        <input id="doc-search" type="search" autocomplete="off" placeholder="Search symbols and members">
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <nav aria-label="API reference">
        <div class="nav-section">
          <h2>Package</h2>
          <a href="${escapeHtml(withBase(options.basePath))}"${options.currentPath === "" ? ' aria-current="page"' : ""}>${escapeHtml(options.manifest.package.name)}</a>
        </div>
        <div class="nav-section api-navigation">
          <h2>Public API</h2>
          ${options.manifest.symbols
            .map((symbol) => {
              const path = `api/${symbol.slug}.html`;
              return `<a href="${href(options.basePath, symbol)}"${path === options.currentPath ? ' aria-current="page"' : ""}>${escapeHtml(symbol.exportName)}</a>${symbol.members.length === 0 ? "" : `<div class="nav-symbols">${symbol.members.map((member) => `<a href="${memberHref(options.basePath, symbol, member)}"${`api/${symbol.slug}/${member.slug}.html` === options.currentPath ? ' aria-current="page"' : ""}>${escapeHtml(member.name)}</a>`).join("")}</div>`}`;
            })
            .join("")}
        </div>
        ${
          options.staticPages.length === 0
            ? ""
            : `<div class="nav-section"><h2>Evidence</h2>${options.staticPages.map((page) => `<a href="${escapeHtml(withBase(options.basePath, `experiments/${page.slug}.html`))}">${escapeHtml(page.title)}</a>`).join("")}</div>`
        }
      </nav>
      <div class="revision">
        <span>Source revision</span>
        <code title="${escapeHtml(options.manifest.source.revision)}">${escapeHtml(revision.length > 16 ? `${revision.slice(0, 12)}…` : revision)}</code>
      </div>
    </aside>
    <main id="content" class="content">
      ${options.body}
    </main>
  </body>
</html>
`;
};

const header = (
  title: string,
  summary: string,
  kind?: string,
  manifest?: ApiManifest,
  basePath?: string,
): string =>
  `<header class="page-header">${kind === undefined ? "" : `<p class="page-meta">${escapeHtml(kind)}</p>`}<h1>${escapeHtml(title)}</h1><p>${manifest === undefined || basePath === undefined ? escapeHtml(summary) : inline(summary, manifest, basePath)}</p></header>`;

const spanLink = (label: string, span: SourceSpan): string =>
  `<a href="${escapeHtml(span.url)}">${escapeHtml(label)} <code>${escapeHtml(span.path)}:${span.line}${span.endLine === span.line ? "" : `-${span.endLine}`}</code></a>`;

const provenance = (value: {
  readonly tsdoc?: SourceSpan;
  readonly declaration: SourceSpan;
  readonly implementation: SourceSpan;
}): string =>
  `<section class="provenance"><h2>Source</h2><ul>${value.tsdoc === undefined ? "" : `<li>${spanLink("TSDoc", value.tsdoc)}</li>`}<li>${spanLink("Declaration", value.declaration)}</li><li>${spanLink("Implementation", value.implementation)}</li></ul></section>`;

export const renderCheckedExample = (
  pageId: string,
  example: PageExample,
  manifest: ApiManifest,
  apiHref: string,
): string =>
  `<section class="page-example" data-page-example="${escapeHtml(pageId)}" data-page-principal="${escapeHtml(example.principal)}"><h2>Checked example</h2>${renderCodeBlock(
    example.code,
    {
      label: `${example.principal} · TypeScript`,
      twoslash: {
        idPrefix: pageId,
        identifiers: [
          {
            target: example.principal,
            apiHref,
            sourceHref: example.source.url,
          },
        ],
        requiredTargets: [example.principal],
      },
    },
  )}<p class="source-link">${spanLink("Example source", example.source)}</p></section>`;

const documentation = (
  docs: DocumentationText,
  manifest: ApiManifest,
  basePath: string,
): string =>
  `${docs.remarks === "" ? "" : `<section><h2>Remarks</h2>${prose(docs.remarks, manifest, basePath)}</section>`}${
    docs.parameters.length === 0
      ? ""
      : `<section><h2>Parameters</h2><dl>${docs.parameters.map((parameter) => `<div><dt><code>${escapeHtml(parameter.name)}</code></dt><dd>${inline(parameter.description, manifest, basePath)}</dd></div>`).join("")}</dl></section>`
  }${docs.returns === "" ? "" : `<section><h2>Returns</h2>${prose(docs.returns, manifest, basePath)}</section>`}${
    docs.failures.length === 0
      ? ""
      : `<section><h2>Failures</h2><ul>${docs.failures.map((failure) => `<li>${inline(failure, manifest, basePath)}</li>`).join("")}</ul></section>`
  }`;

const relations = (
  entries: readonly LifecycleRelation[],
  manifest: ApiManifest,
  basePath: string,
): string =>
  entries.length === 0
    ? ""
    : `<section><h2>Related API</h2><ul>${entries
        .map((relation) => {
          const target = manifest.symbols.find(
            (symbol) => symbol.id === relation.targetSymbolId,
          );
          return `<li><code>${escapeHtml(relation.kind)}</code> ${target === undefined ? `<code>${escapeHtml(relation.target)}</code>` : `<a href="${href(basePath, target)}"><code>${escapeHtml(target.exportName)}</code></a>`}</li>`;
        })
        .join("")}</ul></section>`;

export const renderPackageReference = (
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const body = `${header(
    manifest.package.name,
    manifest.package.documentation.summary,
    "package",
    manifest,
    basePath,
  )}
  ${prose(manifest.package.documentation.remarks, manifest, basePath)}
  ${renderCheckedExample(
    `package:${manifest.package.name}`,
    manifest.package.pageExample,
    manifest,
    withBase(
      basePath,
      `api/${
        manifest.symbols.find(
          (symbol) =>
            symbol.exportName === manifest.package.pageExample.principal,
        )?.slug ?? manifest.symbols[0]?.slug
      }.html`,
    ),
  )}
  <section><h2>Public API</h2><ol class="symbol-list">${manifest.symbols
    .map(
      (symbol) =>
        `<li><a href="${href(basePath, symbol)}"><code>${escapeHtml(symbol.exportName)}</code></a><span>${inline(symbol.documentation.summary, manifest, basePath)}</span></li>`,
    )
    .join("")}</ol></section>
  ${relations(manifest.package.relations, manifest, basePath)}
  ${provenance(manifest.package.provenance)}`;
  return layout({
    basePath,
    title: manifest.package.name,
    description: manifest.package.documentation.summary,
    currentPath: "",
    pageId: `package:${manifest.package.name}`,
    manifest,
    staticPages,
    body,
  });
};

export const renderApiSymbol = (
  symbol: ApiSymbol,
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${escapeHtml(withBase(basePath))}">${escapeHtml(manifest.package.name)}</a><span>/</span><span>${escapeHtml(symbol.exportName)}</span></nav>
  ${header(
    symbol.exportName,
    symbol.documentation.summary,
    symbol.kind,
    manifest,
    basePath,
  )}
  ${renderCheckedExample(
    symbol.id,
    symbol.pageExample,
    manifest,
    withBase(basePath, `api/${symbol.slug}.html`),
  )}
  <section><h2>Declaration</h2>${renderCodeBlock(symbol.declaration, {
    label: "Declaration",
    sourceCheckedBy: `TypeScript ${manifest.generator.typescriptVersion} checked`,
  })}</section>
  ${documentation(symbol.documentation, manifest, basePath)}
  ${
    symbol.members.length === 0
      ? ""
      : `<section><h2>Members</h2><ol class="symbol-list">${symbol.members.map((member) => `<li><a href="${memberHref(basePath, symbol, member)}"><code>${escapeHtml(member.name)}</code></a><span>${escapeHtml(member.documentation.summary)}</span></li>`).join("")}</ol></section>`
  }
  ${relations(symbol.relations, manifest, basePath)}
  ${provenance(symbol.provenance)}`;
  return layout({
    basePath,
    title: symbol.exportName,
    description: symbol.documentation.summary,
    currentPath: `api/${symbol.slug}.html`,
    pageId: symbol.id,
    manifest,
    staticPages,
    body,
  });
};

export const renderApiMember = (
  member: ApiMember,
  symbol: ApiSymbol,
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const title = `${symbol.exportName}.${member.name}`;
  const body = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${escapeHtml(withBase(basePath))}">${escapeHtml(manifest.package.name)}</a><span>/</span><a href="${href(basePath, symbol)}">${escapeHtml(symbol.exportName)}</a><span>/</span><span>${escapeHtml(member.name)}</span></nav>
  ${header(title, member.documentation.summary, "member", manifest, basePath)}
  ${renderCheckedExample(
    member.id,
    member.pageExample,
    manifest,
    withBase(basePath, `api/${symbol.slug}/${member.slug}.html`),
  )}
  <section><h2>Signature</h2>${renderCodeBlock(member.signature, {
    label: "Member signature",
    sourceCheckedBy: `TypeScript ${manifest.generator.typescriptVersion} checked`,
  })}</section>
  ${documentation(member.documentation, manifest, basePath)}
  ${relations(member.relations, manifest, basePath)}
  ${provenance(member.provenance)}`;
  return layout({
    basePath,
    title,
    description: member.documentation.summary,
    currentPath: `api/${symbol.slug}/${member.slug}.html`,
    pageId: member.id,
    manifest,
    staticPages,
    body,
  });
};

export const renderNotFound = (
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const example = manifest.package.pageExample;
  const principal = manifest.symbols.find(
    (symbol) => symbol.exportName === example.principal,
  );
  if (principal === undefined) {
    throw new Error(
      `Package example principal "${example.principal}" has no API page.`,
    );
  }
  return layout({
    basePath,
    title: "Page not found",
    description: "The requested reference page does not exist.",
    currentPath: "404.html",
    pageId: "not-found",
    manifest,
    staticPages,
    body: `${header("Page not found", "That reference path does not exist.")}<p><a href="${escapeHtml(withBase(basePath))}">Return to ${escapeHtml(manifest.package.name)}</a></p>${renderCheckedExample(
      "not-found",
      example,
      manifest,
      withBase(basePath, `api/${principal.slug}.html`),
    )}`,
  });
};
