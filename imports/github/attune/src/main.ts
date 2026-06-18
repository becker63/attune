import type { Runtime } from 'foldkit'

import * as RuleWorkbench from './page/ruleWorkbench'
import { WorkbenchRoute } from './route'
import type { Message } from './message'
import { Model } from './model'

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: WorkbenchRoute(),
    ruleWorkbench: RuleWorkbench.init(),
  }),
  [],
]
