export type ToolTarget = 'ast-grep' | 'ESLint' | 'CodeQL'

export type PatternFixture = {
  readonly title: string
  readonly intent: string
  readonly evidence: string
  readonly files: string
  readonly tags: string
  readonly readiness: string
  readonly tone: 'good' | 'warn' | 'bad' | 'info'
  readonly target: ToolTarget
  readonly selected: boolean
}

export type FindingFixture = {
  readonly path: string
  readonly rule: string
  readonly snippet: string
  readonly state: string
  readonly line: string
  readonly tone: 'good' | 'warn' | 'bad' | 'info'
  readonly selected: boolean
}

export type LineageEventFixture = {
  readonly number: string
  readonly title: string
  readonly summary: string
  readonly timestamp: string
  readonly tone: 'good' | 'warn' | 'info'
  readonly selected: boolean
}

export type ExportFileFixture = {
  readonly path: string
  readonly summary: string
  readonly kind: string
  readonly selected: boolean
}

export type SettingRowFixture = {
  readonly label: string
  readonly value: string
}

export type SettingToggleFixture = {
  readonly label: string
  readonly value: string
  readonly enabled: boolean
}

export const candidate = {
  title: 'Styling belongs in UI primitives and recipes',
  version: 'Candidate B (v2)',
  status: 'Promoted',
  readiness: 'Ready to inspect',
  repo: 'bulletproof-react',
  findingsRepo: 'sat-demo',
  branch: 'main',
}

export const patterns: ReadonlyArray<PatternFixture> = [
  {
    title: 'Styling belongs in UI primitives and recipes',
    intent:
      'Keep visual styling centralized so app components stay structural.',
    evidence: '34 matches',
    files: '12 files',
    tags: 'JSX style / className',
    readiness: 'Ready to inspect',
    tone: 'good',
    target: 'ast-grep',
    selected: true,
  },
  {
    title: 'Effects stay at the boundary',
    intent:
      'Side effects should live in loaders, actions, or infrastructure adapters.',
    evidence: '14 matches',
    files: '5 files',
    tags: 'imports / fetch / IO',
    readiness: 'Ready to inspect',
    tone: 'good',
    target: 'ESLint',
    selected: false,
  },
  {
    title: 'Domain logic in domain layer',
    intent:
      'Complex business logic appears in UI routes and should be moved inward.',
    evidence: '9 matches',
    files: '7 files',
    tags: 'business logic heuristics',
    readiness: 'Needs examples',
    tone: 'warn',
    target: 'CodeQL',
    selected: false,
  },
  {
    title: 'No raw secrets in source',
    intent: 'Secrets, keys, and tokens should not appear in committed code.',
    evidence: '6 matches',
    files: '4 files',
    tags: 'strings / env / secrets',
    readiness: 'Too broad',
    tone: 'info',
    target: 'CodeQL',
    selected: false,
  },
  {
    title: 'Consistent error handling strategy',
    intent:
      'Multiple error handling patterns detected across route boundaries.',
    evidence: '4 matches',
    files: '3 files',
    tags: 'try/catch / Result / Either',
    readiness: 'Needs examples',
    tone: 'warn',
    target: 'ESLint',
    selected: false,
  },
]

export const findings: ReadonlyArray<FindingFixture> = [
  {
    path: 'src/components/Button.tsx',
    rule: 'Uses raw style object for visual styling',
    snippet: '<button style={{ padding: "12px 16px", borderRadius: 8 }}>',
    state: 'Matched',
    line: '42',
    tone: 'info',
    selected: false,
  },
  {
    path: 'src/components/Card.tsx',
    rule: 'Uses raw style object for visual styling',
    snippet:
      '<div style={{ background: "#121212", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>',
    state: 'Matched',
    line: '58',
    tone: 'good',
    selected: true,
  },
  {
    path: 'src/components/UserAvatar.tsx',
    rule: 'Uses raw style object for visual styling',
    snippet: '<div style={{ width: 40, height: 40, borderRadius: "50%" }} />',
    state: 'False positive',
    line: '21',
    tone: 'bad',
    selected: false,
  },
  {
    path: 'src/features/dashboard/StatsCard.tsx',
    rule: 'Uses raw style object for visual styling',
    snippet: '<div style={{ display: "flex", alignItems: "center" }}>',
    state: 'Ignored',
    line: '77',
    tone: 'warn',
    selected: false,
  },
  {
    path: 'src/components/Tooltip.tsx',
    rule: 'Uses raw style object for visual styling',
    snippet: '<div style={{ position: "absolute", zIndex: 1000 }}>',
    state: 'Matched',
    line: '31',
    tone: 'info',
    selected: false,
  },
]

export const lineageEvents: ReadonlyArray<LineageEventFixture> = [
  {
    number: '1',
    title: 'Agent proposed pattern',
    summary:
      'Generated an initial rule from repository structure and prior design knowledge.',
    timestamp: 'Apr 28, 2025 · 10:33 AM · attune@local',
    tone: 'good',
    selected: false,
  },
  {
    number: '2',
    title: 'Examples grounded',
    summary:
      'Curated positive and negative examples from UI primitives and recipes.',
    timestamp: 'Apr 28, 2025 · 10:45 AM · attune@local',
    tone: 'info',
    selected: false,
  },
  {
    number: '3',
    title: 'Measured against repo',
    summary: 'Ran deterministic scan to measure coverage and precision.',
    timestamp: 'Apr 28, 2025 · 11:02 AM · attune@local',
    tone: 'warn',
    selected: false,
  },
  {
    number: '4',
    title: 'Candidate revised',
    summary:
      'Refined rule to exclude non-UI wrappers and contextual components.',
    timestamp: 'Apr 28, 2025 · 11:18 AM · attune@local',
    tone: 'good',
    selected: true,
  },
  {
    number: '5',
    title: 'Promoted',
    summary: 'Meets quality and determinism thresholds for promotion.',
    timestamp: 'May 12, 2025 · 9:42 AM · attune@local',
    tone: 'good',
    selected: false,
  },
]

export const exportFiles: ReadonlyArray<ExportFileFixture> = [
  {
    path: 'attune/rules/style-inline-forbidden.yml',
    summary: 'Native ast-grep rule',
    kind: 'YAML',
    selected: true,
  },
  {
    path: 'attune/fixtures/style-inline-valid.tsx',
    summary: 'Positive fixture',
    kind: 'TSX',
    selected: false,
  },
  {
    path: 'attune/fixtures/style-inline-invalid.tsx',
    summary: 'Negative fixture',
    kind: 'TSX',
    selected: false,
  },
  {
    path: 'docs/policies/ui-styling.md',
    summary: 'Short policy guide',
    kind: 'MD',
    selected: false,
  },
]

export const repositoryRows: ReadonlyArray<SettingRowFixture> = [
  { label: 'Repository', value: 'bulletproof-react' },
  { label: 'Branch', value: 'main' },
  { label: 'Scan paths include', value: 'src/**, apps/react-vite/**' },
  { label: 'Excluded paths', value: 'node_modules/**, dist/**, coverage/**' },
  { label: 'Rule engine', value: 'ast-grep' },
]

export const ruleEngineRows: ReadonlyArray<SettingRowFixture> = [
  { label: 'ast-grep', value: 'Structural syntax shadows · enabled' },
  { label: 'ESLint', value: 'Programmable repo policy · enabled' },
  { label: 'CodeQL', value: 'Semantic/path stories · enabled' },
]

export const reviewToggles: ReadonlyArray<SettingToggleFixture> = [
  {
    label: 'Require positive and negative examples before promotion',
    value: 'Required',
    enabled: true,
  },
  {
    label: 'Show findings review before export',
    value: 'Required',
    enabled: true,
  },
  {
    label: 'Allow direct YAML editing for advanced users',
    value: 'Reserved',
    enabled: false,
  },
  {
    label: 'Keep lineage private to Attune',
    value: 'On',
    enabled: true,
  },
]

export const agentToggles: ReadonlyArray<SettingToggleFixture> = [
  {
    label: 'Revision guidance mode',
    value: 'Balanced',
    enabled: true,
  },
  {
    label: 'Auto-generate editorial summaries',
    value: 'On',
    enabled: true,
  },
  {
    label: 'Suggested example count',
    value: '2-3',
    enabled: true,
  },
]

export const statsCardSnippet = `return (
  <div
    style={{
      padding: '16px',
      borderRadius: 8,
      background: '#1f2937',
      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
    }}
  >
    <h3>{title}</h3>
    {children}
  </div>
)`

export const avatarSnippet = `return (
  <img
    src={src}
    style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      objectFit: 'cover',
    }}
    alt={name}
  />
)`

export const deterministicShapeSnippet = `pattern: $EL[style={$OBJ}]
pattern-not: $EL[style={$OBJ}] inside "**/(ui|components|primitives|recipes)/**"`

export const findingSnippet = `export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cx("card", className)}
      style={{
        background: "#121212",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}`

export const beforeRuleSnippet = `pattern: $EL[style={$OBJ}]

inside: **/*.{ts,tsx,jsx}
where:
  - not: Style prop uses token($VAL)
  - not: $EL matches /(Icon|Svg)/`

export const afterRuleSnippet = `pattern: $EL[style={$OBJ}]

inside: **/(ui|primitives|recipes)/**/*.{ts,tsx,jsx}
where:
  - not: Style prop uses token($VAL)
  - not: $EL matches /(Icon|Svg|Avatar)/`

export const exportRuleSnippet = `id: style-inline-forbidden
language: tsx
message: Use primitives or recipes; avoid inline styling.
severity: error
metadata:
  category: styling
  description: Disallow inline style objects and raw CSS.
rule:
  any:
    - pattern: $X({style: $Y})
    - pattern: $Y(): { $X: { $V | $Y, ... } }`
