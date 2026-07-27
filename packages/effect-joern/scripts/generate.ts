import { Effect } from "effect";

import { generate } from "./codegen/generate.ts";

Effect.runPromise(generate()).catch((error) => {
  console.error(error);
  process.exit(1);
});
