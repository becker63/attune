import { Match as M } from 'effect'
import { type Document, type Html, html } from 'foldkit/html'

import * as Icon from './icon'
import type { Message } from './message'
import { GotRuleWorkbenchMessage, SelectedRoute } from './message'
import type { Model } from './model'
import * as RuleWorkbench from './page/ruleWorkbench'
import {
  DiscoverRoute,
  ExportsRoute,
  FindingsRoute,
  LineageRoute,
  SettingsRoute,
  WorkbenchRoute,
  type Route,
} from './route'

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
                WorkbenchRoute: () =>
                  h.submodel({
                    slotId: 'rule-workbench',
                    model: model.ruleWorkbench,
                    view: RuleWorkbench.view,
                    toParentMessage: (message) =>
                      GotRuleWorkbenchMessage({ message }),
                  }),
                DiscoverRoute: () => stubPageView('Discover'),
                FindingsRoute: () => stubPageView('Findings'),
                LineageRoute: () => stubPageView('Lineage'),
                ExportsRoute: () => stubPageView('Exports'),
                SettingsRoute: () => stubPageView('Settings'),
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
          h.span([], ['Attune']),
        ],
      ),
      h.nav(
        [h.Class('attune-nav'), h.AriaLabel('Primary')],
        [
          navButtonView(route, DiscoverRoute(), 'Discover', Icon.compass()),
          navButtonView(route, WorkbenchRoute(), 'Workbench', Icon.workflow()),
          navButtonView(route, FindingsRoute(), 'Findings', Icon.fileSearch()),
          navButtonView(route, LineageRoute(), 'Lineage', Icon.gitBranch()),
          navButtonView(route, ExportsRoute(), 'Exports', Icon.archive()),
          navButtonView(route, SettingsRoute(), 'Settings', Icon.settings()),
        ],
      ),
      h.div(
        [h.Class('attune-sidebar-section')],
        [
          h.p([h.Class('attune-sidebar-eyebrow')], ['Potential patterns']),
          patternCardView(
            'Styling belongs in UI primitives and recipes',
            '34',
            'Likely overbroad',
            true,
          ),
          patternCardView(
            'Effects stay at the boundary',
            '14',
            'Strong candidate',
            false,
          ),
          patternCardView(
            'Avoid raw environment reads',
            '7',
            'Good candidate',
            false,
          ),
          h.button(
            [
              h.Class('attune-sidebar-link'),
              h.OnClick(SelectedRoute({ route: DiscoverRoute() })),
            ],
            [
              'View 3 more patterns',
              Icon.arrowRight({ className: 'icon tiny-icon' }),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('attune-sidebar-footer')],
        [
          h.div([h.Class('attune-avatar')], [Icon.user({ className: 'icon' })]),
          h.div([], [h.strong([], ['Joseph']), h.span([], ['Taskie-Steward'])]),
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

const patternCardView = (
  title: string,
  matchCount: string,
  hint: string,
  isSelected: boolean,
): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class(
        isSelected ? 'attune-pattern-card is-selected' : 'attune-pattern-card',
      ),
      h.OnClick(SelectedRoute({ route: WorkbenchRoute() })),
    ],
    [
      h.span(
        [h.Class('attune-pattern-card-top')],
        [
          h.span([h.Class('attune-pattern-title')], [title]),
          h.span([h.Class('attune-pattern-count')], [matchCount]),
        ],
      ),
      h.span(
        [h.Class('attune-pattern-card-bottom')],
        [h.span([h.Class('attune-status-dot')], []), h.span([], [hint])],
      ),
    ],
  )
}

const stubPageView = (title: string): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('attune-stub-page')],
    [
      h.h1([], [title]),
      h.p([], ['This route is reserved for the Workbench-first spike.']),
    ],
  )
}
