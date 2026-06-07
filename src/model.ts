import { Schema as S } from 'effect'

import * as RuleWorkbench from './page/ruleWorkbench'
import { Route } from './route'

export const Model = S.Struct({
  route: Route,
  ruleWorkbench: RuleWorkbench.Model,
})
export type Model = typeof Model.Type
