import { createHighlighter, type BundledLanguage } from "shiki";
import type { ShikiTransformer } from "shiki/core";

import { twoslashTransformer } from "./twoslash.ts";

const highlighter = await createHighlighter({
  langs: ["typescript", "json", "bash", "markdown"],
  themes: ["github-light-default"],
});

const escapeAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const languages = {
  bash: "bash",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  typescript: "typescript",
} as const satisfies Readonly<Record<string, BundledLanguage>>;

const languageName = (language: BundledLanguage): string => {
  switch (language) {
    case "typescript":
      return "TypeScript";
    case "json":
      return "JSON";
    case "bash":
      return "Shell";
    case "markdown":
      return "Markdown";
    default:
      return language;
  }
};

const accessibleTwoslash: ShikiTransformer = {
  name: "attune-accessible-twoslash",
  enforce: "post",
  code(code) {
    const visit = (candidate: unknown): void => {
      if (typeof candidate !== "object" || candidate === null) return;
      const node = candidate as {
        readonly type?: string;
        readonly tagName?: string;
        readonly properties?: Record<string, unknown>;
        readonly children?: unknown[];
      };
      if (node.type !== "element" || node.children === undefined) {
        return;
      }
      const classValue = node.properties?.className ?? node.properties?.class;
      const classes =
        typeof classValue === "string"
          ? classValue.split(/\s+/u)
          : Array.isArray(classValue)
            ? classValue
            : [];
      if (node.tagName === "span" && classes.includes("twoslash-hover")) {
        if (node.properties !== undefined) {
          node.properties.class = [...classes, "twoslash-trigger"].join(" ");
          delete node.properties.className;
          node.properties.tabIndex = 0;
          node.properties.role = "button";
          node.properties.ariaLabel = "Show inferred type";
        }
        const popup = node.children.findIndex((child) => {
          if (typeof child !== "object" || child === null) return false;
          const properties = (
            child as { readonly properties?: Record<string, unknown> }
          ).properties;
          const popupClasses = properties?.className ?? properties?.class;
          return (
            typeof popupClasses === "string"
              ? popupClasses.split(/\s+/u)
              : Array.isArray(popupClasses)
                ? popupClasses
                : []
          ).includes("twoslash-popup-container");
        });
        if (popup >= 0) {
          const [popupNode] = node.children.splice(popup, 1);
          if (popupNode !== undefined) node.children.push(popupNode);
        }
      }
      for (const child of node.children) visit(child);
    };
    visit(code);
  },
};

export interface CodeBlockOptions {
  readonly language?: keyof typeof languages;
  readonly label?: string;
  readonly sourceCheckedBy?: string;
}

/** Render a static Shiki block, adding Twoslash hovers for valid TypeScript. */
export const renderCodeBlock = (
  source: string,
  options: CodeBlockOptions = {},
): string => {
  const language = languages[options.language ?? "typescript"];
  const highlighted = highlighter.codeToHtml(source, {
    lang: language,
    theme: "github-light-default",
    transformers:
      language === "typescript"
        ? [
            twoslashTransformer,
            accessibleTwoslash,
            {
              name: "attune-code-block",
              pre(node) {
                this.addClassToHast(node, "attune-code");
              },
            },
          ]
        : [
            {
              name: "attune-code-block",
              pre(node) {
                this.addClassToHast(node, "attune-code");
              },
            },
          ],
  });
  const hasHoverTypes = highlighted.includes("twoslash-hover");
  const status = [
    ...(options.sourceCheckedBy === undefined
      ? []
      : [
          `<span class="code-status source-checked" title="${escapeAttribute(options.sourceCheckedBy)}">${escapeAttribute(options.sourceCheckedBy)}</span>`,
        ]),
    ...(hasHoverTypes
      ? ['<span class="code-status hover-types">Hover types</span>']
      : []),
  ].join("");
  return `<div class="code-block" data-language="${escapeAttribute(language)}">
    <div class="code-toolbar">
      <span class="code-language">${escapeAttribute(options.label ?? languageName(language))}</span>
      <span class="code-meta">${status}</span>
      <button type="button" class="copy-code" data-copy-code data-code="${escapeAttribute(source)}">Copy</button>
    </div>
    ${highlighted}
  </div>`;
};
