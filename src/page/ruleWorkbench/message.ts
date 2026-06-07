import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const ClickedOpenFindings = m('ClickedOpenFindings')
export const ClickedPromoteRule = m('ClickedPromoteRule')
export const ClickedReviseRule = m('ClickedReviseRule')

export const Message = S.Union([
  ClickedOpenFindings,
  ClickedPromoteRule,
  ClickedReviseRule,
])
export type Message = typeof Message.Type
