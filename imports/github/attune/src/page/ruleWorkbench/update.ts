import { Match as M } from 'effect'
import type { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import type { Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedOpenFindings: () => [model, []],
      ClickedPromoteRule: () => [model, []],
      ClickedReviseRule: () => [model, []],
      ToggledCodePaneExpansion: ({ paneId }) => [
        evo(model, {
          expandedCodePane: () =>
            model.expandedCodePane === paneId ? 'none' : paneId,
        }),
        [],
      ],
    }),
  )
