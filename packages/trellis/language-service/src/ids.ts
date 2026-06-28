import { createHash } from "node:crypto"

export const stableTrellisLsId = (
  prefix: "diag" | "fix",
  parts: readonly unknown[],
): string => {
  const hash = createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("base64url")
    .slice(0, 24)

  return `${prefix}_${hash}`
}
