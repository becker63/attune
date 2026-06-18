import { generatedSchema, nodes, prop, traversalStepNames } from "joern-effect"

const propertyCountByNode = nodes
  .map((node) => ({
    node: node.name,
    starter: node.starterName,
    properties: node.properties.length,
  }))
  .toSorted((a, b) => b.properties - a.properties)

console.log("Generated schema:", generatedSchema)
console.log("Traversal steps:", traversalStepNames.length)
console.log("Properties:", Object.keys(prop).length)
console.table(propertyCountByNode.slice(0, 10))
