import { type Container, type Directory } from "@dagger.io/dagger";
import { repoContainer, runInRepoAllowFailure } from "../base.js";

export const e2eSensor = (source: Directory): Container =>
  runInRepoAllowFailure(repoContainer(source), "pnpm --filter @attune/joern-effect-properties test");
