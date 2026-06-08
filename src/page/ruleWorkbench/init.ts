import { highlightedCodeFromPlainText } from '../../syntax/HighlightedCode'
import { Model } from './model'

const looksLikeCode = `import { Button } from "@/components/ui/button"

export function Toolbar() {
  return <Button variant="surface" size="sm">Save</Button>
}`

const doesNotLookLikeCode = `export function Card() {
  return (
    <div
      style={{
        background: "#121212",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        borderRadius: 12,
      }}
    />
  )
}`

const astGrepRule = `id: style-inline-forbidden
language: tsx
message: Use primitives or recipes for surface styling.
severity: error
rule:
  any:
    - pattern: <$$$ style={$$$} $$$ />
    - pattern: className={$VALUE}`

export const init = (): Model =>
  Model.make({
    repoName: 'bulletproof-react',
    branchName: 'main',
    expandedCodePane: 'none',
    title: 'Styling belongs in UI primitives and recipes',
    versionLabel: 'Candidate B (v2)',
    ruleId: 'style-inline-forbidden',
    intent:
      'Keep visual styling centralized in UI primitives and recipes so app components remain structural and token-driven.',
    status: {
      label: 'Candidate B (v2)',
      readinessLabel: 'Ready to inspect',
      matchCount: 34,
      reviewedCount: 8,
      falsePositiveCount: 2,
      durationMs: 180,
    },
    looksLike: {
      label: 'Looks like',
      description: 'What this rule means',
      sourcePath: 'src/components/ui/button.tsx',
      code: highlightedCodeFromPlainText('tsx', looksLikeCode),
    },
    doesNotLookLike: {
      label: 'Does not look like',
      description: 'What this rule avoids',
      sourcePath: 'src/features/dashboard/StatsCard.tsx',
      code: highlightedCodeFromPlainText('tsx', doesNotLookLikeCode),
    },
    deterministicRule: highlightedCodeFromPlainText('yaml', astGrepRule),
    deterministicRuleNote:
      'This is the native ast-grep artifact being considered, not a prompt.',
    revisionPlaceholder:
      'Allow inline width and height for layout-only geometry, but keep raw colors and shadows flagged.',
    revisionSuggestions: [
      'Only apply outside ui/primitives',
      'Allow layout geometry',
      'Keep raw colors flagged',
    ],
    findingsSummary:
      '34 matches across 12 files. Two false positives should inform the next revision before promotion.',
    timeline: [
      {
        label: 'Agent proposed',
        detail: 'The agent noticed repeated styling boundaries.',
        time: '10:21 AM',
      },
      {
        label: 'Candidate B revised',
        detail: 'Rule revised to focus on surface styling specifics together.',
        time: '10:48 AM',
      },
      {
        label: 'Measured',
        detail: '34 matches, 2 false positives, 180 ms.',
        time: '10:52 AM',
      },
      {
        label: 'Promoted',
        detail: 'Rule promoted and ready to export to repository.',
        time: '10:58 AM',
      },
      {
        label: 'Export ready',
        detail: 'Clean artifact prepared for attune/rules.',
        time: '10:59 AM',
      },
    ],
    fileCount: 12,
  })
