import type {
  DiscoveryEvent,
  ReportEvent,
  WorkbenchSnapshot,
} from "@attune/attuned-discovery"
import type { DispatchMdxPage } from "@attune/dispatch-schema"

export type FoldkitWorkbenchFixtureStep = Readonly<{
  readonly stepId: string
  readonly title: string
  readonly events: ReadonlyArray<DiscoveryEvent>
}>

export type FoldkitWorkbenchFixture = Readonly<{
  readonly fixtureId: string
  readonly runId: string
  readonly title: string
  readonly steps: ReadonlyArray<FoldkitWorkbenchFixtureStep>
  readonly reportEvents: ReadonlyArray<ReportEvent>
}>

export type FoldkitMtxViewFixture = Readonly<{
  readonly fixtureId: string
  readonly sourcePath: string
  readonly page: DispatchMdxPage
  readonly expectedText: ReadonlyArray<string>
  readonly expectedComponents: ReadonlyArray<string>
}>

export type AppliedWorkbenchFixture = Readonly<{
  readonly fixture: FoldkitWorkbenchFixture
  readonly appendedEvents: ReadonlyArray<DiscoveryEvent>
  readonly trace: ReadonlyArray<string>
  readonly snapshot: WorkbenchSnapshot
  readonly runSummary: Readonly<{
    readonly runId: string
    readonly status: string
    readonly appendedEventCount: number
    readonly snapshotVersion: number
    readonly bestNextAction: string
  }>
}>
