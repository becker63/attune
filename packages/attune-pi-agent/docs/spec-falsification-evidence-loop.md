# Attune Pi Agent Loop

`@attune/pi-agent` is the private local package for turning an implementation spec into reviewable evidence.

The v0 loop is:

```text
spec -> plan -> execute -> falsify -> repair -> collect evidence -> review -> handoff
```

This first slice implements the typed spec, evidence, and project-guardrail parts of the loop:

- `/attune-spec` is the Attune orientation guardrail command. It asks the agent to read the Attune project contract and source docs before implementation work.
- `ImplementationSpec` describes the bounded subsystem run, forbidden actions, obligations, validation commands, review gates, permission profile, and local artifact policy.
- Test, property, mutation, and snapshot obligations make falsification duties explicit before work starts.
- Permission profiles are deny-first code, not prompt-only safety guidance.
- `.attune-runs/<run-id>/` is the local execution-memory layout for spec, plan, events, validation, reports, review, and summary artifacts.
- `attuneEvidence` renders a deterministic evidence matrix from decoded fixture/run data.

ATT-50 is the first fixture target:

```text
Model Pi permission policies in Regofile and generate Pi policy artifacts.
```

The package does not implement remote workers, SSH, deployment, Taskplane delegation, hybrid-harness delegation, or live Linear execution memory in v0. Those remain future adapters once the local command and evidence surface is stable.

The package still exposes a model-agnostic spec-interview core:

```ts
const turn = attuneSpec({
  rawPrompt: "Model Pi permission policies in Regofile...",
  answers: [],
})

// Render turn.questions to the user, collect answers, then call attuneSpec again.
```

For a live Pi-style chat surface, use the conversation adapter:

```ts
let turn = startAttuneSpecConversation({
  rawPrompt: "Model Pi permission policies in Regofile...",
})

render(turn.messagesToRender)

turn = answerAttuneSpecConversation({
  state: turn.state,
  answer: "attune-pi-agent",
})

render(turn.messagesToRender)
```

The adapter stores accumulated answers in `turn.state`, renders assistant messages for the next question, parses list/package/command answers, and returns a draft when all required slots are complete. The live Pi command does not render this as input boxes. Use `pi-task` as its own package when you want the full conversational grill/spec flow.

## Pi Extension

The package also exposes an actual Pi extension:

```json
{
  "pi": {
    "extensions": ["dist/pi-extension.js"]
  }
}
```

The Attune flake builds this package into the overlaid `pi` derivation and loads it with a baked `--extension` flag for normal Pi sessions. From the repo root:

```bash
nix develop
pi --version
```

The wrapper preserves normal Pi package commands, so `pi install npm:<package> --local --approve` still works. No project-local `pi install ./packages/attune-pi-agent` step is required for the Attune extension in the dev shell.

When Pi starts from the dev shell in the Attune repo, the extension automatically sends a one-time orientation message for a new empty session. That message requires the agent to read:

```text
AGENTS.md
docs/platform/codex-cloud-environment.md
docs/platform/autonomous-codex-workstation.md
docs/attuned/Attune Discovery v0 Technical spec.md
docs/attuned/Attune Atom, Reactivity, and State Philosophy.md
docs/attuned/Attune Discovery v0 Architecture Model.md
docs/attuned/Attune Discovery v0 Joern and Cocoindex.md
docs/attuned/Attune Discovery v0 Performance Model.md
```

It also appends Attune guardrails to the system prompt for every agent turn inside the repo. To rerun the orientation manually:

```text
/attune-spec
```

To connect a ChatGPT/Codex subscription, use Pi's native login flow:

```text
/login
```

Choose `Use a subscription`, then `ChatGPT Plus/Pro (Codex Subscription)`. If browser login fails, choose Pi's device-code login option. After login, select an `openai-codex` model with Pi's normal `/model` command or Ctrl+L model picker.

You can also start directly with a Codex subscription model after login:

```bash
pi --provider openai-codex --model gpt-5.5 --approve
```

Attune does not wrap Codex authentication and does not wrap `pi-task`. Codex login and model selection belong to Pi; conversational task interrogation belongs to `pi-task`; Attune supplies the repo-specific guardrails, schemas, evidence model, and Nx artifacts.
