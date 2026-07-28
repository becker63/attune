/**
 * Supported Attune MCP package entry point.
 *
 * @remarks
 * This intentionally small file exposes the repository's noun-oriented
 * contract, investigation, platform, server, and tool boundaries. The `v0`
 * directory remains an implementation-compatibility layer; contributors
 * should begin with `investigation/service.ts` or the relevant `tools/<noun>`
 * module instead of treating protocol registration as the application model.
 */
export * from "./contract/index.js";
export * from "./investigation/index.js";
export * from "./platform/index.js";
export * from "./server/index.js";
export * from "./tools/index.js";
