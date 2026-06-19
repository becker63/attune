export const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\"'\"'")}'`

export const renderCommand = (command: readonly string[]): string => command.map(shellQuote).join(" ")

export interface CommandPlan {
  readonly argv: readonly string[]
  readonly display: string
}

export const commandPlan = (argv: readonly string[]): CommandPlan => ({
  argv,
  display: renderCommand(argv),
})
