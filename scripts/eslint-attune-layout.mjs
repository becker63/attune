#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'

import { chromium } from '@playwright/test'

const port = 4317
const baseUrl = `http://127.0.0.1:${port}`
const routes = [
  'Workbench',
  'Discover',
  'Findings',
  'Lineage',
  'Exports',
  'Settings',
]
const viewports = [
  { width: 1600, height: 1000, name: 'desktop' },
  { width: 1366, height: 768, name: 'compact-desktop' },
]

const thresholds = {
  pageGap: 14,
  majorGap: 16,
  bodyLuminance: 12,
  panelLuminance: 18,
  maxMajorPanels: 4,
  maxButtons: 11,
  maxChips: 4,
  maxFineSurfaces: 10,
  maxTextBlocks: 20,
  maxProseWords: 130,
  minPrimaryCodePaneHeight: 180,
}

const routeThresholds = {
  Workbench: { maxMajorPanels: 3, maxFineSurfaces: 8, maxButtons: 6 },
  Discover: { maxMajorPanels: 3, maxFineSurfaces: 7, maxButtons: 6 },
  Findings: { maxMajorPanels: 2, maxFineSurfaces: 6, maxButtons: 5 },
  Lineage: { maxMajorPanels: 4, maxFineSurfaces: 8, maxButtons: 6 },
  Exports: { maxMajorPanels: 3, maxFineSurfaces: 7, maxButtons: 6 },
  Settings: { maxMajorPanels: 3, maxFineSurfaces: 7, maxButtons: 6 },
}

const server = spawn(
  'bun',
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)],
  {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

const serverOutput = []
server.stdout.on('data', (chunk) => serverOutput.push(String(chunk)))
server.stderr.on('data', (chunk) => serverOutput.push(String(chunk)))

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForServer = async () => {
  const started = Date.now()

  while (Date.now() - started < 20_000) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      await wait(250)
    }
  }

  throw new Error(`Timed out waiting for ${baseUrl}\n${serverOutput.join('')}`)
}

const chromiumExecutable = () => {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE !== undefined) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }

  for (const command of ['chromium', 'chromium-browser', 'google-chrome']) {
    const result = spawnSync('which', [command], { encoding: 'utf8' })
    if (result.status === 0) return result.stdout.trim()
  }

  return undefined
}

try {
  await waitForServer()

  const executablePath = chromiumExecutable()
  const browser = await chromium.launch(
    executablePath === undefined ? {} : { executablePath },
  )
  const issues = []

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport })
    await page.goto(baseUrl, { waitUntil: 'networkidle' })

    for (const route of routes) {
      if (route !== 'Workbench') {
        await page.getByRole('button', { name: route }).click()
      }

      await page.waitForTimeout(75)

      const routeIssues = await page.evaluate(
        ({ route, routeThresholds, thresholds, viewportName }) => {
          const visible = (element) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()

            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0
            )
          }

          const parseRgb = (value) => {
            const match = value.match(/rgba?\(([^)]+)\)/)
            if (match === null) return null

            const [r = 0, g = 0, b = 0] = match[1]
              .split(',')
              .slice(0, 3)
              .map((part) => Number.parseFloat(part.trim()))

            return { r, g, b }
          }

          const luminance = (rgb) => {
            if (rgb === null) return 0
            return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
          }

          const labelFor = (element) =>
            [
              element.tagName.toLowerCase(),
              element.className.toString().trim().replace(/\s+/g, '.'),
              element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 48),
            ]
              .filter(Boolean)
              .join(' ')

          const rectFor = (element) => {
            const rect = element.getBoundingClientRect()
            return {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }
          }

          const issues = []
          const root = document.documentElement
          const body = document.body
          const main = document.querySelector('.attune-main')
          const page = document.querySelector('.attune-page')
          const scope = page ?? main ?? document.body

          const elements = Array.from(
            scope.querySelectorAll(
              [
                '.attune-panel',
                '.attune-document-panel',
                '.attune-artifact-panel',
                '.finding-card',
                '.decision-card',
                '.timeline-item',
                '.export-file',
                '.settings-panel',
                '.revision-panel',
                '.attune-page-header',
                '.attune-context-row',
              ].join(','),
            ),
          ).filter(visible)

          const majorPanels = Array.from(
            scope.querySelectorAll(
              '.attune-panel, .attune-document-panel, .attune-artifact-panel, .panel',
            ),
          ).filter(visible)

          const fineSurfaces = Array.from(
            scope.querySelectorAll(
              [
                '.attune-panel',
                '.attune-document-panel',
                '.attune-artifact-panel',
                '.panel',
                '.finding-card',
                '.decision-card',
                '.timeline-item',
                '.export-file',
                '.settings-fields',
                '.attune-note-box',
              ].join(','),
            ),
          ).filter(visible)

          const buttons = Array.from(
            scope.querySelectorAll('button, [role="button"]'),
          ).filter(visible)

          const chips = Array.from(
            scope.querySelectorAll(
              '.attune-chip, .status-chip, .quiet-chip, .context-pill',
            ),
          ).filter(visible)

          const textBlocks = Array.from(
            scope.querySelectorAll(
              'h1, h2, h3, p, strong, small, .plan-row, .settings-toggle-row',
            ),
          ).filter((element) => visible(element) && element.textContent?.trim())
          const proseWords = Array.from(
            scope.querySelectorAll(
              'h1, h2, h3, p, strong, small, .plan-row, .settings-toggle-row',
            ),
          )
            .filter(
              (element) =>
                visible(element) && element.closest('.code-pane') === null,
            )
            .flatMap(
              (element) => element.textContent?.trim().split(/\s+/) ?? [],
            )
            .filter(Boolean)

          if (root.scrollWidth > window.innerWidth + 1) {
            issues.push(
              `Horizontal document overflow: ${root.scrollWidth}px > ${window.innerWidth}px.`,
            )
          }

          if (body.scrollHeight > window.innerHeight + 1) {
            issues.push(
              `Body exceeds viewport height: ${body.scrollHeight}px > ${window.innerHeight}px.`,
            )
          }

          if (main !== null && main.scrollWidth > main.clientWidth + 1) {
            issues.push(
              `Main content overflows horizontally: ${main.scrollWidth}px > ${main.clientWidth}px.`,
            )
          }

          if (page !== null) {
            const style = getComputedStyle(page)
            const gap = Number.parseFloat(style.rowGap)

            if (Number.isFinite(gap) && gap < thresholds.pageGap) {
              issues.push(
                `Page row gap is cramped: ${gap}px < ${thresholds.pageGap}px.`,
              )
            }
          }

          const routeBudget = routeThresholds[route] ?? {}
          const maxMajorPanels =
            routeBudget.maxMajorPanels ?? thresholds.maxMajorPanels
          const maxFineSurfaces =
            routeBudget.maxFineSurfaces ?? thresholds.maxFineSurfaces
          const maxButtons = routeBudget.maxButtons ?? thresholds.maxButtons

          if (majorPanels.length > maxMajorPanels) {
            issues.push(
              `Too many major bordered surfaces: ${majorPanels.length} > ${maxMajorPanels}.`,
            )
          }

          if (fineSurfaces.length > maxFineSurfaces) {
            issues.push(
              `Too many visible fine surfaces: ${fineSurfaces.length} > ${maxFineSurfaces}. Delete or merge UI before styling.`,
            )
          }

          if (buttons.length > maxButtons) {
            issues.push(
              `Too many visible buttons/interactions: ${buttons.length} > ${maxButtons}.`,
            )
          }

          if (chips.length > thresholds.maxChips) {
            issues.push(
              `Too many visible chips/pills: ${chips.length} > ${thresholds.maxChips}.`,
            )
          }

          if (textBlocks.length > thresholds.maxTextBlocks) {
            issues.push(
              `Text density is too high: ${textBlocks.length} visible text blocks > ${thresholds.maxTextBlocks}.`,
            )
          }

          if (proseWords.length > thresholds.maxProseWords) {
            issues.push(
              `Prose density is too high: ${proseWords.length} visible non-code words > ${thresholds.maxProseWords}.`,
            )
          }

          const bodyLum = luminance(
            parseRgb(getComputedStyle(body).backgroundColor),
          )
          if (bodyLum > thresholds.bodyLuminance) {
            issues.push(
              `Body background is not black enough: luminance ${bodyLum.toFixed(1)} > ${thresholds.bodyLuminance}.`,
            )
          }

          for (const element of majorPanels) {
            const style = getComputedStyle(element)
            const background = style.backgroundColor
            const lum = luminance(parseRgb(background))

            if (lum > thresholds.panelLuminance) {
              issues.push(
                `${labelFor(element)} has too-obvious background ${background} (luminance ${lum.toFixed(1)}).`,
              )
            }
          }

          const codePanes = Array.from(
            scope.querySelectorAll('.code-pane'),
          ).filter(visible)
          const primaryCodePane = codePanes.toSorted(
            (a, b) =>
              b.getBoundingClientRect().height *
                b.getBoundingClientRect().width -
              a.getBoundingClientRect().height *
                a.getBoundingClientRect().width,
          )[0]

          if (primaryCodePane !== undefined) {
            const rect = primaryCodePane.getBoundingClientRect()
            if (rect.height < thresholds.minPrimaryCodePaneHeight) {
              issues.push(
                `Largest code pane is too short: ${rect.height.toFixed(0)}px < ${thresholds.minPrimaryCodePaneHeight}px.`,
              )
            }
          }

          for (let i = 0; i < elements.length; i += 1) {
            for (let j = i + 1; j < elements.length; j += 1) {
              const a = elements[i]
              const b = elements[j]
              const aRect = rectFor(a)
              const bRect = rectFor(b)
              const sameParent = a.parentElement === b.parentElement
              const nested = a.contains(b) || b.contains(a)

              if (nested) continue

              const horizontalOverlap =
                Math.max(
                  0,
                  Math.min(aRect.right, bRect.right) -
                    Math.max(aRect.left, bRect.left),
                ) > 8
              const verticalOverlap =
                Math.max(
                  0,
                  Math.min(aRect.bottom, bRect.bottom) -
                    Math.max(aRect.top, bRect.top),
                ) > 8

              const verticalGap = Math.max(
                0,
                Math.max(aRect.top, bRect.top) -
                  Math.min(aRect.bottom, bRect.bottom),
              )
              const horizontalGap = Math.max(
                0,
                Math.max(aRect.left, bRect.left) -
                  Math.min(aRect.right, bRect.right),
              )

              if (
                sameParent &&
                horizontalOverlap &&
                verticalGap > 0 &&
                verticalGap < thresholds.majorGap
              ) {
                issues.push(
                  `Cramped vertical gap (${verticalGap.toFixed(1)}px) between ${labelFor(a)} and ${labelFor(b)}.`,
                )
              }

              if (
                sameParent &&
                verticalOverlap &&
                horizontalGap > 0 &&
                horizontalGap < thresholds.majorGap
              ) {
                issues.push(
                  `Cramped horizontal gap (${horizontalGap.toFixed(1)}px) between ${labelFor(a)} and ${labelFor(b)}.`,
                )
              }
            }
          }

          return issues.map((message) => ({
            message,
            route,
            viewport: viewportName,
          }))
        },
        { route, routeThresholds, thresholds, viewportName: viewport.name },
      )

      issues.push(...routeIssues)
    }

    await page.close()
  }

  await browser.close()

  console.log('# Attune Layout ESLint')
  console.log('')
  console.log(
    `Checked ${routes.length} routes across ${viewports.length} viewports.`,
  )
  console.log('')

  if (issues.length === 0) {
    console.log('No layout lint issues found.')
    process.exitCode = 0
  } else {
    console.log(
      `Found ${issues.length} issue${issues.length === 1 ? '' : 's'}.`,
    )
    console.log('')
    for (const issue of issues) {
      console.log(`- ${issue.viewport} / ${issue.route}: ${issue.message}`)
    }
    process.exitCode = 1
  }
} finally {
  server.kill()
}
