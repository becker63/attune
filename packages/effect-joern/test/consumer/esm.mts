import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import { Joern, cpg, prop, type Query } from "joern-effect";

const query: Query<ReadonlyArray<{ readonly name: string }>> = cpg.method
  .name("main")
  .select({ name: prop.name });

void query;

const NodeLive = Layer.merge(NodeServices.layer, NodeHttpClient.layerNodeHttp);
const JoernLive = Joern.layer({
  port: 8080,
  repoPath: ".",
}).pipe(Layer.provide(NodeLive));

const program = Effect.gen(function* () {
  const joern = yield* Joern;
  return yield* joern.query(query);
}).pipe(Effect.provide(JoernLive));

const closed: Effect.Effect<
  ReadonlyArray<{ readonly name: string }>,
  unknown,
  never
> = program;

void closed;
