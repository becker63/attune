/** Display/transport records. Admission and ranking are compiled Flix. */
export type Source = {
  path: string;
  source: string;
  digest: string;
  blob: string;
};
export type Repository = {
  name: string;
  revision: string;
  origin: string;
  files: Source[];
  excluded: { path: string; reason: string }[];
  truncated: boolean;
  treeCount: number;
  fetchedBytes: number;
  apiRequests: number;
  rawRequests: number;
  sourceHits: number;
  acquisitionMs: number;
};
export type Declaration = {
  symbol: string;
  name: string;
  path: string;
  start: number;
  end: number;
};
export type Index = {
  version: string;
  identity: { origin: string; content: string; semantics: string };
  facts: [string, string, string][];
  declarations: Declaration[];
  witnesses: Witness[];
  refusals: { path: string; reason: string; subject: string }[];
};
export type Witness = {
  path: string;
  start: number;
  end: number;
  source: string;
  relation: "defines" | "imports" | "calls";
  target: string;
};
export type Hit = { path: string; score: number; witnesses: string[] };
export type MergeContribution = {
  path: string;
  ranks: [number | null, number | null];
  votes: [number, number];
  score: number;
};
export type Stage = {
  label: string;
  detail: string;
  paths: string[];
  merge?: MergeContribution[];
};
export type Method = {
  method: string;
  version: string;
  status: "complete" | "unknown" | "unavailable" | "failed";
  detail: string;
  candidateCount: number;
  results: Hit[];
  stages: Stage[];
  pool?: string[];
};
export type Request = [model: string, recipe: string, input: string];
export type FileProgress = {
  phase: "Source" | "Structure";
  completed: number;
  total: number;
};
export type Observation = {
  path: string;
  source: string;
  defines: string;
  imports: string;
  calls: string;
};
export type Timing = {
  stage: string;
  ms: number;
  executed: number;
  reused: number;
  bytes?: number;
  workers?: number;
  start?: number;
  spans?: { label: string; start: number; end: number; lane: number }[];
};
export type Comparison = {
  schema: "attune-studio-v1";
  repository: string;
  revision: string;
  world: Index["identity"];
  question: string;
  queryId: string;
  mode: "local" | "fixture" | "live";
  methods: Method[];
  timings: Timing[];
  providerCalls: number | null;
  providerRequests: number;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
  };
  providerObservations: {
    capability: string;
    cache: string;
    usage: Comparison["usage"];
  }[];
  coverage: { indexedFiles: number; excludedFiles: number; truncated: boolean };
  limitations: string[];
};
export type Loaded = {
  repository: Repository;
  index: Index;
  observations: Observation[];
  extractionFailures: {
    path: string;
    relation: "defines" | "imports" | "calls";
    reason: string;
  }[];
  localCacheAvailable: boolean;
  timings: Timing[];
  initializationMs: number;
  runtime: {
    gritLinearMemoryBytes: number | null;
    gritWorkers: number;
    gritIntervals: {
      worker: number;
      path: string;
      relation?: "defines" | "imports" | "calls";
      start: number;
      end: number;
    }[];
    assets: {
      path: string;
      transferBytes: number;
      encodedBytes: number;
      decodedBytes: number;
    }[];
  };
};

export type Trace = Pick<Loaded, "initializationMs" | "runtime" | "timings"> & {
  repository: string;
  revision: string;
  comparison: Comparison | null;
};
