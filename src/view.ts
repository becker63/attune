import { Match as M } from 'effect'
import { type Document, type Html, html } from 'foldkit/html'

import {
  afterRuleSnippet,
  beforeRuleSnippet,
  candidate,
  deterministicShapeSnippet,
  exportFiles,
  exportRuleSnippet,
  findingSnippet,
  findings,
  lineageEvents,
  patterns,
  repositoryRows,
  ruleEngineRows,
  statsCardSnippet,
  type ExportFileFixture,
  type FindingFixture,
  type LineageEventFixture,
  type PatternFixture,
  type SettingRowFixture,
  type SettingToggleFixture,
} from './fixtures'
import * as Icon from './icon'
import type { Message } from './message'
import { GotRuleWorkbenchMessage, SelectedRoute } from './message'
import type { Model } from './model'
import * as RuleWorkbench from './page/ruleWorkbench'
import { highlightedCodeView } from './page/ruleWorkbench/view/highlightedCode'
import {
  DiscoverRoute,
  ExportsRoute,
  FindingsRoute,
  LineageRoute,
  SettingsRoute,
  WorkbenchRoute,
  type Route,
} from './route'
import { highlightedCodeFromPlainText } from './syntax/HighlightedCode'

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'Attune',
    body: h.main(
      [h.Class('attune-shell')],
      [
        sidebarView(model.route),
        h.section(
          [h.Class('attune-main')],
          [
            M.value(model.route).pipe(
              M.withReturnType<Html>(),
              M.tagsExhaustive({
                DiscoverRoute: () => discoverPageView(),
                WorkbenchRoute: () =>
                  h.submodel({
                    slotId: 'rule-workbench',
                    model: model.ruleWorkbench,
                    view: RuleWorkbench.view,
                    toParentMessage: (message) =>
                      GotRuleWorkbenchMessage({ message }),
                  }),
                FindingsRoute: () => findingsPageView(),
                LineageRoute: () => lineagePageView(),
                ExportsRoute: () => exportsPageView(),
                SettingsRoute: () => settingsPageView(),
              }),
            ),
          ],
        ),
      ],
    ),
  }
}

const sidebarView = (route: Route): Html => {
  const h = html<Message>()

  return h.aside(
    [h.Class('attune-sidebar'), h.AriaLabel('Attune navigation')],
    [
      h.div(
        [h.Class('attune-brand')],
        [
          Icon.leaf({ className: 'brand-icon', label: 'Attune' }),
          h.span([], ['attune']),
        ],
      ),
      h.nav(
        [h.Class('attune-nav'), h.AriaLabel('Primary')],
        [
          navButtonView(route, DiscoverRoute(), 'Discover', Icon.compass()),
          navButtonView(
            route,
            WorkbenchRoute(),
            'Workbench',
            Icon.fileSearch(),
          ),
          navButtonView(route, FindingsRoute(), 'Findings', Icon.workflow()),
          navButtonView(route, LineageRoute(), 'Lineage', Icon.gitBranch()),
          navButtonView(route, ExportsRoute(), 'Exports', Icon.archive()),
          navButtonView(route, SettingsRoute(), 'Settings', Icon.settings()),
        ],
      ),
      h.div(
        [h.Class('attune-sidebar-repo')],
        [
          h.strong([], [`+ ${candidate.repo}`]),
          h.span([], ['TypeScript · 4,312 files']),
          h.span([h.Class('attune-status-dot')], []),
        ],
      ),
      h.div(
        [h.Class('attune-sidebar-footer')],
        [
          h.div([h.Class('attune-avatar')], ['AB']),
          h.div([], [h.strong([], ['Alex']), h.span([], ['attune@local'])]),
        ],
      ),
    ],
  )
}

const navButtonView = (
  current: Route,
  route: Route,
  label: string,
  icon: Html,
): Html => {
  const h = html<Message>()
  const isSelected = current._tag === route._tag

  return h.button(
    [
      h.Class(isSelected ? 'attune-nav-item is-selected' : 'attune-nav-item'),
      h.AriaCurrent(isSelected ? 'page' : 'false'),
      h.OnClick(SelectedRoute({ route })),
    ],
    [icon, h.span([], [label])],
  )
}

const topbarView = (
  className: string,
  leftRepo = candidate.repo,
  right: ReadonlyArray<Html> = [],
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class(`attune-context-row ${className}`)],
    [h.span([], [`${leftRepo} / ${candidate.branch}`]), ...right],
  )
}

const pageHeaderView = (
  title: string,
  subtitle: string,
  actions: ReadonlyArray<Html> = [],
): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class('attune-page-header')],
    [
      h.div(
        [],
        [
          h.h1([h.Class('attune-page-title')], [title]),
          h.p([h.Class('attune-page-subtitle')], [subtitle]),
        ],
      ),
      actions.length === 0
        ? h.empty
        : h.div([h.Class('attune-action-group')], actions),
    ],
  )
}

const chipView = (label: string, tone?: string): Html => {
  const h = html<Message>()
  const className =
    tone === undefined ? 'attune-chip' : `attune-chip is-${tone}`

  return h.span([h.Class(className)], [label])
}

const codeView = (language: 'tsx' | 'yaml' | 'text', code: string): Html =>
  highlightedCodeView(highlightedCodeFromPlainText(language, code))

const discoverPageView = (): Html => {
  const h = html<Message>()
  const selected = patterns.find((pattern) => pattern.selected) ?? patterns[0]!

  return h.section(
    [h.Class('discover-page attune-page')],
    [
      topbarView('discover-topbar', candidate.repo, [
        h.span([], ['scan complete']),
      ]),
      pageHeaderView(
        'Discover',
        'Attune found 12 possible patterns in bulletproof-react.',
      ),
      h.section(
        [h.Class('discover-controls attune-control-row')],
        [
          h.p(
            [h.Class('shared-context-note')],
            ['Ready to inspect 5 · needs examples 3 · promoted 2'],
          ),
          h.empty,
        ],
      ),
      h.section(
        [h.Class('discover-body')],
        [
          h.aside(
            [h.Class('pattern-shelf attune-panel')],
            [
              h.div(
                [h.Class('attune-section-heading')],
                [h.h2([], ['Patterns']), h.span([], ['Sort: Most evidence'])],
              ),
              ...patterns.slice(0, 3).map(discoverPatternView),
            ],
          ),
          h.article(
            [h.Class('pattern-dossier attune-document-panel')],
            [
              h.div(
                [h.Class('dossier-heading')],
                [
                  h.div([], [h.h2([], [selected.title])]),
                  h.button(
                    [
                      h.Class(
                        'attune-button attune-button-secondary open-workbench-card',
                      ),
                      h.OnClick(SelectedRoute({ route: WorkbenchRoute() })),
                    ],
                    ['Open in Workbench', Icon.arrowRight()],
                  ),
                ],
              ),
              documentSectionView(
                'Why Attune noticed this',
                'Repeated inline styling appears outside primitive paths.',
              ),
              h.section(
                [h.Class('dossier-section')],
                [
                  h.h3([], ['Supporting examples']),
                  h.div(
                    [h.Class('example-preview-grid is-single')],
                    [
                      evidencePreviewView(
                        'src/features/dashboard/StatsCard.tsx',
                        statsCardSnippet,
                      ),
                    ],
                  ),
                ],
              ),
              documentSectionView('Target', 'ast-grep'),
              h.section(
                [h.Class('dossier-section')],
                [
                  h.h3([], ['Possible deterministic shape']),
                  codeView('yaml', deterministicShapeSnippet),
                ],
              ),
              documentSectionView(
                'Known risk',
                'May catch local animation or layout styles.',
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const findingsPageView = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('findings-page attune-page')],
    [
      topbarView('findings-topbar', candidate.findingsRepo, [
        h.span([], ['workbench']),
      ]),
      pageHeaderView(
        'Findings',
        'Review what this candidate matched before promotion.',
      ),
      h.section(
        [h.Class('findings-layout')],
        [
          h.aside(
            [h.Class('finding-queue attune-panel')],
            [
              h.p(
                [h.Class('muted-copy')],
                ['Unreviewed queue · 23 remaining · ast-grep'],
              ),
              ...findings.slice(0, 2).map(findingCardView),
            ],
          ),
          h.article(
            [h.Class('finding-dossier attune-document-panel')],
            [
              h.div(
                [h.Class('detail-heading')],
                [
                  h.div(
                    [],
                    [
                      h.h2([], ['src/components/Card.tsx']),
                      h.p([], ['Lines 54-62 · TSX']),
                    ],
                  ),
                  chipView('TSX'),
                ],
              ),
              codeView('tsx', findingSnippet),
              documentSectionView(
                'Why it matched',
                'The rule flags inline visual styles on UI primitives. This style object sets visual properties directly on a DOM element instead of using a recipe or primitive variant.',
              ),
              h.section(
                [h.Class('dossier-section')],
                [
                  h.h3([], ['Review decision']),
                  h.div(
                    [h.Class('decision-grid')],
                    [
                      decisionCardView('True positive', '', 'good'),
                      decisionCardView('False positive', '', 'bad'),
                      decisionCardView('Ignore', '', 'warn'),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const lineagePageView = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('lineage-page attune-page')],
    [
      topbarView('lineage-topbar', candidate.repo, [h.span([], ['workbench'])]),
      pageHeaderView(
        'Lineage',
        'Understand how this candidate evolved from first proposal to promoted artifact.',
      ),
      h.section(
        [h.Class('lineage-layout')],
        [
          h.aside(
            [h.Class('timeline-rail attune-panel')],
            lineageEvents.slice(0, 4).map(timelineItemView),
          ),
          h.article(
            [h.Class('lineage-article attune-document-panel')],
            [
              h.div(
                [h.Class('event-hero')],
                [
                  h.div(
                    [],
                    [
                      h.h2([], ['Candidate revised']),
                      h.p([], ['Apr 28, 2025 · 11:18 AM · attune@local']),
                    ],
                  ),
                ],
              ),
              documentSectionView(
                'What changed',
                'Excluded non-UI wrappers and contextual components.',
              ),
              h.section(
                [h.Class('dossier-section')],
                [
                  h.h3([], ['Rule comparison']),
                  h.div(
                    [h.Class('comparison-grid')],
                    [
                      comparisonPaneView(
                        'Before (Candidate B v1)',
                        beforeRuleSnippet,
                      ),
                      comparisonPaneView(
                        'After (Candidate B v2)',
                        afterRuleSnippet,
                      ),
                    ],
                  ),
                ],
              ),
              documentSectionView(
                'Why it matters',
                'Matches 34 -> 23. False positives 6 -> 0.',
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const exportsPageView = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('exports-page attune-page')],
    [
      topbarView('exports-topbar', candidate.repo, [h.span([], ['lineage'])]),
      pageHeaderView(
        'Exports',
        'Prepare the clean repository artifact and send it through the Git bot.',
      ),
      h.section(
        [h.Class('exports-layout')],
        [
          h.article(
            [h.Class('export-package attune-document-panel')],
            [
              h.div(
                [h.Class('attune-section-heading')],
                [
                  h.div(
                    [],
                    [
                      h.h2([], ['Clean artifact package']),
                      h.p([], ['Files entering the repository.']),
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class('export-package-grid')],
                [
                  h.aside(
                    [h.Class('export-files')],
                    exportFiles.slice(0, 3).map(exportFileView),
                  ),
                  h.article(
                    [h.Class('export-preview attune-artifact-panel')],
                    [
                      h.div(
                        [h.Class('detail-heading')],
                        [
                          h.h3([], ['attune/rules/style-inline-forbidden.yml']),
                          h.span([], ['YAML']),
                        ],
                      ),
                      codeView('yaml', exportRuleSnippet),
                    ],
                  ),
                ],
              ),
              h.p(
                [h.Class('shared-context-note')],
                ['Accepted artifacts enter the repo. Lineage stays in Attune.'],
              ),
            ],
          ),
          h.aside(
            [h.Class('git-plan attune-document-panel')],
            [
              h.h2([], ['Git bot handoff']),
              h.p([], ['Draft pull request handoff.']),
              h.section(
                [h.Class('settings-fields')],
                [
                  planRowView('Bot', 'attune-bot'),
                  planRowView('Base branch', 'main'),
                  planRowView('New branch', 'attune/style-inline-forbidden'),
                  planRowView('Destination path', 'attune/rules/'),
                  planRowView(
                    'Commit message',
                    'attune: add style-inline-forbidden rule',
                  ),
                  planRowView(
                    'PR title',
                    'Add UI primitive styling boundary rule',
                  ),
                ],
              ),
              documentSectionView('PR summary', 'Rule, fixtures, policy.'),
              h.p([h.Class('shared-context-note')], ['Ready for Git bot']),
              h.div(
                [h.Class('attune-action-group export-actions')],
                [
                  h.button(
                    [h.Class('attune-button attune-button-secondary')],
                    ['Preview files'],
                  ),
                  h.button(
                    [h.Class('attune-button attune-button-primary')],
                    ['Create draft PR', Icon.arrowRight()],
                  ),
                ],
              ),
              h.empty,
            ],
          ),
        ],
      ),
    ],
  )
}

const settingsPageView = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('settings-page attune-page')],
    [
      topbarView('settings-topbar', candidate.repo, [h.span([], ['saved'])]),
      pageHeaderView(
        'Settings',
        'Configure how Attune scans, revises, and exports patterns for this repository.',
      ),
      h.section(
        [h.Class('settings-board')],
        [
          settingsPanelView(
            'Repository scope',
            'Control what Attune scans and how rules are evaluated.',
            repositoryRows.slice(0, 3),
          ),
          settingsPanelView(
            'Analysis tools',
            'Choose which deterministic tools can materialize patterns.',
            ruleEngineRows.slice(0, 2),
          ),
          togglePanelView('Git bot handoff', 'Pull request export behavior.', [
            {
              label: 'Open draft PR after export',
              value: 'On',
              enabled: true,
            },
            {
              label: 'Include short policy docs',
              value: 'On',
              enabled: true,
            },
            {
              label: 'PR title template',
              value: 'Attune: {title} ({candidate})',
              enabled: true,
            },
          ]),
        ],
      ),
      h.footer(
        [h.Class('settings-savebar')],
        [
          h.span([], [Icon.check(), 'Settings saved 2 minutes ago']),
          h.div(
            [h.Class('attune-action-group')],
            [
              h.button(
                [h.Class('attune-button attune-button-secondary')],
                ['Restore defaults'],
              ),
              h.button(
                [h.Class('attune-button attune-button-save')],
                ['Save changes'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const discoverPatternView = (pattern: PatternFixture): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class(
        pattern.selected ? 'discover-pattern is-selected' : 'discover-pattern',
      ),
    ],
    [
      h.div(
        [],
        [
          h.strong([], [pattern.title]),
          h.div(
            [h.Class('pattern-meta-row')],
            [pattern.evidence, pattern.files, pattern.tags].map((item) =>
              h.span([], [item]),
            ),
          ),
          h.div(
            [h.Class('pattern-meta-row')],
            [h.span([], [pattern.readiness]), h.span([], [pattern.target])],
          ),
        ],
      ),
      Icon.arrowRight({ className: 'icon tiny-icon' }),
    ],
  )
}

const evidencePreviewView = (path: string, code: string): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class('evidence-preview attune-artifact-panel')],
    [h.h3([], [path]), codeView('tsx', code)],
  )
}

const findingCardView = (finding: FindingFixture): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class(
        finding.selected
          ? `finding-card is-${finding.tone} is-selected`
          : `finding-card is-${finding.tone}`,
      ),
    ],
    [
      h.div(
        [h.Class('finding-card-top')],
        [h.strong([], [finding.path]), h.span([], [finding.line])],
      ),
      h.span([], [finding.state]),
    ],
  )
}

const decisionCardView = (
  label: string,
  description: string,
  tone: string,
): Html => {
  const h = html<Message>()

  return h.button(
    [h.Class(`attune-button decision-action is-${tone}`)],
    description === ''
      ? [h.strong([], [label])]
      : [h.strong([], [label]), h.span([], [description])],
  )
}

const timelineItemView = (event: LineageEventFixture): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class(
        event.selected
          ? `timeline-item is-${event.tone} is-selected`
          : `timeline-item is-${event.tone}`,
      ),
    ],
    [
      h.span([h.Class('timeline-number')], [event.number]),
      h.div([], [h.strong([], [event.title])]),
    ],
  )
}

const exportFileView = (file: ExportFileFixture): Html => {
  const h = html<Message>()

  return h.button(
    [h.Class(file.selected ? 'export-file is-selected' : 'export-file')],
    [h.span([], [file.path]), h.small([], [file.summary])],
  )
}

const settingsPanelView = (
  title: string,
  summary: string,
  rows: ReadonlyArray<SettingRowFixture>,
  action?: string,
): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class('settings-panel attune-document-panel')],
    [
      h.div(
        [h.Class('attune-section-heading')],
        [
          h.div([], [h.h2([], [title]), h.p([], [summary])]),
          action === undefined
            ? h.empty
            : h.button(
                [h.Class('attune-button attune-button-secondary')],
                [action],
              ),
        ],
      ),
      h.section(
        [h.Class('settings-fields')],
        rows.map((row) => planRowView(row.label, row.value)),
      ),
    ],
  )
}

const togglePanelView = (
  title: string,
  summary: string,
  rows: ReadonlyArray<SettingToggleFixture>,
  note?: string,
  action?: string,
): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class('settings-panel attune-document-panel')],
    [
      h.div(
        [h.Class('attune-section-heading')],
        [
          h.div([], [h.h2([], [title]), h.p([], [summary])]),
          action === undefined
            ? h.empty
            : h.button(
                [h.Class('attune-button attune-button-secondary')],
                [action],
              ),
        ],
      ),
      h.section(
        [h.Class('settings-fields')],
        rows.map((row) =>
          h.div(
            [h.Class('settings-toggle-row')],
            [
              h.span([], [row.label]),
              h.strong([], [row.value]),
              h.span(
                [h.Class(row.enabled ? 'toggle-pill is-on' : 'toggle-pill')],
                [],
              ),
            ],
          ),
        ),
      ),
      note === undefined ? h.empty : h.p([h.Class('attune-note-box')], [note]),
    ],
  )
}

const planRowView = (label: string, value: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('plan-row')],
    [h.span([], [label]), h.strong([], [value])],
  )
}

const documentSectionView = (title: string, copy: string): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('dossier-section')],
    [h.h3([], [title]), h.p([], [copy])],
  )
}

const comparisonPaneView = (title: string, code: string): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class('comparison-pane attune-artifact-panel')],
    [h.h3([], [title]), codeView('yaml', code)],
  )
}
