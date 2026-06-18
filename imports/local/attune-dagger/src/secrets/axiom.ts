import { dag, type Secret } from "@dagger.io/dagger";
import { DEFAULT_AXIOM_SECRET_NAME } from "../defaults.js";

export const axiomSecretFromEnvironment = (): Secret | undefined => {
  const token = process.env[DEFAULT_AXIOM_SECRET_NAME];
  return token === undefined || token.length === 0
    ? undefined
    : dag.setSecret(DEFAULT_AXIOM_SECRET_NAME, token);
};
