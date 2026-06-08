#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs'
import path from 'node:path'

const cssPath = path.join(process.cwd(), 'src', 'styles.css')
const keyPrimitives = [
  '.attune-page',
  '.attune-page-header',
  '.attune-panel',
  '.attune-document-panel',
  '.attune-artifact-panel',
  '.attune-code-panel',
  '.attune-status-strip',
  '.attune-button',
]

const uniq = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b))

const matches = (text, regex) => [...text.matchAll(regex)]

const stripRootBlocks = (css) => css.replace(/:root\s*\{[\s\S]*?\}/g, '')

const printList = (items, empty = '_None found._') => {
  if (items.length === 0) {
    console.log(empty)
    return
  }

  for (const item of items) console.log(`- ${item}`)
}

console.log('# Attune CSS Inventory')

if (!fs.existsSync(cssPath)) {
  console.log('\n## Warnings')
  console.log(`- Missing CSS file: ${cssPath}`)
  process.exit(0)
}

const css = fs.readFileSync(cssPath, 'utf8')
const cssWithoutRoot = stripRootBlocks(css)

const variables = uniq(
  matches(css, /--[a-zA-Z0-9_-]+\s*:\s*[^;]+/g).map((match) => match[0]),
)

const classSelectors = uniq(
  matches(css, /(^|[,{]\s*)\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/gm).map(
    (match) => `.${match[2]}`,
  ),
)

const rawColorsOutsideVariables = uniq(
  matches(cssWithoutRoot, /#[0-9a-fA-F]{3,8}\b/g).map((match) => match[0]),
)

const radiusDeclarations = uniq(
  matches(css, /border-radius\s*:\s*[^;]+/g).map((match) => match[0]),
)

const shadowDeclarations = uniq(
  matches(css, /box-shadow\s*:\s*[^;]+/g).map((match) => match[0]),
)

const backgroundDeclarations = uniq(
  matches(css, /background(?:-color)?\s*:\s*[^;]*(?:#|rgb|hsl)[^;]*/g).map(
    (match) => match[0],
  ),
)

const warnings = []
if (rawColorsOutsideVariables.length > 0) {
  warnings.push('Raw hex colors appear outside `:root` custom-property blocks.')
}

if (radiusDeclarations.length > 10) {
  warnings.push(
    `More than 10 distinct border-radius declarations (${radiusDeclarations.length}).`,
  )
}

if (backgroundDeclarations.length > 10) {
  warnings.push(
    `More than 10 distinct background color declarations (${backgroundDeclarations.length}).`,
  )
}

const missingPrimitives = keyPrimitives.filter(
  (primitive) => !classSelectors.includes(primitive),
)
if (missingPrimitives.length > 0) {
  warnings.push(`Missing key primitives: ${missingPrimitives.join(', ')}.`)
}

console.log('\n## CSS variables')
printList(variables)

console.log('\n## Class selectors')
printList(classSelectors)

console.log('\n## Raw colors outside variables')
printList(rawColorsOutsideVariables)

console.log('\n## Border radius declarations')
printList(radiusDeclarations)

console.log('\n## Shadow declarations')
printList(shadowDeclarations)

console.log('\n## Background declarations')
printList(backgroundDeclarations)

console.log('\n## Warnings')
printList(warnings, '_No warnings._')
