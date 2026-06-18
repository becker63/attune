# joern-effect

Generated TypeScript and Effect bindings for Joern CPGQL, organized around Attune phases.

```txt
pure    says what things mean
bridge  says what crosses boundaries
harness says how to generate evidence
edge    makes contact with reality
```

Nix supplies reproducible toolchains and Joern runtime inputs. Buck2 declares the graph. Fork checks phase semantics. FastCheck applies property pressure through harnesses.

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check
pnpm property
pnpm lab
pnpm generate
pnpm check-generated
```

Use `nix develop` for the full toolchain shell.

This repo does not commit loop reports, traces, event batches, or counterexample run output. Buck/Nix actions own generated artifacts.
