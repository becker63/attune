// Transport bounds, shared by browser dispatch and the server's cache-miss batcher.
export const BATCH_ITEMS = 16;
export const BATCH_BYTES = 128 * 1024;
export const EMBEDDING_CONCURRENCY = 4;
export function batches<T>(items: T[], text: (item: T) => string): T[][] {
  const result: T[][] = [];
  let group: T[] = [],
    bytes = 0;
  for (const item of items) {
    const size = new TextEncoder().encode(text(item)).length;
    if (size > BATCH_BYTES)
      throw new Error("Embedding exceeds the batch byte limit.");
    if (
      group.length &&
      (group.length === BATCH_ITEMS || bytes + size > BATCH_BYTES)
    ) {
      result.push(group);
      group = [];
      bytes = 0;
    }
    group.push(item);
    bytes += size;
  }
  if (group.length) result.push(group);
  return result;
}
export async function parallel<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number, lane: number) => Promise<R>,
): Promise<R[]> {
  let next = 0;
  const result: R[] = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async (_, lane) => {
      while (next < items.length) {
        const index = next++;
        result[index] = await run(items[index], index, lane);
      }
    }),
  );
  return result;
}
