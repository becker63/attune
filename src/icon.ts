import { type Html, html } from 'foldkit/html'

type IconOptions = {
  readonly className?: string
  readonly label?: string
}

const icon = (
  d: string,
  { className = 'icon', label }: IconOptions = {},
): Html => {
  const h = html()
  const accessibility =
    label === undefined
      ? [h.AriaHidden(true)]
      : [h.Attribute('role', 'img'), h.AriaLabel(label)]

  return h.svg(
    [
      ...accessibility,
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.8'),
      h.Stroke('currentColor'),
    ],
    [h.path([h.StrokeLinecap('round'), h.StrokeLinejoin('round'), h.D(d)], [])],
  )
}

export const leaf = (options?: IconOptions): Html =>
  icon(
    'M11 20A7 7 0 0 1 4 13c0-6 8-9 16-9 0 8-3 16-9 16ZM4 13c4 0 7-2 10-5',
    options,
  )

export const compass = (options?: IconOptions): Html =>
  icon(
    'm16 8-2.2 5.8L8 16l2.2-5.8L16 8ZM12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
    options,
  )

export const workflow = (options?: IconOptions): Html =>
  icon(
    'M6 3v6m0 0a3 3 0 1 0 0 6m0-6a3 3 0 1 1 0 6m12-3h-6m6-6v12M6 15v6m12-18v6',
    options,
  )

export const gitBranch = (options?: IconOptions): Html =>
  icon(
    'M6 3v12m0 0a3 3 0 1 0 3 3M6 15a3 3 0 1 1-3 3m15-15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 6c0 4-4 4-7 4H9',
    options,
  )

export const archive = (options?: IconOptions): Html =>
  icon('M21 8H3m2 0 1 12h12l1-12M7 4h10l1 4H6l1-4Zm3 8h4', options)

export const settings = (options?: IconOptions): Html =>
  icon(
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13v3m0 13v3m9.5-9.5h-3m-13 0h-3m16.2-6.7-2.1 2.1M7.4 16.6l-2.1 2.1m0-13.4 2.1 2.1m9.2 9.2 2.1 2.1',
    options,
  )

export const check = (options?: IconOptions): Html =>
  icon('M20 6 9 17l-5-5', options)

export const x = (options?: IconOptions): Html =>
  icon('M18 6 6 18M6 6l12 12', options)

export const clock = (options?: IconOptions): Html =>
  icon('M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', options)

export const fileSearch = (options?: IconOptions): Html =>
  icon(
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6m-5 7-2-2m-3 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    options,
  )

export const flask = (options?: IconOptions): Html =>
  icon(
    'M9 3h6m-1 0v5l5 8.5A3 3 0 0 1 16.4 21H7.6A3 3 0 0 1 5 16.5L10 8V3m-2.5 13h9',
    options,
  )

export const arrowRight = (options?: IconOptions): Html =>
  icon('M5 12h14m-6-6 6 6-6 6', options)

export const user = (options?: IconOptions): Html =>
  icon('M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', options)

export const expand = (options?: IconOptions): Html =>
  icon('M15 3h6v6m0-6-7 7M9 21H3v-6m0 6 7-7', options)

export const shrink = (options?: IconOptions): Html =>
  icon('M8 3v5H3m0 0 6-6m7 19v-5h5m0 0-6 6', options)
