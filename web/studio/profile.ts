import { Profile, StringTable } from "pprof-format";
// Recorded wall-time weights, not CPU samples. The viewer groups costs; it does
// not infer a call stack or a chronology from these stage names.
export function wallProfile(rows: { stack: string[]; ms: number }[]) {
  const strings = new StringTable(),
    names = [...new Set(rows.flatMap((r) => r.stack))];
  const ids = new Map(names.map((name, i) => [name, i + 1]));
  return new Profile({
    stringTable: strings,
    sampleType: [
      { type: strings.dedup("wall"), unit: strings.dedup("microseconds") },
    ],
    function: names.map((name) => ({
      id: ids.get(name)!,
      name: strings.dedup(name),
    })),
    location: names.map((name) => ({
      id: ids.get(name)!,
      line: [{ functionId: ids.get(name)! }],
    })),
    sample: rows.map((r) => ({
      locationId: [...r.stack].reverse().map((n) => ids.get(n)!),
      value: [Math.round(r.ms * 1000)],
    })),
    comment: [
      strings.dedup(
        "Attune recorded wall-time stages; not sampled CPU stacks. Concurrent work may exceed elapsed time.",
      ),
    ],
  });
}
