import { Effect, Result } from "effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { makeHttpTransport, renderImportCode } from "../src/core/transport.js";

type SeenRequest = {
  readonly method: string;
  readonly signal: AbortSignal;
  readonly url: URL;
};

const fakeHttpClient = (
  body: unknown,
  status = 200,
): {
  readonly client: HttpClient.HttpClient;
  readonly seen: SeenRequest[];
} => {
  const seen: SeenRequest[] = [];
  const client = HttpClient.make((request, url, signal) => {
    seen.push({
      method: request.method,
      signal,
      url,
    });
    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json" },
          status,
        }),
      ),
    );
  });

  return { client, seen };
};

describe("Joern HTTP transport", () => {
  it("normalizes endpoints and delegates cancellation to HttpClient", async () => {
    const { client, seen } = fakeHttpClient({
      stdout: "result",
      success: true,
    });

    await expect(
      Effect.runPromise(
        makeHttpTransport(client).execute("http://127.0.0.1:8080/", "1 + 1"),
      ),
    ).resolves.toBe("result");

    expect(seen).toHaveLength(1);
    expect(seen[0]?.url.href).toBe("http://127.0.0.1:8080/query-sync");
    expect(seen[0]?.method).toBe("POST");
    expect(seen[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("exposes the complete bounded query-sync envelope additively", async () => {
    const response = {
      stderr: "warning from Joern",
      stdout: 'val res0: String = "[1,2,3]"',
      success: true,
    };
    const { client } = fakeHttpClient(response);
    const transport = makeHttpTransport(client);

    const diagnostic = await Effect.runPromise(
      transport.executeDiagnostic("http://127.0.0.1:8080", "cpg.method.size"),
    );

    expect(diagnostic).toStrictEqual({
      query: "cpg.method.size",
      status: 200,
      responseBody: JSON.stringify(response),
      responseBodyBytes: Buffer.byteLength(JSON.stringify(response)),
      responseLimitBytes: 8 * 1_024 * 1_024,
      responseComplete: true,
      success: true,
      stdout: response.stdout,
      stderr: response.stderr,
      result: "[1,2,3]",
    });
    await expect(
      Effect.runPromise(
        transport.execute("http://127.0.0.1:8080", "cpg.method.size"),
      ),
    ).resolves.toBe("[1,2,3]");
  });

  it("attaches the complete diagnostic envelope to established query failures", async () => {
    const response = {
      stderr: "query rejected",
      stdout: "partial",
      success: false,
    };
    const { client } = fakeHttpClient(response);
    const result = await Effect.runPromise(
      makeHttpTransport(client)
        .execute("http://127.0.0.1:8080", "invalid CPGQL")
        .pipe(Effect.result),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected failed CPGQL to fail");
    }
    expect(result.failure).toMatchObject({
      _tag: "JoernHttpError",
      body: "query rejected",
      diagnostic: {
        query: "invalid CPGQL",
        responseBody: JSON.stringify(response),
        responseComplete: true,
        stderr: "query rejected",
        stdout: "partial",
        success: false,
      },
      responseComplete: true,
    });
  });

  it("fails closed with a bounded prefix when the hard response limit is exceeded", async () => {
    const { client } = fakeHttpClient({
      stdout: "x".repeat(512),
      success: true,
    });
    const result = await Effect.runPromise(
      makeHttpTransport(client, { responseLimitBytes: 64 })
        .executeDiagnostic("http://127.0.0.1:8080", "large")
        .pipe(Effect.result),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected an oversized response to fail");
    }
    expect(result.failure).toMatchObject({
      _tag: "JoernHttpError",
      responseComplete: false,
      responseLimitBytes: 64,
    });
    expect(Buffer.byteLength(result.failure.body)).toBeLessThanOrEqual(64);
    expect(result.failure.responseBytesObserved).toBeGreaterThan(64);
  });

  it("uses Joern's automatic frontend unless one is requested", () => {
    expect(renderImportCode("/repo", "project")).toBe(
      'importCode(inputPath="/repo", projectName="project")',
    );
    expect(renderImportCode("/repo", "project", "jssrc")).toBe(
      'importCode.jssrc(inputPath="/repo", projectName="project")',
    );
  });

  it("accepts successful imports whose result contains None", async () => {
    const { client } = fakeHttpClient({
      stdout: 'val res0: String = "NoneRepo"',
      success: true,
    });

    await expect(
      Effect.runPromise(
        makeHttpTransport(client).importCode(
          "http://127.0.0.1:8080",
          "/repo/NoneRepo",
          "NoneRepo",
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it.each([
    [{ stdout: "[]" }, "expected schema"],
    [{ success: true }, "did not include stdout"],
  ])("rejects malformed successful responses: %j", async (body, message) => {
    const { client } = fakeHttpClient(body);

    const result = await Effect.runPromise(
      makeHttpTransport(client)
        .execute("http://127.0.0.1:8080", "cpg.method")
        .pipe(Effect.result),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected malformed response to fail");
    }
    expect(result.failure._tag).toBe("JoernHttpError");
    expect(result.failure.message).toContain(message);
  });

  it("preserves non-success HTTP status and body", async () => {
    const { client } = fakeHttpClient({ error: "server unavailable" }, 503);

    const result = await Effect.runPromise(
      makeHttpTransport(client)
        .execute("http://127.0.0.1:8080", "cpg.method")
        .pipe(Effect.result),
    );

    if (!Result.isFailure(result)) {
      throw new Error("Expected unsuccessful HTTP response to fail");
    }
    expect(result.failure._tag).toBe("JoernHttpError");
    expect(result.failure.status).toBe(503);
    expect(result.failure.body).toContain("server unavailable");
  });
});
