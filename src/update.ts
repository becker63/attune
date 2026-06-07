import { Match as M } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import type { Message } from './message'
import { GotRuleWorkbenchMessage, SelectedRoute } from './message'
import type { Model } from './model'
import * as RuleWorkbench from './page/ruleWorkbench'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      SelectedRoute: ({ route }) => [evo(model, { route: () => route }), []],
      GotRuleWorkbenchMessage: ({ message }) => {
        const [ruleWorkbench, commands] = RuleWorkbench.update(
          model.ruleWorkbench,
          message,
        )

        return [
          evo(model, { ruleWorkbench: () => ruleWorkbench }),
          Command.mapMessages(commands, (message) =>
            GotRuleWorkbenchMessage({ message }),
          ),
        ]
      },
    }),
  )

export { SelectedRoute }
