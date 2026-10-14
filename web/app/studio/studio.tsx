"use client";
import Link from "next/link";
import { useStudio } from "./session";
import type { Method } from "../../studio/types";
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
  const {
    loaded,
    comparison,
    url,
    setUrl,
    question,
    setQuestion,
    live,
    setLive,
    inferenceAvailable,
    busy,
    progress,
    error,
    inspected,
    setInspected,
    secondary,
    setSecondary,
    mobileMethod,
    setMobileMethod,
    controls,
    setControls,
    fileProgress,
    index,
    ask,
    cancel,
    clear,
  } = useStudio();
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
          <Link href="/studio/timing">Flamegraph</Link>
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
              inspect={setInspected}
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
                Index repository
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
          {(error || progress) && (
            <p
              className="operation-status"
              role={error ? "alert" : "status"}
              aria-live="polite"
            >
              {error || progress}
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
                  <MethodPanel method={activeMethod} inspect={setInspected} />
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
              before tests and examples. Public source and extraction are shared
              on the server; Flix analyzes them in your browser. Inference sends
              the question and source excerpts. Private answers last for this
              session.
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
                      Completed files can be reused across visitors. Failed
                      files remain searchable by text and embeddings; their
                      structure is not admitted.
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
                  Reset session
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
