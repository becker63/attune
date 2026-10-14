"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Cosmograph, CosmographConfig } from "@cosmograph/cosmograph";
import type { Loaded, Method, Stage } from "../../studio/types";
import { fileLayout } from "./file-layout";
import Source from "./source";

type Edge = { source: string; target: string; relation: "imports" | "calls" };
const COLORS = { defines: "#a7c59c", imports: "#d5ad75", calls: "#e4a0b0" };
export default function Graph({
  loaded,
  method,
  inspected,
  inspect,
}: {
  loaded: Loaded;
  method?: Method;
  inspected: string;
  inspect: (path: string) => void;
}) {
  const canvas = useRef<HTMLDivElement>(null),
    graph = useRef<Cosmograph | null>(null),
    popup = useRef<HTMLElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function hover(path: string) {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (path) setHovered(path);
    else leaveTimer.current = setTimeout(() => setHovered(""), 180);
  }
  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );
  const [renderer, setRenderer] = useState("loading"),
    [geometry, setGeometry] = useState<Record<string, number[]>>({}),
    [clusters, setClusters] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0),
    [hovered, setHovered] = useState("");
  const paths = useMemo(
    () => loaded.repository.files.map((f) => f.path),
    [loaded],
  );
  const initial = useMemo<Stage[]>(
    () => [
      {
        label: "Indexed files",
        detail: "Every indexed file. Select a node to read its source.",
        paths,
      },
    ],
    [paths],
  );
  const steps = method?.stages ?? initial;
  const current = steps[Math.min(step, steps.length - 1)];
  const edges = useMemo(() => {
    const files = new Set(paths),
      symbols = new Map(
        loaded.index.declarations.map((d) => [d.symbol, d.path]),
      );
    const links = new Map<string, Edge>();
    for (const [a, relation, b] of loaded.index.facts) {
      if (relation !== "imports" && relation !== "calls") continue;
      // File projection of already admitted edges; no source resolution here.
      const source = relation === "imports" ? a : symbols.get(a);
      const target = relation === "imports" ? b : symbols.get(b);
      if (
        source &&
        target &&
        source !== target &&
        files.has(source) &&
        files.has(target)
      )
        links.set(JSON.stringify([source, relation, target]), {
          source,
          relation,
          target,
        });
    }
    return [...links.values()];
  }, [loaded]);
  const connections = useMemo(() => {
    const degree = new Map(paths.map((path) => [path, 0]));
    for (const edge of edges) {
      degree.set(edge.source, degree.get(edge.source)! + 1);
      degree.set(edge.target, degree.get(edge.target)! + 1);
    }
    return degree;
  }, [paths, edges]);
  const maximumDegree = Math.max(1, ...connections.values());
  // One layout per repository. Queries change only annotations and colors.
  const scene = useMemo(() => {
    const layout = fileLayout(paths);
    const indices = new Map(layout.nodes.map((n, index) => [n.id, index]));
    return {
      ...layout,
      nodes: layout.nodes.map((n, index) => ({ ...n, index })),
      edges: edges.map((e, index) => ({
        ...e,
        index,
        sourceIndex: indices.get(e.source)!,
        targetIndex: indices.get(e.target)!,
      })),
    };
  }, [paths, edges]);
  const kept = new Set(current.paths),
    ranks = new Map(current.paths.map((p, i) => [p, i + 1]));
  const merging = !!current.merge;
  const contributions = new Map(current.merge?.map((c) => [c.path, c]));
  const largestMerge = Math.max(
    Number.EPSILON,
    ...(current.merge?.map((c) => c.score) ?? []),
  );
  const state = useRef({
    kept,
    inspect,
    hovered,
    merging,
    contributions,
    largestMerge,
  });
  state.current = {
    kept,
    inspect,
    hovered,
    merging,
    contributions,
    largestMerge,
  };
  const layoutRef = useRef(() => {});
  const configuration = (): CosmographConfig => ({
    points: "attune_points",
    links: scene.edges.length ? "attune_links" : undefined,
    pointIdBy: "id",
    pointIndexBy: "index",
    pointXBy: "x",
    pointYBy: "y",
    linkSourceBy: "source",
    linkTargetBy: "target",
    linkSourceIndexBy: "sourceIndex",
    linkTargetIndexBy: "targetIndex",
    enableSimulation: false,
    rescalePositions: false,
    preservePointPositionsOnDataUpdate: true,
    disableLogging: true,
    backgroundColor: "#140e11",
    // Count the displayed incoming and outgoing edges, not a relevance score.
    pointSizeBy: "id",
    pointSizeByFn: (id: string) =>
      6 +
      (10 * (connections.get(id) ?? 0)) / maximumDegree +
      (id === state.current.hovered ? 1 : 0),
    pointClusterBy: "id",
    pointClusterByFn: (id: string) =>
      state.current.kept.has(id) ? "results" : "other",
    pointColorBy: "id",
    pointColorByFn: (id: string) =>
      id === state.current.hovered
        ? "#d5ad75"
        : state.current.merging
          ? "#a7c59c"
          : state.current.kept.has(id)
            ? "#a7c59c"
            : "#49313b",
    linkColorBy: "index",
    linkColorByFn: (index: number) => {
      const e = scene.edges[index];
      return state.current.hovered
        ? e.source === state.current.hovered ||
          e.target === state.current.hovered
          ? COLORS[e.relation]
          : "#2a1d24"
        : state.current.kept.has(e.source) && state.current.kept.has(e.target)
          ? COLORS[e.relation]
          : "#35242c";
    },
    linkWidthBy: "index",
    linkWidthByFn: (index: number) => {
      const e = scene.edges[index];
      return state.current.hovered &&
        (e.source === state.current.hovered ||
          e.target === state.current.hovered)
        ? 1.25
        : 0.5;
    },
    linkDefaultArrows: true,
    linkArrowsSizeScale: 0.45,
    // Cosmograph culls overlapping labels; zooming reveals more contributions.
    showLabels: merging,
    showClusterLabels: false,
    pointLabelBy: "id",
    pointLabelFn: (id) => {
      const c = state.current.contributions.get(String(id));
      return c
        ? `Qwen  ${c.votes[0].toFixed(5)}\nAtlas ${c.votes[1].toFixed(5)}`
        : "";
    },
    pointLabelClassName: "merge-label",
    pointLabelFontSize: 10,
    labelPadding: [2, 4, 2, 4],
    labelMargin: 6,
    onLabelClick: (index) => state.current.inspect(scene.nodes[index].path),
    showTopLabels: false,
    showDynamicLabels: merging,
    showHoveredPointLabel: false,
    showLabelsFor: [],
    fitViewOnInit: false,
    scalePointsOnZoom: false,
    selectPointOnClick: false,
    focusPointOnClick: false,
    onZoom: () => layoutRef.current(),
    onZoomEnd: () => layoutRef.current(),
    onClick: (index) =>
      state.current.inspect(index === undefined ? "" : scene.nodes[index].path),
  });
  const configRef = useRef(configuration);
  configRef.current = configuration;
  function fit() {
    graph.current?.fitView(0, 0.12);
    layoutRef.current();
  }
  useEffect(() => {
    let disposed = false,
      frame = 0;
    let close: (() => Promise<void>) | undefined;
    const element = canvas.current!;
    const position = (x: number, y: number) =>
      graph.current?.spaceToScreenPosition([x, y]) ?? [x / 2 + 40, -y / 2 + 40];
    layoutRef.current = () => {
      if (disposed) return;
      const next: Record<string, number[]> = {};
      for (const n of scene.nodes) {
        const world = graph.current?.getPointPositionByIndex(n.index) ?? [
          n.x,
          n.y,
        ];
        next[n.id] = [...position(...world), ...world];
      }
      for (const g of scene.groups)
        next[`folder:${g.name}`] = [
          ...position(g.x, g.y),
          ...position(g.x + g.w, g.y - g.h),
        ];
      setGeometry(next);
      if (graph.current)
        setClusters(
          Object.fromEntries(
            [...graph.current.clusterMapping].map(([name, value]) => [
              name,
              value.count,
            ]),
          ),
        );
    };
    setRenderer("loading");
    void import("./cosmograph")
      .then(async ({ createGraph }) => {
        if (disposed) return;
        const mounted = await createGraph(
          element,
          configRef.current(),
          scene.nodes,
          scene.edges,
        );
        close = mounted.close;
        if (disposed) {
          await close();
          return;
        }
        graph.current = mounted.graph;
        // The user may have changed the selected stage during runtime loading.
        await graph.current.setConfig(configRef.current());
        if (disposed) return;
        setRenderer("cosmograph");
        fit();
      })
      .catch(() => {
        if (!disposed) {
          setRenderer("unavailable");
          layoutRef.current();
        }
      });
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(element);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      void close?.();
      graph.current = null;
    };
  }, [scene]);
  useEffect(() => {
    void graph.current
      ?.setConfig(configRef.current())
      .then(() => layoutRef.current());
  }, [current, hovered, scene]);
  useEffect(() => {
    setStep(0);
  }, [method]);
  useEffect(() => {
    if (inspected) popup.current?.focus({ preventScroll: true });
  }, [inspected]);
  const path = inspected || hovered,
    source = loaded.repository.files.find((f) => f.path === path);
  const witnesses = useMemo(
    () => loaded.index.witnesses.filter((w) => w.path === path),
    [loaded, path],
  );
  const point = geometry[path] ?? [20, 20],
    width = canvas.current?.clientWidth ?? 700,
    height = canvas.current?.clientHeight ?? 500;
  const popupWidth = Math.min(620, width - 24),
    popupHeight = Math.min(600, height - 24);
  const left = Math.max(
    12,
    Math.min(
      width - popupWidth - 12,
      point[0] + (point[0] > width / 2 ? -popupWidth - 24 : 24),
    ),
  );
  const hit = method?.results.find((h) => h.path === path);
  const definitions = loaded.index.declarations.filter((d) => d.path === path);
  const symbols = new Set(definitions.map((d) => d.symbol));
  const hoverContribution = contributions.get(hovered);
  const hoverPoint = geometry[hovered] ?? [0, 0];
  const tooltipWidth = Math.min(380, width - 24);
  return (
    <div
      className="retrieval-graph"
      data-renderer={renderer}
      data-stage={current.label}
      data-overlay={merging ? "merge-contributions" : "clusters"}
      data-clusters={JSON.stringify(clusters)}
      data-kept={current.paths.length}
      data-node-count={scene.nodes.length}
      data-highlighted-edges={
        hovered
          ? edges.filter(
              (e) => e.source === hovered || e.target === hovered,
            ).length
          : 0
      }
    >
      <div
        className="studio-graph-map"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            inspect("");
            setHovered("");
          }
        }}
      >
        <div className="studio-graph-canvas" ref={canvas} />
        <div className="studio-graph-labels">
          {scene.groups.map((g) => {
            const p = geometry[`folder:${g.name}`];
            return (
              p && (
                <div
                  key={g.name}
                  className="graph-folder"
                  style={{
                    left: p[0],
                    top: p[1],
                    width: p[2] - p[0],
                    height: p[3] - p[1],
                  }}
                >
                  <span>{g.name}/</span>
                </div>
              )
            );
          })}
          {scene.nodes.map((n) => {
            const p = geometry[n.id];
            if (!p) return null;
            const active = kept.has(n.path),
              label =
                scene.nodes.length <= 24 ||
                (active && current.paths.length <= 24) ||
                n.path === path;
            const contribution =
              n.path === hovered ? contributions.get(n.path) : undefined;
            const radius =
              6 + (5 * (connections.get(n.id) ?? 0)) / maximumDegree;
            return (
              <button
                key={n.id}
                className={`graph-node ${active ? "retained" : "dimmed"} ${label && !merging ? "" : "node-dot"}`}
                style={{ left: p[0], top: p[1] }}
                data-path={n.path}
                data-world-x={p[2]}
                data-world-y={p[3]}
                data-connections={connections.get(n.id)}
                aria-label={`Inspect ${n.name} (${n.path})`}
                aria-pressed={n.path === inspected}
                onClick={() => inspect(n.path)}
                onMouseEnter={() => hover(n.path)}
                onMouseLeave={() => hover("")}
                onFocus={() => hover(n.path)}
                onBlur={(e) => {
                  if (!e.currentTarget.matches(":hover")) hover("");
                }}
              >
                {contribution && !inspected && (
                  <svg
                    className="merge-ring"
                    viewBox="-14 -14 28 28"
                    aria-label="Qwen and Atlas contributions"
                  >
                    <circle r={radius} className="merge-track" />
                    {contribution.votes.map((vote, i) => (
                      <circle
                        key={i}
                        r={radius}
                        pathLength={1}
                        className={i ? "merge-structure" : "merge-qwen"}
                        strokeDasharray={`${vote / largestMerge} 1`}
                        strokeDashoffset={
                          i ? -contribution.votes[0] / largestMerge : 0
                        }
                      />
                    ))}
                  </svg>
                )}
                <span className="node-title">
                  {n.name}
                  {active && step > 0 && <span> {ranks.get(n.path)}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="graph-tools">
          <button onClick={fit}>Fit</button>
          <button
            aria-label="Zoom in"
            onClick={() =>
              graph.current?.setZoomLevel(
                (graph.current.getZoomLevel() ?? 1) * 1.4,
                0,
              )
            }
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={() =>
              graph.current?.setZoomLevel(
                (graph.current.getZoomLevel() ?? 1) / 1.4,
                0,
              )
            }
          >
            −
          </button>
        </div>
        <div className="relation-legend" aria-label="Relationship colors">
          <span className="relation-defines">defines · in source</span>
          <span className="relation-imports">imports</span>
          <span className="relation-calls">calls</span>
        </div>
        {merging && (
          <div className="merge-legend" aria-label="Rank contributions">
            <span className="merge-qwen">Qwen</span> +{" "}
            <span className="merge-structure">Atlas</span>
            <span>= combined score</span>
          </div>
        )}
        {hovered && !inspected && (
          <div
            className="node-tooltip"
            role="tooltip"
            style={{
              width: tooltipWidth,
              left: Math.max(
                12,
                Math.min(
                  width - tooltipWidth - 12,
                  hoverPoint[0] +
                    (hoverPoint[0] > width / 2 ? -tooltipWidth - 22 : 22),
                ),
              ),
              top: Math.max(
                12,
                Math.min(
                  height - 210,
                  Math.round(hoverPoint[1] / 16) * 16 - 48,
                ),
              ),
            }}
          >
            <strong>{hovered}</strong>
            {hoverContribution ? (
              <>
                {["Qwen", "Atlas"].map((name, i) => (
                  <div
                    key={name}
                    className={i ? "merge-structure" : "merge-qwen"}
                  >
                    <span>
                      {name}:{" "}
                      {hoverContribution.ranks[i] === null
                        ? "not in its results"
                        : `position ${hoverContribution.ranks[i]}`}
                    </span>
                    <code>
                      {hoverContribution.ranks[i] === null
                        ? "0 = 0"
                        : `1 ÷ (60 + ${hoverContribution.ranks[i]}) ≈ ${hoverContribution.votes[i].toFixed(5)}`}
                    </code>
                  </div>
                ))}
                <div className="merge-sum">
                  <span>Add both contributions</span>
                  <code>
                    {hoverContribution.votes[0].toFixed(5)} +{" "}
                    {hoverContribution.votes[1].toFixed(5)} ≈{" "}
                    {hoverContribution.score.toFixed(5)}
                  </code>
                </div>
                <span>Position 1 is first in a method’s results.</span>
              </>
            ) : (
              <span>
                {ranks.has(hovered) && step > 0
                  ? `Position ${ranks.get(hovered)} in these results · `
                  : ""}
                {connections.get(hovered)} connections
              </span>
            )}
          </div>
        )}
        {source && inspected && (
          <aside
            ref={popup}
            tabIndex={-1}
            className="source-popup"
            aria-label={`Preview of ${source.path}`}
            style={{
              left,
              width: popupWidth,
              maxHeight: popupHeight,
              top: Math.max(
                12,
                Math.min(
                  height - popupHeight - 12,
                  Math.round(point[1] / 16) * 16 - 64,
                ),
              ),
            }}
          >
            <div className="popup-heading">
              <strong>{source.path}</strong>
              <button
                aria-label="Close source preview"
                onClick={() => {
                  inspect("");
                  setHovered("");
                }}
              >
                ×
              </button>
            </div>
            {hit && (
              <p>
                Result {method!.results.indexOf(hit) + 1} · {hit.witnesses[0]}
              </p>
            )}
            {contributions.has(path) && (
              <p className="merge-detail">
                {["Qwen", "Atlas"].map((name, i) => {
                  const c = contributions.get(path)!;
                  return (
                    <span
                      key={name}
                      className={i ? "merge-structure" : "merge-qwen"}
                    >
                      {name}:{" "}
                      {c.ranks[i] === null
                        ? "no vote"
                        : `position ${c.ranks[i]} → ${c.votes[i].toFixed(5)}`}
                    </span>
                  );
                })}
                <span>Sum: {contributions.get(path)!.score.toFixed(5)}</span>
              </p>
            )}
            <Source
              path={source.path}
              text={source.source}
              witnesses={witnesses}
            />
            <details>
              <summary>Definitions and relationships</summary>
              <ul>
                {definitions.map((d) => (
                  <li key={d.symbol + d.start}>
                    {d.name} · bytes {d.start}–{d.end}
                  </li>
                ))}
              </ul>
              <ul>
                {loaded.index.facts
                  .filter(
                    ([a, , b]) =>
                      a === path ||
                      b === path ||
                      symbols.has(a) ||
                      symbols.has(b),
                  )
                  .map(([a, r, b], i) => (
                    <li key={i}>
                      {a} → {r} → {b}
                    </li>
                  ))}
              </ul>
              {loaded.index.refusals
                .filter((r) => r.path === path)
                .map((r, i) => (
                  <p key={i}>
                    {r.subject} — {r.reason}
                  </p>
                ))}
            </details>
            {loaded.repository.origin.startsWith("https:") && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`${loaded.repository.origin}/blob/${loaded.repository.revision}/${source.path.split("/").map(encodeURIComponent).join("/")}`}
              >
                Open this revision ↗
              </a>
            )}
          </aside>
        )}
        {renderer === "unavailable" && (
          <p className="graph-unavailable">
            Graph renderer unavailable. File buttons and rankings remain usable.
          </p>
        )}
      </div>
      <div className="graph-steps" role="group" aria-label="Retrieval stages">
        {steps.map((s, i) => (
          <button
            key={i}
            title={s.detail}
            aria-pressed={i === step}
            onClick={() => {
              setStep(i);
            }}
          >
            <span>{s.label}</span>
            <b>{s.paths.length}</b>
          </button>
        ))}
      </div>
      <p className="graph-caption" aria-live="polite" title={current.detail}>
        {current.detail}
      </p>
    </div>
  );
}
