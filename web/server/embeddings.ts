import { cacheLife, cacheTag } from "next/cache";
import { embeddingQueue, embedBatch } from "./inference";
import { verifiedSource } from "./github";
import type { publicFile } from "./source";
const queuedEmbedding = embeddingQueue((inputs) =>
  embedBatch(inputs, process.env.STUDIO_OPENROUTER_KEY!),
);
export async function sharedEmbedding(
  model: string,
  recipe: string,
  file: ReturnType<typeof publicFile>,
) {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 86400, expire: 604800 });
  cacheTag("studio-embedding-v1", model, recipe);
  return queuedEmbedding((await verifiedSource(file)).source.slice(0, 32768));
}
export async function sharedFixture() {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("studio-cache-fixture-v1");
  return {
    kind: "authored-cache-fixture",
    vector: [1, 0, 0],
    observationId: crypto.randomUUID(),
    createdAt: Date.now(),
  };
}
