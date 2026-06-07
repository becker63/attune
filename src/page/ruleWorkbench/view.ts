import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import * as Icon from '../../icon'
import type { Message } from './message'
import {
  ClickedOpenFindings,
  ClickedPromoteRule,
  ClickedReviseRule,
  ToggledCodePaneExpansion,
} from './message'
import type { CodePaneId, Model } from './model'
import { highlightedCodeView } from './view/highlightedCode'

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()
  const isExpanded = model.expandedCodePane !== 'none'

  return h.div(
    [h.Class(isExpanded ? 'workbench has-expanded-code' : 'workbench')],
    [
      h.div(
        [h.Class('workbench-topbar')],
        [
          h.span([h.Class('topbar-repo')], [model.repoName]),
          h.span(
            [h.Class('topbar-branch')],
            [Icon.gitBranch(), model.branchName],
          ),
        ],
      ),
      h.header(
        [h.Class('workbench-header')],
        [
          h.div(
            [],
            [h.h1([], [model.title]), h.p([h.Class('intent')], [model.intent])],
          ),
          h.div(
            [h.Class('workbench-actions')],
            [
              h.button(
                [h.Class('button secondary'), h.OnClick(ClickedReviseRule())],
                ['Revise rule'],
              ),
              h.button(
                [h.Class('button primary'), h.OnClick(ClickedPromoteRule())],
                ['Promote rule'],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [h.Class('status-row'), h.AriaLabel('Candidate measurement summary')],
        [
          metricView(model.status.label, '', Icon.check(), 'good'),
          metricView(
            model.status.matchCount.toString(),
            'matches',
            Icon.fileSearch(),
          ),
          metricView(
            model.status.reviewedCount.toString(),
            'reviewed',
            Icon.check(),
          ),
          metricView(
            model.status.falsePositiveCount.toString(),
            'false positives',
            Icon.x(),
            'bad',
          ),
          metricView(model.status.durationMs.toString(), 'ms', Icon.clock()),
        ],
      ),
      h.section([h.Class('artifact-grid')], artifactGridChildren(model)),
      h.aside(
        [h.Class('findings-strip panel'), h.AriaLabel('Findings summary')],
        [
          h.div(
            [h.Class('findings-card-title')],
            [
              Icon.fileSearch({ className: 'icon muted-icon' }),
              h.span([], ['Findings']),
            ],
          ),
          h.div(
            [h.Class('findings-metrics')],
            [
              metricView(model.status.matchCount.toString(), 'matches'),
              metricView(model.fileCount.toString(), 'files'),
              metricView(
                model.status.falsePositiveCount.toString(),
                'false positives',
                undefined,
                'bad',
              ),
            ],
          ),
          h.button(
            [
              h.Class('button primary compact-button'),
              h.OnClick(ClickedOpenFindings()),
            ],
            ['Open findings', Icon.arrowRight({ className: 'icon tiny-icon' })],
          ),
        ],
      ),
    ],
  )
})

const artifactGridChildren = (model: Model): ReadonlyArray<Html> => {
  if (model.expandedCodePane === 'looksLike') {
    return [
      examplePaneView(
        model,
        model.looksLike.label,
        model.looksLike.code,
        'good',
        'looksLike',
        'What this rule means',
      ),
    ]
  }

  if (model.expandedCodePane === 'doesNotLookLike') {
    return [
      examplePaneView(
        model,
        model.doesNotLookLike.label,
        model.doesNotLookLike.code,
        'bad',
        'doesNotLookLike',
        'What this rule avoids',
      ),
    ]
  }

  if (model.expandedCodePane === 'deterministicRule') {
    return [rulePanelView(model)]
  }

  return [
    examplePaneView(
      model,
      model.looksLike.label,
      model.looksLike.code,
      'good',
      'looksLike',
      'What this rule means',
    ),
    examplePaneView(
      model,
      model.doesNotLookLike.label,
      model.doesNotLookLike.code,
      'bad',
      'doesNotLookLike',
      'What this rule avoids',
    ),
    rulePanelView(model),
  ]
}

const examplePaneView = (
  model: Model,
  label: string,
  code: Model['looksLike']['code'],
  tone: 'good' | 'bad',
  paneId: CodePaneId,
  description: string,
): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class(`example-card panel artifact-pane is-${tone}`)],
    [
      h.div(
        [h.Class('panel-heading')],
        [
          h.span(
            [],
            [
              h.span(
                [h.Class('example-icon')],
                [tone === 'good' ? Icon.check() : Icon.x()],
              ),
              label,
            ],
          ),
          h.span(
            [h.Class('panel-heading-actions')],
            [h.small([], [description]), expandButtonView(model, paneId)],
          ),
        ],
      ),
      highlightedCodeView(code),
      model.expandedCodePane === 'none'
        ? h.empty
        : h.p(
            [h.Class('resize-hint')],
            ['Drag this pane or its code corner to resize it.'],
          ),
    ],
  )
}

const rulePanelView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('rule-panel panel artifact-pane')],
    [
      h.div(
        [h.Class('panel-heading')],
        [
          h.span(
            [],
            [Icon.flask({ className: 'icon good-icon' }), 'Deterministic rule'],
          ),
          h.span(
            [h.Class('panel-heading-actions')],
            [
              h.small([], ['ast-grep']),
              expandButtonView(model, 'deterministicRule'),
            ],
          ),
        ],
      ),
      highlightedCodeView(model.deterministicRule),
      h.p(
        [h.Class('rule-note')],
        ['3 matches ', h.code([], ['styled({...})'])],
      ),
    ],
  )
}

const metricView = (
  value: string,
  label: string,
  icon?: Html,
  tone?: 'good' | 'bad',
): Html => {
  const h = html<Message>()
  const className = tone === undefined ? 'metric' : `metric is-${tone}`

  return h.div(
    [h.Class(className)],
    [
      icon === undefined ? h.empty : h.span([h.Class('metric-icon')], [icon]),
      h.strong([], [value]),
      label === '' ? h.empty : h.span([], [label]),
    ],
  )
}

const expandButtonView = (model: Model, paneId: CodePaneId): Html => {
  const h = html<Message>()
  const isExpanded = model.expandedCodePane === paneId
  const label = isExpanded ? 'Collapse code pane' : 'Expand code pane'

  return h.button(
    [
      h.Class('icon-button'),
      h.Title(label),
      h.AriaLabel(label),
      h.AriaPressed(isExpanded ? 'true' : 'false'),
      h.OnClick(ToggledCodePaneExpansion({ paneId })),
    ],
    [
      isExpanded
        ? Icon.shrink({ className: 'icon tiny-icon' })
        : Icon.expand({ className: 'icon tiny-icon' }),
    ],
  )
}
