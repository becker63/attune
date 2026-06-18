import { type Container, type Directory } from "@dagger.io/dagger";
import { repoContainer, runInRepoAllowFailure } from "../base.js";

export const typecheckSensor = (source: Directory): Container =>
  runInRepoAllowFailure(repoContainer(source), "pnpm typecheck");
