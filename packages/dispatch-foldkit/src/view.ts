import { type Document, type Html, html } from "foldkit/html";

import {
  deriveThreads,
  dispatchSummaryCounts,
  filterDispatchItems,
} from "@attune/dispatch-core";
import type {
  DispatchFilter,
  DispatchItem,
  DispatchRoute,
  FoldkitMdxBlock,
  WorkThread,
} from "@attune/dispatch-schema";

import type { Message } from "./message.js";
import {
  FixtureStartRequested,
  FixtureStepRequested,
  RequestedPromotion,
  SelectedFilter,
  SelectedFixtureAnchor,
  SelectedRoute,
  SelectedThread,
} from "./message.js";
import type { Model } from "./model.js";

type IconName =
  | "arrow-left"
  | "arrow-up"
  | "arrow-up-right"
  | "box"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "compass"
  | "copy"
  | "eye"
  | "file-code"
  | "filter"
  | "flask"
  | "git-branch"
  | "git-fork"
  | "key"
  | "layers"
  | "layout-grid"
  | "list-checks"
  | "minus-circle"
  | "paintbrush"
  | "scan-text"
  | "settings"
  | "sparkles"
  | "timer"
  | "upload"
  | "x"
  | "x-circle";

type Tone =
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "violet"
  | "destructive";

type StatItem = Readonly<{
  readonly icon: IconName;
  readonly value: string;
  readonly label: string;
}>;

type TabItem = Readonly<{
  readonly label: string;
  readonly count?: number;
  readonly tone?: Tone;
  readonly active?: boolean;
  readonly filter?: DispatchFilter;
}>;

type ListRowItem = Readonly<{
  readonly icon?: IconName;
  readonly title: string;
  readonly description?: string;
  readonly status?: string;
  readonly tone?: Tone;
  readonly meta?: ReadonlyArray<string>;
  readonly code?: string;
  readonly active?: boolean;
  readonly compact?: boolean;
}>;

const positiveExample = `export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cx("card", className)}
      style={{
        background: '#121212',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}`;

const negativeExample = `return (
  <img
    src={src}
    alt={name}
    width={40}
    height={40}
    borderRadius: '50%',
    objectFit: 'cover'
  />
)`;

const astGrepRule = `id: no-inline-styling-in-ui-primitives
language: tsx
message: Avoid inline styling in UI primitives and recipes
severity: error
metadata:
  category: styling
  description: Disallow inline style props and style objects
  rationale:
    - Inline styles make visual patterns harder to maintain
    - Prefer className or tokens from the design system
rule:
  any:
    - pattern: $X({ style: $Z })
    - pattern: $Y(): { $x: { $Y | $Y, ... } }
  where:
    - metavariable-regex:
        metavariable: $x
        regex: ^(div|span|button|a|input|textarea|select)$
fix:
  suggestion: Replace inline style with a className or token`;

const discoverShape = `pattern: $EL[style={$OBJ}]
pattern-not: $EL[style={$OBJ}] inside "**/(ui|components|primitives|recipes)/**"`;

const selectedFindingCode = `export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cx('card', className)}
      style={{
        background: '#121212',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}`;

const iconPaths: Readonly<Record<IconName, ReadonlyArray<string>>> = {
  "arrow-left": ["M19 12H5", "m12 19-7-7 7-7"],
  "arrow-up": ["m5 12 7-7 7 7", "M12 19V5"],
  "arrow-up-right": ["M7 17 17 7", "M7 7h10v10"],
  box: [
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
    "m3.3 7 8.7 5 8.7-5",
    "M12 22V12",
  ],
  check: ["M20 6 9 17l-5-5"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  compass: [
    "m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36Z",
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  ],
  copy: [
    "M8 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z",
    "M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2",
  ],
  eye: [
    "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z",
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  ],
  "file-code": [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
    "M14 2v6h6",
    "m10 13-2 2 2 2",
    "m14 17 2-2-2-2",
  ],
  filter: ["M3 5h18", "M7 12h10", "M10 19h4"],
  flask: [
    "M9 3h6",
    "M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3",
    "M8 15h8",
  ],
  "git-branch": [
    "M6 3v12",
    "M18 9a3 3 0 1 0-3-3",
    "M6 21a3 3 0 1 0 0-6",
    "M18 9c0 4-3 6-6 6H9",
  ],
  "git-fork": [
    "M12 18V6",
    "M5 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M19 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M5 6v2a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V6",
    "M12 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  ],
  key: [
    "m21 2-2 2",
    "m15.5 7.5 2 2",
    "M7 14a5 5 0 1 1 7.1-7.1L22 14.8V19h-4.2L15 16.2l-2 2H9.8Z",
  ],
  layers: ["m12 2 9 5-9 5-9-5Z", "m3 12 9 5 9-5", "m3 17 9 5 9-5"],
  "layout-grid": [
    "M3 3h7v7H3Z",
    "M14 3h7v7h-7Z",
    "M14 14h7v7h-7Z",
    "M3 14h7v7H3Z",
  ],
  "list-checks": ["m3 7 2 2 4-4", "M13 6h8", "m3 17 2 2 4-4", "M13 18h8"],
  "minus-circle": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M8 12h8"],
  paintbrush: [
    "M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-3-3Z",
    "M9 12l3 3",
    "M7 14c-2 0-4 2-4 4a3 3 0 0 0 3 3c2 0 4-2 4-4Z",
  ],
  "scan-text": [
    "M3 7V5a2 2 0 0 1 2-2h2",
    "M17 3h2a2 2 0 0 1 2 2v2",
    "M21 17v2a2 2 0 0 1-2 2h-2",
    "M7 21H5a2 2 0 0 1-2-2v-2",
    "M7 8h10",
    "M7 12h10",
    "M7 16h6",
  ],
  settings: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.2a2 2 0 1 1-3.5 2l-.1-.2a1.7 1.7 0 0 0-1.7-.9 1.7 1.7 0 0 0-1.5 1.3l-.1.3a2 2 0 1 1-4 0l-.1-.3A1.7 1.7 0 0 0 7.3 18a1.7 1.7 0 0 0-1.7.9l-.1.2a2 2 0 1 1-3.5-2l.1-.2A1.7 1.7 0 0 0 2.6 15a1.7 1.7 0 0 0-1.3-1.5L1 13.4a2 2 0 1 1 0-4l.3-.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9L2.2 5a2 2 0 1 1 3.5-2l.1.2A1.7 1.7 0 0 0 7.5 4a1.7 1.7 0 0 0 1.3-1.3l.1-.3a2 2 0 1 1 4 0l.1.3A1.7 1.7 0 0 0 14.5 4a1.7 1.7 0 0 0 1.7-.9l.1-.2a2 2 0 1 1 3.5 2l-.1.2A1.7 1.7 0 0 0 19.4 7a1.7 1.7 0 0 0 1.3 1.5l.3.1a2 2 0 1 1 0 4l-.3.1a1.7 1.7 0 0 0-1.3 1.3Z",
  ],
  sparkles: [
    "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z",
    "M5 3v4",
    "M3 5h4",
    "M19 17v4",
    "M17 19h4",
  ],
  timer: ["M10 2h4", "M12 14l3-3", "M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  upload: ["M12 3v12", "m7 8 5-5 5 5", "M5 21h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  "x-circle": [
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
    "m15 9-6 6",
    "m9 9 6 6",
  ],
};

export const view = (model: Model): Document => {
  const h = html<Message>();
  const threads = deriveThreads(model.items);
  const page = routeView(model);

  return {
    title: titleForRoute(model.route),
    body: h.main(
      [h.Class("app-shell")],
      [
        sidebarView(threads, model.selectedThreadId, model.route),
        h.section(
          [h.Class("app-main")],
          [h.div([h.Class("page-shell page-shell-md")], page)],
        ),
      ],
    ),
  };
};

const titleForRoute = (route: DispatchRoute): string => {
  if (route === "discover") return "Attune Discover";
  if (route === "workbench") return "Attune Workbench";
  if (route === "findings") return "Attune Findings";
  return "Attune Dispatch";
};

const routeView = (model: Model): ReadonlyArray<Html> => {
  switch (model.route) {
    case "discover":
      return discoverRouteView();
    case "workbench":
      return workbenchRouteView(model);
    case "findings":
      return findingsRouteView();
    case "lineage":
      return simpleRouteView(
        "Lineage",
        "Candidate lineage",
        "Track how examples, selectors, and evidence changed before promotion.",
      );
    case "exports":
      return simpleRouteView(
        "Exports",
        "Export promoted rule packet",
        "Ship ast-grep rules, prompts, examples, and review evidence as one artifact.",
      );
    case "settings":
      return simpleRouteView(
        "Settings",
        "Workspace settings",
        "Keep scan paths, model routing, and promotion thresholds explicit.",
      );
    default:
      return dispatchRouteView(model);
  }
};

const dispatchRouteView = (model: Model): ReadonlyArray<Html> => {
  const counts = dispatchSummaryCounts(model.items);
  const visibleItems = filterDispatchItems(model.items, model.filter);

  return [
    pageHeaderView(
      "Dispatch",
      "Attune Dispatch",
      "A calm event river for autonomous Attune work, validation, safety gates, and human actions.",
    ),
    statStripView([
      { icon: "sparkles", label: "Items", value: String(counts.total) },
      { icon: "eye", label: "Review", value: String(counts.review) },
      { icon: "timer", label: "Safety", value: String(counts.safety) },
      { icon: "x-circle", label: "Failures", value: String(counts.failed) },
    ]),
    filterTabsView(model.filter),
    humanActionView(model.items),
    dispatchRiverView(visibleItems),
    foldkitMdxBlocksView(model.page.document.blocks),
    feedLinksView(),
  ];
};

const discoverRouteView = (): ReadonlyArray<Html> => {
  const h = html<Message>();

  return [
    pageHeaderView(
      "Discover",
      "12 possible patterns in bulletproof-react",
      "Attune scanned the repository and grouped what it found by how ready each pattern is to become a rule.",
    ),
    hDiv("toolbar-row", [
      filterTabsStaticView([
        { active: true, count: 5, label: "Ready to inspect", tone: "primary" },
        { count: 3, label: "Needs examples", tone: "warning" },
        { count: 2, label: "Too broad", tone: "info" },
        { count: 2, label: "Promoted", tone: "violet" },
      ]),
      searchInputView("Search patterns..."),
    ]),
    sectionView(undefined, undefined, [
      hDiv("featured-pattern", [
        hDiv("featured-pattern-heading", [
          iconTileView("paintbrush", "primary", "lg"),
          hDiv("", [
            h.p(
              [h.Class("ready-line")],
              [dotView("primary"), "Ready to inspect"],
            ),
            h.h2(
              [h.Class("feature-title")],
              ["Styling belongs in UI primitives and recipes"],
            ),
          ]),
          buttonView("Open in Workbench", "primary", "arrow-up-right"),
        ]),
        h.p(
          [h.Class("feature-copy")],
          [
            "We found repeated inline styling and className usage outside of UI primitive paths. Centralizing these keeps app components structural and easier to evolve.",
          ],
        ),
        sectionLabelView("Supporting examples", "section-label-spaced"),
        hDiv("example-grid", [
          codePanelView(
            "src/features/dashboard/StatsCard.tsx",
            codeView(discoverExampleA, 32),
          ),
          codePanelView(
            "src/components/UserAvatar.tsx",
            codeView(discoverExampleB, 18),
          ),
        ]),
        sectionLabelView(
          "Possible deterministic shape",
          "section-label-spaced",
        ),
        h.p(
          [h.Class("section-copy")],
          [
            "Ast-grep can approximate this pattern with JSX style and className selectors.",
          ],
        ),
        codePanelView(undefined, codeView(discoverShape, 1), true),
        sectionLabelView("Known risk", "section-label-spaced"),
        h.p(
          [h.Class("section-copy")],
          [
            "May catch animation or layout styles that are intentionally local to a component.",
          ],
        ),
        metaGridView([
          { label: "Evidence", value: "34 matches" },
          { label: "Files", value: "12" },
          { label: "Confidence", value: "High", tone: "success" },
          { label: "Determinism", value: "Likely", tone: "success" },
          { label: "Last scanned", value: "2 min ago" },
        ]),
      ]),
    ]),
    sectionView(
      "All patterns",
      undefined,
      [
        listView([
          {
            active: true,
            description:
              "Keep visual styling centralized so app components stay structural.",
            icon: "paintbrush",
            meta: [
              "Ready to inspect",
              "34 matches",
              "12 files",
              "JSX style / className",
            ],
            status: "Ready to inspect",
            title: "Styling belongs in UI primitives and recipes",
            tone: "primary",
          },
          {
            description:
              "Side effects should live in loaders, actions, or infrastructure, not in UI components.",
            icon: "box",
            meta: [
              "Ready to inspect",
              "14 matches",
              "5 files",
              "imports / fetch / IO",
            ],
            status: "Ready to inspect",
            title: "Effects stay at the boundary",
            tone: "primary",
          },
          {
            description: "Complex business logic appears in UI or routes.",
            icon: "layout-grid",
            meta: [
              "Needs examples",
              "9 matches",
              "7 files",
              "business logic heuristics",
            ],
            status: "Needs examples",
            title: "Domain logic in domain layer",
            tone: "warning",
          },
        ]),
        paginationView(),
      ],
      "Sort: Most evidence",
    ),
  ];
};

const discoverExampleA = `return (
  <div style={{
    padding: '16px',
    borderRadius: 8,
    background: '#1f2937',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <h3>{title}</h3>
    {children}
  </div>
)`;

const discoverExampleB = `return (
  <img
    src={src}
    style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      objectFit: 'cover'
    }}
    alt={name}
  />
)`;

const workbenchRouteView = (model: Model): ReadonlyArray<Html> => {
  const h = html<Message>();
  const snapshot = model.serverSnapshot;

  if (snapshot === null) {
    return [
      pageHeaderView(
        "Workbench",
        "FoldKit fixture route",
        "The local closed-loop fixture is loading its first atom-derived workbench snapshot.",
      ),
      sectionView(undefined, undefined, [
        hDiv("callout callout-warning", [
          iconTileView("timer", "warning"),
          h.div(
            [],
            [
              sectionLabelView("Fixture startup"),
              h.h2([], ["Waiting for atom snapshot"]),
              h.p(
                [],
                [
                  model.fixtureRoute.lastError === ""
                    ? "Start the deterministic run to project fixture events through the read model and atom workspace."
                    : model.fixtureRoute.lastError,
                ],
              ),
            ],
          ),
          h.button(
            [
              h.Class("button button-primary"),
              h.OnClick(FixtureStartRequested()),
            ],
            [iconView("sparkles"), "Start fixture"],
          ),
        ]),
      ]),
    ];
  }

  const packet = snapshot.decisionPacket;
  const hypothesis = packet.hypotheses[0];
  const bestNextAction = packet.bestNextAction;
  const routeStatus =
    model.pendingCommand === ""
      ? model.fixtureRoute.status
      : model.pendingCommand;
  const proofComplete = packet.evidence.length > 0;

  return [
    pageHeaderView(
      "Workbench",
      hypothesis?.title ?? "FoldKit fixture route",
      "FoldKit drives the local route; render state comes from the server-side atom-derived WorkbenchSnapshot.",
    ),
    statStripView([
      { icon: "layers", value: `v${snapshot.version}`, label: "Snapshot" },
      {
        icon: "scan-text",
        value: String(packet.anchors.length),
        label: "Anchors",
      },
      {
        icon: "file-code",
        value: String(packet.evidence.length),
        label: "Evidence",
      },
      {
        icon: "eye",
        value: String(snapshot.reviewQueue.length),
        label: "Review",
      },
      { icon: "timer", value: routeStatus, label: "Route" },
    ]),
    sectionView(
      "Best next action",
      packet.run.repoSnapshotId,
      [
        hDiv("featured-pattern", [
          hDiv("featured-pattern-heading", [
            iconTileView(
              proofComplete ? "check" : "flask",
              proofComplete ? "success" : "primary",
              "lg",
            ),
            hDiv("", [
              h.p(
                [h.Class("ready-line")],
                [
                  dotView(proofComplete ? "success" : "primary"),
                  bestNextAction.kind,
                ],
              ),
              h.h2([h.Class("feature-title")], [bestNextAction.label]),
            ]),
            h.button(
              [
                h.Class("button button-primary"),
                h.OnClick(
                  FixtureStepRequested({
                    step: proofComplete
                      ? "request-promotion"
                      : "complete-proof",
                  }),
                ),
              ],
              [
                iconView(proofComplete ? "arrow-up" : "flask"),
                proofComplete ? "Request promotion" : "Run fixture proof",
              ],
            ),
          ]),
          h.p(
            [h.Class("feature-copy")],
            [
              hypothesis?.summary ??
                "No active hypothesis has been projected yet.",
            ],
          ),
          metaGridView([
            { label: "Run", value: snapshot.runId },
            { label: "Packet", value: packet.packetId },
            {
              label: "Budget",
              value: `${packet.budget.joernRunsRemaining} Joern`,
              tone: "info",
            },
            {
              label: "Route steps",
              value: String(model.fixtureRoute.routeStepCount),
            },
            {
              label: "Useful evidence",
              value: String(
                model.fixtureRoute.summary?.usefulEvidenceCount ?? 0,
              ),
              tone: proofComplete ? "success" : "warning",
            },
          ]),
        ]),
      ],
      h.button(
        [h.Class("button button-ghost"), h.OnClick(FixtureStartRequested())],
        [iconView("sparkles"), "Restart"],
      ),
    ),
    sectionView(
      "Anchors",
      "Selected anchors are interaction state; anchor data is snapshot-derived.",
      [
        listView(
          packet.anchors.map((anchor) => ({
            active: anchor.anchorId === model.fixtureRoute.selectedAnchorId,
            description: anchor.excerpt,
            icon: "key",
            meta: [
              `score ${anchor.score.toFixed(2)}`,
              ...anchor.vocabulary.slice(0, 2),
            ],
            status:
              anchor.anchorId === model.fixtureRoute.selectedAnchorId
                ? "selected"
                : "snapshot",
            title: anchor.title,
            tone:
              anchor.anchorId === model.fixtureRoute.selectedAnchorId
                ? "primary"
                : "info",
          })),
        ),
        hDiv(
          "chip-row",
          packet.anchors.map((anchor) =>
            h.button(
              [
                h.Class("filter-tab"),
                h.OnClick(SelectedFixtureAnchor({ anchorId: anchor.anchorId })),
              ],
              [anchor.title],
            ),
          ),
        ),
      ],
    ),
    sectionView(
      "Evidence",
      "Proof evidence appears only after the command projects semantic events and reads the atom snapshot.",
      [
        packet.evidence.length === 0
          ? hDiv("card card-padded", [
              h.h2([h.Class("card-title")], ["No proof evidence yet"]),
              h.p(
                [h.Class("section-copy")],
                [
                  "Run the fixture proof to append deterministic semantic evidence and refresh this snapshot.",
                ],
              ),
            ])
          : listView(
              packet.evidence.map((evidence) => ({
                description: evidence.summary,
                icon: "file-code",
                meta: [
                  evidence.templateId,
                  `${evidence.durationMs} ms`,
                  ...evidence.excerpts,
                ],
                status: evidence.confidence,
                title: evidence.evidenceId,
                tone: "success",
              })),
            ),
      ],
    ),
    sectionView(
      "Route trace",
      "Trace entries connect FoldKit events, semantic events, invalidation keys, and refreshed atom labels.",
      [
        listView(
          model.fixtureRoute.trace.slice(-4).map((entry) => ({
            description: [
              `semantic: ${entry.semanticEventTags.join(", ") || "none"}`,
              `invalidated: ${entry.invalidatedKeys.join(", ") || "none"}`,
            ].join(" | "),
            icon: "layers",
            meta: [
              `snapshot v${entry.snapshotVersion}`,
              ...entry.routeEventTags,
            ],
            status: entry.step,
            title: entry.traceId,
            tone: "violet",
          })),
        ),
      ],
    ),
    actionBarView([
      h.button(
        [
          h.Class("button button-ghost"),
          h.OnClick(FixtureStepRequested({ step: "complete-proof" })),
        ],
        [iconView("flask"), "Run proof step"],
      ),
      h.button(
        [
          h.Class("button button-primary"),
          h.OnClick(
            RequestedPromotion({
              hypothesisId: hypothesis?.hypothesisId ?? "",
            }),
          ),
        ],
        [iconView("arrow-up"), "Promote rule"],
      ),
    ]),
  ];
};

const findingsRouteView = (): ReadonlyArray<Html> => {
  const h = html<Message>();

  return [
    pageHeaderView(
      "Findings",
      "Review what this candidate matched",
      "Confirm true positives and weed out noise before promoting the rule.",
      "Back to Workbench",
    ),
    statStripView([
      { icon: "scan-text", value: "34", label: "Matches" },
      { icon: "eye", value: "9", label: "Reviewed" },
      { icon: "x-circle", value: "2", label: "False positives" },
      { icon: "minus-circle", value: "1", label: "Ignored" },
      { icon: "timer", value: "180 ms", label: "Scan time" },
    ]),
    sectionView(undefined, undefined, [
      hDiv("finding-file-row", [
        h.span(
          [h.Class("mono-row")],
          [iconView("file-code", "icon-muted"), "src/components/Card.tsx"],
        ),
        h.span([h.Class("finding-meta")], ["Lines 54-62", badgeView("TSX")]),
      ]),
      codePanelView(undefined, codeView(selectedFindingCode, 52)),
      sectionLabelView("Why it matched", "section-label-spaced"),
      h.p(
        [h.Class("section-copy")],
        [
          "The rule flags inline visual styles on UI primitives. This style object sets visual properties directly on a DOM element instead of using a recipe or primitive variant.",
        ],
      ),
      sectionLabelView("Deterministic selector", "section-label-spaced"),
      codePanelView(undefined, codeView(discoverShape, 1), true),
      sectionLabelView("Review decision", "section-label-spaced"),
      hDiv("decision-grid", [
        decisionButtonView(
          "check",
          "success",
          "True positive",
          "This is a valid match",
        ),
        decisionButtonView(
          "x-circle",
          "destructive",
          "False positive",
          "Not a valid match",
        ),
        decisionButtonView(
          "minus-circle",
          "warning",
          "Ignore",
          "Ignore and move on",
        ),
      ]),
      h.div(
        [h.Class("note-box")],
        [
          "Add a note to explain your decision...",
          h.span([h.Class("note-count")], ["0 / 200"]),
        ],
      ),
    ]),
    sectionView(undefined, undefined, [
      hDiv("toolbar-row", [
        filterTabsStaticView([
          { label: "Unreviewed", count: 23, active: true },
          { label: "False positives", count: 2 },
          { label: "Ignored", count: 1 },
          { label: "All", count: 34 },
        ]),
        hDiv("toolbar-controls", [
          searchInputView("Search findings..."),
          iconButtonView("filter"),
        ]),
      ]),
      hDiv("finding-nav-row", [
        h.span([], ["Finding 9 of 34"]),
        h.span([], ["Prev  Next"]),
      ]),
      listView([
        {
          active: true,
          code: "<div style={{ background: '#121212', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>",
          compact: true,
          description: "Rule: Uses raw style object for visual styling",
          meta: ["Matched", "58"],
          status: "Matched",
          title: "src/components/Card.tsx",
          tone: "success",
        },
        {
          code: "<div style={{ width: 40, height: 40, borderRadius: '50%' }} />",
          compact: true,
          description: "Rule: Uses raw style object for visual styling",
          meta: ["False positive", "21"],
          status: "False positive",
          title: "src/components/UserAvatar.tsx",
          tone: "destructive",
        },
      ]),
    ]),
  ];
};

const simpleRouteView = (
  eyebrow: string,
  title: string,
  subtitle: string,
): ReadonlyArray<Html> => [
  pageHeaderView(eyebrow, title, subtitle),
  sectionView(undefined, undefined, [
    hDiv("card-grid", [
      cardView(
        "Source evidence",
        "This route keeps the v0 card, code panel, and action-bar grammar while live data catches up.",
      ),
      cardView(
        "FoldKit MDX",
        "Agents author constrained page blocks; FoldKit renders typed data without React runtime execution.",
      ),
    ]),
  ]),
];

const sidebarView = (
  threads: ReadonlyArray<WorkThread>,
  selectedThreadId: string,
  route: DispatchRoute,
): Html => {
  const h = html<Message>();
  const nav: ReadonlyArray<
    Readonly<{ label: string; route: DispatchRoute; icon: IconName }>
  > = [
    { icon: "sparkles", label: "Dispatch", route: "dispatch" },
    { icon: "compass", label: "Discover", route: "discover" },
    { icon: "flask", label: "Workbench", route: "workbench" },
    { icon: "list-checks", label: "Findings", route: "findings" },
    { icon: "git-fork", label: "Lineage", route: "lineage" },
    { icon: "upload", label: "Exports", route: "exports" },
    { icon: "settings", label: "Settings", route: "settings" },
  ];

  return h.aside(
    [h.Class("sidebar"), h.AriaLabel("Attune navigation")],
    [
      h.div(
        [h.Class("brand-row")],
        [iconView("sparkles", "brand-icon"), h.span([], ["attune"])],
      ),
      h.nav(
        [h.Class("nav-list"), h.AriaLabel("Primary")],
        nav.map((item) =>
          navLabelView(item.label, item.route, item.icon, route),
        ),
      ),
      h.div(
        [h.Class("candidate-card")],
        [
          sectionLabelView("Current candidate"),
          h.p([], ["Styling belongs in UI primitives and recipes"]),
          h.div(
            [h.Class("candidate-badges")],
            [badgeView("Candidate B (v2)", "primary"), badgeView("Promoted")],
          ),
        ],
      ),
      h.div(
        [h.Class("repo-grid")],
        [
          repoMetaView("Repository", "bulletproof-react", "git-fork"),
          repoMetaView("Branch", "main", "git-branch"),
        ],
      ),
      h.div(
        [h.Class("sidebar-threads")],
        [
          sectionLabelView("Active threads"),
          ...threads
            .slice(0, 2)
            .map((thread) =>
              h.button(
                [
                  h.Class(
                    thread.id === selectedThreadId
                      ? "thread-pill is-selected"
                      : "thread-pill",
                  ),
                  h.OnClick(SelectedThread({ threadId: thread.id })),
                ],
                [
                  h.span([], [thread.title]),
                  h.span(
                    [h.Class(`thread-status is-${thread.status}`)],
                    [thread.status],
                  ),
                ],
              ),
            ),
        ],
      ),
      h.div(
        [h.Class("user-row")],
        [
          h.span([h.Class("avatar")], ["AB"]),
          h.span([], [h.strong([], ["Alex"]), h.span([], ["attune@local"])]),
          iconView("chevron-down", "icon-muted"),
        ],
      ),
    ],
  );
};

const navLabelView = (
  label: string,
  route: DispatchRoute,
  icon: IconName,
  current: DispatchRoute,
): Html => {
  const h = html<Message>();
  const selected = route === current;

  return h.button(
    [
      h.Class(selected ? "nav-item is-selected" : "nav-item"),
      h.OnClick(SelectedRoute({ route })),
    ],
    [iconView(icon, selected ? "nav-icon is-selected" : "nav-icon"), label],
  );
};

const repoMetaView = (label: string, value: string, icon: IconName): Html => {
  const h = html<Message>();

  return h.div(
    [],
    [
      h.p([h.Class("tiny-label")], [label]),
      h.p([h.Class("repo-meta-value")], [iconView(icon, "icon-muted"), value]),
    ],
  );
};

const pageHeaderView = (
  eyebrow: string,
  title: string,
  subtitle: string,
  back?: string,
): Html => {
  const h = html<Message>();

  return h.header(
    [h.Class("page-header")],
    [
      h.div(
        [h.Class("back-row")],
        back === undefined
          ? []
          : [
              h.button(
                [h.Class("back-button")],
                [iconView("arrow-left"), back],
              ),
            ],
      ),
      sectionLabelView(eyebrow, "page-eyebrow"),
      h.h1([h.Class("page-title")], [title]),
      h.p([h.Class("page-subtitle")], [subtitle]),
    ],
  );
};

const statStripView = (items: ReadonlyArray<StatItem>): Html => {
  const h = html<Message>();

  return h.div(
    [h.Class(items.length === 5 ? "stat-strip is-five" : "stat-strip")],
    items.map((item) =>
      h.div(
        [h.Class("stat-item")],
        [
          iconView(item.icon, "stat-icon"),
          h.span(
            [],
            [
              h.span([h.Class("stat-value")], [item.value]),
              h.span([h.Class("stat-label")], [item.label]),
            ],
          ),
        ],
      ),
    ),
  );
};

const filterTabsView = (current: DispatchFilter): Html => {
  const h = html<Message>();
  const filters: ReadonlyArray<TabItem> = [
    { filter: "all", label: "All" },
    { filter: "review", label: "Review" },
    { filter: "safety", label: "Safety" },
    { filter: "failed", label: "Failed" },
  ];

  return h.div(
    [h.Class("filter-tabs")],
    filters.map((filter) =>
      h.button(
        [
          h.Class(
            filter.filter === current ? "filter-tab is-active" : "filter-tab",
          ),
          h.OnClick(SelectedFilter({ filter: filter.filter ?? "all" })),
        ],
        [filter.label],
      ),
    ),
  );
};

const filterTabsStaticView = (tabs: ReadonlyArray<TabItem>): Html => {
  const h = html<Message>();

  return h.div(
    [h.Class("filter-tabs")],
    tabs.map((tab) =>
      h.button(
        [h.Class(tab.active === true ? "filter-tab is-active" : "filter-tab")],
        [
          tab.tone === undefined ? h.empty : dotView(tab.tone),
          tab.label,
          tab.count === undefined
            ? h.empty
            : h.span([h.Class("tab-count")], [String(tab.count)]),
        ],
      ),
    ),
  );
};

const humanActionView = (items: ReadonlyArray<DispatchItem>): Html => {
  const h = html<Message>();
  const action = items.find((item) => item.requiresHuman);

  if (action === undefined) {
    return h.empty;
  }

  return h.section(
    [h.Class("callout callout-warning")],
    [
      iconTileView("sparkles", "warning"),
      h.div(
        [],
        [
          sectionLabelView("Needs human review"),
          h.h2([], [action.title]),
          h.p([], [action.summary]),
        ],
      ),
      badgeView(action.risk, "warning"),
    ],
  );
};

const dispatchRiverView = (items: ReadonlyArray<DispatchItem>): Html =>
  sectionView(
    "Event river",
    undefined,
    [listView(items.map(dispatchItemToRow))],
    `${items.length} visible`,
  );

const dispatchItemToRow = (item: DispatchItem): ListRowItem => ({
  active: item.severity === "safety",
  description: item.summary,
  icon:
    item.severity === "safety"
      ? "sparkles"
      : item.kind === "fuzzer"
        ? "flask"
        : item.kind === "linear"
          ? "list-checks"
          : "file-code",
  meta: [item.kind, formatTime(item.occurredAt), ...item.tags],
  status: item.severity,
  title: item.title,
  tone: severityTone(item.severity),
});

const foldkitMdxBlocksView = (blocks: ReadonlyArray<FoldkitMdxBlock>): Html => {
  const h = html<Message>();
  const componentNames = blocks
    .filter((block) => block._tag === "Component")
    .map((block) => block.name);

  return sectionView("FoldKit MDX contract", undefined, [
    hDiv("card card-padded", [
      h.h2([h.Class("card-title")], ["Agent-authored page grammar"]),
      h.p(
        [h.Class("section-copy")],
        [
          "This page is backed by constrained MDX component slots decoded into data before FoldKit renders them.",
        ],
      ),
      hDiv(
        "chip-row",
        componentNames.map((name) => badgeView(name, "primary")),
      ),
    ]),
  ]);
};

const feedLinksView = (): Html =>
  sectionView("Feeds", undefined, [
    hDiv("chip-row", [
      badgeView("/feeds/dispatch.xml"),
      badgeView("/feeds/review-required.xml"),
      badgeView("/feeds/safety.xml", "warning"),
      badgeView("/feeds/dispatch.json", "info"),
    ]),
  ]);

const sectionView = (
  label: string | undefined,
  description: string | undefined,
  children: ReadonlyArray<Html>,
  action?: Html | string,
): Html => {
  const h = html<Message>();

  return h.section(
    [h.Class("page-section")],
    [
      label === undefined && description === undefined && action === undefined
        ? h.empty
        : h.div(
            [h.Class("section-head")],
            [
              h.div(
                [],
                [
                  label === undefined ? h.empty : sectionLabelView(label),
                  description === undefined
                    ? h.empty
                    : h.p([h.Class("section-description")], [description]),
                ],
              ),
              typeof action === "string"
                ? h.span([h.Class("section-action")], [action])
                : (action ?? h.empty),
            ],
          ),
      h.div([h.Class("section-body")], children),
    ],
  );
};

const exampleBlockView = (input: {
  readonly code: string;
  readonly count: string;
  readonly description: string;
  readonly file: string;
  readonly icon: IconName;
  readonly startLine: number;
  readonly title: string;
  readonly tone: Tone;
}): Html => {
  const h = html<Message>();

  return codePanelView(
    undefined,
    codeView(input.code, input.startLine),
    false,
    h.div(
      [],
      [
        h.div(
          [h.Class("example-head")],
          [
            h.div(
              [h.Class("example-title")],
              [
                iconView(input.icon, `tone-${input.tone}`),
                h.h3([], [input.title]),
              ],
            ),
            h.button(
              [h.Class("count-pill")],
              [input.count, iconView("chevron-right", "icon-muted")],
            ),
          ],
        ),
        h.p([h.Class("example-desc")], [input.description]),
        h.p([h.Class("example-file")], [input.file]),
      ],
    ),
  );
};

const reviseWithIntentView = (): Html => {
  const h = html<Message>();

  return h.section(
    [h.Class("revise-card")],
    [
      h.div(
        [h.Class("revise-copy")],
        [
          iconTileView("sparkles", "violet"),
          h.div(
            [],
            [
              h.h3([], ["Revise with intent"]),
              h.p(
                [],
                [
                  "Describe what should change. Attune will update the examples and the rule together; YAML stays for inspection.",
                ],
              ),
            ],
          ),
        ],
      ),
      buttonView("Revise candidate", "ghost", "sparkles"),
    ],
  );
};

const actionBarView = (actions: ReadonlyArray<Html>): Html => {
  const h = html<Message>();

  return h.div([h.Class("action-bar")], actions);
};

const metaGridView = (
  items: ReadonlyArray<Readonly<{ label: string; value: string; tone?: Tone }>>,
): Html => {
  const h = html<Message>();

  return h.dl(
    [h.Class("meta-grid")],
    items.map((item) =>
      h.div(
        [],
        [
          h.dt([], [item.label]),
          h.dd(
            [],
            [
              item.value,
              item.tone === undefined ? h.empty : dotView(item.tone),
            ],
          ),
        ],
      ),
    ),
  );
};

const listView = (items: ReadonlyArray<ListRowItem>): Html => {
  const h = html<Message>();

  return h.ul(
    [h.Class("list")],
    items.map((item) =>
      h.li(
        [
          h.Class(
            `${item.compact === true ? "list-row is-compact" : "list-row"}${
              item.active === true ? " is-active" : ""
            }`,
          ),
        ],
        [
          item.icon === undefined ? h.empty : iconTileView(item.icon),
          h.div(
            [h.Class("list-row-body")],
            [
              h.div(
                [h.Class("list-row-title-line")],
                [
                  h.h3([], [item.title]),
                  h.div(
                    [h.Class("list-row-trailing")],
                    [
                      item.status === undefined
                        ? h.empty
                        : badgeView(item.status, item.tone),
                      iconView("chevron-right", "icon-muted"),
                    ],
                  ),
                ],
              ),
              item.description === undefined
                ? h.empty
                : h.p([h.Class("list-row-desc")], [item.description]),
              item.meta === undefined
                ? h.empty
                : h.div(
                    [h.Class("list-row-meta")],
                    item.meta.map((meta, index) =>
                      index === 0 && item.tone !== undefined
                        ? h.span([], [dotView(item.tone), meta])
                        : h.span([], [meta]),
                    ),
                  ),
              item.code === undefined
                ? h.empty
                : h.div(
                    [h.Class("list-row-code")],
                    [codeView(item.code, 1, false)],
                  ),
            ],
          ),
        ],
      ),
    ),
  );
};

const decisionButtonView = (
  icon: IconName,
  tone: Tone,
  title: string,
  subtitle: string,
): Html => {
  const h = html<Message>();

  return h.button(
    [h.Class("decision-button")],
    [
      iconView(icon, `tone-${tone}`),
      h.span(
        [],
        [
          h.span([h.Class("decision-title")], [title]),
          h.span([h.Class("decision-subtitle")], [subtitle]),
        ],
      ),
    ],
  );
};

const searchInputView = (placeholder: string): Html => {
  const h = html<Message>();

  return h.div(
    [h.Class("search-input")],
    [iconView("filter", "icon-muted"), h.span([], [placeholder])],
  );
};

const paginationView = (): Html => {
  const h = html<Message>();

  return h.div(
    [h.Class("pagination")],
    [
      h.button([], ["Prev"]),
      h.button([h.Class("is-current")], ["1"]),
      h.button([], ["2"]),
      h.button([], ["3"]),
      h.button([], ["Next"]),
    ],
  );
};

const cardView = (title: string, body: string): Html => {
  const h = html<Message>();

  return h.article(
    [h.Class("card card-padded")],
    [h.h2([h.Class("card-title")], [title]), h.p([], [body])],
  );
};

const codePanelView = (
  filename: string | undefined,
  content: Html,
  copy = false,
  header?: Html,
): Html => {
  const h = html<Message>();

  return h.div(
    [h.Class("code-panel")],
    [
      header ??
        (filename === undefined
          ? h.empty
          : h.div([h.Class("code-caption")], [filename])),
      copy
        ? h.button([h.Class("copy-button")], [iconView("copy", "icon-muted")])
        : h.empty,
      h.div([h.Class("code-body")], [content]),
    ],
  );
};

const codeView = (code: string, startLine = 1, lineNumbers = true): Html => {
  const h = html<Message>();
  const lines = code.split("\n");

  return h.pre(
    [h.Class("code-view")],
    lines.flatMap((line, index) => [
      h.span(
        [h.Class("code-line")],
        [
          lineNumbers
            ? h.span([h.Class("code-line-number")], [String(startLine + index)])
            : h.empty,
          h.code([], [line.length === 0 ? " " : line]),
        ],
      ),
      "\n",
    ]),
  );
};

const buttonView = (
  label: string,
  variant: "primary" | "ghost",
  icon?: IconName,
): Html => {
  const h = html<Message>();

  return h.button(
    [h.Class(`button button-${variant}`)],
    [label, icon === undefined ? h.empty : iconView(icon)],
  );
};

const iconButtonView = (icon: IconName): Html => {
  const h = html<Message>();

  return h.button([h.Class("icon-button")], [iconView(icon)]);
};

const iconTileView = (
  icon: IconName,
  tone: Tone = "muted",
  size: "sm" | "md" | "lg" = "md",
): Html => {
  const h = html<Message>();

  return h.span(
    [h.Class(`icon-tile icon-tile-${size} tone-${tone}`)],
    [iconView(icon)],
  );
};

const iconView = (name: IconName, className = ""): Html => {
  const h = html<Message>();

  return h.svg(
    [
      h.Class(`icon ${className}`.trim()),
      h.ViewBox("0 0 24 24"),
      h.Fill("none"),
      h.Stroke("currentColor"),
      h.StrokeWidth("1.75"),
      h.StrokeLinecap("round"),
      h.StrokeLinejoin("round"),
    ],
    iconPaths[name].map((path) => h.path([h.D(path)], [])),
  );
};

const badgeView = (label: string, tone: Tone = "muted"): Html => {
  const h = html<Message>();

  return h.span([h.Class(`badge tone-${tone}`)], [label]);
};

const dotView = (tone: Tone = "primary"): Html => {
  const h = html<Message>();

  return h.span([h.Class(`dot tone-${tone}`)], []);
};

const sectionLabelView = (label: string, className = ""): Html => {
  const h = html<Message>();

  return h.p([h.Class(`section-label ${className}`.trim())], [label]);
};

const hDiv = (
  className: string,
  children: ReadonlyArray<Html | string>,
): Html => {
  const h = html<Message>();

  return h.div(className.length === 0 ? [] : [h.Class(className)], children);
};

const severityTone = (severity: DispatchItem["severity"]): Tone => {
  if (severity === "success") return "success";
  if (severity === "warning" || severity === "blocked") return "warning";
  if (severity === "safety" || severity === "failure") return "destructive";
  return "info";
};

const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
