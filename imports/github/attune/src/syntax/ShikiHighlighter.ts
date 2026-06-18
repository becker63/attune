import { Effect, Option } from 'effect'
import { createHighlighter } from 'shiki'

import { type CodeLanguage } from './CodeLanguage'
import {
  HighlightedCode,
  HighlightedLine,
  HighlightedToken,
} from './HighlightedCode'

export const highlightCode = (
  language: CodeLanguage,
  rawCode: string,
): Effect.Effect<HighlightedCode, Error> =>
  Effect.tryPromise({
    try: async () => {
      const highlighter = await createHighlighter({
        themes: ['dark-plus'],
        langs: ['ts', 'tsx', 'yaml'],
      })

      const lines = highlighter.codeToTokens(rawCode, {
        lang: language === 'text' ? 'text' : language,
        theme: 'dark-plus',
      }).tokens

      return HighlightedCode.make({
        language,
        rawCode,
        lines: lines.map((line, index) =>
          HighlightedLine.make({
            lineNumber: index + 1,
            tokens: line.map((token) =>
              HighlightedToken.make({
                text: token.content,
                color: Option.fromUndefinedOr(token.color),
                className: Option.none(),
              }),
            ),
            isMarked: false,
          }),
        ),
      })
    },
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  })
