## Overview

Nx is the stable public workflow API for Attune agents. Nix provides the shell
and pinned tooling that make those Nx targets reproducible. Documentation should
name the Nx target or generator that owns a workflow; any package-manager command
used to reach Nx is an internal detail of the dev shell.

## Policy suites

The policy surface is split into four Nx targets so agents can run the smallest
appropriate gate while humans can compose broader validation:

- `workspace:policy-fast`
- `workspace:policy-architecture`
- `workspace:policy-proof-pressure`
- `workspace:source-bom-check`

## Source BOM

Source BOM shards record ownership for repeated and generated shapes. Agents
must query shard ownership before editing those shapes and prefer `@attune/nx`
generators or sync generators when a generator owns the shape.
