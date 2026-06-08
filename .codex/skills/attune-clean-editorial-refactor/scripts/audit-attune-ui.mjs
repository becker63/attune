#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const stylesPath = path.join(cwd, 'src', 'styles.css')
const srcRoot = path.join(cwd, 'src')

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

const forbiddenLabels = [
  'Give feedback',
  'Ask AI',
  'Run agent',
  'Generate',
  'Autofix',
  'Auto-fix',
  'Publish',
  'Sync now',
]

const requiredSpecs = [
  'pages/style.md',
  'pages/discover.md',
  'pages/workbench.md',
  'pages/findings.md',
  'pages/lineage.md',
  'pages/exports.md',
  'pages/settings.md',
]

const walk = (directory) => {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    if (entry.name === 'view.ts' || entry.name === 'view.tsx') return [fullPath]
    return []
  })
}

const relative = (file) => path.relative(cwd, file)

const stripRootBlocks = (css) => css.replace(/:root\s*\{[\s\S]*?\}/g, '')

const countMatches = (text, regex) => [...text.matchAll(regex)].length

const addIssue = (issues, severity, message, file = undefined) => {
  issues.push({ severity, message, file })
}

const issues = []

if (!fs.existsSync(stylesPath)) {
  addIssue(issues, 'high', 'Missing `src/styles.css`.')
} else {
  const css = fs.readFileSync(stylesPath, 'utf8')
  const missingPrimitives = keyPrimitives.filter(
    (primitive) => !css.includes(primitive),
  )
  if (missingPrimitives.length > 0) {
    addIssue(
      issues,
      'medium',
      `Missing key visual primitives: ${missingPrimitives.join(', ')}.`,
      'src/styles.css',
    )
  }

  const rawHexOutsideTokens = [
    ...stripRootBlocks(css).matchAll(/#[0-9a-fA-F]{3,8}\b/g),
  ]
  if (rawHexOutsideTokens.length > 0) {
    addIssue(
      issues,
      'medium',
      `${rawHexOutsideTokens.length} raw hex colors appear outside token definitions.`,
      'src/styles.css',
    )
  }

  for (const indicator of [
    'measurement-card',
    'measurement-panel',
    'metrics-grid',
  ]) {
    if (css.includes(indicator)) {
      addIssue(
        issues,
        'medium',
        `Standalone measurement-panel indicator found: ${indicator}.`,
        'src/styles.css',
      )
    }
  }

  if (css.includes('settings-grid')) {
    addIssue(
      issues,
      'medium',
      '`settings-grid` suggests a settings dashboard layout; prefer rail + selected document.',
      'src/styles.css',
    )
  }
}

const viewFiles = [
  path.join(cwd, 'src', 'view.ts'),
  ...walk(path.join(srcRoot, 'page')),
].filter((file) => fs.existsSync(file))

for (const file of viewFiles) {
  const source = fs.readFileSync(file, 'utf8')
  const rel = relative(file)

  const primaryButtons = countMatches(
    source,
    /button primary|attune-button-primary/g,
  )
  if (primaryButtons > 1 && !rel.includes('ruleWorkbench')) {
    addIssue(
      issues,
      'medium',
      `${rel} has ${primaryButtons} primary button class occurrences.`,
      rel,
    )
  }

  for (const label of forbiddenLabels) {
    if (source.includes(label)) {
      addIssue(
        issues,
        'high',
        `Forbidden generic button label: "${label}".`,
        rel,
      )
    }
  }

  const metricViewCalls = countMatches(source, /\bmetricView\s*\(/g)
  if (metricViewCalls > 6) {
    addIssue(
      issues,
      'medium',
      `${rel} has ${metricViewCalls} metricView calls; consider a compact strip.`,
      rel,
    )
  }

  const densityClasses = [
    ...source.matchAll(/\b(?:card|panel|metric|grid)[-_a-zA-Z0-9]*/g),
  ]
  if (densityClasses.length > 45) {
    addIssue(
      issues,
      'medium',
      `${rel} has ${densityClasses.length} card/panel/metric/grid class mentions.`,
      rel,
    )
  }

  const settingsCardMentions = countMatches(source, /settings-card/g)
  if (settingsCardMentions > 3) {
    addIssue(
      issues,
      'medium',
      `${rel} has many settings-card mentions; prefer one selected settings document.`,
      rel,
    )
  }
}

for (const spec of requiredSpecs) {
  if (!fs.existsSync(path.join(cwd, spec))) {
    addIssue(issues, 'high', `Missing page spec: ${spec}.`)
  }
}

const bySeverity = (severity) =>
  issues.filter((issue) => issue.severity === severity)

console.log('# Attune Visual Audit')

console.log('\n## Summary')
console.log(`- Issues found: ${issues.length}`)
console.log(`- High: ${bySeverity('high').length}`)
console.log(`- Medium: ${bySeverity('medium').length}`)
console.log(`- Low: ${bySeverity('low').length}`)

console.log('\n## Possible issues')
if (issues.length === 0) {
  console.log('_No heuristic issues found._')
} else {
  for (const issue of issues) {
    const location = issue.file === undefined ? '' : ` (${issue.file})`
    console.log(`- [${issue.severity}]${location} ${issue.message}`)
  }
}

console.log('\n## Suggested next actions')
const suggestions = new Set()

if (
  issues.some((issue) =>
    /primary button|metric|card|panel|grid/i.test(issue.message),
  )
) {
  suggestions.add('Refactor layout before color work.')
  suggestions.add('Reduce metric/card density.')
  suggestions.add('Move secondary content into rail or selected detail pane.')
}

if (issues.some((issue) => /primitive/i.test(issue.message))) {
  suggestions.add('Use global primitives before page-specific CSS.')
}

if (issues.some((issue) => /raw hex/i.test(issue.message))) {
  suggestions.add(
    'Move one-off colors into tokens or explain syntax-highlight exceptions.',
  )
}

if (issues.some((issue) => /settings/i.test(issue.message))) {
  suggestions.add('Keep Settings to one selected document plus a section rail.')
}

if (suggestions.size === 0) {
  suggestions.add(
    'Run a manual page-grammar audit against the clean editorial target.',
  )
}

for (const suggestion of suggestions) console.log(`- ${suggestion}`)
