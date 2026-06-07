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
    intent:
      'Keep visual styling centralized in UI primitives and recipes so app components remain structural and token-driven.',
    status: {
      label: 'Candidate B (v2)',
      matchCount: 34,
      reviewedCount: 8,
      falsePositiveCount: 2,
      durationMs: 180,
    },
    looksLike: {
      label: 'Looks like',
      code: highlightedCodeFromPlainText('tsx', looksLikeCode),
    },
    doesNotLookLike: {
      label: 'Does not look like',
      code: highlightedCodeFromPlainText('tsx', doesNotLookLikeCode),
    },
    deterministicRule: highlightedCodeFromPlainText('yaml', astGrepRule),
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
