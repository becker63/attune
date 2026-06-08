#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs'
import path from 'node:path'

const srcRoot = path.join(process.cwd(), 'src')
const classNamePattern = /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*(?::[_a-zA-Z0-9-]+)?$/
const noisyClassWords = ['dashboard', 'card', 'grid', 'metric']

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []

  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    if (/\.(ts|tsx)$/.test(entry.name)) return [fullPath]
    return []
  })
}

const relative = (file) => path.relative(process.cwd(), file)

const addCount = (map, key, amount = 1) => {
  map.set(key, (map.get(key) ?? 0) + amount)
}

const extractFromClassAttribute = (source) => {
  const classCalls = [
    ...source.matchAll(/\bh\.Class\(\s*(['"`])([\s\S]*?)\1\s*\)/g),
  ].map((match) => match[2])

  const likelyClassStrings = [
    ...source.matchAll(/\bclass(?:Name)?\s*[:=]\s*(['"`])([\s\S]*?)\1/g),
  ].map((match) => match[2])

  return [...classCalls, ...likelyClassStrings]
    .filter((value) => !/[${}]/.test(value))
    .flatMap((value) => value.split(/\s+/))
    .map((value) => value.trim())
    .filter((value) => classNamePattern.test(value))
}

const files = walk(srcRoot)
const globalCounts = new Map()
const byFile = new Map()
const warnings = []

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const classes = extractFromClassAttribute(source)
  const counts = new Map()

  for (const className of classes) {
    addCount(globalCounts, className)
    addCount(counts, className)
  }

  if (counts.size > 0) byFile.set(relative(file), counts)
}

const sortedGlobal = [...globalCounts.entries()].sort(
  ([aName, aCount], [bName, bCount]) =>
    bCount - aCount || aName.localeCompare(bName),
)

const oneOffs = sortedGlobal
  .filter(([, count]) => count === 1)
  .map(([className]) => className)

const noisyCounts = noisyClassWords
  .map((word) => ({
    word,
    count: sortedGlobal
      .filter(([className]) => className.toLowerCase().includes(word))
      .reduce((total, [, count]) => total + count, 0),
  }))
  .filter(({ count }) => count > 10)

if (oneOffs.length > 20) {
  warnings.push(`Many classes are used only once (${oneOffs.length}).`)
}

for (const { word, count } of noisyCounts) {
  warnings.push(`Classes containing "${word}" are frequent (${count} uses).`)
}

for (const [file, counts] of byFile) {
  if (counts.size > 25) {
    warnings.push(`${file} uses ${counts.size} unique classes.`)
  }

  const customLooking = [...counts.keys()].filter(
    (className) =>
      className.includes('super') ||
      className.includes('custom') ||
      className.split('-').length > 4,
  )

  if (customLooking.length > 0) {
    warnings.push(
      `${file} has custom-looking classes: ${customLooking.join(', ')}.`,
    )
  }
}

const printList = (items, empty = '_None found._') => {
  if (items.length === 0) {
    console.log(empty)
    return
  }
  for (const item of items) console.log(`- ${item}`)
}

console.log('# Attune Class Usage')

if (!fs.existsSync(srcRoot)) {
  console.log('\n## Warnings')
  console.log(`- Missing source directory: ${srcRoot}`)
  process.exit(0)
}

console.log('\n## Most used classes')
printList(
  sortedGlobal.slice(0, 40).map(([className, count]) => `${className}: ${count}`),
)

console.log('\n## Classes by file')
if (byFile.size === 0) {
  console.log('_No classes found._')
} else {
  for (const [file, counts] of [...byFile.entries()].sort()) {
    console.log(`\n### ${file}`)
    printList(
      [...counts.entries()]
        .sort(([aName, aCount], [bName, bCount]) =>
          bCount - aCount || aName.localeCompare(bName),
        )
        .map(([className, count]) => `${className}: ${count}`),
    )
  }
}

console.log('\n## Potential one-off classes')
printList(oneOffs)

console.log('\n## Warnings')
printList(warnings, '_No warnings._')
