import MarkdownIt from "markdown-it";

import { renderCodeBlock } from "./highlight.ts";
import { escapeHtml, layout } from "./html.ts";
import type { ApiManifest, ProseDraft } from "./model.ts";
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
  guides: readonly ProseDraft[],
  basePath: string,
): string =>
  layout({
    basePath,
    title: page.title,
    description: `Approved static publication: ${page.title}.`,
    currentPath: `experiments/${page.slug}.html`,
    manifest,
    guides,
    body: `<article class="static-publication">${markdown.render(page.markdown)}</article>`,
  });
