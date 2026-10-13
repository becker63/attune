// Bounded HTTP transport. The server owns public source and Grit reuse.
import { parallel } from "./batches";
import type {
  FileProgress,
  Loaded,
  Observation,
  Repository,
  Timing,
} from "./types";

export async function acquire(
  url: string,
  example: boolean,
  extractor: string,
  progress: (text: string, files?: FileProgress) => void,
) {
  const start = performance.now(),
    spans: NonNullable<Timing["spans"]> = [];
  let requests = 0,
    bytes = 0,
    completed = 0;
  async function request(body: unknown) {
    const began = performance.timeOrigin + performance.now();
    requests++;
    const response = await fetch("/api/extraction", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240000),
    });
    const text = await response.text();
    bytes += new TextEncoder().encode(text).length;
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(
        `Extraction returned HTTP ${response.status} without a valid result.`,
      );
    }
    if (example)
      spans.push({
        label: "Authored extraction",
        lane: 0,
        start: began,
        end: performance.timeOrigin + performance.now(),
      });
    if (!response.ok)
      throw new Error(value.error ?? "Public extraction unavailable.");
    return value;
  }
  const observations: Observation[] = [],
    failures: Loaded["extractionFailures"] = [],
    executions: Loaded["runtime"]["executions"] = [];
  function accept(value: any) {
    if (value.extractor !== extractor)
      throw new Error("Extractor build changed; reload Studio.");
    if (value.failure) {
      for (const relation of ["defines", "imports", "calls"] as const)
        failures.push({
          path: value.file.path,
          relation,
          reason: value.failure.reason,
        });
    } else {
      observations.push({
        path: value.file.path,
        source: value.file.source,
        ...value.relations,
      });
      executions.push({
        path: value.file.path,
        servedBy: value.servedBy,
        ...value.execution,
      });
    }
  }
  let repository: Repository;
  if (example) {
    const value = await request({ operation: "fixture" });
    if (value.kind !== "authored-fixture")
      throw new Error("Invalid fixture response.");
    repository = {
      name: "Authored shop fixture",
      origin: "attune:studio-fixture",
      revision: "fixture-v1",
      files: value.files.map((v: any) => v.file),
      excluded: [],
      truncated: false,
      treeCount: value.files.length,
    };
    for (const item of value.files)
      accept({
        ...item,
        extractor: value.extractor,
        relations: item.observation,
        servedBy: value.servedBy,
      });
  } else {
    progress("Resolving public source…");
    const inventory = await request({ operation: "repository", url });
    repository = { ...inventory, files: [] };
    const groups: { path: string }[][] = [];
    for (let i = 0; i < inventory.files.length; i += 2)
      groups.push(inventory.files.slice(i, i + 2));
    const results = await parallel(groups, 4, async (group, _i, lane) => {
      const began = performance.timeOrigin + performance.now();
      try {
        const response = await request({
          operation: "files",
          repository: inventory.name,
          revision: inventory.revision,
          paths: group.map((f) => f.path),
        });
        if (response.files.length !== group.length)
          throw new Error("Incomplete source response.");
        return response.files.map((value: any, i: number) => {
          if (!value.file) {
            repository.excluded.push({
              path: group[i].path,
              reason: value.failure.reason,
            });
            return null;
          }
          if (value.file.path !== group[i].path)
            throw new Error("Source response identity mismatch.");
          accept({
            ...value,
            extractor: response.extractor,
            servedBy: response.servedBy,
          });
          return value.file;
        });
      } catch (error) {
        for (const file of group)
          repository.excluded.push({
            path: file.path,
            reason:
              error instanceof Error ? error.message : "Source unavailable.",
          });
        return [];
      } finally {
        completed += group.length;
        spans.push({
          label: group.map((f) => f.path).join(" + "),
          lane,
          start: began,
          end: performance.timeOrigin + performance.now(),
        });
        progress("", {
          phase: "Structure",
          completed,
          total: inventory.files.length,
        });
      }
    });

    repository.files = results.flat().filter(Boolean);
  }
  repository.files.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
  observations.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    repository,
    observations,
    failures,
    executions,
    timings: [
      {
        stage: "Public source and extraction HTTP",
        start: performance.timeOrigin + start,
        ms: performance.now() - start,
        executed: requests,
        reused: 0,
        bytes,
        spans,
      },
    ] as Timing[],
  };
}
