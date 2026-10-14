// Test-only fault injection around Next's own in-memory handler. No application cache.
import fs from "node:fs";
import { createDefaultCacheHandler } from "next/dist/server/lib/cache-handlers/default.js";
let epoch, cache;
function current() {
  const state = JSON.parse(
    fs.readFileSync(process.env.STUDIO_TEST_CACHE_CONTROL, "utf8"),
  );
  if (state.down) throw Error("Authored remote cache outage");
  if (epoch !== state.epoch) {
    epoch = state.epoch;
    cache = createDefaultCacheHandler(50 * 1024 * 1024);
  }
  return cache;
}
export default Object.fromEntries(
  ["get", "set", "refreshTags", "getExpiration", "updateTags"].map((name) => [
    name,
    (...args) => current()[name](...args),
  ]),
);
