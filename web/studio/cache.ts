import { createStore, get, getMany, promisifyRequest, clear } from "idb-keyval";
const store = createStore("attune-studio-v1", "artifacts");
const LIMIT_BYTES = 48 * 1024 * 1024;
const LIMIT_ITEMS = 800;
const CATALOG = "cache-catalog-v1";
type Entry = { id: string; bytes: number; time: number };
export async function digest(
  value: string | Uint8Array,
  algorithm = "SHA-256",
) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const result = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  return Array.from(new Uint8Array(result), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function key(kind: string, inputs: unknown) {
  return `${kind}:${await digest(JSON.stringify(inputs))}`;
}
export async function read<T>(id: string): Promise<T | undefined> {
  try {
    return (await get<{ value: T }>(id, store))?.value;
  } catch {
    return undefined;
  }
}
export async function readMany<T>(ids: string[]): Promise<(T | undefined)[]> {
  try {
    return (await getMany<{ value: T }>(ids, store)).map(
      (record) => record?.value,
    );
  } catch {
    return ids.map(() => undefined);
  }
}
export async function write(id: string, value: unknown) {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value)).length;
    if (bytes > LIMIT_BYTES / 2) return false;
    // Eviction reads only a small size catalog, not every source and vector.
    // The catalog and artifacts change atomically, including across tabs.
    await store("readwrite", (objects) => {
      const done = promisifyRequest(objects.transaction);
      const commit = (existing: Entry[]) => {
        const records = existing
          .filter((record) => record.id !== id)
          .sort((a, b) => a.time - b.time);
        let total = records.reduce((sum, record) => sum + record.bytes, 0);
        while (
          records.length &&
          (total + bytes > LIMIT_BYTES || records.length >= LIMIT_ITEMS)
        ) {
          const oldest = records.shift()!;
          objects.delete(oldest.id);
          total -= oldest.bytes;
        }
        const time = Date.now();
        objects.put({ value, bytes, time }, id);
        objects.put(
          { value: [...records, { id, bytes, time }], bytes: 0, time },
          CATALOG,
        );
      };
      const request = objects.get(CATALOG);
      request.onsuccess = () => {
        if (request.result) {
          commit(request.result.value);
          return;
        }
        // One-time migration preserves artifacts saved by the earlier version.
        const records: Entry[] = [],
          cursor = objects.openCursor();
        cursor.onsuccess = () => {
          const item = cursor.result;
          if (!item) {
            commit(records);
            return;
          }
          records.push({
            id: String(item.key),
            bytes: item.value.bytes,
            time: item.value.time,
          });
          item.continue();
        };
      };
      return done;
    });
    return true;
  } catch {
    return false;
  } // Storage denial/quota never masquerades as a hit.
}
export async function clearCache() {
  await clear(store);
}
