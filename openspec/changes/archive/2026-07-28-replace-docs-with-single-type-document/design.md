## Context

The current documentation stack projects one small API into many API HTML
files, a manifest and schema, search records, page-local examples, generated
input and output lenses, hover payloads, client JavaScript, and a separate
Twoslash package. Its production implementation is approximately:

| Current surface               | Physical lines |
| ----------------------------- | -------------: |
| `packages/attune-docs/src`    |          3,673 |
| `packages/attune-docs/static` |          1,298 |
| `packages/twoslash/src`       |            526 |
| **Production total**          |      **5,497** |

The repository does not yet have a custom Oxlint plugin. It has
`.oxlintrc.json`, native JSDoc rules, `options.typeAware: true`, and a root
command that repeats `--type-aware`. It also has no direct dependencies on
`effect-oxlint`, `@effect/tsgo`, `@microsoft/tsdoc`, unified, remark-rehype,
unified-lint-rule, or VFile. Those are new integration seams, not existing
abstractions to rename.

There are currently two production build configs:

```text
packages/attune-mcp/tsconfig.build.json     29 TypeScript roots
packages/effect-joern/tsconfig.build.json  20 TypeScript roots
```

Four `effect-joern` roots are generated. Its generator scripts and the
documentation compiler itself do not have production build configs and
therefore are not part of the published type universe. The generators remain
authorities that must emit documented source and pass their existing drift
check.

`pnpm --filter attune-mcp loc:check` currently reports 7,976 handwritten
physical TypeScript lines across `src` and `test`, against the existing
8,000-line gate. Comments count. Replacing the 34 duplicated public examples
across the six public source owners with one running program and only useful
boundary variations is therefore a required source cut, not merely an
editorial preference.

The replacement architecture is:

```text
                         authoring loop
                              │
                              ▼
                    Oxlint + effect-oxlint
                       one attune/tsdoc rule
                              │
                              ▼
TypeScript + TSDoc ── read ──▶ ordinary MDAST
                              │
                         resolve + check
                     @effect/tsgo LSP + VFile
                              │
                        remark-rehype
                     Shiki code HAST handler
                              │
                              ▼
                             HAST
                              │
                              ▼
                         one index.html
             no JavaScript · no router · no search index
```

The primary information-architecture reference is the Elm Guide, not a
package-reference theme. Its
[architecture chapter](https://guide.elm-lang.org/architecture/) establishes
one small recurring model, and its
[structure guidance](https://guide.elm-lang.org/webapps/structure) grows
around a central type until another concept is genuinely independent. Attune
applies that pattern to authority, action, and evidence. The compiler
machinery exists to verify the chapter and stays out of the reader-facing
ontology.

## Goals / Non-Goals

### Goals

- Give authors one immediate documentation rule and one authoritative
  repository compilation.
- Make TypeScript annotations own facts and TSDoc own caller meaning.
- Include every eligible declaration from production build roots without a
  manually maintained policy or export-entry blind spot.
- Check example diagnostics and resolve definition links through one pinned
  TypeScript-Go language-server process supplied by `@effect/tsgo`.
- Compile directly through ordinary MDAST and HAST rather than creating a
  documentation-domain model.
- Teach one stable public model—authority, action, and evidence—through one
  running investigation before introducing failure and installation
  boundaries.
- Publish one readable, source-authored, zero-JavaScript technical chapter
  whose exhaustive reference remains reachable through compiler links.
- Preserve exact immutable source provenance and native browser
  click-to-definition behavior.
- Cut production documentation TypeScript to 2,200–2,500 lines and CSS to at
  most 350 lines, including the root lint plugin and `oxlint.config.ts` in the
  TypeScript count. Require architecture review above 1,500 TypeScript lines
  and fail above 2,500.
- Keep `attune-mcp` handwritten `src`+`test` at or below its existing
  8,000-line gate without changing its baseline, limit, or counted files.
- Replace the current implementation cleanly, without compatibility or
  migration machinery.

### Non-Goals

- Recreate an IDE, hover card, inspector, search application, router, MDX
  runtime, or browser TypeScript compiler.
- Create separate learn, guide, reference, or onboarding information
  architectures; a card grid; a marketing landing page; or six peer product
  concepts at the opening.
- Preserve routes, page identities, manifest versions, snapshots, search
  records, Twoslash scenes, generated lenses, or UI state.
- Invent a `DocGraph`, `DocumentationSnapshot`, inventory schema,
  disposition hierarchy, audience tier, or documentation policy.
- Add build configs merely to expand the documentation universe.
- Duplicate TypeScript types in JSDoc type expressions.
- Have the custom Oxlint rule perform cross-file or type-aware analysis that
  Oxlint's JavaScript plugin API does not expose.
- Treat a comment percentage, example quota, word count, or cached debt
  baseline as a quality authority.
- Change runtime APIs, protocols, generated schemas, or Python-owned
  experiment facts.

## Decisions

### 1. This is an in-place clean fork

`packages/attune-docs` keeps its package identity and output location, but its
implementation is replaced rather than evolved.

The implementation branch may perform two disposable pre-cut activities:

1. record physical LOC, source owners, and deletion targets by reading the
   base revision; and
2. run a blocking tool-seam probe for `effect-oxlint`, `@effect/tsgo`, unified,
   Shiki range linking, and UTF-16 positions.

Those activities do not create committed migration artifacts. After the probe
passes, the change deletes the old implementation and introduces the new
files in place:

```text
packages/attune-docs/
  src/
    read.ts
    docs.ts
    main.ts
  static/
    styles.css
  test/
    docs.test.ts
    e2e.spec.ts

tooling/oxlint/
  attune.ts
  attune.test.ts

oxlint.config.ts
tsdoc.json
```

The exact test split may stay smaller, but production code does not grow more
layers. In particular, the branch must not add:

```text
attune-docs-next
compatibility adapter
v2 manifest
old-to-new converter
dual renderer
dual build
route redirect table
migration baseline
debt ledger
temporary policy
checked-in MDAST JSON
```

The old tree remains available in Git history and the base revision. It is not
kept in the working tree “until later.” A replacement commit that contains a
parallel old and new architecture is invalid. There is no package-by-package
rollout state: merge requires the source rule for every handwritten
production root and the repository compiler for every production root,
including generated source.

### 2. The authority map has no documentation-domain model

| Concern                                                  | Authority                               |
| -------------------------------------------------------- | --------------------------------------- |
| Signatures, generics, state indices, parameters, returns | TypeScript source                       |
| Effect success, failure, and requirement channels        | Resolved TypeScript annotations         |
| Meaning, lifecycle guarantees, evidence, recovery        | TSDoc                                   |
| Syntax-local handwritten TSDoc authoring contract        | `attune/tsdoc`                          |
| Definitions and example diagnostics                      | Pinned `@effect/tsgo` TypeScript-Go LSP |
| Compiled document structure                              | Transient ordinary MDAST                |
| HTML structure                                           | Transient HAST                          |
| Published API                                            | `dist/index.html`                       |
| Experiment facts                                         | Existing Python publication bundles     |

MDAST is an intermediate compiler tree, not a second source of truth. HAST is a
disposable lowering. Neither is checked in, independently versioned, or
consumed as an API. The build emits no manifest, snapshot, search index, or
debug JSON that another target may depend on.

The documentation universe is discovered, not configured:

1. find every workspace package `tsconfig.build.json`;
2. parse each config;
3. take only its exact root file names, not its transitive program source set;
4. sort projects by package name and roots by normalized repository path; and
5. discover eligible declaration shapes within each root.

Tests, examples, distribution output, dependencies, and scripts outside those
root sets are out of universe by construction. A newly added production build
config is discovered automatically. No `docs-policy.json`, exclusion record,
audience override, or separate registry is allowed.

The eligible shapes are fixed:

- named top-level functions and constants;
- classes, interfaces, type aliases, enums, and namespaces;
- constructors, methods, accessors, properties, and interface/type members;
- call, construct, and index signatures; and
- direct authored properties of an exported named constant's object-literal
  initializer, including an object literal passed directly to
  `Object.assign`.

Local variables, anonymous callbacks, implementation expressions, imports,
bindings, reexport sites, overload implementations, and individual accessor
halves are not independent documentation entries.

Six syntax normalization rules are sufficient:

| Source shape                              | Canonical presentation                      |
| ----------------------------------------- | ------------------------------------------- |
| overload declarations plus implementation | one overload family                         |
| getter plus setter                        | one property                                |
| constructor parameter property            | constructor parameter/heading               |
| same-scope type/value declarations        | one concept with all definition facets      |
| reexport                                  | link to the declaration owning source TSDoc |
| generated source                          | declaration documented from generator input |

An overload family is eligible for one narrative only when every contract
overload uses compatible ordered parameter and type-parameter names; divergent
names fail until the source exposes one documentable vocabulary. Its semantic
failure obligation is the distinct set of supported error atoms across all
contract overloads.

For a legal same-name type/value pair, a unique facet with substantive
`@remarks` is the deterministic narrative owner. If no facet has remarks, the
first source declaration owns and must be documented; multiple competing
remarks fail as ambiguous until one narrative is selected. All facet
signatures and definition spans still map to the one heading. This fits both
schema-value-owned concepts such as `AttuneReceipt` and interface-owned
concepts such as `Attune` without creating separate type/value pages.

The current generated convention is concrete rather than policy-driven:
`packages/effect-joern/src/pure/generated/**` is produced by
`packages/effect-joern/scripts/codegen/**` from
`packages/effect-joern/schema/joern-cpg-schema.1.7.70.json`. A
`joern-effect:generated-check` target generates into a temporary directory and
compares the exact relative file set and bytes—currently four files—with the
tracked working generated files. It never mutates those files. Automatic
build, typecheck, test, root-check, and documentation paths remove their
`generate` dependencies and invoke this nonmutating check where drift
authority is required; only the intentional manual regeneration command writes
generated source. Therefore no sibling task can regenerate first and make the
comparison tautological. During the clean-worktree publication build, the
tracked working files are necessarily the immutable `HEAD` blobs. That
upstream gate proves generator provenance.
Generated files are nevertheless exact production roots. They are excluded
from the human-authoring `attune/tsdoc` override because fixes belong in the
schema/generator, not the emitted file. After the byte-drift gate, unified
applies the same parsed TSDoc structure plus semantic link/compiler
obligations to generated declarations. Generator ownership changes where the
check and fix live, not whether generated declarations enter the document.

Temporary maps and arrays inside `read` and `resolve` are ordinary
implementation details. They do not become exported inventories or models.

### 3. `attune/tsdoc` is the one source authoring rule

The root adds one source-loaded custom plugin built with
[`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint). It is not a new
workspace package and does not require a generated plugin artifact on a clean
checkout. The plugin exposes exactly one repository rule:

```text
attune/tsdoc
```

All documentation-authoring facets belong to that rule. The repository does
not split them into `require-summary`, `require-param`, `check-example`, or
similar rule nouns. Existing non-documentation Oxlint rules remain unchanged.
Native JSDoc `require-*` rules are removed where they would duplicate
`attune/tsdoc`; the TSDoc parser and this rule own the documentation grammar.

The rule uses `effect-oxlint` primitives directly:

```text
Visitor.accumulate  collect canonical declarations
Visitor.merge       combine declaration/member visitors
Visitor.filter      omit tests, non-production input, and generated output
SourceCode          read comments, tokens, and exact source
Diagnostic          report on the owning source span
Testing             exercise rule helper/event behavior
```

At `Program:exit`, it associates leading comments, normalizes local overload,
accessor, and same-name type/value ownership, parses TSDoc with
`@microsoft/tsdoc`, and checks only facts available from syntax and comments.

For every canonical eligible handwritten production declaration or member, it
checks:

- exactly one attached direct TSDoc owner after normalization, or one
  structurally valid standalone `{@inheritDoc}` accepted provisionally;
- a concise non-placeholder summary;
- no `TODO`, `TBD`, template filler, name-only summary, or type-only
  restatement;
- no JSDoc type expression that duplicates TypeScript;
- no local `@docsIgnore` or equivalent suppression; and
- no stale or unsupported TSDoc tag.

A standalone `{@inheritDoc}` provisionally satisfies local summary, remarks,
parameter/type-parameter, and return ownership because their content is
semantic. It may not mix copied prose with a second local narrative. Unified
must resolve and validate it; any non-inherited local example or other
applicable tag remains local. A non-owning type/value or overload facet does
not carry a duplicate narrative; any unique fact is folded into the canonical
owner while every facet signature/source span still renders.

For every directly documented callable, it checks:

- exactly one ordered `@param` for each syntactic parameter;
- exactly one ordered `@typeParam` for each syntactic type parameter;
- no stale, duplicated, or renamed tags;
- exactly one `@returns` for an explicitly non-void return;
- no `@returns` on a constructor or setter; and
- explicit parameter and return annotations for module-level/exported
  callables.

Standalone `{@inheritDoc}` provisionally owns the callable tags instead of
duplicating them locally; explicit source annotations remain required. For
every canonical owner representing an exported top-level concept, the rule
checks substantive `@remarks` unless standalone inheritance provisionally owns
them. It applies the same remarks obligation to public callable members of an
exported named declaration, including every `Attune` lifecycle member.
Properties and other semantic leaves need only a precise summary. The
syntax-only rule does not try to infer that a declaration is an error or
state-indexed capability and does not grade free prose for semantic agreement.
It rejects deterministic filler and missing structure without a word-count
score; resolved facts and public editorial review supply the deeper contract.

The accepted TSDoc vocabulary centers on:

```text
@packageDocumentation
@remarks
@typeParam
@param
@returns
@throws
@example
@see
{@link}
{@inheritDoc}
@failure
```

`@failure` is the only Attune-specific tag. The syntax-only rule rejects
`@throws` on a callable whose explicit return syntax is `Effect.Effect`; its
error channel must use `@failure`. Non-Effect callables may use `@throws` for
authored synchronous-throw behavior, whose runtime truth remains an editorial
and test concern. `@requires`, `@produces`, and
`@transitionsTo` are removed because state indices and Effect requirements
already own those facts. Other source files may use a leading narrative
comment, but there is no custom `@moduleDocumentation` tag or mandatory
file-disposition model.

The custom block has one canonical syntax:

```text
@failure {@link FailureType} - Nonempty explanation.
```

The link has no custom label. Its destination is either one TSDoc declaration
reference or one exact in-scope type-parameter name; semantic matching remains
the unified pass's responsibility.

For every locally authored `@example`, the rule checks a nonempty TypeScript
or JavaScript fenced program and structural validity of the small retained
example directives:

```text
// @filename: relative/path.ts
// @errors: 1234 5678
// ---cut---
// ---cut-before---
// ---cut-after---
// ---cut-start---
// ---cut-end---
```

Virtual filenames cannot escape the example project. Cut pairs must balance.
`@errors` is the sole expected-diagnostic authority. The rule rejects
`@ts-nocheck`, `@ts-ignore`, `@ts-expect-error`, `@effect-diagnostics`,
`@effect-diagnostics-next-line`, and any equivalent diagnostic-suppression
directive recognized by the pinned toolchain. The local rule does not claim
that the example type-checks. After semantic checking, lowering removes
`@errors` and every cut-control line. It retains a visible `@filename` marker
only when needed to label a displayed virtual-file boundary; ordinary cuts may
hide that marker with its file.

The boundary is intentional. Oxlint custom JavaScript plugins do not expose
TypeScript parser services; the relevant Oxc issue reports an empty
`parserServices` object
([oxc-project/oxc#19962](https://github.com/oxc-project/oxc/issues/19962)).
Therefore `attune/tsdoc` does not decide:

- the resolved `Effect` error channel;
- whether a link or `{@inheritDoc}` target resolves;
- whether an implementation is type-compatible with inherited documentation;
- whether lifecycle prose agrees with a resolved state index; or
- whether an example compiles.

Those checks belong to unified plus the language server. Oxlint's plugin
handlers are synchronous and `effect-oxlint` runs them with `Effect.runSync`;
the rule must therefore wrap every TSDoc/parser/analysis call, catch defects,
and explicitly report them as source diagnostics rather than letting them
escape or silently pass.

The root configuration moves from `.oxlintrc.json` to `oxlint.config.ts`,
loads the root-local plugin directly, enables `options.typeAware: true`, leaves
`options.typeCheck: false`, and enables `attune/tsdoc` as an error. The root
command becomes:

```text
oxlint --disable-nested-config --deny-warnings .
```

The fix command uses the same `--disable-nested-config` boundary. The
redundant CLI `--type-aware` disappears. At config evaluation,
`oxlint.config.ts` discovers every production `tsconfig.build.json`, parses
its exact roots, removes the fixed generated-source convention, and supplies
precisely the remaining handwritten repository-relative files to the
`attune/tsdoc` override. Therefore:

```text
reader roots = handwritten production roots ∪ generated production roots
attune/tsdoc roots = handwritten production roots
```

Generated roots receive ordinary repository lint and the generator/unified
documentation checks, but not `attune/tsdoc`; tests and other non-production
inputs are also outside this documentation rule. A fixture proves both set
equations and that only the known generated convention is subtracted, so a new
production config cannot silently widen only one side. Config evaluation also
fails if a repository ignore pattern would omit a handwritten rule root.

A source-text configuration-integrity scan over those exact handwritten roots
rejects any `oxlint-disable` or `eslint-disable` directive that would suppress
`attune/tsdoc`, either by naming it or by omitting the rule list and disabling
all rules. It covers file, line, and next-line forms before the config is
returned. This guard is not another lint rule and cannot be disabled by the
source it protects. Disabling nested configs prevents a package-local
configuration from replacing the root contract.

The format migration preserves every unrelated root lint invariant:
correctness-category settings, ignore patterns, native plugin configuration,
and the `effect-joern/src` platform-neutral globals/import restrictions.
Changing config syntax does not reset repository lint policy.

Oxfmt enables its JSDoc formatter for deterministic comment layout, wrapping,
tag ordering, and capitalization. Oxfmt 0.60 indents fenced comment bodies in
a form rejected by `@microsoft/tsdoc`, so the JSDoc pass is disabled only for
the exact TypeScript files containing TSDoc fences; normal TypeScript
formatting still applies, and a config-integrity test closes that derived
allowlist. A formatter fixture proves fenced example payloads plus
`@filename`, `@errors`, and cut directives are byte-stable. The exception is
not a documentation-ignore mechanism and the formatter does not become
another documentation validator.

`effect-oxlint/testing` is a low-level mock/event harness, not a real parser
integration. Tests therefore include both its focused valid/invalid cases and
at least one real `oxlint` CLI fixture proving that the source-loaded plugin
parses a handwritten TypeScript file, reports at the expected location, and
does not claim the generated-source override.

### 4. `read` creates ordinary MDAST directly

`read.ts` is the only source-specific frontend. It receives the repository
root and current clean immutable revision and returns one standard MDAST
`root`. The supported full site build rejects a dirty worktree because
uncommitted bytes cannot have truthful immutable GitHub provenance; root lint
and focused fixtures remain the pre-commit authoring loop, not a second site
build.

It:

1. discovers production build configs and exact roots;
2. reads declarations in deterministic project/file/source order;
3. applies the six fixed normalization rules;
4. parses TSDoc tag boundaries, declaration references, and examples through
   `@microsoft/tsdoc`;
5. parses the exact CommonMark bodies of TSDoc sections through the always-on
   `remark-parse` bridge and lowers TSDoc links/tags into the resulting
   standard MDAST;
6. emits exact declaration signatures as `code` nodes;
7. emits each example once as one complete-source `code` node;
8. attaches source paths, source ranges, roles, digests, and immutable links;
   and
9. projects the source-authored public curriculum before the exhaustive
   source-ordered repository body.

The public symbol sequence is owned by
`packages/attune-mcp/src/index.ts`, not by a renderer manifest. Its package
TSDoc owns the opening sentence, the three-part model, the one text
lifecycle/evidence diagram, and the canonical
`@example` whose first body line is `A complete investigation`. Its public
reexports are authored in this order:

```text
Investigation
Attune
AttuneReceipt
InvestigationLifecycleError
AttuneToolFailure
AttuneToolkit
```

The `Attune` interface's existing member order owns its lifecycle subsequence.
`read` follows those source positions, then emits every not-yet-rendered
production declaration in deterministic project/file/source order. The
compiler owns only the fixed `Failures` grouping before the two adjacent error
reexports and the `Repository` boundary before that exhaustive tail. This is a
small projection over ordinary headings, not an API manifest or a second
documentation tree.

| Rendered structure          | Owner                                                   |
| --------------------------- | ------------------------------------------------------- |
| `Attune` title/opening      | package identity plus package TSDoc                     |
| `The model`                 | package TSDoc CommonMark heading/body                   |
| `A complete investigation`  | package `@example` title/body                           |
| public declaration sequence | direct package reexport source order                    |
| `Attune` member sequence    | interface member source order                           |
| `Failures`                  | fixed compiler grouping of the two adjacent error roots |
| `Repository`                | fixed compiler boundary before unconsumed declarations  |
| repository path labels      | source provenance, rendered as non-heading separators   |

The canonical example is one complete virtual TypeScript project. Its visible
program carries the same bindings through the whole chapter:

```text
materialized → active → execution
                           ├── receipt
                           └── replacement active → finalized
```

Setup declarations may be hidden with virtual files and cuts, but the visible
program must use the actual signatures: it narrows rejected materialization
before activation, supplies the real finalization input, and carries
`execution.investigation` after execution. It must not treat a rejected
materialization as authority or demonstrate a stale pre-execution capability
as if it remained current. Visible syntax annotates the activated value as
`Investigation<"active">`, assigns `execution.receipt` to
`AttuneReceipt`, reads or branches on `execution.receipt.status`, and calls
finalization directly with `execution.investigation`. These exact syntax
shapes plus resolved offsets keep the checker out of general dataflow
analysis. Later public sections refer to this one `#complete-investigation`
code node. A focused additional `@example` is authored only when it explains a
distinct caller decision—such as invalid authority or interrupted terminal
recovery—that the signature, prose, and running program do not already
explain. It reuses the same investigation vocabulary instead of constructing
an unrelated tutorial.

A signature code node is an exact source excerpt, not a synthesized type
program. The language server sees the complete original declaration first;
the visible interval map may then cut implementation bodies, overload
implementation signatures that are not callable contracts, aggregate
initializer interiors, and duplicate narrative comments. Contract-bearing
overload, accessor, and type/value facets remain as exact excerpts under their
one canonical heading. Direct exported object members receive their own exact
source excerpts. This keeps generated catalog constants readable without
inventing `Parameters<T>`, `ReturnType<T>`, hover text, or a
documentation-only alias.

An example follows the same single-node discipline. `read` puts its complete
program in one `code.value`; `resolve` partitions virtual files, checks and
links that complete value, then replaces the same node value with the visible
cut result and attaches only remapped ranges. The complete source and interval
map remain transient transform state, so no second renderable example node or
hidden example model exists.

The tree uses only standard nodes:

```text
root
heading
paragraph
text
emphasis
strong
inlineCode
code
link
list
listItem
blockquote
table
tableRow
tableCell
```

Tables, when authored, use the standard GFM MDAST table nodes. No raw HTML node
or custom MDAST node is required. A narrow module augmentation permits
`data.attune` on headings and code:

```ts
interface AttuneData {
  readonly role?: "declaration" | "member" | "signature" | "example";
  readonly id?: string;
  readonly sourcePath?: string;
  readonly sourceRange?: SourceRange;
  readonly sourceHref?: string;
  readonly signatureDigest?: string;
  readonly documentationDigest?: string;
  readonly links?: readonly ResolvedRange[];
  readonly checked?: true;
}
```

This is metadata on ordinary syntax nodes, not an exported documentation
schema. Stable IDs derive from package name, repository-relative path, and
canonical symbol/member name. Friendly public fragments remain:

```text
#Attune
#Attune.execute
#Investigation
#AttuneReceipt
#AttuneToolkit
#InvestigationLifecycleError
#AttuneToolFailure
```

Other declarations use deterministic package/path/symbol fragments. IDs never
use compiler-internal symbol numbers.

A unified `VFile` has one canonical output path, but the tree represents many
TypeScript sources. MDAST `position` therefore cannot be treated as
multi-file provenance. Every source-backed node carries its explicit
repository-relative `sourcePath` and source range in `data.attune`; semantic
diagnostics reconstruct the correct source file and range instead of
misattributing them to `index.html`.

`@microsoft/tsdoc` remains the authority for comment grammar, block tags, and
declaration references, but it is not used as an improvised CommonMark AST.
`remark-parse` is a normal docs dependency and parses the exact source slices
owned by each TSDoc section. The bridge preserves TSDoc node/source ranges so
`{@link}` and tag ownership can be reattached without treating them as
ordinary prose. `remark-gfm` remains optional and is installed only if API
TSDoc or approved experiment Markdown actually uses GFM tables. No custom
Markdown parser is written in `read.ts`.

### 5. One pinned `@effect/tsgo` process owns semantic resolution

`@effect/tsgo` is a CLI/binary distribution, not an importable JavaScript
language-service SDK. The build:

1. runs the pinned package's `get-exe-path` command;
2. starts the returned patched TypeScript-Go executable with `--lsp --stdio`;
3. initializes one JSON-RPC/LSP session for the build;
4. opens source and example projects;
5. handles the bounded server-initiated configuration, capability, progress,
   and cancellation messages exercised by the probe;
6. requests diagnostics and standard definitions;
7. closes every virtual document/project; and
8. performs `shutdown` and `exit` inside the Effect scope.

The `@effect/tsgo`, `@effect/language-service`, and native TypeScript 7
versions are exact lockfile inputs and appear in the document footer. The
build fails clearly when the platform binary or compatible native TypeScript
package is unavailable.

The workspace pins `@effect/language-service` and its real plugin options in
the applicable shared/production tsconfig. Virtual example projects inherit
the same plugin entry. The blocking probe opens the actual project configs and
an example config derived from them; it may not enable Effect diagnostics only
in a private probe configuration.

The first implementation task is a blocking capability probe against the
exact installed versions. Before any semantic design depends on the server, it
must prove:

- initialize and clean shutdown;
- real CLI loading of the source `effect-oxlint` plugin on TypeScript;
- diagnostics for a real project and virtual multi-file example, including the
  exact accepted diagnostic sources, severities, and code representation;
- definitions for a public declaration, member, reexport, internal helper,
  and generated Joern declaration;
- package-import definitions that traverse built declarations/source maps back
  to the production-source ranges owning canonical headings;
- synthetic resolution of declaration references parsed from `{@link}`,
  `{@inheritDoc}`, and named-type `@failure` targets, plus contextual binding
  of a generic `@failure` target to its owning type-parameter slot;
- TSDoc plus `remark-parse` lowering of the package CommonMark chapter heading,
  ordered model prose, the plain-text fenced diagram, declaration references,
  and canonical first-body-line `@example` title into the expected ordinary
  MDAST nodes;
- a compiler-checked inheritance assertion plus explicit syntactic heritage;
- server-initiated requests and `didClose` cleanup;
- UTF-16 position handling after astral and combining characters;
- canonical recognition of `Effect.Effect<Success, Error, Requirements>`;
- canonical recognition of `Investigation<State>`; and
- stable source-to-signature remapping after body/initializer removal and
  overload/accessor normalization; and
- stable source-to-visible remapping after every retained cut directive.

Standard TypeScript-Go definition behavior is the contract. The design does
not claim an Effect-specific go-to-definition extension.

Effect channel extraction is intentionally narrow:

1. source syntax identifies an explicit `Effect.Effect<S, E, R>` reference;
2. definition requests prove that `Effect` resolves to the installed Effect
   declaration;
3. explicit success, error, and requirement type arguments remain the
   publishable facts; omitted trailing arguments are accepted only when the
   probed canonical declaration proves their pinned default is `never`;
4. the error grammar accepts only `never`, a named type reference, a type
   parameter, or an explicit top-level union of those atoms;
5. a meaningful named error alias remains one atom and is not recursively
   expanded; and
6. `any`, `unknown`, intersections, conditionals, indexed access, inferred
   returns, type operators, and other opaque forms fail as undocumented.

No hover or quick-information payload is required for this grammar. The
compiler authenticates names with definitions and never implements a
home-grown type evaluator. A named `@failure` target resolves through the
synthetic declaration-reference source. A type-parameter target is instead
bound by exact name to the owning callable's declared type-parameter slot,
confirmed by definitions inside the complete signature, and linked to that
callable's canonical heading. It is never resolved as a free-standing global
name.

Lifecycle extraction follows the same pattern for explicit
`Investigation<State>` annotations. If an API hides the fact behind an
unresolvable inferred type, the source must become more documentable.

The client offers only UTF-16 position encoding (or omits the optional encoding
list so the LSP default applies), asserts that initialization selects UTF-16,
and aborts on another encoding. Source offsets, extracted-signature offsets,
LSP positions, visible example offsets, and Shiki decorations use one tested
conversion path. Raw responses, request IDs, temporary URIs, hover Markdown,
completions, reference lists, inlay hints, semantic tokens, editor selection,
and cursor state never enter MDAST or the published output.

### 6. Unified has two Attune-specific semantic passes

`docs.ts` contains the one visible processor and its local `resolve`, `check`,
heading, and code-lowering functions. A pass does not gain its own module,
service, interface, or configuration object merely because unified calls it.
The file remains centered on the processor until a genuinely independent
source type with its own helpers exists; the clean-fork budget does not assume
such an extraction.

The processor reads as one sentence:

```ts
const processor = unified()
  .use(resolve, language)
  .use(check, "error")
  .use(remarkRehype, {
    handlers: {
      code: codeToHast(highlighter),
      heading: headingToHast,
    },
  })
  .use(rehypeSanitize, attuneSchema)
  .use(rehypeDocument, documentOptions)
  .use(rehypeStringify);
```

`resolve` is one asynchronous MDAST transform. It associates every source
definition with its canonical declaration heading, checks examples before
cuts, attaches definition ranges to signature/example code nodes, and appends
compiler-derived lifecycle, success, failure, and requirement facts as ordinary
paragraphs and lists. TSDoc declaration references do not rely on a definition
request at a comment position: the transform parses them with TSDoc, emits a
small virtual TypeScript resolution source, and resolves that source through
the same LSP session. The sole exception is an error-channel type parameter,
which is bound to the owning generic slot under the rule above rather than
being placed out of scope in a free-standing virtual file.

An inherited contract is accepted only when its declaration reference
resolves, its source names an explicit `implements`, `extends`, or `override`
relation, its ordered parameter/type-parameter names are compatible, and a
generated virtual program proves bidirectional assignability between the
source and target member types. If either declaration cannot be safely named
in that assertion, `{@inheritDoc}` is rejected and the source must carry direct
TSDoc. The blocking probe owns this exact technique.

Virtual-file directives partition an example before it is opened. The complete
project is then checked and resolved; only afterward are cuts applied and
definition ranges remapped to visible code. `@errors` matches exact numeric
TypeScript error codes. Every unmatched error or warning diagnostic from
TypeScript or Effect is fatal; informational diagnostics and suggestions are
not error expectations. The blocking probe freezes LSP `source`, severity,
code, and range normalization for the pinned compiler.

It may use temporary maps from source URI/range to heading and from example
URI to visible offsets. Those maps die with the transform. It does not produce
a `DefinitionLink`, `EffectChannels`, `DocumentationNode`, or other persistent
domain model.

`check` is one repository-wide semantic pass implemented with
`unified-lint-rule` at error severity. It checks only facts the source rule
cannot know:

- every eligible declaration discovered from exact production roots appears
  exactly once under a canonical heading;
- stable IDs are unique;
- every local `{@link}` and definition range targets an existing heading;
- `{@inheritDoc}` resolves without a cycle and passes the explicit
  heritage/name/bidirectional-assignability contract;
- every supported non-`never` Effect error atom has exactly one
  nonempty `@failure` explanation and every documented failure is in the
  channel;
- every authored example has exactly its expected diagnostics;
- the package has exactly one canonical complete-investigation example and
  each applicable public section refers to its one stable anchor;
- generated declarations satisfy applicable summary/callable-tag structure
  plus valid semantic links after the upstream generator drift gate has
  passed;
- every declaration heading has a valid immutable source link; and
- all source ranges, visible ranges, digests, and revision URLs match current
  bytes.

There is no deterministic example-bearing set or per-declaration example
quota. Every voluntarily authored example is checked. The one package example
is mandatory because it owns the shared lifecycle context; other examples are
optional source-authored evidence for a distinct caller decision and render
once. Human editorial review decides whether prose plus the shared program are
sufficient. Unified verifies only objective claims: compilation, resolved
occurrences, links, and expected diagnostics.

For handwritten declarations, `check` does not reimplement local summary,
`@param`, `@typeParam`, or `@returns` checks; the docs target depends on root
lint. It applies those parsed structural obligations only to generated
declarations excluded from the human-authoring rule. That narrow branch is the
generator boundary, not a second handwritten authoring ruleset.

All semantic defects are VFile messages. The processor is configured so they
are errors, and the outer build fails on `message.fatal === true`. A message
for TypeScript source explicitly carries that source path/range; output-level
defects may point to `index.html`.

`remark-rehype` performs ordinary MDAST-to-HAST lowering. Its custom `code`
handler calls one acquired Shiki highlighter, applies compiler-resolved
decorations, and constructs links around exact identifier ranges. A custom
heading handler lowers canonical IDs, immutable source links, and symbol
markers. Arbitrary `data.attune` is not assumed to copy into HAST
automatically; these structural handlers explicitly lower only the required
properties.

Raw HTML is forbidden. All attributes and link destinations are constructed
from validated values, and external schemes are allowlisted before
serialization. `rehype-sanitize` then admits only renderer-owned heading IDs,
fragment/source links, Shiki classes/styles, and symbol data attributes needed
by the static page. The HTML contract revalidates link closure after sanitation
so safety cannot silently remove a destination.

### 7. The output is one Elm-style linked type guide

The information architecture follows the
[Elm Guide's stable core loop](https://guide.elm-lang.org/architecture/) and
its advice to
[grow around a central type before extracting another concept](https://guide.elm-lang.org/webapps/structure).
This is not an Elm color theme. The document teaches one small model and makes
later sections deepen or bound it:

```text
Investigation carries authority.
Attune changes or uses that authority.
AttuneReceipt preserves evidence of what happened.
```

The source-authored chapter order is:

```text
Attune
  The model
  A complete investigation

Investigation<State>

Attune
  materialize
  activate
  acquireActive
  execute
  finalize
  recoverTerminal

AttuneReceipt

Failures
  InvestigationLifecycleError
  AttuneToolFailure

AttuneToolkit

Repository
  remaining packages/files/declarations in deterministic source order
```

There is exactly one `h1`, `Attune`. The opening package prose begins with one
causal sentence equivalent to:

> Attune materializes an exact repository state, issues typed authority to
> operate on it, and preserves every accepted operation as a durable receipt.

`The model`, `A complete investigation`, `Failures`, and `Repository` are the
four structural chapter headings. They are not API nouns and do not pretend to
own source definitions. Every declaration/member heading beneath them owns a
real source span, canonical fragment, exact signature, and immutable source
link. These structural headings and the one title are the only non-symbol
headings. Package/file paths beneath `Repository` render as small provenance
labels, not headings.

| Content                        | Heading/label                   | Fragment                  |
| ------------------------------ | ------------------------------- | ------------------------- |
| document title                 | `h1` `Attune`                   | `#top`                    |
| model                          | `h2` `The model`                | `#the-model`              |
| running example                | `h2` `A complete investigation` | `#complete-investigation` |
| capability declaration         | `h2` `Investigation<State>`     | `#Investigation`          |
| service declaration            | `h2` `Attune`                   | `#Attune`                 |
| service member                 | `h3` `Attune.<member>`          | `#Attune.<member>`        |
| receipt declaration            | `h2` `AttuneReceipt`            | `#AttuneReceipt`          |
| failure grouping               | `h2` `Failures`                 | `#failures`               |
| each failure declaration       | `h3` exact public name          | friendly public fragment  |
| toolkit declaration            | `h2` `AttuneToolkit`            | `#AttuneToolkit`          |
| exhaustive boundary            | `h2` `Repository`               | `#repository`             |
| package/file source provenance | non-heading path label          | none                      |

The package TSDoc owns exactly one plain `text` fence beneath `The model`:

```text
materialized
     │ activate
     ▼
   active ───── execute ─────▶ receipt
     │                           │
     │ finalize                  │ inspect
     ▼                           ▼
 finalized                durable evidence
```

It remains one ordinary MDAST `code` node and renders once. There is no
Mermaid dependency, image, JavaScript, diagram component, or diagram-domain
model. Later prose reuses its state, action, receipt, and evidence vocabulary
instead of introducing parallel lifecycle pictures.

`A complete investigation` renders the one canonical checked program once at
`#complete-investigation`. It materializes, activates, executes, inspects the
returned `AttuneReceipt`, and finalizes the current active authority returned
by execution. Its visible source contains compiler-resolved occurrences of
`Attune`, `Investigation<"active">`, `AttuneReceipt`, and every lifecycle
member it claims to demonstrate; hidden setup cannot satisfy that visible
contract. The `Investigation<State>`, `Attune`, and `AttuneReceipt` sections
own ordinary CommonMark links to the one example anchor and reuse its bindings
rather than copying it. The compiler resolves and validates those authored
links; it does not synthesize a second reference projection. `acquireActive`
and `recoverTerminal` are explained as restart and
interrupted-exchange variations around the same lifecycle. A focused negative
or recovery example may exist only when it adds that distinct caller decision
and keeps the same vocabulary.

The receipt section distinguishes acceptance from terminal completion,
explains the existing `"succeeded"`, `"failed"`, and `"cancelled"` statuses,
and relates interrupted exchange to `recoverTerminal`. “Incomplete execution”
is not rendered as a fourth receipt status.

Parameters, type parameters, returns, failures, lifecycle facts, and focused
examples render only when the declaration and TSDoc support them. No generic
empty section or generated `Parameters<T>`/`ReturnType<T>` lens exists.

Every resolved local type or member occurrence in a signature, TSDoc link,
annotation, and visible example becomes an ordinary anchor:

```html
<a href="#Investigation">Investigation</a>
<a href="#Attune.execute">execute</a>
<a href="#AttuneReceipt">AttuneReceipt</a>
```

Every definition inside the production-root universe is local, including
private named declarations. Only a definition outside that universe may use a
validated immutable source or external documentation link. Prose becomes
semantic navigation only through authored TSDoc `{@link}` references; the
compiler does not guess that an arbitrary bare word names a type.

Clicking changes browser history, scrolls to the canonical definition, applies
`:target`, and lets Back return to the exact use site. One compact sticky
contents list projects only these existing chapter headings, in this order:

```text
The model
A complete investigation
Investigation
Attune
AttuneReceipt
Failures
AttuneToolkit
Repository
```

It does not list packages, modules, `Attune` members, individual failures, or
the remaining declaration/member hierarchy, and it is not a separately
modeled sidebar. Browser Find and compiler links are the exhaustive lookup
facilities.

Shiki performs static syntax highlighting only. There are no hovers,
diagnostic popovers, editor affordances, copy controls, or client hydration.
The page reads as a small technical book:

- one quiet main reading column with a restrained prose measure;
- code that may widen or scroll enough to preserve real signatures;
- one readable prose font stack and one monospace stack, with no remote font
  requirement;
- short narrative immediately adjacent to the signature or example it
  explains;
- quiet visible links, small source links, generous concept spacing, and very
  few borders; and
- no cards, card grid, dashboard, hero marketing panel, or separate
  guide/reference chrome.

Reader-facing chapter headings never expose compiler implementation terms such
as MDAST, HAST, VFile, LSP, Shiki, unified, or Oxlint. The stylesheet also
supplies syntax colors, `scroll-margin-top`, accessible focus states, and a
visible target treatment:

```css
[id] {
  scroll-margin-top: 5rem;
}

[data-attune-symbol]:target {
  outline: 2px solid currentColor;
  outline-offset: 0.65rem;
}
```

Fast contracts can prove one semantic `<main>` flow, the exact chapter/section
structure, a bounded prose measure, horizontal code overflow, the two local
font stacks, source-link treatment, and the absence of per-declaration
card/grid wrappers or forbidden reader-facing headings. They do not pretend to
score whether the prose feels quiet, the rhythm feels generous, or the
narrative is genuinely clear. `.github/CODEOWNERS` assigns the public source
owners, `styles.css`, and the guide compiler to a documentation-editorial
owner. Changes to that public spine require the designated owner's explicit
editorial approval; when the designated owner authors the change and its
context explicitly approves the feature size and editorial direction, that
owner-authored context supplies the approval. This is an ownership contract,
not a claim that repository branch protection is configured. No word-count,
screenshot, or aesthetic score replaces that judgment.

The API output inventory is:

```text
dist/index.html
dist/styles.css
dist/.nojekyll        # only when Pages requires it
```

`index.html` references `styles.css` with a relative URL and every local asset
is Pages-base-path and `file://` safe.

There is no `site.js`, route tree, sidebar model, 404 projection, search index,
manifest, JSON snapshot, or checked-in `attune-docs` publication output.

### 8. Effect owns execution boundaries, not compiler nouns

Ordinary functions implement `read`, `resolve`, `check`, and lowering. Effect
owns:

- repository and file access;
- acquisition of one `@effect/tsgo` process;
- acquisition of one Shiki highlighter;
- cancellation and process cleanup;
- current revision/configuration acquisition; and
- atomic output writes.

The design does not add reader, resolver, checker, renderer, or publisher
services. One infrastructure error type is sufficient:

```ts
class DocsError extends Data.TaggedError("DocsError")<{
  readonly phase: "read" | "compile" | "write";
  readonly cause: unknown;
}> {}
```

Documentation defects remain VFile messages, not error subclasses. Existing
unrelated lint configuration may continue to enforce architectural boundaries
such as platform ownership. Those checks are not facets of `attune/tsdoc` and
do not create another documentation rule.

### 9. One build and four test contracts replace the matrix

The only supported documentation target performs:

```text
root lint
  │
current attune-mcp/joern-effect builds + generated drift
  │
read → resolve → check → MDAST-to-HAST → index.html
  │
focused unit/HTML/browser verification
```

There is no separately supported `audit`, `manifest`, `site`, or unchecked
render mode. `attune-docs:build` is an explicit Nx target whose command invokes
`main.ts` directly and then invokes the focused lint/unified/HTML Vitest
contracts and Playwright journey directly against the completed output. There
is no public package `build` script that can bypass Nx dependencies, no
recursive Nx call, and no test-to-build dependency cycle. Pages calls only:

```text
nx run attune-docs:build
```

That target depends on `attune:lint`, `attune-mcp:build`,
`joern-effect:build`, and the nonmutating `joern-effect:generated-check`.
It remains `cache: false` because the HTML embeds the exact commit and GitHub
source URLs; Pages supplies and verifies its source commit/ref. The supported
full target requires a clean committed worktree, so a cached or provisional
revision can never be published.

Nx inputs include:

- every production build root and `tsconfig.build.json`;
- package manifests that determine project identities;
- source TSDoc;
- `tsdoc.json`;
- `oxlint.config.ts` and the root-local plugin;
- exact TypeScript and `@effect/tsgo` lockfile versions;
- documentation source and CSS;
- Joern generator inputs and generated-drift command; and
- approved experiment bundles only when independent experiment publication is
  enabled.

The root shared inputs replace `.oxlintrc.json` with `oxlint.config.ts`.

The docs package directly declares the dependencies it imports: Effect and its
Node platform boundary, `@effect/tsgo`, TypeScript 7, ts-morph, TSDoc/config,
unified, remark-parse, remark-rehype, rehype-document, rehype-sanitize,
rehype-stringify, unified-lint-rule, VFile, Shiki, and the chosen JSON-RPC/LSP
protocol packages. It declares `remark-gfm` only when authored API tables or
an actually selected approved experiment publication requires it. No
experiment bundle is selected by this change, so no experiment adapter or
`remark-gfm` dependency is added for that path. The root declares
`effect-oxlint`, its compatible Effect peer,
`@microsoft/tsdoc`, `@microsoft/tsdoc-config`, and
`@effect/language-service`, because the root-local plugin imports them
directly. The lockfile, platform binary, and clean-checkout install are part
of the blocking probe.

Four substantive tests remain:

1. **Lint:** focused `effect-oxlint/testing` cases plus a real Oxlint CLI
   fixture for missing/stale/invalid TSDoc and a valid normalized declaration.
2. **Unified fixture:** representative declarations prove deterministic order,
   Effect/lifecycle derivation, inheritance, multi-file cuts, UTF-16 ranges,
   generated TSDoc after upstream drift, diagnostics, definition
   destinations, the one running program's causal order and visible core type
   links, and public-section references to its one anchor.
3. **HTML contract:** every local `href` has exactly one `id`, every
   declaration heading has an immutable source link, every checked code node
   was resolved, no source span escapes its file, the exact chapter/contents
   order and one-diagram/one-running-program constraints hold, remaining
   declarations live beneath `Repository`, no card/inventory navigation
   structure exists, and two builds are byte-identical.
4. **Browser:** one short Playwright journey clicks `Investigation` from the
   opening complete-investigation program, asserts the fragment and computed
   target style, goes Back to the original use site, and verifies the
   immutable GitHub href without navigating the live network.

The LOC gate counts all local production TypeScript supporting the
documentation compiler, `attune/tsdoc`, and the `oxlint.config.ts`
root-discovery/integrity guard, regardless of directory:

| Area                      |                 Expected |
| ------------------------- | -----------------------: |
| `read.ts`                 |                  450–550 |
| `docs.ts`                 |                  300–400 |
| `main.ts`                 |                900–1,050 |
| root lint rule + config   |                  450–550 |
| **Production TypeScript** | **2,200–2,500 expected** |
| CSS                       |                  200–300 |

Above 1,500 production TypeScript lines, the LOC report flags the change for
explicit documentation-architecture CODEOWNER approval. The designated
owner's explicit authoring context can supply that approval; the gate does not
assert that GitHub branch protection is configured. CI fails above 2,500
production TypeScript lines, above 350 CSS lines, on any browser JavaScript,
or when `packages/twoslash` exists. Moving code to another package does not
evade the count.

The semantic resolver is the dominant production surface. A real
`@effect/tsgo` LSP client must own process lifecycle, cancellation, UTF-16
positions, virtual multi-file projects, diagnostics, definition resolution,
source/cut remapping, generic Effect-channel interpretation, and
`{@inheritDoc}` heritage plus bidirectional assignment checks. Those checks
are the feature's trust boundary and cannot be replaced by the lexical
linking shortcuts assumed by the early estimate. The revised budget still
replaces the old 5,497-line production documentation stack with one compiler
and one static document.

The independent `attune-mcp` consolidation gate remains unchanged: all
handwritten `.ts` files beneath its `src` and `test` directories count, TSDoc
is not excluded, and the limit remains 8,000. The implementation may not fund
repository-wide TSDoc by raising that limit. It removes repeated public
examples, generated lenses, and redundant prose first, then uses the recovered
lines for concise source documentation.

### 10. Experiments reuse syntax trees, not API models

Python Pydantic models, closed JSON Schemas, immutable bundles, and generated
Markdown remain the authority for experiment facts. This change selects the
normative disabled-publication case: no approved bundle is selected, no
experiment namespace is emitted, and no Markdown publication adapter is
implemented. A later separately approved change may elect to pass approved
Markdown through `remark-parse` and `remark-gfm` into the generic sanitized
MDAST-to-HAST tail under an independent `experiments/` namespace.

Experiment nodes do not enter the API MDAST tree, definition resolver,
declaration completeness check, compact guide contents, or source-type links.
TypeScript does not create experiment-domain models, recompute metrics, query
ActiveGraph, or generate factual tables. Disabling experiment publication
does not alter `index.html` or `styles.css`; this change proves that property
through the absence of experiment inputs and experiment output.

## Risks / Trade-offs

### `@effect/tsgo` has no high-level JavaScript SDK

The executable/LSP boundary is version-coupled. The blocking probe, exact
lockfile pin, narrow explicit-type grammar, and fail-closed behavior prevent an
imagined API from becoming architecture.

### A single document can become long

The public guide remains conceptually small because it teaches three ideas and
their boundaries before the `Repository` appendix. The exhaustive universe is
finite, source ordered beneath that boundary, and navigable by exact anchors
and browser Find. If the type graph becomes unreadably large, the correct
response is to reduce or clarify source nouns, not reintroduce a page
framework or enlarge the sticky contents into an inventory.

### One lint rule has a broad contract

That breadth is intentional: all facets describe one authoring invariant and
share comment ownership/normalization. Diagnostic codes and focused helper
functions keep failures precise without exposing multiple configuration
switches.

### Standard MDAST metadata is untyped by default

A narrow local `Data` augmentation gives the compiler safety it needs.
Metadata is explicitly lowered and never serialized as an independent schema.

### No grandfathered baseline makes the branch larger

The source comments and generators must reach the finished standard before
merge. This costs more within the branch but avoids shipping a permanent
policy, exception language, or migration state that would outlive the change.

## Clean-Fork Execution

The probe is preflight, not a product phase. The first implementation cut
removes the former architecture before building the replacement:

1. Run the blocking dependency/LSP/UTF-16/Shiki probe and record only
   disposable results.
2. Read the base revision only for physical LOC, source owners, and deletion
   targets, without adding baseline artifacts or treating old pages as a
   parity contract.
3. Delete the old docs source, static JavaScript, manifest/schema/policy,
   Twoslash package, and obsolete tests; scaffold the replacement files in the
   same change.
4. Add `attune/tsdoc`, `oxlint.config.ts`, `tsdoc.json`, and complete all
   production TSDoc, with generated comments fixed at their generator input.
5. Implement direct MDAST reading, the single `docs.ts` unified processor,
   Shiki/HAST lowering, the one Elm-style page, and the four focused test
   contracts.
6. Enforce LOC/artifact gates, run the complete workspace/Pages checks,
   regenerate `dist` from the final revision, and retire the three superseded
   capability specs during archival.

At every reviewable endpoint after step 3, only the replacement architecture
exists. There is no supported hybrid state.
