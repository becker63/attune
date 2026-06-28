import type {
  DiscoveryEvent,
  ReportEvent,
  WorkbenchSnapshot,
} from "@attune/attuned-discovery"
import type {
  ActivityItem,
  FoldkitPage,
  AttuneRoute,
} from "./schema.js"

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

export type FoldkitMdxViewFixture = Readonly<{
  readonly fixtureId: string
  readonly sourcePath: string
  readonly page: FoldkitPage
  readonly expectedText: ReadonlyArray<string>
  readonly expectedComponents: ReadonlyArray<string>
}>

export type FoldkitSiteSurfaceFixture = Readonly<{
  readonly surfaceId: string
  readonly route: AttuneRoute
  readonly sourcePath: string
  readonly expectedText: ReadonlyArray<string>
}>

export type FoldkitSiteFixture = Readonly<{
  readonly fixtureId: string
  readonly scenarioId: string
  readonly runId: string
  readonly routes: ReadonlyArray<AttuneRoute>
  readonly items: ReadonlyArray<ActivityItem>
  readonly surfaces: ReadonlyArray<FoldkitSiteSurfaceFixture>
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
