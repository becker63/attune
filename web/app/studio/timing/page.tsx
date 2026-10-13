"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useStudio } from "../session";
import { wallProfile } from "../../../studio/profile";
import type { Timing, Trace } from "../../../studio/types";
import "../studio.css";
import "./timing.css";
const FlameGraph = dynamic(
  () =>
    import("react-pprof/dist/components/FlameGraph.js").then(
      (m) => m.FlameGraph,
    ),
  { ssr: false },
);
export default function TimingPage() {
  const { loaded, comparison } = useStudio();
  const trace: Trace | null = loaded
    ? {
        ...loaded,
        repository: loaded.repository.name,
        revision: loaded.repository.revision,
        comparison,
      }
    : null;
  const [view, setView] = useState("Indexing"),
    [work, setWork] = useState(false),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const timings: Timing[] =
    view === "Query"
      ? (trace?.comparison?.timings ?? [])
      : view === "Startup"
        ? [
            {
              stage: "Load compiled Flix",
              ms: trace?.initializationMs ?? 0,
              executed: 1,
              reused: 0,
            },
          ]
        : (trace?.timings ?? []);
  const spans = useMemo(
    () =>
      timings.flatMap((t) => {
        const items = t.spans ?? [];
        return items.map((i) => ({
          ...i,
          stage: t.stage,
          offset: i.start - (t.start ?? i.start),
          ms: i.end - i.start,
          elapsed: t.ms,
        }));
      }),
    [trace, view],
  );
  const rows = work
    ? spans.map((s) => ({
        stack: [s.stage, `Lane ${s.lane + 1}`, s.label],
        ms: s.ms,
      }))
    : timings.map((t) => ({ stack: [view, t.stage], ms: t.ms }));
  const profile = useMemo(() => wallProfile(rows), [trace, view, work]);
  const filtered = rows.filter((r) =>
    r.stack.join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  const total = rows.reduce((n, r) => n + r.ms, 0);
  function exportProfile() {
    const href = URL.createObjectURL(
      new Blob([new Uint8Array(profile.encode())], {
        type: "application/octet-stream",
      }),
    );
    const a = document.createElement("a");
    a.href = href;
    a.download = "attune-wall-time.pprof";
    a.click();
    URL.revokeObjectURL(href);
  }
  return (
    <main className="timing-page">
      <header className="studio-header">
        <nav aria-label="Main navigation">
          <a href="/">Attune</a>
          <Link href="/studio">← Studio</Link>
          <h1>Flamegraph</h1>
        </nav>
      </header>
      {!trace ? (
        <div className="timing-empty">
          <p>
            Index a repository in this session to record a run. A full reload
            clears the trace.
          </p>
          <Link href="/studio">Open Studio →</Link>
        </div>
      ) : (
        <>
          <div className="timing-toolbar">
            <span>
              {trace.repository} <code>{trace.revision.slice(0, 10)}</code>
            </span>
            <nav aria-label="Timing phase">
              {["Startup", "Indexing", "Query"].map((v) => (
                <button
                  key={v}
                  aria-pressed={view === v}
                  onClick={() => {
                    setView(v);
                    setWork(false);
                    setSelected(null);
                  }}
                >
                  {v}
                </button>
              ))}
            </nav>
            <button onClick={exportProfile}>Export pprof</button>
          </div>
          <div className="timing-description">
            <p>
              Recorded wall time · {total.toFixed(1)} ms{" "}
              {work
                ? "summed across concurrent work"
                : "across measured stages"}
              . Click to zoom; scroll to magnify.
            </p>
            <label className="toggle">
              <input
                type="checkbox"
                checked={work}
                disabled={!spans.length}
                onChange={(e) => {
                  setWork(e.target.checked);
                  setSelected(null);
                }}
              />
              Inspect individual requests and batches
            </label>
          </div>
          <div className="profile-view" data-viewer="react-pprof">
            {rows.length ? (
              <FlameGraph
                profile={profile}
                height={320}
                width="100%"
                zoomOnScroll
                selectedFrameId={selected}
                onFrameClick={(frame) => setSelected(frame?.id ?? null)}
                primaryColor="#a7c59c"
                secondaryColor="#d5ad75"
                backgroundColor="#140e11"
                textColor="#efe4d6"
                shadowOpacity={0}
                fontFamily='"DejaVu Sans Mono", monospace'
              />
            ) : (
              <p>No recorded work for this phase.</p>
            )}
          </div>
          <div className="timing-lower">
            <section className="span-table" aria-label="Recorded stages">
              <div className="timing-table-tools">
                <input
                  aria-label="Find a stage or file"
                  placeholder="Find a stage or file…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={() => setSelected(null)}>Reset zoom</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Stage / work</th>
                    <th>Wall time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <button
                          aria-pressed={
                            selected === `root/${r.stack.join("/")}`
                          }
                          onClick={() =>
                            setSelected(`root/${r.stack.join("/")}`)
                          }
                        >
                          {r.stack.join(" → ")}
                        </button>
                      </td>
                      <td>{r.ms.toFixed(2)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="parallel-timeline">
              <h2>Concurrent requests</h2>
              <p>
                Each bar keeps its actual start and end. Width in the flamegraph
                groups duration; it does not show chronology.
              </p>
              {spans.length ? (
                [...new Set(spans.map((s) => s.stage))].map((stage) => {
                  const group = spans.filter((s) => s.stage === stage),
                    elapsed = Math.max(1, group[0].elapsed),
                    lanes = Math.max(...group.map((s) => s.lane)) + 1;
                  return (
                    <figure key={stage}>
                      <figcaption>
                        {stage} · {elapsed.toFixed(1)} ms elapsed
                      </figcaption>
                      <svg
                        viewBox={`0 0 650 ${lanes * 32}`}
                        role="img"
                        aria-label={`${stage} concurrent lanes`}
                      >
                        {group.map((s, i) => (
                          <g
                            className="work-span"
                            tabIndex={0}
                            key={i}
                            aria-label={`${s.label}: ${s.ms.toFixed(1)} ms on lane ${s.lane + 1}`}
                          >
                            <title>
                              {s.label} · {s.ms.toFixed(1)} ms
                            </title>
                            <rect
                              x={(Math.max(0, s.offset) / elapsed) * 650}
                              y={s.lane * 32 + 2}
                              width={Math.max(1, (s.ms / elapsed) * 650)}
                              height={24}
                            />
                          </g>
                        ))}
                      </svg>
                    </figure>
                  );
                })
              ) : (
                <p>No overlapping work recorded in this phase.</p>
              )}
            </section>
          </div>
          <details className="timing-accounting">
            <summary>Requests, reuse and provider usage</summary>
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Executed</th>
                  <th>Reused</th>
                </tr>
              </thead>
              <tbody>
                {timings.map((t, i) => (
                  <tr key={i}>
                    <td>{t.stage}</td>
                    <td>{t.executed ?? "Unavailable"}</td>
                    <td>{t.reused ?? "Unavailable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              {trace.comparison?.providerRequests ?? 0} inference HTTP requests
              in the saved comparison. Provider execution count:{" "}
              {trace.comparison?.providerCalls ?? "Unavailable"}.
            </p>
            <p>
              Grit receipts describe the original extraction, which may have run
              for another visitor. Current server execution count and cache-hit
              status are unavailable. The timeline measures this browser’s HTTP
              requests.
            </p>
            <p>
              Batch usage is reported once per observation. Shared-cache bills
              can describe an earlier request; they are not evidence of a new
              charge.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Observation</th>
                  <th>Tokens in / out</th>
                  <th>Reported cost</th>
                  <th>Cache</th>
                </tr>
              </thead>
              <tbody>
                {trace.comparison?.providerObservations.map((o, i) => (
                  <tr key={i}>
                    <td>{o.capability}</td>
                    <td>
                      {o.usage.inputTokens ?? "Unavailable"} /{" "}
                      {o.usage.outputTokens ?? "Unavailable"}
                    </td>
                    <td>
                      {o.usage.costUsd === null
                        ? "Unavailable"
                        : `$${o.usage.costUsd.toFixed(6)}`}
                    </td>
                    <td>{o.cache}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <footer className="studio-status">
            Measured stages and waits, not sampled CPU stacks. Kept for this
            session; reloading clears the trace. Viewer: react-pprof.
          </footer>
        </>
      )}
    </main>
  );
}
