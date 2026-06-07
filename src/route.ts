import { ts } from 'foldkit/schema'
import { Schema as S } from 'effect'

export const DiscoverRoute = ts('DiscoverRoute')
export const WorkbenchRoute = ts('WorkbenchRoute')
export const FindingsRoute = ts('FindingsRoute')
export const LineageRoute = ts('LineageRoute')
export const ExportsRoute = ts('ExportsRoute')
export const SettingsRoute = ts('SettingsRoute')

export const Route = S.Union([
  DiscoverRoute,
  WorkbenchRoute,
  FindingsRoute,
  LineageRoute,
  ExportsRoute,
  SettingsRoute,
])
export type Route = typeof Route.Type
