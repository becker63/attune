const flakeEnvVars = new Set([
  "CI",
  "CODEPROPERTYGRAPH_DIR",
  "COREPACK_ENABLE_DOWNLOAD_PROMPT",
  "COREPACK_ENABLE_PROJECT_SPEC",
  "HOME",
  "JAVA_HOME",
  "JOERN_BINARY",
  "JOERN_CPG_SCHEMA_JSON",
  "JOERN_CPG_SCHEMA_SOURCES",
  "JOERN_CPG_VERSION",
  "JOERN_EFFECT_DEBUG",
  "JOERN_EFFECT_E2E",
  "JOERN_EFFECT_E2E_RUNS",
  "JOERN_EFFECT_TEST_TMPDIR",
  "JOERN_EFFECT_WORKSPACE",
  "JOERN_HOME",
  "JOERN_READY_TIMEOUT_MS",
  "PATH",
  "TMPDIR",
])

const defaultAllowedPatterns = [/^haskellish-effect(\/.*)?$/, /^@haskellish\//, /^\.\.?\//, /^@\//]

const blockedGlobals = new Set([
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
])

const blockedGlobalThis = new Set(["globalThis", "window", "document", "self"])

const alwaysAllowedGlobals = new Set([
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
  "WeakRef",
  "FinalizationRegistry",
  "RegExp",
  "Proxy",
  "Reflect",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "Iterator",
  "structuredClone",
  "TextEncoder",
  "TextDecoder",
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
])

const isAllowedImportSource = (source, additionalAllowed = []) => {
  if (defaultAllowedPatterns.some((pattern) => pattern.test(source))) return true
  return additionalAllowed.some((pkg) => {
    if (pkg.endsWith("/*")) {
      const prefix = pkg.slice(0, -1)
      return source === pkg.slice(0, -2) || source.startsWith(prefix)
    }
    return source === pkg || source.startsWith(`${pkg}/`)
  })
}

const isProcessEnv = (node) =>
  node?.type === "MemberExpression" &&
  node.object?.type === "Identifier" &&
  node.object.name === "process" &&
  !node.computed &&
  node.property?.type === "Identifier" &&
  node.property.name === "env"

const envNameFromProperty = (property) => {
  if (property?.type === "Identifier") return property.name
  if (property?.type === "Literal" && typeof property.value === "string") return property.value
  return undefined
}

const envNameFromMember = (node) => {
  if (node.object?.type !== "MemberExpression" || !isProcessEnv(node.object)) return undefined
  return envNameFromProperty(node.property)
}

const literalString = (node) => {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value
  return undefined
}

const reportImport = (context, node, source, allowedPackages) => {
  if (!isAllowedImportSource(source, allowedPackages)) {
    context.report({
      node,
      messageId: "disallowedImport",
      data: { source },
    })
  }
}

const isPropertyName = (node) =>
  node.parent?.type === "MemberExpression" && node.parent.property === node && !node.parent.computed

const isDeclarationName = (node) => {
  const parent = node.parent
  return (
    (parent?.type === "VariableDeclarator" && parent.id === node) ||
    (parent?.type === "FunctionDeclaration" && parent.id === node) ||
    (parent?.type === "FunctionExpression" && parent.id === node) ||
    (parent?.type === "ClassDeclaration" && parent.id === node) ||
    (parent?.type === "ClassExpression" && parent.id === node) ||
    (parent?.type === "ImportSpecifier" || parent?.type === "ImportDefaultSpecifier" || parent?.type === "ImportNamespaceSpecifier") ||
    (parent?.type === "TSTypeReference" && parent.typeName === node)
  )
}

const isLocalBinding = (node) => {
  let current = node.parent
  while (current) {
    if (
      current.type === "VariableDeclarator" &&
      current.id?.type === "Identifier" &&
      current.id.name === node.name
    ) return true
    if (
      (current.type === "FunctionDeclaration" || current.type === "FunctionExpression") &&
      current.id?.name === node.name
    ) return true
    if (
      (current.type === "ClassDeclaration" || current.type === "ClassExpression") &&
      current.id?.name === node.name
    ) return true
    if (current.type === "Program") return false
    current = current.parent
  }
  return false
}

const isGlobalReferenceCandidate = (node) => !isPropertyName(node) && !isDeclarationName(node)

const onlyAllowedImportsRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Restrict imports to relative paths and explicitly allowed packages",
    },
    messages: {
      disallowedImport: 'Import from "{{source}}" is not allowed. Add it to allowedPackages or wrap it behind a capability.',
    },
    schema: false,
  },
  create(context) {
    const allowedPackages = context.options[0]?.allowedPackages ?? []
    return {
      ImportDeclaration(node) {
        const source = literalString(node.source)
        if (source !== undefined) reportImport(context, node, source, allowedPackages)
      },
      ImportExpression(node) {
        const source = literalString(node.source)
        if (source !== undefined) reportImport(context, node, source, allowedPackages)
      },
      ExportNamedDeclaration(node) {
        const source = literalString(node.source)
        if (source !== undefined) reportImport(context, node, source, allowedPackages)
      },
      ExportAllDeclaration(node) {
        const source = literalString(node.source)
        if (source !== undefined) reportImport(context, node, source, allowedPackages)
      },
    }
  },
}

const noGlobalAccessRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct access to effectful global APIs",
    },
    messages: {
      blockedGlobal: 'Direct access to global "{{name}}" is not allowed. Use an Effect service or explicit unsafe boundary.',
    },
    schema: false,
  },
  create(context) {
    const options = context.options[0] ?? {}
    const blocked = new Set(options.blocked ?? blockedGlobals)
    for (const name of options.additionalBlocked ?? []) blocked.add(name)

    return {
      Identifier(node) {
        if (blocked.has(node.name) && isGlobalReferenceCandidate(node)) {
          context.report({ node, messageId: "blockedGlobal", data: { name: node.name } })
        }
      },
    }
  },
}

const capabilityEnforcementRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce closed-world model: imports and globals must be explicitly allowed",
    },
    messages: {
      disallowedGlobal: 'Access to global "{{name}}" is not allowed in the closed-world model. Use an Effect service or explicit unsafe boundary.',
      disallowedImport: 'Import from "{{source}}" is not allowed. Add it to allowedPackages or wrap it behind a capability.',
    },
    schema: false,
  },
  create(context) {
    const options = context.options[0] ?? {}
    const allowedPackages = options.allowedPackages ?? []
    const allowedGlobals = new Set(options.allowedGlobals ?? [])

    return {
      ImportDeclaration(node) {
        const source = literalString(node.source)
        if (source !== undefined) reportImport(context, node, source, allowedPackages)
      },
      Identifier(node) {
        if (
          !alwaysAllowedGlobals.has(node.name) &&
          blockedGlobals.has(node.name) &&
          !allowedGlobals.has(node.name) &&
          isGlobalReferenceCandidate(node) &&
          !isLocalBinding(node)
        ) {
          context.report({ node, messageId: "disallowedGlobal", data: { name: node.name } })
        }
      },
    }
  },
}

const noImplicitGlobalThisRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct access to globalThis, window, document, and self",
    },
    messages: {
      blockedGlobalThis: 'Direct access to "{{name}}" is not allowed. Use an explicit unsafe boundary.',
    },
    schema: false,
  },
  create(context) {
    return {
      Identifier(node) {
        if (
          blockedGlobalThis.has(node.name) &&
          isGlobalReferenceCandidate(node) &&
          !isLocalBinding(node)
        ) {
          context.report({ node, messageId: "blockedGlobalThis", data: { name: node.name } })
        }
      },
    }
  },
}

const noPromiseRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow async functions, new Promise(), and Promise static methods. Use Effect instead.",
    },
    messages: {
      noAsync: "async functions are not allowed. Use Effect.gen or Effect.tryPromise instead.",
      noNewPromise: "new Promise() is not allowed. Use Effect.async instead.",
      noPromiseStatic: "Promise.{{method}}() is not allowed. Use the Effect equivalent instead.",
    },
    schema: false,
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        if (node.async) context.report({ node, messageId: "noAsync" })
      },
      FunctionExpression(node) {
        if (node.async) context.report({ node, messageId: "noAsync" })
      },
      ArrowFunctionExpression(node) {
        if (node.async) context.report({ node, messageId: "noAsync" })
      },
      NewExpression(node) {
        if (node.callee?.type === "Identifier" && node.callee.name === "Promise") {
          context.report({ node, messageId: "noNewPromise" })
        }
      },
      MemberExpression(node) {
        if (
          node.object?.type === "Identifier" &&
          node.object.name === "Promise" &&
          node.property?.type === "Identifier" &&
          node.parent?.type === "CallExpression" &&
          node.parent.callee === node
        ) {
          context.report({
            node,
            messageId: "noPromiseStatic",
            data: { method: node.property.name },
          })
        }
      },
    }
  },
}

const noThrowRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow throw statements. Model failures in Effect instead.",
    },
    messages: {
      noThrow: "throw is not allowed. Use Effect.fail, Effect.die, or a typed error channel.",
    },
    schema: false,
  },
  create(context) {
    return {
      ThrowStatement(node) {
        context.report({ node, messageId: "noThrow" })
      },
    }
  },
}

const noMutationRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow mutation-oriented syntax in application code",
    },
    messages: {
      noAssignment: "Assignment mutation is not allowed. Prefer immutable values or Effect-managed state.",
      noUpdate: "Update mutation is not allowed. Prefer immutable values or Effect-managed state.",
      noDelete: "delete mutation is not allowed. Prefer immutable values or Effect-managed state.",
      noLet: "let declares mutable local state. Prefer const or Effect-managed state.",
    },
    schema: false,
  },
  create(context) {
    const allowLet = context.options[0]?.allowLet ?? false
    return {
      AssignmentExpression(node) {
        context.report({ node, messageId: "noAssignment" })
      },
      UpdateExpression(node) {
        context.report({ node, messageId: "noUpdate" })
      },
      UnaryExpression(node) {
        if (node.operator === "delete") context.report({ node, messageId: "noDelete" })
      },
      VariableDeclaration(node) {
        if (!allowLet && node.kind === "let") context.report({ node, messageId: "noLet" })
      },
    }
  },
}

const noExplicitAnyRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow the any type annotation",
    },
    messages: {
      noAny: "The any type is not allowed. Use unknown, a specific type, or a generic parameter instead.",
    },
    schema: false,
  },
  create(context) {
    return {
      TSAnyKeyword(node) {
        context.report({ node, messageId: "noAny" })
      },
    }
  },
}

const hasEffectReturnType = (returnType) => {
  const annotation = returnType?.typeAnnotation
  if (annotation?.type !== "TSTypeReference") return false
  const name = annotation.typeName
  if (name?.type === "Identifier") return name.name === "Effect"
  if (name?.type === "TSQualifiedName") {
    return name.left?.type === "Identifier" && name.left.name === "Effect" && name.right?.name === "Effect"
  }
  return false
}

const effectBoundaryRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Exported functions should expose explicit Effect return types",
    },
    messages: {
      missingEffectReturn: 'Exported function "{{name}}" should have an explicit Effect return type annotation.',
    },
    schema: false,
  },
  create(context) {
    const checkFunction = (node, name) => {
      if (!hasEffectReturnType(node.returnType)) {
        context.report({ node, messageId: "missingEffectReturn", data: { name } })
      }
    }

    return {
      FunctionDeclaration(node) {
        if (node.parent?.type === "ExportNamedDeclaration" && node.id?.name !== undefined) {
          checkFunction(node, node.id.name)
        }
      },
      VariableDeclarator(node) {
        const declaration = node.parent
        const exported = declaration?.parent?.type === "ExportNamedDeclaration"
        const init = node.init
        if (
          exported &&
          node.id?.type === "Identifier" &&
          (init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression")
        ) {
          checkFunction(init, node.id.name)
        }
      },
    }
  },
}

module.exports = {
  meta: {
    name: "haskellish-effect",
  },
  rules: {
    "only-allowed-imports": onlyAllowedImportsRule,
    "no-global-access": noGlobalAccessRule,
    "no-implicit-globalthis": noImplicitGlobalThisRule,
    "capability-enforcement": capabilityEnforcementRule,
    "no-promise": noPromiseRule,
    "no-throw": noThrowRule,
    "no-mutation": noMutationRule,
    "no-explicit-any": noExplicitAnyRule,
    "effect-boundary": effectBoundaryRule,
    "no-raw-flake-env-vars": {
      meta: {
        type: "problem",
        docs: {
          description: "Require flake-defined environment variables to be read through src/runtime/env.ts constants",
        },
        messages: {
          rawEnv:
            "Use EnvVars/readEnv from src/runtime/env.ts for {{name}} instead of reading process.env directly.",
        },
        schema: false,
      },
      create(context) {
        return {
          MemberExpression(node) {
            const name = envNameFromMember(node)
            if (name !== undefined && flakeEnvVars.has(name)) {
              context.report({ node, messageId: "rawEnv", data: { name } })
            }
          },
        }
      },
    },
  },
}
