# Attune Grit frontends

This tree is the repository-visible semantic boundary for the three extracted
primitive relations: `defines`, `imports`, and `calls`. Each relation has an
explicit entry point per admitted source language. Attune derives `defined_in`,
`imported_by`, and `callers` by inversion; there are no independent inverse
extractors.

Every language emits the same `Attune.Grit.Fact` shape and flows through
ordinary `Attune.Repository` admission. There are no per-language fact types, and
the native host never normalizes syntax differently for Atlas: language-specific
syntax is parsed by Grit (inside the frozen closure), and `Attune.Grit` turns the
one wire envelope into one canonical typed fact stream.

File routing is explicit:

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

`Attune.Grit.language(path)` is the one detection table; unknown extensions are
rejected by name before Grit runs. Every entry point documents positive examples,
exclusions, normalization, parser selection, returned values, and the later
resolver/admission responsibilities.

The extractor behavior for plain JavaScript is preserved from the reference: it
is parsed by the JSX-capable frontend. The important change here is that this
choice and the TSX grammar are declared in the `.grit` entry point rather than
produced by a native runtime rewrite. A future switch to a different parser is a
semantic extractor change and must receive a new observation identity and a
separate experimental condition.

The four non-JavaScript languages use the pinned grammars inside the frozen
Grit closure: Java and Ruby via the upstream parsers already inside the pin
(`tree-sitter-java`, `tree-sitter-ruby`, the latter at ABI 14), Flix via the
repository's one pinned `omarjatoi/tree-sitter-flix` grammar (shared with Zed),
and Starlark/Bazel via a maintained Tree-sitter Starlark grammar. Tree-sitter is
an implementation detail inside Grit; it is never exposed as a second frontend
to Repository or Atlas.

Resolution in `Attune.Repository` is per language, because each frontend writes
its references differently. Imports keep the reference dispatch: a
JavaScript/JSX/TypeScript/TSX quoted relative specifier resolves against the
requiring file's own directory through the candidate extensions and `index`
files, a Java dotted type reference resolves to its source file, a Flix qualified
module reference resolves to the file naming its longest admitted module prefix,
a Starlark repository-relative label resolves to the source file it names, and a
Ruby literal `require_relative` resolves beside the requiring file. Every path is
admitted only on a unique match; a match of zero or more than one candidate stays
unresolved.

Calls follow the reference law too: a call in a retained-language file is owned
by the narrowest declaration that encloses it in the same file, and it is
admitted to the uniquely named target in that file or, when the file declares no
such name, to the uniquely named target in the repository. Ruby keeps its own
bounded rule as an additional branch beside that law: a constant-qualified call
inside a `module`/`class` method resolves to the unique singleton declaration of
its constant path.

Nothing is guessed: every other reference is an explicit typed refusal with its
own name — a computed require, a target no admitted file names, a receiver that
is not a constant path, a constant path reachable from more than one scope, an
ambiguous or ownerless call, a dynamic callee, or a symbol the world declares
more than once — rather than dropped or resolved to a plausible edge.

Starlark adds exactly one narrow relation-word extension: a log with kind
`dependency` for a label/dependency reference that is a real repository
dependency but not a function call, so it never enters `calls`. It is reused
consistently and carried through the ordinary `Imports` relation like every other
reference, where it stays explicitly unresolved unless it names an admitted file.

The native host memoizes serialized evaluator output only when language,
program bytes, path, and source bytes are all exact matches. It retains at most
one source/result per program and path, so unchanged files are reused across
repository revisions without changing extraction semantics or allowing old
revisions to grow memory without bound.
