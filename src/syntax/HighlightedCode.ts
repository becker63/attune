import { Option, Schema as S } from 'effect'

import { CodeLanguage } from './CodeLanguage'

export const HighlightedToken = S.Struct({
  text: S.String,
  color: S.Option(S.String),
  className: S.Option(S.String),
})
export type HighlightedToken = typeof HighlightedToken.Type

export const HighlightedLine = S.Struct({
  lineNumber: S.Number,
  tokens: S.Array(HighlightedToken),
  isMarked: S.Boolean,
})
export type HighlightedLine = typeof HighlightedLine.Type

export const HighlightedCode = S.Struct({
  language: CodeLanguage,
  rawCode: S.String,
  lines: S.Array(HighlightedLine),
})
export type HighlightedCode = typeof HighlightedCode.Type

export const highlightedCodeFromPlainText = (
  language: CodeLanguage,
  rawCode: string,
): HighlightedCode =>
  HighlightedCode.make({
    language,
    rawCode,
    lines: rawCode.split('\n').map((line, index) =>
      HighlightedLine.make({
        lineNumber: index + 1,
        tokens: [
          HighlightedToken.make({
            text: line,
            color: Option.none(),
            className: Option.none(),
          }),
        ],
        isMarked: false,
      }),
    ),
  })
