import { Option } from 'effect'
import { type Html, html } from 'foldkit/html'

import type { HighlightedCode } from '../../../syntax/HighlightedCode'
import type { Message } from '../message'

export const highlightedCodeView = (code: HighlightedCode): Html => {
  const h = html<Message>()

  return h.pre(
    [
      h.Class('code-pane'),
      h.Attribute('data-language', code.language),
      h.AriaLabel(`${code.language} code`),
    ],
    [
      h.code(
        [h.Attribute('data-raw-code', code.rawCode)],
        code.lines.map(line =>
          h.span(
            [h.Class('code-line'), h.Attribute('data-line', line.lineNumber.toString())],
            [
              h.span([h.Class('code-line-number')], [
                line.lineNumber.toString(),
              ]),
              h.span(
                [h.Class('code-line-content')],
                line.tokens.map(token => {
                  const style = Option.match(token.color, {
                    onNone: () => ({}),
                    onSome: color => ({ color }),
                  })

                  return h.span([h.Style(style)], [token.text])
                }),
              ),
              '\n',
            ],
          ),
        ),
      ),
    ],
  )
}
