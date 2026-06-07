import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { CodePaneId } from './model'

export const ClickedOpenFindings = m('ClickedOpenFindings')
export const ClickedPromoteRule = m('ClickedPromoteRule')
export const ClickedReviseRule = m('ClickedReviseRule')
export const ToggledCodePaneExpansion = m('ToggledCodePaneExpansion', {
  paneId: CodePaneId,
})

export const Message = S.Union([
  ClickedOpenFindings,
  ClickedPromoteRule,
  ClickedReviseRule,
  ToggledCodePaneExpansion,
])
export type Message = typeof Message.Type
