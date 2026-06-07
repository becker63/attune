import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as RuleWorkbench from './page/ruleWorkbench'
import { Route } from './route'

export const SelectedRoute = m('SelectedRoute', { route: Route })
export const GotRuleWorkbenchMessage = m('GotRuleWorkbenchMessage', {
  message: RuleWorkbench.Message,
})

export const Message = S.Union([SelectedRoute, GotRuleWorkbenchMessage])
export type Message = typeof Message.Type
