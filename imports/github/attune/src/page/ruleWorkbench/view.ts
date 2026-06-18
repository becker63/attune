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
    [
      h.Class(
        isExpanded
          ? 'workbench attune-page has-expanded-code'
          : 'workbench attune-page',
      ),
    ],
    [
      h.div(
        [h.Class('workbench-topbar attune-context-row')],
        [h.span([], [`${model.repoName} / ${model.branchName}`])],
      ),
      h.header(
        [h.Class('workbench-header attune-page-header')],
        [
          h.div(
            [h.Class('workbench-title-row')],
            [
              h.div(
                [],
                [
                  h.h1([], [model.title]),
                  h.p([h.Class('intent')], [model.status.readinessLabel]),
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('workbench-actions')],
            [
              h.button(
                [h.Class('button secondary'), h.OnClick(ClickedOpenFindings())],
                ['Open findings'],
              ),
              h.button(
                [h.Class('button primary'), h.OnClick(ClickedPromoteRule())],
                ['Promote rule'],
              ),
            ],
          ),
        ],
      ),
      h.section([h.Class('artifact-grid')], artifactGridChildren(model)),
      h.section(
        [h.Class('revision-panel')],
        [
          h.div(
            [h.Class('revision-heading')],
            [h.div([], [h.h2([], ['Revise with intent'])])],
          ),
          h.div(
            [h.Class('revision-input-row')],
            [
              h.textarea(
                [
                  h.AriaLabel('Revision intent'),
                  h.Placeholder(model.revisionPlaceholder),
                ],
                [],
              ),
              h.button(
                [h.Class('button primary'), h.OnClick(ClickedReviseRule())],
                ['Revise candidate'],
              ),
            ],
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
        model.looksLike.description,
        model.looksLike.sourcePath,
        model.looksLike.code,
        'good',
        'looksLike',
      ),
    ]
  }

  if (model.expandedCodePane === 'doesNotLookLike') {
    return [
      examplePaneView(
        model,
        model.doesNotLookLike.label,
        model.doesNotLookLike.description,
        model.doesNotLookLike.sourcePath,
        model.doesNotLookLike.code,
        'bad',
        'doesNotLookLike',
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
      model.looksLike.description,
      model.looksLike.sourcePath,
      model.looksLike.code,
      'good',
      'looksLike',
    ),
    examplePaneView(
      model,
      model.doesNotLookLike.label,
      model.doesNotLookLike.description,
      model.doesNotLookLike.sourcePath,
      model.doesNotLookLike.code,
      'bad',
      'doesNotLookLike',
    ),
    rulePanelView(model),
  ]
}

const examplePaneView = (
  model: Model,
  label: string,
  _description: string,
  sourcePath: string,
  code: Model['looksLike']['code'],
  tone: 'good' | 'bad',
  paneId: CodePaneId,
): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class(`example-card attune-artifact-panel artifact-pane is-${tone}`)],
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
            [
              h.code([h.Class('source-path')], [sourcePath]),
              expandButtonView(model, paneId),
            ],
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
    [h.Class('rule-panel attune-artifact-panel artifact-pane')],
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
              h.code([h.Class('source-path')], [model.ruleId]),
              expandButtonView(model, 'deterministicRule'),
            ],
          ),
        ],
      ),
      highlightedCodeView(model.deterministicRule),
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
