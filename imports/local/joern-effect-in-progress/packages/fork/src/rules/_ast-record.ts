import type { ESTree } from "effect-oxlint";

export type AstRecord = {
  readonly [key: string]: unknown;
};

export const isAstRecord = (value: unknown): value is AstRecord =>
  typeof value === "object" && value !== null;

export const field = (value: unknown, key: string): unknown =>
  isAstRecord(value) ? value[key] : undefined;

export const stringField = (value: unknown, key: string): string | undefined => {
  const raw = field(value, key);
  return typeof raw === "string" ? raw : undefined;
};

export const booleanField = (value: unknown, key: string): boolean | undefined => {
  const raw = field(value, key);
  return typeof raw === "boolean" ? raw : undefined;
};

export const arrayField = (value: unknown, key: string): ReadonlyArray<unknown> | undefined => {
  const raw = field(value, key);
  return Array.isArray(raw) ? raw : undefined;
};

export const isAstNode = (value: unknown): value is ESTree.Node =>
  isAstRecord(value) && typeof value["type"] === "string";

export const nodeField = (value: unknown, key: string): ESTree.Node | undefined => {
  const raw = field(value, key);
  return isAstNode(raw) ? raw : undefined;
};

export const nodeArrayField = (value: unknown, key: string): ReadonlyArray<ESTree.Node> | undefined => {
  const raw = arrayField(value, key);
  return raw?.every(isAstNode) === true ? raw : undefined;
};

export const isNodeType = <Type extends ESTree.Node["type"]>(
  value: unknown,
  type: Type,
): value is Extract<ESTree.Node, { readonly type: Type }> => isAstNode(value) && value.type === type;

export const memberExpressionField = (value: unknown, key: string): ESTree.MemberExpression | undefined => {
  const raw = nodeField(value, key);
  return raw?.type === "MemberExpression" ? raw : undefined;
};

export const callExpressionField = (value: unknown, key: string): ESTree.CallExpression | undefined => {
  const raw = nodeField(value, key);
  return raw?.type === "CallExpression" ? raw : undefined;
};

export const lineField = (value: unknown, edge: "start" | "end"): number | undefined => {
  const point = field(field(value, "loc"), edge);
  const line = field(point, "line");
  return typeof line === "number" ? line : undefined;
};
