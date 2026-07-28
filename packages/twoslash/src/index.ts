/**
 * Isolated compatibility boundary for build-time Twoslash hover information.
 *
 * Attune source is validated by the repository's native TypeScript 7
 * compiler. Twoslash still consumes the TypeScript 5 compiler API, so this
 * private workspace package owns that compiler and its complete peer graph.
 */
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import { createTransformerFactory, rendererRich } from "@shikijs/twoslash";
import { createTwoslasher } from "twoslash/core";
import * as TypeScript from "typescript";

const packageDirectory = Path.resolve(
  Path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryDirectory = Path.resolve(packageDirectory, "..", "..");
const twoslashTypeScriptDirectory = Path.dirname(
  fileURLToPath(import.meta.resolve("typescript/package.json")),
);

export const twoslashRichStylePath = fileURLToPath(
  import.meta.resolve("@shikijs/twoslash/style-rich.css"),
);

const twoslasher = createTwoslasher({
  compilerOptions: {
    module: TypeScript.ModuleKind.ESNext,
    moduleResolution: TypeScript.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    strict: true,
    target: TypeScript.ScriptTarget.ES2022,
  },
  tsLibDirectory: Path.join(twoslashTypeScriptDirectory, "lib"),
  tsModule: TypeScript,
  vfsRoot: repositoryDirectory,
});

type TwoslashTransformer = ReturnType<
  ReturnType<typeof createTransformerFactory>
>;

/**
 * Upstream rich Twoslash rendering with errors isolated to the code block.
 *
 * A declaration that is not self-contained still receives Shiki highlighting;
 * Twoslash simply declines to add language-service annotations to that block.
 */
export const twoslashTransformer: TwoslashTransformer =
  createTransformerFactory(
    twoslasher,
    rendererRich({
      errorRendering: "hover",
      jsdoc: true,
    }),
  )({
    langs: ["ts", "typescript"],
    throws: false,
  });

export const twoslashTypeScriptVersion = TypeScript.version;
