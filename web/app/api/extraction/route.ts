import { Denied, readRequest } from "../../../server/http";
import { publicFile, repositoryName } from "../../../server/source";
import { SOURCES } from "../../../studio/fixture";
import { parallel } from "../../../studio/batches";
import {
  inventory,
  repositoryHead,
  verifiedSource,
} from "../../../server/github";
import { extractedFile } from "../../../server/observations";
import {
  extractorIdentity,
  ExtractionFailure,
  serverInstance,
} from "../../../server/extraction";
import { createHash } from "node:crypto";

// Cache Components runs in Node; it disallows a segment runtime override.
export const maxDuration = 240;
const noStore = { "Cache-Control": "no-store" };
let active = 0,
  count = 0,
  windowStart = 0;
export async function POST(request: Request) {
  try {
    const body = await readRequest(request, 8192);
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      count = 0;
    }
    if (active >= 8 || count >= 600)
      throw new Denied("Extraction busy; retry shortly.", 429);
    active++;
    count++;
    try {
      if (body.operation === "repository") {
        if (typeof body.url !== "string" || body.url.length > 512)
          throw new Denied("Invalid repository URL.");
        let requested;
        try {
          requested = repositoryName(body.url);
        } catch {
          throw new Denied("Invalid public GitHub URL.");
        }
        if (
          body.revision !== undefined &&
          (typeof body.revision !== "string" ||
            !/^[a-f0-9]{40}$/.test(body.revision))
        )
          throw new Denied("Expected an immutable revision.");
        const head = body.revision
          ? { name: requested, revision: body.revision }
          : await repositoryHead(requested);
        return Response.json(await inventory(head.name, head.revision), {
          headers: noStore,
        });
      }
      const extractor = extractorIdentity();
      if (body.operation === "fixture") {
        const files = await parallel(SOURCES, 4, async ([path, source]) => {
          const digest = createHash("sha256").update(source).digest("hex");
          const result = await extractedFile(extractor, { fixture: path, digest });
          return {
            file: { path, source, digest, blob: "" },
            observation: result.observation,
            execution: result.execution,
          };
        });
        return Response.json(
          {
            files,
            extractor,
            servedBy: serverInstance,
            kind: "authored-fixture",
          },
          { headers: noStore },
        );
      }
      if (
        body.operation !== "files" ||
        !Array.isArray(body.paths) ||
        !body.paths.length ||
        body.paths.length > 2
      )
        throw new Denied("Expected one or two public file paths.");
      let identities;
      try {
        identities = body.paths.map((path: unknown) =>
          publicFile({ ...body, path }),
        );
      } catch {
        throw new Denied("Invalid public file identity.");
      }
      const files = await Promise.all(
        identities.map(async (identity: ReturnType<typeof publicFile>) => {
          let file;
          try {
            file = { ...(await verifiedSource(identity)), path: identity.path };
          } catch {
            return {
              path: identity.path,
              failure: {
                kind: "source",
                reason: "Verified public source unavailable; retry this file.",
              },
            };
          }
          try {
            const result = await extractedFile(extractor, identity);
            const {
              path: _path,
              source: _source,
              ...relations
            } = result.observation;
            return { file, relations, execution: result.execution };
          } catch (error) {
            const failed =
              error instanceof ExtractionFailure ||
              (error as { digest?: string })?.digest === "ATTUNE_GRIT_FAILED";
            return {
              file,
              failure: {
                kind: failed ? "extraction" : "cache-or-runtime",
                reason: failed
                  ? "Grit could not complete this file; retry indexing."
                  : "Extraction cache or runtime unavailable; retry this file.",
              },
            };
          }
        }),
      );
      return Response.json(
        {
          files,
          extractor,
          servedBy: serverInstance,
          cache: "shared lookup; hit status unavailable",
        },
        { headers: noStore },
      );
    } finally {
      active--;
    }
  } catch (error) {
    if (!(error instanceof Denied)) console.error("attune.extraction", error);
    return Response.json(
      {
        error:
          error instanceof Denied
            ? error.message
            : "Public source acquisition failed.",
      },
      {
        status: error instanceof Denied ? error.status : 502,
        headers: noStore,
      },
    );
  }
}
