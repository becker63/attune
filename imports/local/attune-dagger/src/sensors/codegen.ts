import { type Container, type Directory } from "@dagger.io/dagger";
import { repoContainer, runInRepoAllowFailure } from "../base.js";

export const codegenSensor = (source: Directory): Container =>
  runInRepoAllowFailure(repoContainer(source), "pnpm check-generated");
