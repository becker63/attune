import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer, Schema } from "effect";
import { Joern, raw } from "joern-effect";

const topLevelMethods = raw(
  `cpg.method
    .filter(_.isExternal == false)
    .map(m => Map(
      "name" -> m.name,
      "fullName" -> m.fullName,
      "line" -> m.lineNumber
    ))
    .toJson`,
  Schema.Array(
    Schema.Struct({
      name: Schema.String,
      fullName: Schema.String,
      line: Schema.NullOr(Schema.Number),
    }),
  ),
);

const program = Effect.gen(function* () {
  const joern = yield* Joern;
  return yield* joern.query(topLevelMethods);
});

const NodeLive = Layer.merge(NodeServices.layer, NodeHttpClient.layerNodeHttp);
const JoernLive = Joern.layer({
  port: 8080,
  repoPath: process.argv[2] ?? ".",
}).pipe(Layer.provide(NodeLive));

NodeRuntime.runMain(
  program.pipe(
    Effect.provide(JoernLive),
    Effect.tap((methods) => Effect.sync(() => console.table(methods))),
  ),
);
