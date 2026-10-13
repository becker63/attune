"use client";
import { useEffect, useRef, useState } from "react";
import type {
  Comparison,
  FileProgress,
  Loaded,
  Method,
} from "../../studio/types";
import { QUESTIONS } from "../../studio/fixture";
import Graph from "./graph";
import "./studio.css";

const LABELS: Record<string, string> = {
  embeddings: "Qwen",
  jev: "Text + JEv",
  "embeddings+atlas+jev": "Qwen + structure + JEv",
  lexical: "Text matching",
  "embeddings+atlas": "Qwen + structure",
  "embeddings+jev": "Qwen + JEv",
};
const PRIMARY = [
  "embeddings",
  "embeddings+atlas",
  "embeddings+jev",
  "embeddings+atlas+jev",
];
export default function Studio() {
  const worker = useRef<Worker | null>(null),
    sequence = useRef(0);
  const pending = useRef(
    new Map<
      number,
      {
        resolve: (value: any) => void;
        reject: (reason: Error) => void;
      }
    >(),
  );
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [comparison, setComparison] = useState<Comparison | null>(null);
  const [url, setUrl] = useState("https://github.com/developit/mitt"),
    [question, setQuestion] = useState(QUESTIONS[0]);
  const [live, setLive] = useState(true),
    [inferenceAvailable, setInferenceAvailable] = useState(false);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const [inspected, setInspected] = useState(""),
    [secondary, setSecondary] = useState(false),
    [mobileMethod, setMobileMethod] = useState("embeddings");
  const [controls, setControls] = useState(true);
  const [fileProgress, setFileProgress] = useState<FileProgress | null>(null);
  function connect() {
    const w = new Worker("/studio-worker.js");
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (data.type === "progress") {
        setProgress(data.files ? "" : data.text);
        if (data.files) setFileProgress(data.files);
        return;
      }
      const request = pending.current.get(data.id);
      pending.current.delete(data.id);
      if (data.type === "error") request?.reject(new Error(data.message));
      else request?.resolve(data.value);
    };
    w.onerror = () => {
      for (const request of pending.current.values()) {
        request.reject(
          new Error(
            "The browser worker stopped. Cancel and retry, or use a browser with WebAssembly GC support.",
          ),
        );
      }
      pending.current.clear();
    };
  }
  function send(
    operation: string,
    fields: Record<string, unknown> = {},
  ): Promise<any> {
    if (!worker.current) connect();
    const id = ++sequence.current;
    return new Promise((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      worker.current!.postMessage({ id, operation, ...fields });
    });
  }
  useEffect(() => {
    void fetch("/api/inference")
      .then((r) => r.json())
      .then((c) => setInferenceAvailable(c.embedding || c.jev))
      .catch(() => {});
    connect();
    send("restore")
      .then((value) => {
        if (value) {
          setLoaded(value);
          if (value.repository.origin.startsWith("https://github.com/"))
            setUrl(value.repository.origin);
        }
      })
      .catch((e) => setError(e.message));
    return () => worker.current?.terminate();
  }, []);
  async function index(fixture = false) {
    setBusy(true);
    setError("");
    setComparison(null);
    setProgress("Loading the local analysis engines…");
    setFileProgress({ phase: "Source", completed: 0, total: 0 });
    try {
      const result = await send("index", { url, fixture });
      setLoaded(result);
      setInspected("");
      if (fixture) setQuestion(QUESTIONS[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
      setFileProgress(null);
    }
  }
  async function ask() {
    setBusy(true);
    setError("");
    setProgress("Comparing answers…");
    try {
      setComparison(
        await send("query", {
          question,
          live: live && inferenceAvailable,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    for (const p of pending.current.values()) {
      p.reject(new Error("Cancelled."));
    }
    pending.current.clear();
    setBusy(false);
    setProgress("");
    setFileProgress(null);
    setLoaded(null);
    setComparison(null);
  }
  async function clear() {
    await send("clear");
    setLoaded(null);
    setComparison(null);
    setInspected("");
  }
  function inspect(path: string) {
    setInspected(path);
  }
  function download() {
    if (!comparison) return;
    const blob = new Blob(
        [
          JSON.stringify(
            {
              ...comparison,
              runtime: loaded?.runtime,
              indexing: loaded?.timings,
            },
            null,
            2,
          ),
        ],
        {
          type: "application/json",
        },
      ),
      href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "attune-comparison.json";
    a.click();
    URL.revokeObjectURL(href);
  }
  const methods =
    comparison?.methods.filter(
      (m) => secondary || PRIMARY.includes(m.method),
    ) ?? [];
  const activeMethod = comparison?.methods.find(
    (m) => m.method === mobileMethod,
  );
  const fixture = loaded?.repository.origin === "attune:studio-fixture";
  return (
    <main
      className={`studio-frame ${controls ? "controls-open" : "controls-closed"}`}
    >
      <header className="studio-header">
        <nav aria-label="Main navigation">
          <a href="/">Attune</a>
          <h1>Studio</h1>
          <a href="/studio/timing">Flamegraph</a>
          <a href="/#overview" className="research-link">
            Research
          </a>
        </nav>
        <div className="header-controls">
          {(fileProgress || loaded) && (
            <span className="index-counter" role="status" aria-live="polite">
              {fileProgress ? (
                fileProgress.total ? (
                  <>
                    <span>
                      {fileProgress.completed}/{fileProgress.total}
                    </span>
                    <span className="counter-phase">{fileProgress.phase}</span>
                  </>
                ) : (
                  "Indexing…"
                )
              ) : (
                `${loaded!.repository.files.length} files`
              )}
            </span>
          )}
          <button
            aria-expanded={controls}
            aria-controls="studio-controls"
            onClick={() => setControls(!controls)}
          >
            {controls ? "Hide controls" : "Controls"}
          </button>
        </div>
      </header>
      <div className="studio-workspace">
        <section className="graph-workspace" aria-label="Repository graph">
          {loaded ? (
            <Graph
              loaded={loaded}
              method={activeMethod}
              inspected={inspected}
              inspect={inspect}
            />
          ) : (
            <div className="graph-empty">
              <p>Start with a repository.</p>
              <span>Every indexed file becomes a node.</span>
            </div>
          )}
        </section>
        <aside
          id="studio-controls"
          className="studio-controls"
          hidden={!controls}
        >
          <form
            className="repository-form"
            onSubmit={(e) => {
              e.preventDefault();
              void index();
            }}
          >
            <label htmlFor="repository">Public GitHub URL</label>
            <input
              id="repository"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={busy}
            />
            <div className="actions">
              <button disabled={busy} type="submit">
                Index locally
              </button>
              <button
                disabled={busy}
                type="button"
                onClick={() => void index(true)}
              >
                Try the example
              </button>
            </div>
          </form>
          {loaded && (
            <div className="repository-status">
              <strong>{loaded.repository.name}</strong>
              <code>{loaded.repository.revision.slice(0, 10)}</code>
              <span>
                {loaded.repository.files.length} files indexed ·{" "}
                {loaded.repository.excluded.length} excluded
              </span>
              {loaded.extractionFailures.length > 0 && (
                <span className="error">
                  Structure incomplete in{" "}
                  {new Set(loaded.extractionFailures.map((f) => f.path)).size}{" "}
                  files · index again to retry
                </span>
              )}
              {!loaded.localCacheAvailable && (
                <span className="error">
                  Browser storage unavailable · completed work may not survive
                  reload
                </span>
              )}
              {fixture && <span>Example · authored model answers</span>}
              {loaded.repository.truncated && (
                <span className="error">Incomplete GitHub inventory</span>
              )}
            </div>
          )}
          <form
            className="question-form"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <label htmlFor="question">Question or issue description</label>
            <textarea
              id="question"
              rows={2}
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={busy}
              required
            />
            <div className="question-actions">
              <button
                type="submit"
                disabled={!loaded || busy || !question.trim()}
              >
                Compare answers
              </button>
              {busy && (
                <button type="button" onClick={cancel}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          {(error ||
            progress ||
            comparison?.timings[0]?.stage === "Comparison replay") && (
            <p
              className="operation-status"
              role={error ? "alert" : "status"}
              aria-live="polite"
            >
              {error ||
                progress ||
                "Comparison replay · no new inference requests"}
            </p>
          )}
          {comparison && (
            <>
              <h2 className="visually-hidden">Compare the top 10</h2>
              <nav className="method-nav" aria-label="Retrieval method">
                {methods.map((m) => (
                  <button
                    key={m.method}
                    aria-pressed={mobileMethod === m.method}
                    onClick={() => {
                      setMobileMethod(m.method);
                      setInspected("");
                    }}
                  >
                    {LABELS[m.method]}
                  </button>
                ))}
              </nav>
              {activeMethod && (
                <div className="active-ranking">
                  <MethodPanel method={activeMethod} inspect={inspect} />
                </div>
              )}
            </>
          )}
          <details className="studio-options">
            <summary>Options and coverage</summary>
            {inferenceAvailable && !fixture && (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={live}
                  onChange={(e) => setLive(e.target.checked)}
                />
                Use Qwen and JEv
              </label>
            )}
            <p>
              JS/TS · 120 files · 5 MB source limit. Implementation files come
              before tests and examples. Analysis is local; inference sends the
              question and source excerpts.
            </p>
            <label className="toggle">
              <input
                type="checkbox"
                checked={secondary}
                onChange={(e) => setSecondary(e.target.checked)}
              />
              Include text baselines
            </label>
            {fixture &&
              QUESTIONS.map((q) => (
                <button
                  className="text-button"
                  key={q}
                  disabled={busy}
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </button>
              ))}
            {loaded && (
              <>
                {loaded.extractionFailures.length > 0 && (
                  <details>
                    <summary>
                      Extraction failures ({loaded.extractionFailures.length})
                    </summary>
                    <ul>
                      {loaded.extractionFailures.map((f, i) => (
                        <li key={i}>
                          {f.path} · {f.relation} — {f.reason}
                        </li>
                      ))}
                    </ul>
                    <p>
                      Completed relations are saved. Failed files remain
                      searchable by text and embeddings; their structure is not
                      admitted.
                    </p>
                  </details>
                )}
                <details>
                  <summary>
                    Excluded files ({loaded.repository.excluded.length})
                  </summary>
                  <ul>
                    {loaded.repository.excluded.slice(0, 200).map((f, i) => (
                      <li key={i}>
                        {f.path} — {f.reason}
                      </li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>
                    Unresolved references ({loaded.index.refusals.length})
                  </summary>
                  <ul>
                    {loaded.index.refusals.map((r, i) => (
                      <li key={i}>
                        {r.path}: {r.subject} — {r.reason}
                      </li>
                    ))}
                  </ul>
                </details>
                <p>
                  Native Flix Datalog is JVM-only. Browser structure uses
                  compiled Flix traversal, anchored by Qwen.
                </p>
                <button disabled={busy} onClick={() => void clear()}>
                  Clear local data
                </button>
              </>
            )}
            {comparison && (
              <button onClick={download}>Export comparison</button>
            )}
            <a href="https://github.com/becker63/attune">
              Source and frozen evidence ↗
            </a>
          </details>
        </aside>
      </div>
    </main>
  );
}
function MethodPanel({
  method,
  inspect,
}: {
  method: Method;
  inspect: (path: string) => void;
}) {
  // A zero baseline and an independent scale for each method. These are display
  // lengths only; the scores returned by Flix are never rescaled or recomputed.
  const minimum = Math.min(0, ...method.results.map((hit) => hit.score));
  const maximum = Math.max(0, ...method.results.map((hit) => hit.score));
  const extent = maximum - minimum || 1;
  const position = (score: number) => (100 * (score - minimum)) / extent;
  const number = (score: number) => Number(score.toPrecision(4)).toString();
  return (
    <section className="method" aria-label={LABELS[method.method]}>
      <div className="method-count">
        {method.candidateCount} candidates → {method.results.length} results
      </div>
      {method.results.length ? (
        <figure
          className="score-chart"
          data-scale-min={minimum}
          data-scale-max={maximum}
          aria-label={`${LABELS[method.method]} scores, scaled from ${number(minimum)} to ${number(maximum)}`}
        >
          <ol>
            {method.results.map((hit) => (
              <li key={hit.path}>
                <button
                  className="result"
                  onClick={() => inspect(hit.path)}
                  title={hit.path}
                  aria-label={`${hit.path}, score ${hit.score}`}
                >
                  <span className="result-label">
                    <span className="result-path">{hit.path}</span>
                    <span className="score">{number(hit.score)}</span>
                  </span>
                  <span className="result-track" aria-hidden="true">
                    <span
                      className="score-zero"
                      style={{ left: `${position(0)}%` }}
                    />
                    <span
                      className={`score-bar ${hit.score < 0 ? "negative" : ""}`}
                      data-score={hit.score}
                      style={{
                        left: `${position(Math.min(0, hit.score))}%`,
                        width: `${(Math.abs(hit.score) / extent) * 100}%`,
                      }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <figcaption className="score-scale">
            <span>{number(minimum)}</span>
            <span>{number(maximum)}</span>
          </figcaption>
        </figure>
      ) : (
        <p className="empty">
          {method.status === "failed" || method.status === "unavailable"
            ? method.detail
            : "No matches in the indexed source."}
        </p>
      )}
    </section>
  );
}
