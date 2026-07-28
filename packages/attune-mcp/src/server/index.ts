/**
 * MCP transport, tool registration, and resource adapters.
 *
 * @remarks
 * This is the outermost boundary. It translates the frozen contract to Effect
 * MCP registration and delegates application semantics to investigation/tool
 * services.
 *
 */

export * from "../v0/mcp.js";
export * from "../v0/resources.js";
export * from "./handlers.js";
