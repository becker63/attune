import { Effect, Schema as S } from "effect";
import { Command } from "foldkit";

import { advanceFixtureStep, startFixtureRoute } from "./fixture-route.js";
import {
  FixtureStepApplied,
  FixtureStepFailed,
  type Message,
} from "./message.js";
import { FixtureStep } from "./fixture-route.js";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const StartFixtureRun = Command.define(
  "StartFixtureRun",
  FixtureStepApplied,
  FixtureStepFailed,
)(
  Effect.promise(() => startFixtureRoute()).pipe(
    Effect.map((result) => FixtureStepApplied({ result })),
    Effect.catch((error: unknown) =>
      Effect.succeed(
        FixtureStepFailed({ step: "start", reason: errorMessage(error) }),
      ),
    ),
  ),
);

export const AdvanceFixtureStep = Command.define(
  "AdvanceFixtureStep",
  { step: FixtureStep, selectedAnchorId: S.optional(S.String) },
  FixtureStepApplied,
  FixtureStepFailed,
)(({ step, selectedAnchorId }) =>
  Effect.promise(() =>
    step === "start"
      ? startFixtureRoute()
      : advanceFixtureStep(
          step,
          selectedAnchorId === undefined ? {} : { selectedAnchorId },
        ),
  ).pipe(
    Effect.map((result) => FixtureStepApplied({ result })),
    Effect.catch((error: unknown) =>
      Effect.succeed(FixtureStepFailed({ step, reason: errorMessage(error) })),
    ),
  ),
);

export type FixtureCommand = Command.Command<Message>;
