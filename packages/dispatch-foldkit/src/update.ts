import type { Command } from "foldkit"

import type { Message } from "./message.js"
import type { Model } from "./model.js"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
type MessageByTag<TTag extends Message["_tag"]> = Extract<
  Message,
  Readonly<{ _tag: TTag }>
>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case "SelectedRoute": {
      const selected = message as MessageByTag<"SelectedRoute">
      return [{ ...model, route: selected.route }, []]
    }
    case "SelectedFilter": {
      const selected = message as MessageByTag<"SelectedFilter">
      return [{ ...model, filter: selected.filter }, []]
    }
    case "SelectedThread": {
      const selected = message as MessageByTag<"SelectedThread">
      return [{ ...model, selectedThreadId: selected.threadId }, []]
    }
    case "SelectedHypothesis": {
      const selected = message as MessageByTag<"SelectedHypothesis">
      return [{ ...model, selectedHypothesisId: selected.hypothesisId }, []]
    }
    case "RequestedPromotion": {
      const selected = message as MessageByTag<"RequestedPromotion">
      return [
        {
          ...model,
          selectedHypothesisId: selected.hypothesisId,
          pendingCommand: `promote:${selected.hypothesisId}`,
        },
        [],
      ]
    }
    case "ServerSnapshotChanged": {
      const selected = message as MessageByTag<"ServerSnapshotChanged">
      return [
        {
          ...model,
          serverSnapshot: selected.snapshot,
          selectedRunId: selected.snapshot.runId,
          pendingCommand: "",
        },
        [],
      ]
    }
  }

  return [model, []]
}
