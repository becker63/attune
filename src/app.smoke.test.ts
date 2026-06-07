import { describe, expect, test } from 'vitest'

import { init } from './main'

describe('Attune app', () => {
  test('boots into the Workbench route', () => {
    const [model, commands] = init()

    expect(model.route._tag).toBe('WorkbenchRoute')
    expect(model.ruleWorkbench.title).toBe(
      'Styling belongs in UI primitives and recipes',
    )
    expect(commands).toHaveLength(0)
  })
})
