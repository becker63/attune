import { normalizeBasePath } from "./html.ts";
import type { ApiManifest, ProseDraft } from "./model.ts";

/**
 * Render a structured prose field as one literal Markdown line.
 *
 * Model and maintainer text is data, not Markdown authority. Collapsing line
 * breaks prevents a field from opening a new block; escaping every ASCII
 * punctuation character prevents links, images, HTML, headings, and emphasis.
 */
const markdownText = (value: string): string =>
  value
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[!-/:-@[-`{-~]/gu, String.raw`\$&`);

const markdownCode = (value: string): string => {
  const text = value.replace(/\s+/gu, " ").trim();
  const longestRun = Math.max(
    0,
    ...[...text.matchAll(/`+/gu)].map((match) => match[0].length),
  );
  const fence = "`".repeat(longestRun + 1);
  return `${fence} ${text} ${fence}`;
};

const markdownInline = (value: string): string =>
  value
    .split(/(`[^`]+`)/gu)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`")
        ? markdownCode(part.slice(1, -1))
        : markdownText(part),
    )
    .join("");

const frontmatterString = (value: string): string =>
  JSON.stringify(value)
    .replaceAll("\u2028", String.raw`\u2028`)
    .replaceAll("\u2029", String.raw`\u2029`);

export const renderGuideMarkdown = (
  draft: ProseDraft,
  manifest: ApiManifest,
  basePath: string,
): string => {
  const symbols = new Map(
    manifest.symbols.map((symbol) => [symbol.id, symbol]),
  );
  const base = normalizeBasePath(basePath);
  const lines = [
    "---",
    `title: ${frontmatterString(draft.title)}`,
    `sourceRevision: ${frontmatterString(draft.sourceRevision)}`,
    `sourceDigest: ${frontmatterString(draft.sourceDigest)}`,
    `reviewDecision: ${frontmatterString(draft.review.decisionId)}`,
    "---",
    "",
    `# ${markdownText(draft.title)}`,
    "",
    markdownInline(draft.summary),
    "",
    `**For:** ${markdownInline(draft.audience)}`,
    "",
  ];

  for (const section of draft.sections) {
    lines.push(`## ${markdownText(section.heading)}`, "");
    for (const claim of section.claims) {
      lines.push(
        `${markdownInline(claim.text)}${claim.certainty === "inference" ? " *(inference)*" : ""}`,
        "",
      );
    }
    const cited = [
      ...new Set(
        section.claims.flatMap((claim) =>
          claim.evidence.map((evidence) => evidence.symbolId),
        ),
      ),
    ];
    if (cited.length > 0) {
      lines.push("### Grounded in", "");
      for (const symbolId of cited) {
        const symbol = symbols.get(symbolId);
        if (symbol === undefined) {
          lines.push(`- ${markdownCode(symbolId)}`);
        } else {
          lines.push(
            `- [${markdownCode(symbol.exportName)}](${base}api/${symbol.slug}.html)`,
          );
        }
      }
      lines.push("");
    }
  }

  lines.push(
    "---",
    "",
    `Grounded against ${markdownCode(draft.sourceRevision)}. Evidence: [JSON](${base}evidence/${draft.slug}.json) · [trace](${base}traces/${draft.slug}.html).`,
    "",
  );
  return `${lines.join("\n")}\n`;
};
