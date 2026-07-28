export interface TypeDocProbeResult {
  readonly typedocVersion: string;
  readonly typescriptVersion: string;
  readonly compatible: boolean;
  readonly reason: string;
}

export const assessTypeDocCompatibility = (
  typedocVersion: string,
  typescriptVersion: string,
): TypeDocProbeResult => {
  const [typedocMajor = 0, typedocMinor = 0] = typedocVersion
    .split(".")
    .map(Number);
  const [typescriptMajor = 0] = typescriptVersion.split(".").map(Number);
  const supportsTypeScriptSeven =
    typedocMajor > 0 || (typedocMajor === 0 && typedocMinor > 28);
  const compatible =
    typescriptMajor < 7 || (typescriptMajor === 7 && supportsTypeScriptSeven);
  return {
    typedocVersion,
    typescriptVersion,
    compatible,
    reason: compatible
      ? "No known version-matrix blocker; run the executable probe before adoption."
      : "TypeDoc 0.28.x does not support the repository TypeScript 7 compiler API.",
  };
};
