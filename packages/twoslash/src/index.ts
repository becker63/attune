/**
 * Isolated compatibility boundary for build-time Twoslash hover information.
 *
 * Attune source is validated by the repository's native TypeScript 7
 * compiler. Twoslash still consumes the TypeScript 5 compiler API, so this
 * private workspace package owns that compiler and its complete peer graph.
 */
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createTransformerFactory,
  defaultHoverInfoProcessor,
  rendererRich,
  type TwoslashRenderer,
  type TwoslashShikiFunction,
  type TwoslashShikiReturn,
} from "@shikijs/twoslash";
import { createTwoslasher } from "twoslash/core";
import * as TypeScript from "typescript";

const packageDirectory = Path.resolve(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryDirectory = Path.resolve(packageDirectory, "..", "..");
const twoslashTypeScriptDirectory = Path.dirname(
  fileURLToPath(import.meta.resolve("typescript/package.json")),
);

export const twoslashRichStylePath = fileURLToPath(
  import.meta.resolve("@shikijs/twoslash/style-rich.css"),
);

const twoslasher = createTwoslasher({
  compilerOptions: {
    module: TypeScript.ModuleKind.ESNext,
    moduleResolution: TypeScript.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    strict: true,
    target: TypeScript.ScriptTarget.ES2022,
  },
  tsLibDirectory: Path.join(twoslashTypeScriptDirectory, "lib"),
  tsModule: TypeScript,
  vfsRoot: repositoryDirectory,
});

type TwoslashTransformer = ReturnType<
  ReturnType<typeof createTransformerFactory>
>;

/** Static destinations attached to one compiler-resolved identifier. */
export interface TwoslashIdentifierLink {
  /** Identifier text reported by the TypeScript language service. */
  readonly target: string;
  /** API page or member anchor for the identifier. */
  readonly apiHref: string;
  /** Immutable source span, when the declaration has one. */
  readonly sourceHref?: string;
  /** Link text used in the hover box. */
  readonly apiLabel?: string;
}

/** Per-example input for a strict, isolated Twoslash render. */
export interface TwoslashSessionOptions {
  /** Stable prefix for hover tooltip IDs. */
  readonly idPrefix: string;
  /**
   * Bare package specifiers mapped to declaration files beneath the
   * repository root.
   *
   * The declarations stay on disk and TypeScript resolves their transitive
   * imports from their real package location. They are not copied into every
   * example's virtual file set.
   */
  readonly declarationPackages?: Readonly<Record<string, string>>;
  /** Identifier destinations valid for this example only. */
  readonly identifiers?: readonly TwoslashIdentifierLink[];
  /** Identifiers that must resolve with TSDoc and an API destination. */
  readonly requiredTargets?: readonly string[];
  /** Additional virtual files supplied to upstream Twoslash. */
  readonly extraFiles?: Readonly<
    Record<
      string,
      | string
      | {
          readonly append?: string;
          readonly prepend?: string;
        }
    >
  >;
}

/** One render's transformer, visible program, and post-render assertions. */
export interface TwoslashSession {
  readonly transformer: TwoslashTransformer;
  assertValid: () => void;
  visibleCode: () => string;
}

interface MutableElement {
  readonly type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
}

const elementClasses = (candidate: unknown): readonly string[] => {
  if (typeof candidate !== "object" || candidate === null) return [];
  const properties = (candidate as MutableElement).properties;
  const value = properties?.className ?? properties?.class;
  return typeof value === "string"
    ? value.split(/\s+/u)
    : Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : [];
};

const stableIdPart = (value: string): string =>
  value
    .normalize("NFKD")
    .replaceAll(/[^\w-]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .toLowerCase() || "identifier";

const assertLink = (link: TwoslashIdentifierLink): void => {
  if (link.target.trim().length === 0) {
    throw new Error("Twoslash identifier metadata has an empty target.");
  }
  if (link.apiHref.trim().length === 0) {
    throw new Error(
      `Twoslash identifier "${link.target}" has no API destination.`,
    );
  }
};

const hoverDocumentation = (docs: string): string => {
  const lines: string[] = [];
  for (const line of docs.replaceAll("\r\n", "\n").split("\n")) {
    if (/^\s*@example\b/u.test(line)) break;
    if (
      /^\s*@(param|returns|throws|typeParam|requires|produces|transitionsTo)\b/u.test(
        line,
      )
    ) {
      continue;
    }
    lines.push(line.replace(/^\s*@remarks\s*/u, ""));
  }
  return lines
    .join("\n")
    .replace(
      /\{@link\s+([^|\s}]+)(?:\s*\|\s*([^}]+))?\}/gu,
      (_match, target: string, label: string | undefined) =>
        label?.trim() || target,
    )
    .replace(/`([^`\n]+)`/gu, "$1")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
};

const hoverPresentation = <
  Info extends {
    readonly docs?: string;
    readonly tags?: [name: string, text: string | undefined][];
  },
>(
  info: Info,
): Info => {
  const remarks =
    info.tags
      ?.filter(([name]) => name === "remarks")
      .map(([, value]) => value ?? "") ?? [];
  const docs = hoverDocumentation([info.docs ?? "", ...remarks].join("\n\n"));
  const tags = info.tags
    ?.filter(
      ([name]) =>
        name !== "remarks" &&
        name !== "example" &&
        name !== "filename" &&
        name !== "packageDocumentation",
    )
    .map(
      ([name, value]) =>
        [name, value === undefined ? undefined : hoverDocumentation(value)] as [
          string,
          string | undefined,
        ],
    );
  return {
    ...info,
    docs: docs === "" ? undefined : docs,
    tags,
  };
};

const declarationPackagePaths = (
  packages: Readonly<Record<string, string>> | undefined,
): TypeScript.MapLike<string[]> | undefined => {
  if (packages === undefined) return undefined;

  const paths: TypeScript.MapLike<string[]> = {};
  for (const [specifier, declarationPath] of Object.entries(packages).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (specifier.trim() !== specifier || specifier.length === 0) {
      throw new Error(
        "Twoslash declaration package has an empty or padded specifier.",
      );
    }
    if (
      Path.isAbsolute(declarationPath) ||
      declarationPath.split(/[\\/]/u).includes("..") ||
      !/\.d\.(?:c|m)?ts$/u.test(declarationPath)
    ) {
      throw new Error(
        `Twoslash declaration package "${specifier}" must map to a repository-relative declaration file.`,
      );
    }
    paths[specifier] = [declarationPath.replaceAll("\\", "/")];
  }
  return paths;
};

/**
 * Create a strict Twoslash transformer for one source example.
 *
 * Compilation, multi-file parsing, diagnostics, and cut-range remapping remain
 * owned by upstream `twoslash`. This wrapper adds only Attune's static links
 * and validates the required documented hovers after Shiki has rendered them.
 */
export const createTwoslashSession = (
  options: TwoslashSessionOptions,
): TwoslashSession => {
  const declarationPaths = declarationPackagePaths(options.declarationPackages);
  const links = new Map<string, TwoslashIdentifierLink>();
  for (const link of options.identifiers ?? []) {
    assertLink(link);
    if (links.has(link.target)) {
      throw new Error(
        `Twoslash identifier "${link.target}" has duplicate metadata.`,
      );
    }
    links.set(link.target, link);
  }

  const required = new Set(options.requiredTargets ?? []);
  for (const target of required) {
    if (!links.has(target)) {
      throw new Error(
        `Required Twoslash identifier "${target}" has no API destination metadata.`,
      );
    }
  }

  const seen = new Set<string>();
  const documented = new Set<string>();
  const occurrences = new Map<string, number>();
  let output: TwoslashShikiReturn | undefined;
  const run: TwoslashShikiFunction = (code, lang, executeOptions) => {
    output = twoslasher(code, lang, executeOptions);
    return output;
  };

  const rich = rendererRich({
    errorRendering: "hover",
    jsdoc: true,
    // Upstream intentionally suppresses import-alias quick info. Public API
    // examples need that alias to remain a real linked type box.
    processHoverInfo: (info) =>
      defaultHoverInfoProcessor(info) || info.split("\n", 1)[0] || info,
    processHoverDocs: hoverDocumentation,
  });
  const linkedRenderer: TwoslashRenderer = {
    ...rich,
    nodeStaticInfo(info, node) {
      const rendered = rich.nodeStaticInfo.call(
        this,
        hoverPresentation(info),
        node,
      );
      const link = links.get(info.target);
      if (link === undefined) return rendered;

      const element = rendered as MutableElement;
      if (element.type !== "element" || element.children === undefined) {
        return rendered;
      }
      const popup = element.children.find((child) =>
        elementClasses(child).includes("twoslash-popup-container"),
      ) as MutableElement | undefined;
      const tokenIndex = element.children.findIndex((child) => child !== popup);
      const token = element.children[tokenIndex];
      if (
        popup === undefined ||
        popup.children === undefined ||
        tokenIndex < 0 ||
        token === undefined
      ) {
        return rendered;
      }

      seen.add(info.target);
      if (info.docs?.trim()) documented.add(info.target);
      const occurrence = (occurrences.get(info.target) ?? 0) + 1;
      occurrences.set(info.target, occurrence);
      const popupId = `${stableIdPart(options.idPrefix)}-${stableIdPart(info.target)}-${occurrence}`;

      popup.properties = {
        ...popup.properties,
        id: popupId,
        role: "tooltip",
      };
      popup.children.push({
        type: "element",
        tagName: "span",
        properties: { class: "twoslash-popup-links" },
        children: [
          {
            type: "element",
            tagName: "a",
            properties: {
              class: "twoslash-api-link",
              href: link.apiHref,
            },
            children: [
              {
                type: "text",
                value: link.apiLabel ?? "API reference",
              },
            ],
          },
          ...(link.sourceHref === undefined
            ? []
            : [
                {
                  type: "element",
                  tagName: "a",
                  properties: {
                    class: "twoslash-source-link",
                    href: link.sourceHref,
                  },
                  children: [{ type: "text", value: "Source" }],
                },
              ]),
        ],
      });

      element.properties = {
        ...element.properties,
        class: [
          ...elementClasses(element),
          "twoslash-trigger",
          "twoslash-linked",
        ].join(" "),
        dataApiHref: link.apiHref,
        dataSourceHref: link.sourceHref,
        dataTwoslashTarget: info.target,
      };
      element.children[tokenIndex] = {
        type: "element",
        tagName: "a",
        properties: {
          ariaDescribedBy: popupId,
          class: "twoslash-identifier-link",
          href: link.apiHref,
        },
        children: [token],
      };
      return rendered;
    },
  };

  const transformer = createTransformerFactory(
    run,
    linkedRenderer,
  )({
    langs: ["ts", "typescript"],
    throws: true,
    twoslashOptions: {
      ...(declarationPaths === undefined
        ? {}
        : { compilerOptions: { paths: declarationPaths } }),
      ...(options.extraFiles === undefined
        ? {}
        : { extraFiles: options.extraFiles }),
      handbookOptions: {
        noErrorsCutted: false,
        noErrorValidation: false,
      },
      ...(links.size === 0
        ? {}
        : {
            shouldGetHoverInfo: (identifier: string) => links.has(identifier),
          }),
    },
  });

  return {
    transformer,
    assertValid: () => {
      if (output === undefined) {
        throw new Error(
          `Twoslash example "${options.idPrefix}" was not type-checked.`,
        );
      }
      for (const target of required) {
        if (!seen.has(target)) {
          throw new Error(
            `Required Twoslash identifier "${target}" has no visible compiler hover.`,
          );
        }
        if (!documented.has(target)) {
          throw new Error(
            `Required Twoslash identifier "${target}" has no source TSDoc.`,
          );
        }
      }
    },
    visibleCode: () => {
      if (output === undefined) {
        throw new Error(
          `Twoslash example "${options.idPrefix}" was not type-checked.`,
        );
      }
      return output.code;
    },
  };
};

/**
 * Upstream rich Twoslash rendering with errors isolated to the code block.
 *
 * A declaration that is not self-contained still receives Shiki highlighting;
 * Twoslash simply declines to add language-service annotations to that block.
 */
export const twoslashTransformer: TwoslashTransformer =
  createTransformerFactory(
    twoslasher,
    (() => {
      const rich = rendererRich({
        errorRendering: "hover",
        jsdoc: true,
        processHoverDocs: hoverDocumentation,
      });
      return {
        ...rich,
        nodeStaticInfo(info, node) {
          return rich.nodeStaticInfo.call(this, hoverPresentation(info), node);
        },
      } satisfies TwoslashRenderer;
    })(),
  )({
    langs: ["ts", "typescript"],
    throws: false,
  });

export const twoslashTypeScriptVersion = TypeScript.version;
