import { Denied, readRequest } from "../../../server/http";
import { publicFile } from "../../../server/source";
import { parallel } from "../../../studio/batches";
import { sharedEmbedding, sharedFixture } from "../../../server/embeddings";
import { verifiedSource } from "../../../server/github";
import {
  embeddingBatch,
  embedBatch,
  JEV_ID,
  judge,
  MODEL_ID,
  RECIPE,
} from "../../../server/inference";
// Cache Components uses the Node.js runtime; Edge is not supported.
export const maxDuration = 60;
const noStore = { "Cache-Control": "no-store" };
let active = 0,
  windowStart = 0,
  count = 0;
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
    const body = await readRequest(request, 1024 * 1024);
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
        if (item.publicFile) {
          const file = await verifiedSource(publicFile(item.publicFile));
          if (file.source.slice(0, 32768) !== item.input)
            throw new Denied(
              "Embedding input does not match the public source.",
              422,
            );
        }
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
          // Next owns per-file reuse and coalesces local fills. Separate server
          // instances can still race; batching is only provider transport.
          return {
            ...(await sharedEmbedding(
              MODEL_ID,
              RECIPE,
              publicFile(item.publicFile),
            )),
            cache: "shared lookup; hit status unavailable",
          };
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
