/// The tiny deterministic defineTool projection bridge of the narrow evidence
/// contract.
///
/// Typert does not register a DSH tool, and the generated DSH tool schema is
/// NOT the generated Typert declaration: the two schema systems are distinct.
/// This module is the one explicit lowering step between them. It reuses the
/// contract's own supported-subset bridge (`typert/bridge.mjs`) so an
/// unsupported constraint is refused by the same named reason there, then
/// projects a NAMED SUBSET of the lowered contract members into the DSH
/// `defineTool` parameter dialect.
///
/// It deliberately does not reflect the whole contract and does not build a
/// second schema compiler: it maps a lowered member type to exactly one DSH
/// parameter type, and refuses anything else by name. A union of string literals
/// stays a union (as a DSH `enum`); a `$ref`, an array, a boolean or any other
/// construct is refused rather than widened.
///
/// @module attune.dsh.tool-schema

import { BridgeRefusal, lowerWireContract } from '../typert/bridge.mjs'

/// Project one lowered member type string onto exactly one DSH parameter type.
/// The supported subset is deliberately tiny: a primitive, or a union of string
/// literals. Everything else is refused by name, never widened.
export function projectMemberType(member, type) {
  if (type === 'string') return { type: 'string' }
  if (type === 'number') return { type: 'number' }
  // A union is lowered by the contract bridge either as a parenthesised
  // `("a" | "b")` (an `anyOf`) or as a bare `"a" | "b"` (a string enum). Both
  // stay a union here; neither is rewritten into an exclusive `oneOf`.
  const alternatives = type.startsWith('(') && type.endsWith(')') ? type.slice(1, -1).split(' | ') : type.split(' | ')
  if (alternatives.length > 1 || type.includes(' | ')) {
    const literals = alternatives.map((entry) => {
      let parsed
      try {
        parsed = JSON.parse(entry)
      } catch {
        throw new BridgeRefusal(member, `the union alternative ${entry} is not a string literal this subset can preserve`)
      }
      if (typeof parsed !== 'string') {
        throw new BridgeRefusal(member, 'only a union of string literals is in the supported defineTool subset')
      }
      return parsed
    })
    if (new Set(literals).size !== literals.length) {
      throw new BridgeRefusal(member, 'a repeated literal is not a union this subset can preserve')
    }
    return { type: 'string', enum: [...literals].sort() }
  }
  throw new BridgeRefusal(member, `the type ${type} is not in the supported defineTool subset`)
}

/// Lower one versioned wire contract and project exactly the named members into
/// a DSH `defineTool` parameter spec. Each entry is a fully qualified
/// `Root.member` contract member; the model-facing parameter keeps only the
/// member name, and two selected members may not share one name (that would be
/// an ambiguous projection and is refused rather than silently resolved).
/// Every requested member must exist, and every member is required: the
/// supported subset has no optional member.
export function defineToolParametersFromWire(wire, memberNames) {
  const lowered = lowerWireContract(wire)
  const byName = new Map()
  for (const definition of lowered.defs) {
    for (const member of definition.members) {
      byName.set(`${definition.name}.${member.name}`, member.type)
    }
  }
  const parameters = {}
  const used = new Set()
  for (const member of memberNames) {
    if (!byName.has(member)) {
      throw new BridgeRefusal(member, 'the requested tool parameter is not a declared contract member')
    }
    const short = member.slice(member.lastIndexOf('.') + 1)
    if (used.has(short)) {
      throw new BridgeRefusal(member, `the parameter name ${short} is projected from more than one contract member`)
    }
    used.add(short)
    parameters[short] = { ...projectMemberType(member, byName.get(member)), required: true }
  }
  return { contract: lowered.contract, parameters }
}
