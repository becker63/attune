import { Schema as S } from 'effect'

export const CodeLanguage = S.Literals(['ts', 'tsx', 'yaml', 'text'])
export type CodeLanguage = typeof CodeLanguage.Type
