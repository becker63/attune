import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import type {
  Message} from './message';
import {
  ClickedOpenFindings,
  ClickedPromoteRule,
  ClickedReviseRule
} from './message'
import type { Model } from './model'
import { highlightedCodeView } from './view/highlightedCode'

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('workbench')],
    [
      h.header(
        [h.Class('workbench-header')],
        [
          h.div(
            [],
            [
              h.p([h.Class('repo-kicker')], ['sat-demo / main']),
              h.h1([], [model.title]),
              h.p([h.Class('intent')], [model.intent]),
            ],
          ),
          h.div(
            [h.Class('workbench-actions')],
            [
              h.button([h.Class('button secondary'), h.OnClick(ClickedReviseRule())], [
                'Revise rule',
              ]),
              h.button([h.Class('button primary'), h.OnClick(ClickedPromoteRule())], [
                'Promote rule',
              ]),
            ],
          ),
        ],
      ),
      h.section(
        [h.Class('status-row'), h.AriaLabel('Candidate measurement summary')],
        [
          metricView(model.status.label, ''),
          metricView(model.status.matchCount.toString(), 'matches'),
          metricView(model.status.reviewedCount.toString(), 'reviewed'),
          metricView(model.status.falsePositiveCount.toString(), 'false positives'),
          metricView(model.status.durationMs.toString(), 'ms'),
          h.button(
            [h.Class('button secondary'), h.OnClick(ClickedOpenFindings())],
            ['Open findings'],
          ),
        ],
      ),
      h.section(
        [h.Class('artifact-grid')],
        [
          h.div(
            [h.Class('examples-panel panel')],
            [
              h.h2([], ['Examples']),
              exampleView(model.looksLike.label, model.looksLike.code),
              exampleView(model.doesNotLookLike.label, model.doesNotLookLike.code),
            ],
          ),
          h.div(
            [h.Class('rule-panel panel')],
            [
              h.div([h.Class('panel-heading')], ['Deterministic rule ', h.span([], ['ast-grep'])]),
              highlightedCodeView(model.deterministicRule),
            ],
          ),
        ],
      ),
      h.section(
        [h.Class('timeline panel'), h.AriaLabel('Provenance timeline')],
        model.timeline.map(item =>
          h.div(
            [h.Class('timeline-item')],
            [
              h.strong([], [item.label]),
              h.p([], [item.detail]),
            ],
          ),
        ),
      ),
    ],
  )
})

const metricView = (value: string, label: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('metric')],
    [h.strong([], [value]), label === '' ? h.empty : h.span([], [label])],
  )
}

const exampleView = (
  label: string,
  code: Model['looksLike']['code'],
): Html => {
  const h = html<Message>()

  return h.article(
    [h.Class('example-card')],
    [h.h3([], [label]), highlightedCodeView(code)],
  )
}
