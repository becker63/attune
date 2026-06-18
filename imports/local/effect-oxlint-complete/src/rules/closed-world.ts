import type { ESTree } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import { isAstRecord } from "./_ast-record.js";

const ClosedWorldOptions = Schema.UndefinedOr(Schema.Struct({
  allowedPackages: Schema.optional(Schema.Array(Schema.String)),
  allowedGlobals: Schema.optional(Schema.Array(Schema.String)),
  envVars: Schema.optional(Schema.Array(Schema.String)),
}));

type ClosedWorldOptions = typeof ClosedWorldOptions.Type;

const defaultAllowedImportPatterns = [/^haskellish-effect(\/.*)?$/, /^@haskellish\//, /^\.\.?\//, /^@\//];

const defaultBlockedGlobals = new Set([
  "fetch",
  "console",
  "Math",
  "JSON",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "Date",
  "Promise",
  "crypto",
  "URL",
  "Headers",
  "Request",
  "Response",
  "AbortController",
  "FormData",
  "Blob",
  "performance",
  "navigator",
  "localStorage",
  "sessionStorage",
  "alert",
  "confirm",
  "prompt",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "atob",
  "btoa",
  "queueMicrotask",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Buffer",
]);

const implicitGlobalObjects = new Set(["globalThis", "window", "document", "self"]);

const runtimeExecutionMembers = new Set([
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
  "runFork",
  "runCallback",
]);

const mutableCollectionMethods = new Set([
  "copyWithin",
  "delete",
  "fill",
  "pop",
  "push",
  "reverse",
  "set",
  "shift",
  "sort",
  "splice",
  "unshift",
  "add",
  "clear",
]);

const unsafeIdentifierPatterns = [/^unsafe/i, /Unsafe/, /^asUnsafe/, /^runUnsafe/];

const pureGlobals = new Set([
  "undefined",
  "NaN",
  "Infinity",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURIComponent",
  "decodeURIComponent",
  "encodeURI",
  "decodeURI",
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Symbol",
  "BigInt",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "RegExp",
  "Reflect",
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "ReadonlyArray",
  "ReadonlyMap",
  "ReadonlySet",
  "Readonly",
  "Partial",
  "Required",
  "Pick",
  "Omit",
  "Record",
  "Exclude",
  "Extract",
  "NonNullable",
  "Parameters",
  "ReturnType",
  "InstanceType",
  "ConstructorParameters",
  "Awaited",
  "PromiseLike",
  "Iterable",
  "IterableIterator",
  "AsyncIterable",
  "AsyncIterableIterator",
  "Generator",
  "AsyncGenerator",
]);

const emptyOptions: ClosedWorldOptions = {};

const optionArray = (value: Readonly<Record<string, unknown>>, key: string): ReadonlyArray<string> => {
  const raw = value[key];
  return Array.isArray(raw) && raw.every(Predicate.isString) ? raw : [];
};

const settingsOptions = (ctx: RuleContext["Service"]): ClosedWorldOptions => {
  const raw = ctx.settings["effectComplete"];
  if (!isAstRecord(raw)) return emptyOptions;
  return {
    allowedPackages: optionArray(raw, "allowedPackages"),
    allowedGlobals: optionArray(raw, "allowedGlobals"),
    envVars: optionArray(raw, "envVars"),
  };
};

const ruleOptions = (options: ClosedWorldOptions | undefined, ctx: RuleContext["Service"]): ClosedWorldOptions => {
  const settings = settingsOptions(ctx);
  return {
    allowedPackages: options?.allowedPackages ?? settings.allowedPackages,
    allowedGlobals: options?.allowedGlobals ?? settings.allowedGlobals,
    envVars: options?.envVars ?? settings.envVars,
  };
};

const allowedPackagesFrom = (options: ClosedWorldOptions | undefined, ctx: RuleContext["Service"]): ReadonlyArray<string> =>
  ruleOptions(options, ctx).allowedPackages ?? [];

const allowedGlobalsFrom = (options: ClosedWorldOptions | undefined, ctx: RuleContext["Service"]): ReadonlySet<string> =>
  new Set(ruleOptions(options, ctx).allowedGlobals ?? []);

const configuredEnvVarsFrom = (options: ClosedWorldOptions | undefined, ctx: RuleContext["Service"]): ReadonlySet<string> =>
  new Set(ruleOptions(options, ctx).envVars ?? []);

const isAllowedImportSource = (source: string, allowedPackages: ReadonlyArray<string>): boolean => {
  if (defaultAllowedImportPatterns.some((pattern) => pattern.test(source))) return true;
  return allowedPackages.some((pkg) => {
    if (pkg.endsWith("/*")) {
      const prefix = pkg.slice(0, -1);
      return source === pkg.slice(0, -2) || source.startsWith(prefix);
    }
    return source === pkg || source.startsWith(`${pkg}/`);
  });
};

const importSource = (node: ESTree.ImportDeclaration | ESTree.ExportAllDeclaration | ESTree.ExportNamedDeclaration): string | undefined => {
  const source = "source" in node ? node.source : undefined;
  return source?.type === "Literal" && Predicate.isString(source.value) ? source.value : undefined;
};

const isIdentifier = (node: ESTree.Node | null | undefined): node is ESTree.IdentifierReference | ESTree.IdentifierName =>
  node?.type === "Identifier" && "name" in node && Predicate.isString(node.name);

const memberName = (node: ESTree.MemberExpression): string | undefined => {
  if (node.computed) return undefined;
  return isIdentifier(node.property) ? node.property.name : undefined;
};

const memberObjectName = (node: ESTree.MemberExpression): string | undefined =>
  isIdentifier(node.object) ? node.object.name : undefined;

const isCallOfMemberName = (
  node: ESTree.CallExpression,
  objectNames: ReadonlySet<string>,
  propertyNames: ReadonlySet<string>,
): boolean => {
  if (node.callee.type !== "MemberExpression") return false;
  const object = memberObjectName(node.callee);
  const property = memberName(node.callee);
  return object !== undefined && property !== undefined && objectNames.has(object) && propertyNames.has(property);
};

const isProcessEnv = (node: ESTree.MemberExpression): boolean =>
  !node.computed &&
  isIdentifier(node.object) &&
  node.object.name === "process" &&
  isIdentifier(node.property) &&
  node.property.name === "env";

const envVarName = (node: ESTree.MemberExpression): string | undefined => {
  if (node.object.type !== "MemberExpression" || !isProcessEnv(node.object)) return undefined;
  if (!node.computed && isIdentifier(node.property)) return node.property.name;
  return node.property.type === "Literal" && Predicate.isString(node.property.value) ? node.property.value : undefined;
};

const parentOf = (node: ESTree.Node): ESTree.Node | undefined =>
  "parent" in node && typeof node.parent === "object" && node.parent !== null ? (node.parent) : undefined;

const isDeclarationIdentifier = (node: ESTree.Node): boolean => {
  if (!isIdentifier(node)) return false;
  const parent = parentOf(node);
  if (parent === undefined) return false;
  if (parent.type === "VariableDeclarator" && parent.id === node) return true;
  if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") && parent.id === node) return true;
  if ((parent.type === "ClassDeclaration" || parent.type === "ClassExpression") && parent.id === node) return true;
  return parent.type === "ImportSpecifier" || parent.type === "ImportDefaultSpecifier" || parent.type === "ImportNamespaceSpecifier";
};

const isStaticPropertyIdentifier = (node: ESTree.Node): boolean => {
  if (!isIdentifier(node)) return false;
  const parent = parentOf(node);
  return parent?.type === "MemberExpression" && parent.property === node && !parent.computed;
};

const isReferenceCandidate = (node: ESTree.Node): boolean =>
  isIdentifier(node) && !isDeclarationIdentifier(node) && !isStaticPropertyIdentifier(node);

const reportImportIfDisallowed = (
  ctx: RuleContext["Service"],
  node: ESTree.Node,
  source: string | undefined,
  allowedPackages: ReadonlyArray<string>,
): Effect.Effect<void> =>
  source === undefined || isAllowedImportSource(source, allowedPackages)
    ? Effect.void
    : ctx.report(
        Diagnostic.make({
          node,
          message: `Import from "${source}" is outside the closed world. Add a capability wrapper or an explicit allowedPackages entry.`,
        }),
      );

export const onlyAllowedImports = Rule.define({
  name: "only-allowed-imports",
  options: ClosedWorldOptions,
  meta: Rule.meta({
    type: "problem",
    description: "Restrict imports to relative paths and explicitly allowed packages.",
  }),
  create: function* (options) {
    const ctx = yield* RuleContext;
    const allowedPackages = allowedPackagesFrom(options, ctx);
    return {
      ImportDeclaration: (node) => reportImportIfDisallowed(ctx, node, importSource(node), allowedPackages),
      ExportAllDeclaration: (node) => reportImportIfDisallowed(ctx, node, importSource(node), allowedPackages),
      ExportNamedDeclaration: (node) => reportImportIfDisallowed(ctx, node, importSource(node), allowedPackages),
    };
  },
});

export const noGlobalAccess = Rule.define({
  name: "no-global-access",
  options: ClosedWorldOptions,
  meta: Rule.meta({
    type: "problem",
    description: "Disallow direct access to effectful global APIs.",
  }),
  create: function* (options) {
    const ctx = yield* RuleContext;
    const allowedGlobals = allowedGlobalsFrom(options, ctx);
    return {
      Identifier: (node) =>
        defaultBlockedGlobals.has(node.name) && !allowedGlobals.has(node.name) && isReferenceCandidate(node)
          ? ctx.report(Diagnostic.make({ node, message: `Direct global "${node.name}" access must be wrapped in an Effect service.` }))
          : Effect.void,
    };
  },
});

export const noImplicitGlobalThis = Rule.define({
  name: "no-implicit-global-this",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow direct access to globalThis, window, document, and self.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Identifier: (node) =>
        implicitGlobalObjects.has(node.name) && isReferenceCandidate(node)
          ? ctx.report(Diagnostic.make({ node, message: `Direct "${node.name}" access must be behind an explicit unsafe boundary.` }))
          : Effect.void,
    };
  },
});

export const capabilityEnforcement = Rule.define({
  name: "capability-enforcement",
  options: ClosedWorldOptions,
  meta: Rule.meta({
    type: "problem",
    description: "Enforce closed-world imports and global capabilities.",
  }),
  create: function* (options) {
    const ctx = yield* RuleContext;
    const allowedPackages = allowedPackagesFrom(options, ctx);
    const allowedGlobals = allowedGlobalsFrom(options, ctx);
    return {
      ImportDeclaration: (node) => reportImportIfDisallowed(ctx, node, importSource(node), allowedPackages),
      Identifier: (node) =>
        !pureGlobals.has(node.name) && defaultBlockedGlobals.has(node.name) && !allowedGlobals.has(node.name) && isReferenceCandidate(node)
          ? ctx.report(Diagnostic.make({ node, message: `Global "${node.name}" escapes the closed-world capability model.` }))
          : Effect.void,
    };
  },
});

export const noPromise = Rule.define({
  name: "no-promise",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow async functions, new Promise, and Promise static methods.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const reportAsync = (node: ESTree.Node): Effect.Effect<void> =>
      ctx.report(Diagnostic.make({ node, message: "Use Effect.gen, Effect.promise, or Effect.tryPromise instead of async functions." }));
    return {
      FunctionDeclaration: (node) => (node.async ? reportAsync(node) : Effect.void),
      FunctionExpression: (node) => (node.async ? reportAsync(node) : Effect.void),
      ArrowFunctionExpression: (node) => (node.async ? reportAsync(node) : Effect.void),
      NewExpression: (node) =>
        isIdentifier(node.callee) && node.callee.name === "Promise"
          ? ctx.report(Diagnostic.make({ node, message: "Use Effect.async instead of new Promise." }))
          : Effect.void,
      MemberExpression: (node) =>
        isIdentifier(node.object) && node.object.name === "Promise" && memberName(node) !== undefined
          ? ctx.report(Diagnostic.make({ node, message: `Use Effect APIs instead of Promise.${memberName(node)}.` }))
          : Effect.void,
    };
  },
});

export const noMutation = Rule.define({
  name: "no-mutation",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow mutation syntax; use immutable values or Effect-managed state.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      AssignmentExpression: (node) => ctx.report(Diagnostic.make({ node, message: "Assignment mutation is not allowed." })),
      UpdateExpression: (node) => ctx.report(Diagnostic.make({ node, message: "Update mutation is not allowed." })),
      UnaryExpression: (node) =>
        node.operator === "delete"
          ? ctx.report(Diagnostic.make({ node, message: "delete mutation is not allowed." }))
          : Effect.void,
      VariableDeclaration: (node) =>
        node.kind === "let"
          ? ctx.report(Diagnostic.make({ node, message: "let declares mutable local state. Prefer const or Effect-managed state." }))
          : Effect.void,
    };
  },
});

export const noRawEnvVars = Rule.define({
  name: "no-raw-env-vars",
  options: ClosedWorldOptions,
  meta: Rule.meta({
    type: "problem",
    description: "Require configured environment variables to be accessed through typed Config wrappers.",
  }),
  create: function* (options) {
    const ctx = yield* RuleContext;
    const envVars = configuredEnvVarsFrom(options, ctx);
    return {
      MemberExpression: (node) => {
        const name = envVarName(node);
        return name !== undefined && envVars.has(name)
          ? ctx.report(Diagnostic.make({ node, message: `Environment variable "${name}" must be modeled by typed Effect Config, not process.env.` }))
          : Effect.void;
      },
    };
  },
});

export const noInterfaces = Rule.define({
  name: "no-interfaces",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow custom interfaces; model data with Schema instead.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      TSInterfaceDeclaration: (node) =>
        ctx.report(Diagnostic.make({ node, message: "Use Schema.Class/TaggedClass instead of interface." })),
    };
  },
});

export const noClasses = Rule.define({
  name: "no-classes",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow custom classes except Schema class declarations.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      ClassDeclaration: (node) =>
        ctx.report(Diagnostic.make({ node, message: "Use Schema.Class/TaggedClass instead of custom class declarations." })),
      ClassExpression: (node) =>
        ctx.report(Diagnostic.make({ node, message: "Use Schema.Class/TaggedClass instead of custom class expressions." })),
    };
  },
});

export const noUnknown = Rule.define({
  name: "no-unknown",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow unknown; decode and model values with Schema.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      TSUnknownKeyword: (node) =>
        ctx.report(Diagnostic.make({ node, message: "Use Schema decoding or a precise type instead of unknown." })),
    };
  },
});

export const noExplicitAny = Rule.define({
  name: "no-explicit-any",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow any; decode and model values with Schema.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      TSAnyKeyword: (node) =>
        ctx.report(Diagnostic.make({ node, message: "Use Schema decoding or a precise type instead of any." })),
    };
  },
});

export const noTypeAssertions = Rule.define({
  name: "no-type-assertions",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow assertion-based type escapes.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const report = (node: ESTree.Node): Effect.Effect<void> =>
      ctx.report(Diagnostic.make({ node, message: "Type assertions hide boundary uncertainty. Decode or narrow explicitly." }));
    return {
      TSAsExpression: report,
      TSTypeAssertion: report,
      TSNonNullExpression: (node) =>
        ctx.report(Diagnostic.make({ node, message: "Non-null assertions are an unchecked escape hatch. Model absence explicitly." })),
    };
  },
});

export const noRuntimeExecution = Rule.define({
  name: "no-runtime-execution",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow Effect runtime execution except at explicit application entrypoints.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const runtimeObjects = new Set(["Effect", "Runtime"]);
    return {
      CallExpression: (node) =>
        isCallOfMemberName(node, runtimeObjects, runtimeExecutionMembers)
          ? ctx.report(Diagnostic.make({ node, message: "Runtime execution must live at an explicit CLI/application boundary." }))
          : Effect.void,
    };
  },
});

export const noUnsafeEscapeHatches = Rule.define({
  name: "no-unsafe-escape-hatches",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow unsafe escape hatch identifiers outside dedicated wrappers.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Identifier: (node) =>
        isReferenceCandidate(node) && unsafeIdentifierPatterns.some((pattern) => pattern.test(node.name))
          ? ctx.report(Diagnostic.make({ node, message: `Unsafe escape hatch "${node.name}" must be isolated behind a named boundary module.` }))
          : Effect.void,
      MemberExpression: (node) => {
        const property = memberName(node);
        return property !== undefined && unsafeIdentifierPatterns.some((pattern) => pattern.test(property))
          ? ctx.report(Diagnostic.make({ node, message: `Unsafe member "${property}" must be isolated behind a named boundary module.` }))
          : Effect.void;
      },
    };
  },
});

export const noMutableCollections = Rule.define({
  name: "no-mutable-collections",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow common mutable collection methods.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (node.callee.type !== "MemberExpression") return Effect.void;
        const property = memberName(node.callee);
        return property !== undefined && mutableCollectionMethods.has(property)
          ? ctx.report(Diagnostic.make({ node, message: `Mutable collection method "${property}" is not allowed. Use immutable data combinators.` }))
          : Effect.void;
      },
    };
  },
});

export const noModuleSideEffects = Rule.define({
  name: "no-module-side-effects",
  meta: Rule.meta({
    type: "problem",
    description: "Disallow top-level side-effect statements.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      ExpressionStatement: (node) =>
        parentOf(node)?.type === "Program"
          ? ctx.report(Diagnostic.make({ node, message: "Top-level expression statements create import-time effects. Move work into an Effect entrypoint." }))
          : Effect.void,
      AwaitExpression: (node) =>
        parentOf(node)?.type === "Program"
          ? ctx.report(Diagnostic.make({ node, message: "Top-level await is an import-time effect. Move work into an Effect entrypoint." }))
          : Effect.void,
    };
  },
});

const hasEffectReturnType = (node: { readonly returnType?: ESTree.TSTypeAnnotation | null }): boolean => {
  const annotation = node.returnType?.typeAnnotation;
  if (annotation?.type !== "TSTypeReference") return false;
  const typeName = annotation.typeName;
  if (typeName.type === "Identifier") return typeName.name === "Effect";
  return typeName.type === "TSQualifiedName" && typeName.left.type === "Identifier" && typeName.left.name === "Effect" && typeName.right.name === "Effect";
};

export const effectBoundary = Rule.define({
  name: "effect-boundary",
  meta: Rule.meta({
    type: "problem",
    description: "Require exported functions to declare Effect return boundaries.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      FunctionDeclaration: (node) => {
        const parent = parentOf(node);
        return parent?.type === "ExportNamedDeclaration" && !hasEffectReturnType(node)
          ? ctx.report(Diagnostic.make({ node, message: "Exported functions must declare an Effect return type." }))
          : Effect.void;
      },
      VariableDeclarator: (node) => {
        const declaration = parentOf(node);
        const exported = declaration !== undefined && parentOf(declaration)?.type === "ExportNamedDeclaration";
        const init = node.init;
        return exported && (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression") && !hasEffectReturnType(init)
          ? ctx.report(Diagnostic.make({ node, message: "Exported function values must declare an Effect return type." }))
          : Effect.void;
      },
    };
  },
});
