export class Denied extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function limitedBytes(response: Response, max: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Denied("Empty response.", 502);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) throw new Denied("Response exceeds byte limit.", 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return data;
}
export async function limitedText(response: Response, max: number) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await limitedBytes(response, max),
  );
}
export async function readRequest(request: Request, limit: number) {
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
    body = JSON.parse(await limitedText(new Response(request.body), limit));
  } catch (error) {
    throw error instanceof Denied ? error : new Denied("Invalid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Denied("Expected an object.");
  return body;
}
