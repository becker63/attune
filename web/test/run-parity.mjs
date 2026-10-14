import { register } from "tsx/esm/api";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const assets = fileURLToPath(new URL("../browser_assets", import.meta.url));
const server = http.createServer((request, response) => {
  if (request.url === "/studio") {
    response.setHeader("content-type", "text/html");
    response.end("<!doctype html><title>Browser parity</title>");
    return;
  }
  const file = path.resolve(
    assets,
    `.${new URL(request.url, "http://localhost").pathname}`,
  );
  if (!file.startsWith(assets + path.sep) || !fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader(
    "content-type",
    file.endsWith(".wasm")
      ? "application/wasm"
      : file.endsWith(".js")
        ? "text/javascript"
        : "application/octet-stream",
  );
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
server.unref();
process.env.STUDIO_TEST_URL = `http://127.0.0.1:${server.address().port}`;
process.env.STUDIO_PARITY_ONLY = "1";
process.env.STUDIO_PARITY_WORKER = fileURLToPath(
  new URL("../parity-worker.js", import.meta.url),
);
process.env.STUDIO_GRIT_ASSETS = fileURLToPath(new URL("../server_assets", import.meta.url));
process.env.STUDIO_GRIT_WASM = fileURLToPath(new URL("../grit_wasm_assets", import.meta.url));
register();
await import("./browser.test.ts");
await import("./grit.test.ts");
