import MarkdownIt from "markdown-it";

import { renderCodeBlock } from "./highlight.ts";
import {
  escapeHtml,
  renderStaticReference,
  renderTypeReference,
  withBase,
} from "./html.ts";
import type { ApiManifest } from "./model.ts";
import type { StaticPage } from "./static-pages.ts";

const renderer = (manifest: ApiManifest, basePath: string): MarkdownIt => {
  const markdown = new MarkdownIt({
    breaks: false,
    html: false,
    linkify: false,
    typographer: false,
  });
  const subject =
    manifest.symbols.find((symbol) => symbol.exportName === "Attune") ??
    manifest.symbols[0];
  if (subject === undefined) {
    throw new Error("Static evidence needs a public type subject.");
  }
  const typeText =
    subject.typeParameters.length === 0
      ? subject.exportName
      : `${subject.exportName}<${subject.typeParameters
          .map((parameter) => parameter.name)
          .join(", ")}>`;
  const destination = withBase(basePath, `api/${subject.slug}.html`);

  markdown.renderer.rules.code_inline = (tokens, index) =>
    `<code class="inline-code">${escapeHtml(tokens[index]!.content)}</code>`;
  markdown.renderer.rules.paragraph_open = () => "<p data-prose>";
  markdown.renderer.rules.heading_open = (tokens, index) => {
    const requested = Number(tokens[index]!.tag.slice(1));
    const level = Math.min(6, Math.max(2, requested + 2));
    return `<h${level} class="type-heading artifact-heading">${renderTypeReference(typeText, destination)}<span> · `;
  };
  markdown.renderer.rules.heading_close = (tokens, index) => {
    const requested = Number(tokens[index]!.tag.slice(1));
    const level = Math.min(6, Math.max(2, requested + 2));
    return `</span></h${level}>`;
  };
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
  return markdown;
};

/** Render an approved experiment artifact inside the uniform type reference. */
export const renderStaticPage = (
  page: StaticPage,
  manifest: ApiManifest,
  basePath: string,
): string =>
  renderStaticReference(
    page,
    `<article class="static-publication">${renderer(manifest, basePath).render(
      page.markdown,
    )}</article>`,
    manifest,
    basePath,
  );
