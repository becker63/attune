import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import javascript from "shiki/langs/javascript.mjs";
import typescript from "shiki/langs/typescript.mjs";
import jsx from "shiki/langs/jsx.mjs";
import tsx from "shiki/langs/tsx.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import type { Witness } from "../../studio/types";

// Only the four source languages used here; no compiler or highlighting server.
const highlighter = createHighlighterCore({
  themes: [githubDark],
  langs: [javascript, typescript, jsx, tsx],
  engine: createJavaScriptRegexEngine(),
});
export async function highlight(
  source: string,
  path: string,
  witnesses: Witness[] = [],
) {
  const lang = /\.tsx$/i.test(path)
    ? "tsx"
    : /\.jsx$/i.test(path)
      ? "jsx"
      : /\.[cm]?ts$/i.test(path)
        ? "typescript"
        : "javascript";
  // Flix supplies validated UTF-8 source ranges. Shiki expects UTF-16 offsets.
  const offsets = new Map<number, number>([[0, 0]]);
  let bytes = 0,
    units = 0;
  for (const character of source) {
    bytes += new TextEncoder().encode(character).length;
    units += character.length;
    offsets.set(bytes, units);
  }
  const annotations = witnesses
    .filter((w) => w.path === path)
    .map((w) => {
      const start = offsets.get(w.start),
        end = offsets.get(w.end);
      if (start === undefined || end === undefined || end <= start)
        throw new Error("Invalid source witness range.");
      return {
        ...w,
        start,
        end,
        line: source.slice(0, start).split("\n").length,
        label: `${w.relation} ${w.target.replace("::", " → ")}`,
      };
    });
  return (await highlighter).codeToHtml(source, {
    lang,
    theme: "github-dark",
    decorations: annotations.map((a) => ({
      start: a.start,
      end: a.end,
      properties: {
        class: `relation-token relation-${a.relation}`,
        title: a.label,
        "data-relation": a.relation,
      },
    })),
    transformers: [
      {
        name: "attune-source-witnesses",
        line(node, line) {
          node.properties["data-line"] = line;
          const notes = annotations.filter((a) => a.line === line);
          if (!notes.length) return;
          this.addClassToHast(node, "relation-line");
          node.children.push({
            type: "element",
            tagName: "span",
            properties: { class: "relationship-notes" },
            children: notes.map((a) => ({
              type: "element",
              tagName: "span",
              properties: {
                class: `relationship-note relation-${a.relation}`,
                "data-relation": a.relation,
              },
              children: [{ type: "text", value: a.label }],
            })),
          });
        },
      },
    ],
  });
}
