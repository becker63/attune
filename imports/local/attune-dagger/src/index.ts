import { type Directory, type File, type Secret, func, object } from "@dagger.io/dagger";
import { DEFAULT_PHASE } from "./defaults.js";
import { normalizePhase } from "./phases.js";
import { runCi, runCodegen, runDev, runE2e, runEvents, runFork, runProperty } from "./commands.js";
import { shipAxiom } from "./events/shipAxiom.js";

@object()
export class AttuneDagger {
  @func()
  dev(source: Directory): Promise<string> {
    return runDev(source);
  }

  @func()
  ci(source: Directory): Promise<string> {
    return runCi(source);
  }

  @func()
  codegen(source: Directory): Promise<string> {
    return runCodegen(source);
  }

  @func()
  fork(source: Directory): Promise<string> {
    return runFork(source, DEFAULT_PHASE);
  }

  @func()
  property(source: Directory): Promise<string> {
    return runProperty(source, DEFAULT_PHASE);
  }

  @func()
  e2e(source: Directory): Promise<string> {
    return runE2e(source);
  }

  @func()
  events(source: Directory): File {
    return runEvents(source);
  }

  @func()
  devPhase(source: Directory, phase: string): Promise<string> {
    return runFork(source, normalizePhase(phase));
  }

  @func()
  propertyPhase(source: Directory, phase: string): Promise<string> {
    return runProperty(source, normalizePhase(phase));
  }

  @func()
  debugEvents(source: Directory): File {
    return runEvents(source);
  }

  @func()
  async configureAxiom(token: Secret): Promise<string> {
    const result = await shipAxiom([], token);
    return result.status === "sent" ? "Axiom secret accepted." : result.message;
  }
}
