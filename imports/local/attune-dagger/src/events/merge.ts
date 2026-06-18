import type { File } from "@dagger.io/dagger";
import { normalizeJsonl, type NormalizedEvent } from "./normalize.js";

export const mergeEventFiles = async (
  files: ReadonlyArray<File>,
  context: Parameters<typeof normalizeJsonl>[1],
): Promise<ReadonlyArray<NormalizedEvent>> => {
  const batches = await Promise.all(
    files.map(async (file) => normalizeJsonl(await file.contents(), context)),
  );
  return batches.flat();
};
