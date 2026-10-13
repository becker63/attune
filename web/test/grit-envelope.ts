// This is a mechanical envelope conversion, not a parser or resolver.
// The pinned upstream browser binding uses UTF-16 indices; native Grit uses UTF-8.
export type Match = {
  __typename: string;
  sourceFile?: string;
  ranges?: Range[];
  range?: Range;
  message?: string;
  level?: number;
};
export const RELATIONS = ["defines", "imports", "calls"] as const;
export type Relation = (typeof RELATIONS)[number];
type Range = { startByte: number; endByte: number };
export function envelope(path: string, source: string, results: Match[]) {
  const offsets = new Map<number, number>([[0, 0]]);
  let units = 0,
    bytes = 0;
  for (const character of source) {
    units += character.length;
    bytes += new TextEncoder().encode(character).length;
    offsets.set(units, bytes);
  }
  function range(value: Range) {
    const start = offsets.get(value.startByte),
      end = offsets.get(value.endByte);
    if (start === undefined || end === undefined || end < start)
      throw new Error("Grit returned an invalid UTF-16 source range.");
    return { start_byte: start, end_byte: end };
  }
  const output: {
    version: number;
    matched: boolean;
    matches: unknown[];
    logs: unknown[];
    diagnostics: string[];
  } = { version: 1, matched: false, matches: [], logs: [], diagnostics: [] };
  for (const item of results) {
    if (item.__typename === "Match") {
      if (item.sourceFile !== path)
        throw new Error("Grit returned a different source path.");
      output.matched = true;
      output.matches.push(
        ...(item.ranges ?? []).map((r) => ({ path, ...range(r) })),
      );
    } else if (item.__typename === "AnalysisLog") {
      if (item.level !== undefined && item.level < 400)
        throw new Error(item.message || "Grit extraction failed.");
      if (item.range)
        output.logs.push({ message: item.message ?? "", ...range(item.range) });
      else output.diagnostics.push(item.message ?? "Grit diagnostic");
    } else if (
      item.__typename === "Rewrite" ||
      item.__typename === "CreateFile" ||
      item.__typename === "RemoveFile"
    ) {
      throw new Error("Extraction may not rewrite source.");
    }
  }
  return JSON.stringify(output);
}
export function language(path: string) {
  return /\.[cm]?ts$/i.test(path)
    ? "typescript"
    : /\.tsx$/i.test(path)
      ? "tsx"
      : /\.jsx$/i.test(path)
        ? "jsx"
        : /\.[cm]?js$/i.test(path)
          ? "javascript"
          : (() => {
              throw new Error("Unsupported source language.");
            })();
}
