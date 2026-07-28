import { createHighlighter, type BundledLanguage } from "shiki";
import type { ShikiTransformer } from "shiki/core";

import {
  createTwoslashSession,
  twoslashTransformer,
  twoslashTypeScriptVersion,
  type TwoslashSessionOptions,
} from "./twoslash.ts";

const highlighter = await createHighlighter({
  langs: ["typescript", "javascript", "json", "bash", "markdown"],
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
  javascript: "javascript",
  js: "javascript",
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
    case "javascript":
      return "JavaScript";
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
          node.properties.class = [
            ...new Set([...classes, "twoslash-trigger"]),
          ].join(" ");
          delete node.properties.className;
          if (!classes.includes("twoslash-linked")) {
            node.properties.tabIndex = 0;
            node.properties.role = "button";
            node.properties.ariaLabel = "Show inferred type";
          }
        }
        const identifierLink = node.children.find((child) => {
          if (typeof child !== "object" || child === null) return false;
          return (
            (
              child as {
                readonly tagName?: string;
              }
            ).tagName === "a"
          );
        }) as
          | {
              properties?: Record<string, unknown>;
            }
          | undefined;
        if (
          classes.includes("twoslash-linked") &&
          identifierLink?.properties !== undefined
        ) {
          const target = node.properties?.dataTwoslashTarget;
          identifierLink.properties.ariaLabel =
            typeof target === "string"
              ? `Open API reference for ${target}`
              : "Open API reference";
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
  readonly labelPrefix?: string;
  readonly sourceCheckedBy?: string;
  /**
   * Opt into a strict, isolated Twoslash render.
   *
   * Ordinary snippets remain best-effort; source `@example` programs pass
   * this metadata and fail the build on diagnostics or missing linked docs.
   */
  readonly twoslash?: TwoslashSessionOptions;
}

/** Render a static Shiki block, adding Twoslash hovers for valid TypeScript. */
export const renderCodeBlock = (
  source: string,
  options: CodeBlockOptions = {},
): string => {
  const language = languages[options.language ?? "typescript"];
  const session =
    language === "typescript" && options.twoslash !== undefined
      ? createTwoslashSession(options.twoslash)
      : undefined;
  const highlighted = highlighter.codeToHtml(source, {
    lang: language,
    theme: "github-light-default",
    transformers:
      language === "typescript"
        ? [
            session?.transformer ?? twoslashTransformer,
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
  session?.assertValid();
  const visibleLanguage = session?.visibleLanguage() ?? language;
  const visibleSource = session?.visibleCode() ?? source;
  const hasHoverTypes = highlighted.includes("twoslash-hover");
  const checkedBy =
    session === undefined
      ? options.sourceCheckedBy
      : `Twoslash TypeScript ${twoslashTypeScriptVersion} checked`;
  const status = [
    ...(checkedBy === undefined
      ? []
      : [
          `<span class="code-status source-checked" title="${escapeAttribute(checkedBy)}">${escapeAttribute(checkedBy)}</span>`,
        ]),
    ...(hasHoverTypes
      ? ['<span class="code-status hover-types">Hover types</span>']
      : []),
  ].join("");
  const label =
    options.label ??
    (options.labelPrefix === undefined
      ? languageName(visibleLanguage)
      : `${options.labelPrefix} · ${languageName(visibleLanguage)}`);
  return `<div class="code-block${session === undefined ? "" : " checked-code"}" data-language="${escapeAttribute(visibleLanguage)}">
    <div class="code-toolbar">
      <span class="code-language">${escapeAttribute(label)}</span>
      <span class="code-meta">${status}</span>
      <button type="button" class="copy-code" data-copy-code data-code="${escapeAttribute(visibleSource)}">Copy</button>
    </div>
    ${highlighted}
  </div>`;
};
