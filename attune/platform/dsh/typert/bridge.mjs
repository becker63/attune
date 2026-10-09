/// The tiny supported-subset bridge between the canonical Attune wire contract
/// and the TypeScript declaration the real Typert generator analyzes.
///
/// It is deliberately not a schema compiler. It accepts exactly one small,
/// versioned dialect (`attune.wire/1`) and lowers it to a canonical surface
/// model; every construct outside that subset is refused with a named reason,
/// so an unsupported constraint can never be silently widened, dropped or
/// normalized into something that validates more than the contract says. In
/// particular it never widens a type to `{}`, never deletes a `$ref`/`$defs`
/// reference, never rewrites `anyOf` into an exclusive `oneOf`, and never
/// accepts a repository-, task- or gold-dependent special case.
///
/// @module attune.typert.bridge

export class BridgeRefusal extends Error {
  constructor(path, reason) {
    super(`wire contract refused at ${path}: ${reason}`)
    this.name = 'BridgeRefusal'
    this.path = path
    this.reason = reason
  }
}

export const WIRE_DIALECT = 'attune.wire/1'

/// Keywords this dialect does not model. They are refused by name rather than
/// ignored, because ignoring a constraint is exactly how a contract silently
/// widens.
const REFUSED_KEYWORDS = new Map([
  ['oneOf', 'exclusive union semantics cannot be preserved by this bounded subset'],
  ['allOf', 'conjunction semantics are not part of the supported subset'],
  ['not', 'negation is not part of the supported subset'],
  ['if', 'conditional schemas are not part of the supported subset'],
  ['then', 'conditional schemas are not part of the supported subset'],
  ['else', 'conditional schemas are not part of the supported subset'],
  ['const', 'literal equality is not part of the supported subset'],
  ['pattern', 'regular-expression constraints are not part of the supported subset'],
  ['format', 'format constraints are not part of the supported subset'],
  ['minimum', 'numeric bounds are not part of the supported subset'],
  ['maximum', 'numeric bounds are not part of the supported subset'],
  ['exclusiveMinimum', 'exclusive numeric bounds are not part of the supported subset'],
  ['exclusiveMaximum', 'exclusive numeric bounds are not part of the supported subset'],
  ['multipleOf', 'numeric divisibility is not part of the supported subset'],
  ['minItems', 'array bounds are not part of the supported subset'],
  ['maxItems', 'array bounds are not part of the supported subset'],
  ['uniqueItems', 'array uniqueness is not part of the supported subset'],
  ['minLength', 'string bounds are not part of the supported subset'],
  ['maxLength', 'string bounds are not part of the supported subset'],
  ['patternProperties', 'computed property names are not part of the supported subset'],
  ['propertyNames', 'property-name schemas are not part of the supported subset'],
  ['unevaluatedProperties', 'unevaluated properties are not part of the supported subset'],
  ['dependentRequired', 'conditional requirements are not part of the supported subset'],
  ['dependentSchemas', 'conditional schemas are not part of the supported subset'],
  ['$dynamicRef', 'dynamic references are not part of the supported subset'],
  ['$dynamicAnchor', 'dynamic anchors are not part of the supported subset'],
  ['$anchor', 'anchors are not part of the supported subset'],
  ['$id', 'nested identifiers are not part of the supported subset'],
  ['title', 'presentation metadata is not part of the supported subset'],
  ['description', 'presentation metadata is not part of the supported subset'],
  ['default', 'defaults are not part of the supported subset'],
  ['examples', 'presentation metadata is not part of the supported subset'],
])

const SUPPORTED_KEYS = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'anyOf', '$ref'])

/// Lower one versioned wire contract document into the canonical surface model.
export function lowerWireContract(document) {
  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    throw new BridgeRefusal('$', 'the wire contract must be an object')
  }
  for (const key of Object.keys(document)) {
    if (key !== 'contract' && key !== 'dialect' && key !== '$defs') {
      throw new BridgeRefusal(`$.${key}`, 'unknown top-level member of the wire contract')
    }
  }
  if (typeof document.contract !== 'string' || document.contract.length === 0) {
    throw new BridgeRefusal('$.contract', 'the wire contract must name its contract version')
  }
  if (document.dialect !== WIRE_DIALECT) {
    throw new BridgeRefusal('$.dialect', `the dialect must be exactly ${WIRE_DIALECT}`)
  }
  const defs = document.$defs
  if (defs === null || typeof defs !== 'object' || Array.isArray(defs)) {
    throw new BridgeRefusal('$.$defs', 'the wire contract must declare its definitions')
  }
  const names = Object.keys(defs).sort()
  if (names.length === 0) {
    throw new BridgeRefusal('$.$defs', 'a wire contract with no definitions has no surface to lower')
  }

  const defsModel = names.map((name) => {
    const schema = defs[name]
    if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new BridgeRefusal(`$.$defs.${name}`, 'a definition must be an object')
    }
    return { name, members: lowerObject(schema, `$.$defs.${name}`, name, defs) }
  })

  const surface = []
  for (const def of defsModel) {
    surface.push(def.name)
    for (const member of def.members) surface.push(`${def.name}.${member.name}`)
  }
  return { contract: document.contract, dialect: WIRE_DIALECT, defs: defsModel, surface }
}

function lowerObject(schema, path, owner, defs) {
  for (const key of Object.keys(schema)) {
    const refusal = REFUSED_KEYWORDS.get(key)
    if (refusal !== undefined) throw new BridgeRefusal(`${path}.${key}`, refusal)
    if (!SUPPORTED_KEYS.has(key)) throw new BridgeRefusal(`${path}.${key}`, 'unsupported keyword')
  }
  if (schema.type !== 'object') {
    throw new BridgeRefusal(`${path}.type`, 'a declared definition must be an object')
  }
  if (schema.additionalProperties !== false) {
    throw new BridgeRefusal(
      `${path}.additionalProperties`,
      'an object that does not forbid additional properties cannot be lowered without widening it',
    )
  }
  const properties = schema.properties
  if (properties === null || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new BridgeRefusal(`${path}.properties`, 'an object definition must declare its properties')
  }
  const required = schema.required
  if (!Array.isArray(required) || required.some((entry) => typeof entry !== 'string')) {
    throw new BridgeRefusal(`${path}.required`, 'an object definition must declare its required members')
  }
  const names = Object.keys(properties).sort()
  const declared = new Set(names)
  for (const entry of required) {
    if (!declared.has(entry)) {
      throw new BridgeRefusal(`${path}.required`, `${entry} is required but not declared`)
    }
  }
  if (required.length !== names.length) {
    throw new BridgeRefusal(
      `${path}.required`,
      'the supported subset has no optional members: an optional member would change the validated shape',
    )
  }
  return names.map((name) => ({ name, type: lowerType(properties[name], `${path}.properties.${name}`, owner, defs) }))
}

function lowerType(node, path, owner, defs) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    throw new BridgeRefusal(path, 'a member type must be an object')
  }
  for (const key of Object.keys(node)) {
    const refusal = REFUSED_KEYWORDS.get(key)
    if (refusal !== undefined) throw new BridgeRefusal(`${path}.${key}`, refusal)
    if (!SUPPORTED_KEYS.has(key)) throw new BridgeRefusal(`${path}.${key}`, 'unsupported keyword')
  }
  if (Array.isArray(node.enum)) {
    for (const extra of Object.keys(node)) {
      if (extra !== 'enum') throw new BridgeRefusal(`${path}.${extra}`, 'an enum member carries only its literal set')
    }
    const values = node.enum
    if (values.length === 0 || values.some((value) => typeof value !== 'string')) {
      throw new BridgeRefusal(`${path}.enum`, 'only a non-empty set of string literals is in the supported subset')
    }
    if (new Set(values).size !== values.length) {
      throw new BridgeRefusal(`${path}.enum`, 'a repeated literal is not a union this subset can preserve')
    }
    return [...values].sort().map((value) => JSON.stringify(value)).join(' | ')
  }
  if (Array.isArray(node.anyOf)) {
    for (const extra of Object.keys(node)) {
      if (extra !== 'anyOf') throw new BridgeRefusal(`${path}.${extra}`, 'a union member carries only its alternatives')
    }
    if (node.anyOf.length === 0) throw new BridgeRefusal(`${path}.anyOf`, 'an empty union has no meaning')
    // The union is preserved as a union of its alternatives: it is never
    // rewritten into an exclusive `oneOf`, and no alternative is dropped.
    const alternatives = node.anyOf.map((entry, index) => lowerType(entry, `${path}.anyOf[${String(index)}]`, owner, defs))
    return `(${alternatives.join(' | ')})`
  }
  if (typeof node.$ref === 'string') {
    for (const extra of Object.keys(node)) {
      if (extra !== '$ref') throw new BridgeRefusal(`${path}.${extra}`, 'a reference member carries only its reference')
    }
    const prefix = '#/$defs/'
    if (!node.$ref.startsWith(prefix)) {
      throw new BridgeRefusal(`${path}.$ref`, 'only a local $defs reference is in the supported subset')
    }
    const target = node.$ref.slice(prefix.length)
    if (!Object.prototype.hasOwnProperty.call(defs, target)) {
      throw new BridgeRefusal(`${path}.$ref`, `the reference ${node.$ref} does not resolve`)
    }
    // The reference is preserved as the referenced name; it is never inlined
    // away or deleted, so the identity of the referenced declaration survives.
    // A recursive reference therefore stays a reference (its identity is the
    // declaration it names) instead of being flattened or refused.
    return target
  }
  if (node.type === 'array') {
    for (const extra of Object.keys(node)) {
      if (extra !== 'type' && extra !== 'items') throw new BridgeRefusal(`${path}.${extra}`, 'an array member carries only its item type')
    }
    if (node.items === undefined) throw new BridgeRefusal(`${path}.items`, 'an array member must declare its item type')
    return `array<${lowerType(node.items, `${path}.items`, owner, defs)}>`
  }
  if (node.type === 'string' || node.type === 'number' || node.type === 'boolean') {
    for (const extra of Object.keys(node)) {
      if (extra !== 'type') throw new BridgeRefusal(`${path}.${extra}`, 'a primitive member carries only its type')
    }
    return node.type
  }
  if (Array.isArray(node.type)) {
    throw new BridgeRefusal(`${path}.type`, 'a multi-type member would have to be widened to a union this subset cannot verify')
  }
  throw new BridgeRefusal(path, `unsupported member type ${JSON.stringify(node.type ?? Object.keys(node))}`)
}

/// The canonical surface lines of one lowered model: trimmed, deduplicated and
/// sorted exactly like the Flix contract's `canonicalSurface`.
export function canonicalSurface(lines) {
  return [...new Set(lines.map((line) => line.trim()).filter((line) => line.length > 0))].sort()
}

/// The contract digest: the versioned canonical surface, or `undefined` when
/// the surface cannot be computed (it fails closed rather than publishing an
/// empty identity as if it were the contract).
export function contractDigest(contract, lines) {
  const canonical = canonicalSurface(lines)
  if (canonical.length === 0) return undefined
  return `${contract}:${canonical.join('\n')}`
}
