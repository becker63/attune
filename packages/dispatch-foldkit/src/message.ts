import { Schema as S } from "effect"
import { m } from "foldkit/message"

import { WorkbenchSnapshot } from "@attune/attuned-discovery"
import { DispatchFilter, DispatchRoute } from "@attune/dispatch-schema"

export const SelectedRoute = m("SelectedRoute", { route: DispatchRoute })
export const SelectedFilter = m("SelectedFilter", { filter: DispatchFilter })
export const SelectedThread = m("SelectedThread", { threadId: S.String })
export const SelectedHypothesis = m("SelectedHypothesis", {
  hypothesisId: S.String,
})
export const RequestedPromotion = m("RequestedPromotion", {
  hypothesisId: S.String,
})
export const ServerSnapshotChanged = m("ServerSnapshotChanged", {
  snapshot: WorkbenchSnapshot,
})

export const Message = S.Union([
  SelectedRoute,
  SelectedFilter,
  SelectedThread,
  SelectedHypothesis,
  RequestedPromotion,
  ServerSnapshotChanged,
])
export type Message = typeof Message.Type
