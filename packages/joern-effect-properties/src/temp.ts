export const propertyTmpdir = (): string =>
  "/tmp"

export const makePropertyTempDir = (prefix = "joern-effect-property-"): string =>
  `${propertyTmpdir()}/${prefix}deterministic`
