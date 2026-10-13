import { parallel } from "../../../studio/batches";
import { cacheLife, cacheTag } from "next/cache";
import {
  Denied,
  embeddingBatch,
  embedBatch,
  embeddingQueue,
  JEV_ID,
  judge,
  limitedText,
  publicSource,
  MODEL_ID,
  RECIPE,
} from "../../../server/inference";
// Cache Components uses the Node.js runtime; Edge is not supported.
export const maxDuration = 60;
const noStore = { "Cache-Control": "no-store" };
let active = 0,
  windowStart = 0,
  count = 0;
const pending = new Map<
  string,
  Promise<Awaited<ReturnType<typeof embedBatch>>[number]>
>();
const queuedEmbedding = embeddingQueue((inputs) =>
  embedBatch(inputs, process.env.STUDIO_OPENROUTER_KEY!),
);
async function sharedEmbedding(model: string, recipe: string, input: string) {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 86400, expire: 604800 });
  cacheTag("studio-embedding-v1", model, recipe);
  return queuedEmbedding(input);
}
async function sharedFixture() {
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
export async function GET() {
  return Response.json(
    {
      embedding: !!process.env.STUDIO_OPENROUTER_KEY,
      jev: !!process.env.STUDIO_OPENROUTER_KEY,
    },
    { headers: noStore },
  );
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      !origin ||
      new URL(origin).origin !== origin ||
      new URL(origin).host !== request.headers.get("host")
    )
      throw new Denied("Same-origin requests only.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new Denied("Expected JSON.", 415);
    let body;
    try {
      body = JSON.parse(
        await limitedText(new Response(request.body), 1024 * 1024),
      );
    } catch (e) {
      if (e instanceof Denied) throw e;
      throw new Denied("Invalid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Denied("Expected a request object.");
    // Fixed public data only: tests shared-cache behavior without paid calls.
    if (body.operation === "cache-fixture")
      return Response.json(
        {
          ...(await sharedFixture()),
          cache: "shared lookup; compare observation IDs to observe reuse",
          providerCalls: 0,
        },
        { headers: noStore },
      );
    if (body.operation === "judgment") {
      if (
        body.model !== JEV_ID ||
        body.recipe !== "studio-judgment:source-700:witness-200:v1"
      )
        throw new Denied("Unsupported judgment recipe.");
      const state = body.state;
      if (
        typeof state?.question !== "string" ||
        state.question.length > 2000 ||
        !Array.isArray(state.candidates) ||
        state.candidates.some(
          (c: any) =>
            typeof c.path !== "string" ||
            c.path.length > 512 ||
            typeof c.source !== "string" ||
            c.source.length > 700 ||
            typeof c.relationships !== "string" ||
            c.relationships.length > 200,
        ) ||
        new Set(state.candidates.map((c: any) => c.path)).size !==
          state.candidates.length
      )
        throw new Denied("Invalid judgment evidence.");
    } else embeddingBatch(body);
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      count = 0;
    }
    if (active >= 8 || count >= 180)
      throw new Denied("Inference busy; try again later.", 429);
    active++;
    count++;
    try {
      if (body.operation === "judgment") {
        if (!process.env.STUDIO_OPENROUTER_KEY)
          throw new Denied("JEv is not configured.", 503);
        return Response.json(
          {
            ...(await judge(body.state, process.env.STUDIO_OPENROUTER_KEY)),
            cache: "private uncached request",
            providerCalls: 1,
          },
          { headers: noStore },
        );
      }
      if (!process.env.STUDIO_OPENROUTER_KEY)
        throw new Denied("Qwen is not configured.", 503);
      const inputs = embeddingBatch(body);
      // Verify every public input before any paid work. Four bounded GitHub
      // requests at a time; neither user prompts nor arbitrary URLs are cached.
      await parallel(inputs, 4, async (item) => {
        if (item.publicFile) await publicSource(item.publicFile, item.input);
      });
      const privateInputs = inputs.filter((item) => !item.publicFile);
      const privateAnswers = privateInputs.length
        ? embedBatch(
            privateInputs.map((item) => item.input),
            process.env.STUDIO_OPENROUTER_KEY!,
          )
        : Promise.resolve([]);
      const observations = await Promise.all(
        inputs.map(async (item) => {
          if (!item.publicFile)
            return {
              ...(await privateAnswers)[privateInputs.indexOf(item)],
              cache: "private uncached request",
            };
          // Per-file reuse survives different batch boundaries and changed peers.
          // Same-process misses coalesce. Different instances may still race.
          let task = pending.get(item.input);
          if (!task) {
            task = sharedEmbedding(MODEL_ID, RECIPE, item.input);
            pending.set(item.input, task);
          }
          try {
            return {
              ...(await task),
              cache: "shared lookup; hit status unavailable",
            };
          } finally {
            if (pending.get(item.input) === task) pending.delete(item.input);
          }
        }),
      );
      return Response.json(
        {
          observations,
          providerCalls: inputs.some((item) => item.publicFile) ? null : 1,
        },
        { headers: noStore },
      );
    } finally {
      active--;
    }
  } catch (e) {
    const error =
      e instanceof Denied ? e : new Denied("Inference request failed.", 502);
    return Response.json(
      { error: error.message },
      { status: error.status, headers: noStore },
    );
  }
}
