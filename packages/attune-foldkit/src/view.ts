import { type Document, type Html, html } from "foldkit/html"

import type {
  AnchorCard,
  EvidencePacket,
  FoldSceneNode,
  MotifHypothesis,
  ReviewItem,
} from "@attune/attuned-discovery"

import {
  deriveThreads,
  filterActivityItems,
} from "./activity.js"
import type {
  ActivityFilter,
  ActivityItem,
  AttuneRoute,
  FoldkitMdxBlock,
  WorkThread,
} from "./schema.js"

import type { Message } from "./message.js"
import {
  FixtureStartRequested,
  FixtureStepRequested,
  RequestedPromotion,
  SelectedEvidence,
  SelectedFilter,
  SelectedFixtureAnchor,
  SelectedHypothesis,
  SelectedRoute,
  SelectedThread,
} from "./message.js"
import type { Model } from "./model.js"

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
  | "x-circle"

type Tone =
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "violet"
  | "destructive"

type StatItem = Readonly<{
  readonly icon: IconName
  readonly value: string
  readonly label: string
}>

type TabItem = Readonly<{
  readonly label: string
  readonly count?: number
  readonly tone?: Tone
  readonly active?: boolean
  readonly filter?: ActivityFilter
}>

type ListRowItem = Readonly<{
  readonly icon?: IconName
  readonly title: string
  readonly description?: string
  readonly status?: string
  readonly tone?: Tone
  readonly meta?: ReadonlyArray<string>
  readonly code?: string
  readonly active?: boolean
  readonly compact?: boolean
}>

type MdxComponentBlock = Extract<
  FoldkitMdxBlock,
  Readonly<{ _tag: "Component" }>
>

type MdxComponentProps = Readonly<{
  readonly prop: (name: string) => string | undefined
  readonly arrayProp: (name: string) => ReadonlyArray<string>
  readonly route: (name: string) => AttuneRoute | undefined
}>

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
}`

const negativeExample = `return (
  <img
    src={src}
    alt={name}
    width={40}
    height={40}
    borderRadius: '50%',
    objectFit: 'cover'
  />
)`

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
  suggestion: Replace inline style with a className or token`

const discoverShape = `pattern: $EL[style={$OBJ}]
pattern-not: $EL[style={$OBJ}] inside "**/(ui|components|primitives|recipes)/**"`

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
}`

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
  "file-code": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6", "m10 13-2 2 2 2", "m14 17 2-2-2-2"],
  filter: ["M3 5h18", "M7 12h10", "M10 19h4"],
  flask: ["M9 3h6", "M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3", "M8 15h8"],
  "git-branch": ["M6 3v12", "M18 9a3 3 0 1 0-3-3", "M6 21a3 3 0 1 0 0-6", "M18 9c0 4-3 6-6 6H9"],
  "git-fork": ["M12 18V6", "M5 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M19 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M5 6v2a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V6", "M12 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  key: ["m21 2-2 2", "m15.5 7.5 2 2", "M7 14a5 5 0 1 1 7.1-7.1L22 14.8V19h-4.2L15 16.2l-2 2H9.8Z"],
  layers: ["m12 2 9 5-9 5-9-5Z", "m3 12 9 5 9-5", "m3 17 9 5 9-5"],
  "layout-grid": ["M3 3h7v7H3Z", "M14 3h7v7h-7Z", "M14 14h7v7h-7Z", "M3 14h7v7H3Z"],
  "list-checks": ["m3 7 2 2 4-4", "M13 6h8", "m3 17 2 2 4-4", "M13 18h8"],
  "minus-circle": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M8 12h8"],
  paintbrush: ["M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-3-3Z", "M9 12l3 3", "M7 14c-2 0-4 2-4 4a3 3 0 0 0 3 3c2 0 4-2 4-4Z"],
  "scan-text": ["M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2", "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2", "M7 8h10", "M7 12h10", "M7 16h6"],
  settings: ["M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.2a2 2 0 1 1-3.5 2l-.1-.2a1.7 1.7 0 0 0-1.7-.9 1.7 1.7 0 0 0-1.5 1.3l-.1.3a2 2 0 1 1-4 0l-.1-.3A1.7 1.7 0 0 0 7.3 18a1.7 1.7 0 0 0-1.7.9l-.1.2a2 2 0 1 1-3.5-2l.1-.2A1.7 1.7 0 0 0 2.6 15a1.7 1.7 0 0 0-1.3-1.5L1 13.4a2 2 0 1 1 0-4l.3-.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9L2.2 5a2 2 0 1 1 3.5-2l.1.2A1.7 1.7 0 0 0 7.5 4a1.7 1.7 0 0 0 1.3-1.3l.1-.3a2 2 0 1 1 4 0l.1.3A1.7 1.7 0 0 0 14.5 4a1.7 1.7 0 0 0 1.7-.9l.1-.2a2 2 0 1 1 3.5 2l-.1.2A1.7 1.7 0 0 0 19.4 7a1.7 1.7 0 0 0 1.3 1.5l.3.1a2 2 0 1 1 0 4l-.3.1a1.7 1.7 0 0 0-1.3 1.3Z"],
  sparkles: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z", "M5 3v4", "M3 5h4", "M19 17v4", "M17 19h4"],
  timer: ["M10 2h4", "M12 14l3-3", "M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  upload: ["M12 3v12", "m7 8 5-5 5 5", "M5 21h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  "x-circle": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "m15 9-6 6", "m9 9 6 6"],
}

export const view = (model: Model): Document => {
  const h = html<Message>()
  const threads = deriveThreads(model.items)
  const page = routeView(model)

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
  }
}

const titleForRoute = (route: AttuneRoute): string => {
  if (route === "discover") return "Attune Discover"
  if (route === "workbench") return "Attune Workbench"
  if (route === "findings") return "Attune Findings"
  if (route === "lineage") return "Attune Lineage"
  if (route === "exports") return "Attune Exports"
  return "Attune Settings"
}

const routeView = (model: Model): ReadonlyArray<Html> => [mdxPageView(model)]

const discoverRouteView = (): ReadonlyArray<Html> => {
  const h = html<Message>()

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
            h.p([h.Class("ready-line")], [
              dotView("primary"),
              "Ready to inspect",
            ]),
            h.h2([h.Class("feature-title")], [
              "Styling belongs in UI primitives and recipes",
            ]),
          ]),
          buttonView("Open in Workbench", "primary", "arrow-up-right"),
        ]),
        h.p([h.Class("feature-copy")], [
          "We found repeated inline styling and className usage outside of UI primitive paths. Centralizing these keeps app components structural and easier to evolve.",
        ]),
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
        sectionLabelView("Possible deterministic shape", "section-label-spaced"),
        h.p([h.Class("section-copy")], [
          "Ast-grep can approximate this pattern with JSX style and className selectors.",
        ]),
        codePanelView(undefined, codeView(discoverShape, 1), true),
        sectionLabelView("Known risk", "section-label-spaced"),
        h.p([h.Class("section-copy")], [
          "May catch animation or layout styles that are intentionally local to a component.",
        ]),
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
            meta: ["Ready to inspect", "14 matches", "5 files", "imports / fetch / IO"],
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
  ]
}

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
)`

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
)`

const workbenchRouteView = (model: Model): ReadonlyArray<Html> => {
  const h = html<Message>()
  const snapshot = model.serverSnapshot
  const packet = snapshot?.decisionPacket
  const matches = packet?.anchors.length.toString() ?? "0"
  const reviewed = snapshot?.reviewQueue.length.toString() ?? "0"
  const runtime = packet?.evidence[0]
    ? `${packet.evidence[0].durationMs} ms`
    : "0 ms"
  const heading =
    packet?.hypotheses[0]?.title ??
    "Styling belongs in UI primitives and recipes"
  const summary =
    packet?.hypotheses[0]?.summary ??
    "Refine the examples and deterministic rule until this candidate is ready to promote."

  return [
    pageHeaderView("Workbench", heading, summary),
    statStripView([
      { icon: "scan-text", value: matches, label: "Anchors" },
      { icon: "eye", value: reviewed, label: "Reviews" },
      { icon: "x-circle", value: "2", label: "False positives" },
      { icon: "timer", value: runtime, label: "Runtime" },
    ]),
    snapshot
      ? sectionView(
          "Atom-derived snapshot",
          `Version ${snapshot.version} from ${packet?.run.status ?? "unknown"} run`,
          [
            h.p([h.Class("section-copy")], [
              packet?.bestNextAction.label ?? "No action",
            ]),
            ...snapshot.scene.nodes.slice(0, 3).map((node) =>
              h.div([h.Class("list-row")], [
                h.span([h.Class("list-row-title")], [node.label]),
                h.span([h.Class("list-row-description")], [
                  `${node.kind} · ${node.status}`,
                ]),
              ]),
            ),
          ],
        )
      : sectionView("Atom-derived snapshot", "No server snapshot loaded", []),
    sectionView("Examples", undefined, [
      hDiv("example-grid", [
        exampleBlockView({
          code: positiveExample,
          count: "23",
          description: "Positive example that matches the intent.",
          file: "src/components/Card.tsx",
          icon: "check",
          startLine: 52,
          title: "Looks like",
          tone: "success",
        }),
        exampleBlockView({
          code: negativeExample,
          count: "9",
          description: "Negative example that should be flagged.",
          file: "src/components/UserAvatar.tsx",
          icon: "x-circle",
          startLine: 18,
          title: "Does not look like",
          tone: "destructive",
        }),
      ]),
    ]),
    sectionView(
      "Deterministic rule",
      "The ast-grep rule that encodes this pattern.",
      [
        codePanelView(undefined, codeView(astGrepRule, 1), true),
        sectionLabelView("Why it matters", "section-label-spaced"),
        h.p([h.Class("section-copy")], [
          "Inline styles in primitives create maintenance friction, reduce reusability, and make visual consistency harder to enforce across the codebase.",
        ]),
      ],
      buttonView("Copy YAML", "ghost", "copy"),
    ),
    reviseWithIntentView(),
    actionBarView([
      buttonView("View findings", "ghost", "arrow-up-right"),
      buttonView("Promote rule", "primary", "arrow-up"),
    ]),
  ]
}

const findingsRouteView = (): ReadonlyArray<Html> => {
  const h = html<Message>()

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
        h.span([h.Class("mono-row")], [
          iconView("file-code", "icon-muted"),
          "src/components/Card.tsx",
        ]),
        h.span([h.Class("finding-meta")], ["Lines 54-62", badgeView("TSX")]),
      ]),
      codePanelView(undefined, codeView(selectedFindingCode, 52)),
      sectionLabelView("Why it matched", "section-label-spaced"),
      h.p([h.Class("section-copy")], [
        "The rule flags inline visual styles on UI primitives. This style object sets visual properties directly on a DOM element instead of using a recipe or primitive variant.",
      ]),
      sectionLabelView("Deterministic selector", "section-label-spaced"),
      codePanelView(undefined, codeView(discoverShape, 1), true),
      sectionLabelView("Review decision", "section-label-spaced"),
      hDiv("decision-grid", [
        decisionButtonView("check", "success", "True positive", "This is a valid match"),
        decisionButtonView(
          "x-circle",
          "destructive",
          "False positive",
          "Not a valid match",
        ),
        decisionButtonView("minus-circle", "warning", "Ignore", "Ignore and move on"),
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
  ]
}

const simpleRouteView = (
  eyebrow: string,
  title: string,
  subtitle: string,
): ReadonlyArray<Html> => [
  pageHeaderView(eyebrow, title, subtitle),
  sectionView(undefined, undefined, [
    hDiv("card-grid", [
      cardView("Source evidence", "This route keeps the v0 card, code panel, and action-bar grammar while live data catches up."),
      cardView("FoldKit MDX", "Agents author constrained page blocks; FoldKit renders typed data without React runtime execution."),
    ]),
  ]),
]

const sidebarView = (
  threads: ReadonlyArray<WorkThread>,
  selectedThreadId: string,
  route: AttuneRoute,
): Html => {
  const h = html<Message>()
  const nav: ReadonlyArray<Readonly<{ label: string; route: AttuneRoute; icon: IconName }>> =
    [
      { icon: "flask", label: "Workbench", route: "workbench" },
      { icon: "compass", label: "Discover", route: "discover" },
      { icon: "list-checks", label: "Findings", route: "findings" },
      { icon: "git-fork", label: "Lineage", route: "lineage" },
      { icon: "upload", label: "Exports", route: "exports" },
      { icon: "settings", label: "Settings", route: "settings" },
    ]

  return h.aside(
    [h.Class("sidebar"), h.AriaLabel("Attune navigation")],
    [
      h.div(
        [h.Class("brand-row")],
        [iconView("sparkles", "brand-icon"), h.span([], ["attune"])],
      ),
      h.nav(
        [h.Class("nav-list"), h.AriaLabel("Primary")],
        nav.map((item) => navLabelView(item.label, item.route, item.icon, route)),
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
          ...threads.slice(0, 2).map((thread) =>
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
                h.span([h.Class(`thread-status is-${thread.status}`)], [
                  thread.status,
                ]),
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
  )
}

const navLabelView = (
  label: string,
  route: AttuneRoute,
  icon: IconName,
  current: AttuneRoute,
): Html => {
  const h = html<Message>()
  const selected = route === current

  return h.button(
    [
      h.Class(selected ? "nav-item is-selected" : "nav-item"),
      h.OnClick(SelectedRoute({ route })),
    ],
    [iconView(icon, selected ? "nav-icon is-selected" : "nav-icon"), label],
  )
}

const repoMetaView = (label: string, value: string, icon: IconName): Html => {
  const h = html<Message>()

  return h.div([], [
    h.p([h.Class("tiny-label")], [label]),
    h.p([h.Class("repo-meta-value")], [iconView(icon, "icon-muted"), value]),
  ])
}

const pageHeaderView = (
  eyebrow: string,
  title: string,
  subtitle: string,
  back?: string,
): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class("page-header")],
    [
      h.div(
        [h.Class("back-row")],
        back === undefined
          ? []
          : [h.button([h.Class("back-button")], [iconView("arrow-left"), back])],
      ),
      sectionLabelView(eyebrow, "page-eyebrow"),
      h.h1([h.Class("page-title")], [title]),
      h.p([h.Class("page-subtitle")], [subtitle]),
    ],
  )
}

const statStripView = (items: ReadonlyArray<StatItem>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class(items.length === 5 ? "stat-strip is-five" : "stat-strip")],
    items.map((item) =>
      h.div(
        [h.Class("stat-item")],
        [
          iconView(item.icon, "stat-icon"),
          h.span([], [
            h.span([h.Class("stat-value")], [item.value]),
            h.span([h.Class("stat-label")], [item.label]),
          ]),
        ],
      ),
    ),
  )
}

const filterTabsView = (current: ActivityFilter): Html => {
  const h = html<Message>()
  const filters: ReadonlyArray<TabItem> = [
    { filter: "all", label: "All" },
    { filter: "review", label: "Review" },
    { filter: "safety", label: "Safety" },
    { filter: "failed", label: "Failed" },
  ]

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
  )
}

const filterTabsStaticView = (tabs: ReadonlyArray<TabItem>): Html => {
  const h = html<Message>()

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
  )
}

const humanActionView = (items: ReadonlyArray<ActivityItem>): Html => {
  const h = html<Message>()
  const action = items.find((item) => item.requiresHuman)

  if (action === undefined) {
    return h.empty
  }

  return h.section(
    [h.Class("callout callout-warning")],
    [
      iconTileView("sparkles", "warning"),
      h.div([], [
        sectionLabelView("Needs human review"),
        h.h2([], [action.title]),
        h.p([], [action.summary]),
      ]),
      badgeView(action.risk, "warning"),
    ],
  )
}

const activityListView = (items: ReadonlyArray<ActivityItem>): Html =>
  sectionView(
    "Activity",
    undefined,
    [listView(items.map(activityItemToRow))],
    `${items.length} visible`,
  )

const activityItemToRow = (item: ActivityItem): ListRowItem => ({
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
})

const mdxPageView = (model: Model): Html =>
  hDiv("mdx-fixture-page", [
    ...model.page.document.blocks.map((block) => mdxBlockView(block, model)),
  ])

const foldkitMdxBlocksView = (
  blocks: ReadonlyArray<FoldkitMdxBlock>,
): Html => hDiv("mdx-fixture-page", blocks.map((block) => mdxBlockView(block)))

const mdxBlockView = (block: FoldkitMdxBlock, model?: Model): Html => {
  const h = html<Message>()

  switch (block._tag) {
    case "Heading":
      return h.h2([h.Class("page-title")], [block.text])
    case "Paragraph":
      return h.p([h.Class("section-copy")], [block.text])
    case "Code":
      return codePanelView(block.language, codeView(block.code, 1), true)
    case "Component":
      return mdxComponentView(block, model)
  }
}

const mdxComponentView = (
  block: MdxComponentBlock,
  model?: Model,
): Html => {
  const h = html<Message>()
  const props = mdxComponentProps(block)

  switch (block.name) {
    case "PageHeader":
      return mdxPageHeaderView(props, model)
    case "StatStrip":
      return mdxStatStripView(props, model)
    case "FilterTabs":
      return filterTabsView(model?.filter ?? "all")
    case "ActivityList":
      return activityListView(
        filterActivityItems(model?.items ?? [], model?.filter ?? "all"),
      )
    case "Button":
      return mdxButtonView(props, model)
    case "ActionBar":
      return mdxActionBarView(props, model)
    case "OptimizationPacket":
      return mdxOptimizationPacketView(props, model)
    case "PatternDossier":
      return mdxPatternDossierView(props, model)
    case "ExamplePair":
      return hDiv("example-grid", [
        exampleBlockView({
          code: positiveExample,
          count: "23",
          description: "Positive example that matches the intent.",
          file: "src/components/Card.tsx",
          icon: "check",
          startLine: 52,
          title: props.prop("positive") ?? "Looks like",
          tone: "success",
        }),
        exampleBlockView({
          code: negativeExample,
          count: "9",
          description: "Negative example that should be flagged.",
          file: "src/components/UserAvatar.tsx",
          icon: "x-circle",
          startLine: 18,
          title: props.prop("negative") ?? "Does not look like",
          tone: "destructive",
        }),
      ])
    case "PatternList":
      return mdxPatternListView(model)
    case "AnchorList":
      return mdxAnchorListView(model)
    case "HypothesisList":
      return mdxHypothesisListView(model)
    case "EvidenceList":
      return mdxEvidenceListView(model)
    case "ReviewQueue":
      return mdxReviewQueueView(model)
    case "RouteTrace":
      return mdxRouteTraceView(model)
    case "RunSummaryPanel":
      return mdxRunSummaryPanelView(model)
    case "SceneGraph":
      return mdxSceneGraphView(model)
    case "ExportPacket":
      return mdxExportPacketView(model)
    case "SettingsPanel":
      return mdxSettingsPanelView(model)
    case "FuzzerFinding":
      return mdxFuzzerFindingView(props, model)
    case "Badge":
      return badgeView(props.prop("label") ?? block.name)
    case "SectionLabel":
      return sectionLabelView(
        props.prop("label") ?? block.name,
        "section-label-spaced",
      )
    case "SafetyGate":
      return mdxSafetyGateView(model)
    case "MetaGrid":
    case "CodePanel":
      return sectionView(block.name, undefined, [
        hDiv("chip-row", props.arrayProp("items").map((item) => badgeView(item))),
      ])
    default:
      return sectionView(block.name, undefined, [
        h.p([h.Class("section-copy")], [block.textChildren.join(" ")]),
      ])
  }
}

const mdxOptimizationPacketView = (
  props: MdxComponentProps,
  model?: Model,
): Html => {
  const h = html<Message>()
  const snapshot = model?.serverSnapshot ?? undefined
  const packet = snapshot?.decisionPacket
  const summary = model?.fixtureRoute.summary

  return sectionView(
    "Atom-derived snapshot",
    packet === undefined
      ? (props.prop("status") ?? "Waiting for fixture startup")
      : `Version ${snapshot?.version ?? 0} from ${packet.run.status} run`,
    [
      h.p([h.Class("section-copy")], [
        packet?.bestNextAction.label ?? props.prop("action") ?? "No action",
      ]),
      metaGridView([
        { label: "Run", value: snapshot?.runId ?? props.prop("runId") ?? "pending" },
        {
          label: "Events",
          value: String(summary?.eventCount ?? snapshot?.version ?? 0),
          tone: "primary",
        },
        {
          label: "Evidence",
          value: String(packet?.evidence.length ?? 0),
          tone: packet?.evidence.length ? "success" : "warning",
        },
        {
          label: "Reviews",
          value: String(snapshot?.reviewQueue.length ?? 0),
        },
        {
          label: "Cache",
          value: summary?.cache ?? "miss",
        },
      ]),
    ],
  )
}

const mdxPatternDossierView = (
  props: MdxComponentProps,
  model?: Model,
): Html => {
  const h = html<Message>()
  const anchor = selectedAnchor(model)
  const hypothesis = selectedHypothesis(model)
  const evidence = selectedEvidence(model)

  return sectionView(
    anchor?.title ?? props.prop("title") ?? "Pattern dossier",
    hypothesis?.status ?? "candidate",
    [
      h.p([h.Class("section-copy")], [
        hypothesis?.summary ??
          "Select an anchor to inspect the candidate hypothesis.",
      ]),
      h.p([h.Class("section-copy")], [
        evidence?.summary ?? props.prop("evidence") ?? "Evidence pending",
      ]),
    ],
  )
}

const mdxPatternListView = (model?: Model): Html => {
  const snapshot = model?.serverSnapshot ?? undefined
  const hypotheses = snapshot?.decisionPacket.hypotheses ?? []

  return sectionView(
    "All patterns",
    `${hypotheses.length} hypotheses in the atom snapshot`,
    [
      hypotheses.length === 0
        ? listView([
            {
              icon: "paintbrush",
              title: "Fixture startup pending",
              description: "Start the route to load candidate patterns.",
              status: "Pending",
              tone: "warning",
            },
          ])
        : selectableListView(
            hypotheses.map((hypothesis) => ({
              ...hypothesisRow(hypothesis, model),
              message: SelectedHypothesis({
                hypothesisId: hypothesis.hypothesisId,
              }),
            })),
          ),
    ],
  )
}

const mdxAnchorListView = (model?: Model): Html => {
  const anchors = model?.serverSnapshot?.decisionPacket.anchors ?? []
  const selectedId =
    model?.fixtureRoute.selectedAnchorId || anchors[0]?.anchorId || ""

  return sectionView(
    "Anchors",
    `${anchors.length} recalled anchor cards`,
    [
      anchors.length === 0
        ? listView([
            {
              icon: "scan-text",
              title: "No anchors loaded",
              description: "Fixture startup will recall the deterministic anchors.",
              status: "Pending",
              tone: "warning",
            },
          ])
        : selectableListView(
            anchors.map((anchor) => ({
              ...anchorRow(anchor, anchor.anchorId === selectedId),
              message: SelectedFixtureAnchor({ anchorId: anchor.anchorId }),
            })),
          ),
    ],
  )
}

const mdxHypothesisListView = (model?: Model): Html => {
  const hypotheses = model?.serverSnapshot?.decisionPacket.hypotheses ?? []

  return sectionView(
    "Hypotheses",
    `${hypotheses.length} active motif hypotheses`,
    [
      hypotheses.length === 0
        ? listView([
            {
              icon: "layout-grid",
              title: "No hypothesis yet",
              description: "The startup step creates the initial motif hypothesis.",
              status: "Pending",
              tone: "warning",
            },
          ])
        : selectableListView(
            hypotheses.map((hypothesis) => ({
              ...hypothesisRow(hypothesis, model),
              message: SelectedHypothesis({
                hypothesisId: hypothesis.hypothesisId,
              }),
            })),
          ),
    ],
  )
}

const mdxEvidenceListView = (model?: Model): Html => {
  const evidence = model?.serverSnapshot?.decisionPacket.evidence ?? []
  const selectedId = model?.selectedEvidenceId || evidence[0]?.evidenceId || ""

  return sectionView(
    "Evidence",
    `${evidence.length} packets from the proof route`,
    [
      evidence.length === 0
        ? listView([
            {
              icon: "flask",
              title: "Proof evidence pending",
              description: "Run the proof step to append Joern evidence.",
              status: "Pending",
              tone: "warning",
            },
          ])
        : selectableListView(
            evidence.map((packet) => ({
              ...evidenceRow(packet, packet.evidenceId === selectedId),
              message: SelectedEvidence({ evidenceId: packet.evidenceId }),
            })),
          ),
    ],
  )
}

const mdxReviewQueueView = (model?: Model): Html => {
  const reviews = model?.serverSnapshot?.reviewQueue ?? []

  return sectionView(
    "Review queue",
    `${reviews.length} human-gated decisions`,
    [
      listView(
        reviews.length === 0
          ? [
              {
                icon: "eye",
                title: "No review requested",
                description: "Accepting proof evidence requests human review.",
                status: "Pending",
                tone: "warning",
              },
            ]
          : reviews.map(reviewRow),
      ),
    ],
  )
}

const mdxRouteTraceView = (model?: Model): Html => {
  const trace = model?.fixtureRoute.trace ?? []

  return sectionView(
    "Route trace",
    `${model?.fixtureRoute.routeEvents.length ?? 0} route events`,
    [
      listView(
        trace.length === 0
          ? [
              {
                icon: "git-branch",
                title: "Trace pending",
                description: "Fixture commands will record route events, semantic events, invalidated keys, and atom labels.",
                status: "Pending",
                tone: "warning",
              },
            ]
          : trace.map((entry) => ({
              icon: "git-branch",
              title: `${entry.step} -> snapshot v${entry.snapshotVersion}`,
              description: entry.semanticEventTags.join(", ") || "Interaction state only",
              meta: [
                `${entry.routeEventTags.length} route events`,
                `${entry.invalidatedKeys.length} keys`,
                `${entry.atomLabels.length} atoms`,
              ],
              status: entry.step,
              tone: entry.invalidatedKeys.length > 0 ? "success" : "info",
            })),
      ),
    ],
  )
}

const mdxRunSummaryPanelView = (model?: Model): Html => {
  const summary = model?.fixtureRoute.summary

  return sectionView(
    "Run summary",
    summary === null || summary === undefined
      ? "The fixture has not produced a summary yet."
      : `Snapshot v${summary.finalSnapshotVersion}`,
    [
      metaGridView([
        { label: "Events", value: String(summary?.eventCount ?? 0), tone: "primary" },
        { label: "Steps", value: String(summary?.routeStepCount ?? 0) },
        {
          label: "Useful evidence",
          value: String(summary?.usefulEvidenceCount ?? 0),
          tone: summary?.usefulEvidenceCount ? "success" : "warning",
        },
        { label: "Search", value: `${summary?.searchIndexTimeMs ?? 0} ms` },
        { label: "Proof", value: `${summary?.proofTimeMs ?? 0} ms` },
      ]),
    ],
  )
}

const mdxSceneGraphView = (model?: Model): Html => {
  const nodes = model?.serverSnapshot?.scene.nodes ?? []

  return sectionView(
    "Scene graph",
    `${nodes.length} FoldKit scene nodes`,
    [
      listView(
        nodes.length === 0
          ? [
              {
                icon: "layers",
                title: "Scene pending",
                description: "The atom-derived snapshot will build a FoldKit scene.",
                status: "Pending",
                tone: "warning",
              },
            ]
          : nodes.map(sceneNodeRow),
      ),
    ],
  )
}

const mdxExportPacketView = (model?: Model): Html =>
  sectionView("Export packet", "Deterministic packet from the current snapshot.", [
    codePanelView("attune-rule-packet.yaml", codeView(exportPacketCode(model), 1), true),
  ])

const mdxSettingsPanelView = (model?: Model): Html =>
  sectionView("Fixture settings", "Local-only closed loop configuration.", [
    metaGridView([
      { label: "Scenario", value: model?.fixtureRoute.scenarioId ?? "foldkit-fixture-closed-loop" },
      { label: "Backend", value: "fixture services" },
      { label: "Persistence", value: "in-memory" },
      { label: "Run", value: model?.fixtureRoute.runId ?? "pending" },
      { label: "Status", value: model?.fixtureRoute.status ?? "idle" },
    ]),
  ])

const mdxSafetyGateView = (model?: Model): Html =>
  sectionView("Safety gate", "Fixture route dependencies.", [
    listView([
      {
        icon: "check",
        title: "No external backend required",
        description: "The route uses fake services, in-memory projection writes, and the server-side atom snapshot contract.",
        status: "Local",
        tone: "success",
      },
      {
        icon: model?.fixtureRoute.lastError ? "x-circle" : "check",
        title: model?.fixtureRoute.lastError || "No fixture errors",
        description: "Errors are surfaced through FixtureStepFailed instead of hidden component state.",
        status: model?.fixtureRoute.status ?? "idle",
        tone: model?.fixtureRoute.lastError ? "destructive" : "success",
      },
    ]),
  ])

const mdxFuzzerFindingView = (
  props: MdxComponentProps,
  model?: Model,
): Html => {
  const h = html<Message>()
  const evidence = selectedEvidence(model)
  const evidenceId = evidence?.evidenceId ?? ""

  return sectionView(undefined, undefined, [
    hDiv("finding-file-row", [
      h.span([h.Class("mono-row")], [
        iconView("file-code", "icon-muted"),
        props.prop("path") ?? "src/components/Card.tsx",
      ]),
      h.span([h.Class("finding-meta")], [
        evidence?.templateId ?? "component-primitive-policy",
        badgeView(evidence?.confidence ?? "pending"),
      ]),
    ]),
    codePanelView(undefined, codeView(selectedFindingCode, 52)),
    sectionLabelView("Why it matched", "section-label-spaced"),
    h.p([h.Class("section-copy")], [
      evidence?.summary ??
        "Run proof to surface a concrete evidence packet for this finding.",
    ]),
    sectionLabelView("Deterministic selector", "section-label-spaced"),
    codePanelView(undefined, codeView(discoverShape, 1), true),
    sectionLabelView("Review decision", "section-label-spaced"),
    hDiv("decision-grid", [
      decisionButtonView(
        "check",
        "success",
        "True positive",
        "Accept and refresh the snapshot",
        FixtureStepRequested({ step: "complete-proof" }),
      ),
      decisionButtonView(
        "x-circle",
        "destructive",
        "False positive",
        "Keep it as interaction state",
        SelectedEvidence({ evidenceId }),
      ),
      decisionButtonView(
        "minus-circle",
        "warning",
        "Ignore",
        "Return to the workbench",
        SelectedRoute({ route: "workbench" }),
      ),
    ]),
  ])
}

const selectedAnchor = (model?: Model): AnchorCard | undefined => {
  const anchors = model?.serverSnapshot?.decisionPacket.anchors ?? []
  const selectedId = model?.fixtureRoute.selectedAnchorId
  return anchors.find((anchor) => anchor.anchorId === selectedId) ?? anchors[0]
}

const selectedHypothesis = (model?: Model): MotifHypothesis | undefined => {
  const hypotheses = model?.serverSnapshot?.decisionPacket.hypotheses ?? []
  const selectedId = model?.selectedHypothesisId
  return (
    hypotheses.find((hypothesis) => hypothesis.hypothesisId === selectedId) ??
    hypotheses[0]
  )
}

const selectedEvidence = (model?: Model): EvidencePacket | undefined => {
  const evidence = model?.serverSnapshot?.decisionPacket.evidence ?? []
  const selectedId = model?.selectedEvidenceId
  return evidence.find((packet) => packet.evidenceId === selectedId) ?? evidence[0]
}

const anchorRow = (anchor: AnchorCard, active: boolean): ListRowItem => ({
  active,
  description: anchor.excerpt,
  icon: "scan-text",
  meta: [
    anchor.vocabulary.join(", "),
    ...anchor.locations.map(
      (location) => `${location.path}:${location.startLine}`,
    ),
  ],
  status: `${Math.round(anchor.score * 100)}%`,
  title: anchor.title,
  tone: active ? "primary" : "info",
})

const hypothesisRow = (
  hypothesis: MotifHypothesis,
  model?: Model,
): ListRowItem => ({
  active:
    hypothesis.hypothesisId ===
    (model?.selectedHypothesisId ||
      model?.serverSnapshot?.decisionPacket.hypotheses[0]?.hypothesisId),
  description: hypothesis.summary,
  icon: "layout-grid",
  meta: [`${hypothesis.anchorIds.length} anchors`, `score ${hypothesis.score}`],
  status: hypothesis.status,
  title: hypothesis.title,
  tone: hypothesisTone(hypothesis.status),
})

const evidenceRow = (
  packet: EvidencePacket,
  active: boolean,
): ListRowItem => ({
  active,
  description: packet.summary,
  icon: "flask",
  meta: [packet.templateId, `${packet.durationMs} ms`, packet.createdAt],
  status: packet.confidence,
  title: packet.evidenceId,
  tone: evidenceTone(packet.confidence),
})

const reviewRow = (item: ReviewItem): ListRowItem => ({
  description: item.summary,
  icon: "eye",
  meta: [item.kind, item.requiredAction],
  status: item.kind,
  title: item.title,
  tone: item.kind === "promotion" ? "success" : "warning",
})

const sceneNodeRow = (node: FoldSceneNode): ListRowItem => ({
  description: `${node.kind} node in the rendered FoldKit scene.`,
  icon: node.kind === "evidence" ? "flask" : "layers",
  meta: [node.id],
  status: node.status,
  title: node.label,
  tone: node.status === "strong" || node.status === "supported" ? "success" : "info",
})

const hypothesisTone = (status: MotifHypothesis["status"]): Tone => {
  if (status === "supported" || status === "promoted") return "success"
  if (status === "weak" || status === "rejected") return "destructive"
  if (status === "proving") return "warning"
  return "info"
}

const evidenceTone = (confidence: EvidencePacket["confidence"]): Tone => {
  if (confidence === "strong") return "success"
  if (confidence === "medium") return "primary"
  if (confidence === "weak") return "warning"
  return "muted"
}

const exportPacketCode = (model?: Model): string => {
  const snapshot = model?.serverSnapshot
  const packet = snapshot?.decisionPacket
  const summary = model?.fixtureRoute.summary

  return [
    `runId: ${snapshot?.runId ?? "pending"}`,
    `snapshotVersion: ${snapshot?.version ?? 0}`,
    `repoSnapshotId: ${summary?.repoSnapshotId ?? packet?.run.repoSnapshotId ?? "pending"}`,
    `bestNextAction: ${packet?.bestNextAction.label ?? "pending"}`,
    `anchors: ${packet?.anchors.length ?? 0}`,
    `hypotheses: ${packet?.hypotheses.length ?? 0}`,
    `evidence: ${packet?.evidence.length ?? 0}`,
    `reviewQueue: ${snapshot?.reviewQueue.length ?? 0}`,
  ].join("\n")
}

const mdxComponentProps = (block: MdxComponentBlock): MdxComponentProps => {
  const prop = (name: string): string | undefined => {
    const value = block.props.find((item) => item.name === name)?.value
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : undefined
  }

  return {
    prop,
    arrayProp: (name) => {
      const value = block.props.find((item) => item.name === name)?.value
      return Array.isArray(value) ? value : []
    },
    route: (name) => parseAttuneRoute(prop(name)),
  }
}

const parseAttuneRoute = (value: string | undefined): AttuneRoute | undefined =>
  value === "discover" ||
  value === "workbench" ||
  value === "findings" ||
  value === "lineage" ||
  value === "exports" ||
  value === "settings"
    ? value
    : undefined

const mdxPageHeaderView = (props: MdxComponentProps, model?: Model): Html => {
  const snapshot = model?.serverSnapshot
  const hypothesis = snapshot?.decisionPacket.hypotheses[0]
  const useWorkbenchSnapshot = model?.route === "workbench" && hypothesis !== undefined

  return pageHeaderView(
    props.prop("eyebrow") ?? model?.page.title ?? "Fixture",
    useWorkbenchSnapshot
      ? hypothesis.title
      : (props.prop("title") ?? model?.page.title ?? "Fixture"),
    useWorkbenchSnapshot
      ? hypothesis.summary
      : (props.prop("subtitle") ??
          props.prop("description") ??
          model?.page.description ??
          ""),
  )
}

const mdxStatStripView = (props: MdxComponentProps, model?: Model): Html => {
  if (model?.serverSnapshot !== null && model?.serverSnapshot !== undefined) {
    const summary = model.fixtureRoute.summary

    return statStripView([
      {
        icon: "sparkles",
        value: String(summary?.eventCount ?? model.serverSnapshot.version),
        label: "events",
      },
      {
        icon: "scan-text",
        value: String(model.serverSnapshot.version),
        label: "snapshot version",
      },
      {
        icon: "timer",
        value: `${model.serverSnapshot.decisionPacket.evidence[0]?.durationMs ?? 0}`,
        label: "ms",
      },
      {
        icon: "eye",
        value: String(model.serverSnapshot.reviewQueue.length),
        label: "reviews",
      },
    ])
  }

  return statStripView(props.arrayProp("items").map(statItemFromLabel))
}

const statItemFromLabel = (item: string, index: number): StatItem => {
  const icons: ReadonlyArray<IconName> = [
    "sparkles",
    "eye",
    "timer",
    "scan-text",
  ]

  return {
    icon: icons[index % icons.length] ?? "sparkles",
    value: item.split(" ")[0] ?? item,
    label: item.split(" ").slice(1).join(" ") || item,
  }
}

const mdxButtonView = (props: MdxComponentProps, model?: Model): Html => {
  const h = html<Message>()
  const selectedRoute = props.route("route")

  return h.button(
    [
      h.Class("button button-ghost"),
      selectedRoute === undefined
        ? commandAttributeOrClick(props.prop("command"), model)
        : h.OnClick(SelectedRoute({ route: selectedRoute })),
    ],
    [props.prop("label") ?? "Action"],
  )
}

const mdxActionBarView = (props: MdxComponentProps, model?: Model): Html => {
  const h = html<Message>()

  return actionBarView([
    ...optionalNoteView(props.prop("note")),
    ...optionalPrimaryActionView(props, model),
    ...optionalSecondaryActionView(props, model),
    ...props.arrayProp("actions").map((action) => buttonView(action, "ghost")),
  ])
}

const optionalNoteView = (note: string | undefined): ReadonlyArray<Html> => {
  const h = html<Message>()
  return note === undefined ? [] : [h.p([h.Class("section-copy")], [note])]
}

const optionalPrimaryActionView = (
  props: MdxComponentProps,
  model?: Model,
): ReadonlyArray<Html> => {
  const h = html<Message>()
  const primary = props.prop("primary")

  return primary === undefined
    ? []
    : [
        h.button(
          [
            h.Class("button button-primary"),
            primaryActionMessage(
              primary,
              props.prop("command"),
              props.route("primaryRoute"),
              model,
            ),
          ],
          [primary],
        ),
      ]
}

const primaryActionMessage = (
  primary: string,
  command: string | undefined,
  route: AttuneRoute | undefined,
  model?: Model,
) => {
  const h = html<Message>()

  if (route !== undefined) {
    return h.OnClick(SelectedRoute({ route }))
  }

  if (command === "promote" && model?.serverSnapshot) {
    return h.OnClick(
      RequestedPromotion({
        hypothesisId:
          model.serverSnapshot.decisionPacket.hypotheses[0]?.hypothesisId ?? "",
      }),
    )
  }

  if (primary === "True positive") {
    return h.OnClick(FixtureStepRequested({ step: "complete-proof" }))
  }

  return commandAttributeOrClick(command, model)
}

const optionalSecondaryActionView = (
  props: MdxComponentProps,
  model?: Model,
): ReadonlyArray<Html> => {
  const h = html<Message>()
  const secondary = props.prop("secondary")
  const secondaryRoute = props.route("secondaryRoute")
  const secondaryCommand = props.prop("secondaryCommand")

  return secondary === undefined
    ? []
    : [
        h.button(
          [
            h.Class("button button-ghost"),
            secondaryRoute === undefined
              ? commandAttributeOrClick(secondaryCommand, model)
              : h.OnClick(SelectedRoute({ route: secondaryRoute })),
          ],
          [secondary],
        ),
      ]
}


const commandAttributeOrClick = (command: string | undefined, model?: Model) => {
  const h = html<Message>()

  if (command === "fixture-start") {
    return h.OnClick(FixtureStartRequested())
  }
  if (command === "complete-proof") {
    return h.OnClick(FixtureStepRequested({ step: "complete-proof" }))
  }
  if (command === "promote" && model?.serverSnapshot != null) {
    return h.OnClick(
      RequestedPromotion({
        hypothesisId:
          model.serverSnapshot.decisionPacket.hypotheses[0]?.hypothesisId ?? "",
      }),
    )
  }
  if (command === "select-anchor" && model?.serverSnapshot != null) {
    return h.OnClick(
      SelectedFixtureAnchor({
        anchorId:
          model.serverSnapshot.decisionPacket.anchors[0]?.anchorId ?? "",
      }),
    )
  }

  return h.Attribute("data-command", command ?? "noop")
}
const sectionView = (
  label: string | undefined,
  description: string | undefined,
  children: ReadonlyArray<Html>,
  action?: Html | string,
): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class("page-section")],
    [
      label === undefined && description === undefined && action === undefined
        ? h.empty
        : h.div(
            [h.Class("section-head")],
            [
              h.div([], [
                label === undefined ? h.empty : sectionLabelView(label),
                description === undefined
                  ? h.empty
                  : h.p([h.Class("section-description")], [description]),
              ]),
              typeof action === "string"
                ? h.span([h.Class("section-action")], [action])
                : (action ?? h.empty),
            ],
          ),
      h.div([h.Class("section-body")], children),
    ],
  )
}

const exampleBlockView = (input: {
  readonly code: string
  readonly count: string
  readonly description: string
  readonly file: string
  readonly icon: IconName
  readonly startLine: number
  readonly title: string
  readonly tone: Tone
}): Html => {
  const h = html<Message>()

  return codePanelView(
    undefined,
    codeView(input.code, input.startLine),
    false,
    h.div([], [
      h.div([h.Class("example-head")], [
        h.div([h.Class("example-title")], [
          iconView(input.icon, `tone-${input.tone}`),
          h.h3([], [input.title]),
        ]),
        h.button([h.Class("count-pill")], [
          input.count,
          iconView("chevron-right", "icon-muted"),
        ]),
      ]),
      h.p([h.Class("example-desc")], [input.description]),
      h.p([h.Class("example-file")], [input.file]),
    ]),
  )
}

const reviseWithIntentView = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class("revise-card")],
    [
      h.div([h.Class("revise-copy")], [
        iconTileView("sparkles", "violet"),
        h.div([], [
          h.h3([], ["Revise with intent"]),
          h.p([], [
            "Describe what should change. Attune will update the examples and the rule together; YAML stays for inspection.",
          ]),
        ]),
      ]),
      buttonView("Revise candidate", "ghost", "sparkles"),
    ],
  )
}

const actionBarView = (actions: ReadonlyArray<Html>): Html => {
  const h = html<Message>()

  return h.div([h.Class("action-bar")], actions)
}

const metaGridView = (
  items: ReadonlyArray<Readonly<{ label: string; value: string; tone?: Tone }>>,
): Html => {
  const h = html<Message>()

  return h.dl(
    [h.Class("meta-grid")],
    items.map((item) =>
      h.div([], [
        h.dt([], [item.label]),
        h.dd([], [
          item.value,
          item.tone === undefined ? h.empty : dotView(item.tone),
        ]),
      ]),
    ),
  )
}

const listView = (items: ReadonlyArray<ListRowItem>): Html => {
  const h = html<Message>()

  return h.ul(
    [h.Class("list")],
    items.map((item) =>
      h.li(
        [h.Class(listRowClass(item))],
        listRowContent(item),
      ),
    ),
  )
}

const selectableListView = (
  items: ReadonlyArray<ListRowItem & Readonly<{ message: Message }>>,
): Html => {
  const h = html<Message>()

  return h.ul(
    [h.Class("list")],
    items.map((item) =>
      h.li([], [
        h.button(
          [h.Class(listRowClass(item)), h.OnClick(item.message)],
          listRowContent(item),
        ),
      ]),
    ),
  )
}

const listRowClass = (item: ListRowItem): string =>
  `${item.compact === true ? "list-row is-compact" : "list-row"}${
    item.active === true ? " is-active" : ""
  }`

const listRowContent = (item: ListRowItem): ReadonlyArray<Html> => {
  const h = html<Message>()

  return [
    item.icon === undefined ? h.empty : iconTileView(item.icon),
    h.div([h.Class("list-row-body")], [
      h.div([h.Class("list-row-title-line")], [
        h.h3([], [item.title]),
        h.div([h.Class("list-row-trailing")], [
          item.status === undefined ? h.empty : badgeView(item.status, item.tone),
          iconView("chevron-right", "icon-muted"),
        ]),
      ]),
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
        : h.div([h.Class("list-row-code")], [codeView(item.code, 1, false)]),
    ]),
  ]
}

const decisionButtonView = (
  icon: IconName,
  tone: Tone,
  title: string,
  subtitle: string,
  message?: Message,
): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class("decision-button"),
      message === undefined ? h.Attribute("data-command", "noop") : h.OnClick(message),
    ],
    [
      iconView(icon, `tone-${tone}`),
      h.span([], [
        h.span([h.Class("decision-title")], [title]),
        h.span([h.Class("decision-subtitle")], [subtitle]),
      ]),
    ],
  )
}

const searchInputView = (placeholder: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class("search-input")],
    [iconView("filter", "icon-muted"), h.span([], [placeholder])],
  )
}

const paginationView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class("pagination")],
    [
      h.button([], ["Prev"]),
      h.button([h.Class("is-current")], ["1"]),
      h.button([], ["2"]),
      h.button([], ["3"]),
      h.button([], ["Next"]),
    ],
  )
}

const cardView = (title: string, body: string): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class("card card-padded")],
    [h.h2([h.Class("card-title")], [title]), h.p([], [body])],
  )
}

const codePanelView = (
  filename: string | undefined,
  content: Html,
  copy = false,
  header?: Html,
): Html => {
  const h = html<Message>()

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
  )
}

const codeView = (code: string, startLine = 1, lineNumbers = true): Html => {
  const h = html<Message>()
  const lines = code.split("\n")

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
  )
}

const buttonView = (label: string, variant: "primary" | "ghost", icon?: IconName): Html => {
  const h = html<Message>()

  return h.button(
    [h.Class(`button button-${variant}`)],
    [label, icon === undefined ? h.empty : iconView(icon)],
  )
}

const iconButtonView = (icon: IconName): Html => {
  const h = html<Message>()

  return h.button([h.Class("icon-button")], [iconView(icon)])
}

const iconTileView = (
  icon: IconName,
  tone: Tone = "muted",
  size: "sm" | "md" | "lg" = "md",
): Html => {
  const h = html<Message>()

  return h.span(
    [h.Class(`icon-tile icon-tile-${size} tone-${tone}`)],
    [iconView(icon)],
  )
}

const iconView = (name: IconName, className = ""): Html => {
  const h = html<Message>()

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
  )
}

const badgeView = (label: string, tone: Tone = "muted"): Html => {
  const h = html<Message>()

  return h.span([h.Class(`badge tone-${tone}`)], [label])
}

const dotView = (tone: Tone = "primary"): Html => {
  const h = html<Message>()

  return h.span([h.Class(`dot tone-${tone}`)], [])
}

const sectionLabelView = (label: string, className = ""): Html => {
  const h = html<Message>()

  return h.p([h.Class(`section-label ${className}`.trim())], [label])
}

const hDiv = (className: string, children: ReadonlyArray<Html | string>): Html => {
  const h = html<Message>()

  return h.div(className.length === 0 ? [] : [h.Class(className)], children)
}

const severityTone = (severity: ActivityItem["severity"]): Tone => {
  if (severity === "success") return "success"
  if (severity === "warning" || severity === "blocked") return "warning"
  if (severity === "safety" || severity === "failure") return "destructive"
  return "info"
}

const formatTime = (iso: string): string =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
