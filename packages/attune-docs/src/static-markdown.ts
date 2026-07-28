import MarkdownIt from "markdown-it";

import { renderCodeBlock } from "./highlight.ts";
import { escapeHtml, layout, renderCheckedExample, withBase } from "./html.ts";
import type { ApiManifest } from "./model.ts";
import type { StaticPage } from "./static-pages.ts";

const markdown = new MarkdownIt({
  breaks: false,
  html: false,
  linkify: false,
  typographer: false,
});

markdown.renderer.rules.code_inline = (tokens, index) =>
  `<code class="inline-code">${escapeHtml(tokens[index]!.content)}</code>`;

markdown.renderer.rules.fence = (tokens, index) => {
  const token = tokens[index]!;
  const requested = token.info.trim().split(/\s+/u)[0]?.toLowerCase() ?? "";
  const language =
    requested === "ts" || requested === "typescript"
      ? "typescript"
      : requested === "json"
        ? "json"
        : requested === "bash" || requested === "sh" || requested === "shell"
          ? "bash"
          : requested === "md" || requested === "markdown"
            ? "markdown"
            : undefined;
  return language === undefined
    ? `<pre><code>${escapeHtml(token.content)}</code></pre>`
    : renderCodeBlock(token.content.replace(/\n$/u, ""), { language });
};

/** Render an approved experiment Markdown artifact through the normal layout. */
export const renderStaticPage = (
  page: StaticPage,
  manifest: ApiManifest,
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
    title: page.title,
    description: `Approved static publication: ${page.title}.`,
    currentPath: `experiments/${page.slug}.html`,
    pageId: `experiment:${page.slug}`,
    manifest,
    staticPages: [page],
    body: `<article class="static-publication">${markdown.render(page.markdown)}</article>${renderCheckedExample(
      `experiment:${page.slug}`,
      example,
      manifest,
      withBase(basePath, `api/${principal.slug}.html`),
    )}`,
  });
};
