# Reading source into repository connections

Grit extracts three observations: files define symbols, files import files, and
symbols call symbols. Flix checks those observations before adding them to the
repository graph. The reverse questions—`defined_in`, `imported_by`, and
`callers`—come from reversing accepted edges, not separate extractors.

## Choose the reader by file type

Each language has an explicit entry point for each relation. All produce the
same `Attune.Repository.Grit.Fact` shape.

| Extensions | Entry point | Grit declaration |
|---|---|---|
| `.js`, `.mjs`, `.cjs` | `javascript.grit` | `language js(jsx)` |
| `.jsx` | `jsx.grit` | `language js(jsx)` |
| `.ts`, `.mts`, `.cts` | `typescript.grit` | `language js(typescript)` |
| `.tsx` | `tsx.grit` | `language js(jsx)` |
| `.java` | `java.grit` | `language java` |
| `.flix` | `flix.grit` | `language flix` |
| `.bzl`, `.bazel`, `.star` | `starlark.grit` | `language starlark` |
| `BUILD`, `BUILD.bazel`, `WORKSPACE`, `WORKSPACE.bazel` | `starlark.grit` | `language starlark` |
| `.rb` | `ruby.grit` | `language ruby` |

Unknown extensions are rejected before extraction. Each `.grit` file documents
what it recognizes and what it excludes. JavaScript uses the JSX-capable reader;
TSX's parser choice is also explicit. Changing a parser changes the observation
recipe and must get a new identity. Grammar pins live in the Grit build closure.

## Resolve a reference only when it has one answer

- JS/TS relative imports are resolved beside the importing file, including
  candidate extensions and index files.
- Java type names resolve to their source file; Flix uses the longest accepted
  module prefix.
- Starlark labels name repository-relative files. Ruby literal
  `require_relative` resolves beside the requiring file.

Zero matches and multiple matches stay unresolved. Dynamic imports and calls are
not turned into guessed edges.

A call belongs to the narrowest enclosing declaration in its file. Its target
must have one matching name in that file, or otherwise one in the repository.
Ruby constant-qualified calls inside methods have an additional bounded rule:
the constant path must name one singleton declaration. Ambiguous, ownerless, and
dynamic calls retain named refusal reasons.

Starlark dependency references go into `Imports`, not `Calls`; they remain
unresolved unless they name an accepted source file.

## Reuse unchanged file extraction

The native host reuses serialized output only when the language, extractor
program, path, and source bytes all match. It keeps at most one source/result
per program and path. Later name resolution still has to consider the changed
repository; reusing file extraction does not cache the whole graph.
