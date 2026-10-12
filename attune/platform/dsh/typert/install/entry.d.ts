// The TypeScript declaration of the installable Cordis entry (see `entry.mjs`).
import * as contract from './typert.host.js'

export declare const name: string
export declare const inject: readonly string[]
export declare const factories: typeof contract
export declare const identity: { contract: string; digest: string }
export declare function apply(ctx: unknown): unknown
