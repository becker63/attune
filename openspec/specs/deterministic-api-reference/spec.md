# deterministic-api-reference Specification

## Purpose

Define one deterministic, compiler-linked API document from canonical
TypeScript annotations and TSDoc, with experiment publication remaining an
independent Python-owned boundary.

## Requirements

### Requirement: Deterministic static API reference

The system SHALL render one canonical API `index.html` directly from the
checked ordinary MDAST tree through transient HAST. It SHALL be one linear
technical guide with exactly one `h1`, `Attune`, and this chapter order:

```text
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
```

The title SHALL be `h1#top`. `The model`,
`A complete investigation`, `Failures`, and `Repository` SHALL be structural
`h2` headings with fragments `#the-model`, `#complete-investigation`,
`#failures`, and `#repository`. `Investigation<State>`, `Attune`,
`AttuneReceipt`, and `AttuneToolkit` SHALL be canonical `h2` declaration
headings with their friendly type fragments; `Attune` members and both
failure declarations SHALL be canonical `h3` headings. The title and four
structural headings SHALL be the only non-symbol headings.

The model SHALL introduce `Investigation`, `Attune`, and `AttuneReceipt` as
authority, action, and evidence before any failure or toolkit boundary. The
opening prose SHALL state one causal summary equivalent to: Attune
materializes an exact repository state, issues typed authority to operate on
it, and preserves every accepted operation as a durable receipt. Package
TSDoc, ordered direct package reexports, and `Attune` member declaration order
SHALL supply that symbol sequence. The compiler SHALL add only the fixed
`Failures` and `Repository` structural boundaries. Package/file paths SHALL
render as non-heading provenance labels beneath `Repository`, and every
remaining eligible production declaration SHALL appear there exactly once in
deterministic package/file/source order, not as a parallel top-level
information architecture.

The build SHALL consume only committed TypeScript/TSDoc, locked tooling,
styles, and approved frozen experiment inputs. Live language-model output,
guide drafts, review approvals, and uncommitted prose SHALL NOT be rendering
inputs.

`The model` SHALL include exactly one source-authored `text` code fence,
rendered once without custom metadata, Mermaid, an image, a diagram component,
or JavaScript. `A complete investigation` SHALL include
exactly one canonical checked running program, rendered once with a stable
fragment. Its visible source SHALL contain compiler-resolved occurrences of
`Attune`, `Investigation<"active">`, `AttuneReceipt`, and every lifecycle
member it claims to demonstrate; setup hidden by cuts SHALL NOT satisfy that
visible contract. Later public sections SHALL use source-authored ordinary
CommonMark fragment links to `#complete-investigation` and reuse its vocabulary
rather than repeat it. The compiler SHALL resolve and validate those links but
SHALL NOT append a second projection of them.
Additional checked examples MAY explain a distinct invalid-state, restart, or
recovery decision but SHALL NOT form an independent tutorial context.

Every declaration/member heading SHALL have a canonical fragment, real source
span, and immutable revision-pinned source link. Every resolvable local type or
member occurrence in a signature, annotation, visible checked example, or
authored TSDoc `{@link}` within prose/parameter/return explanations SHALL be an
ordinary static link to its canonical declaration. Every definition inside
the production-root universe, including a private named declaration, SHALL
link locally. Only definitions outside the universe MAY use validated
immutable source or external documentation links; unresolved nonsemantic
tokens and bare prose SHALL remain text.

Each declaration SHALL render its exact signature and only narrative sections
supported by its type and TSDoc. A displayed signature SHALL consist only of
exact source bytes retained after the complete original declaration has been
resolved. Implementation bodies, overload implementation signatures that are
not callable contracts, aggregate initializer interiors, and duplicate
narrative comments MAY be cut through the tested source-to-signature interval
map. Every contract-bearing overload, accessor, and type/value facet SHALL
remain as an exact excerpt under its one canonical heading. Parameters, type
parameters, returns, Effect success/failure/requirements, lifecycle facts, and
examples SHALL be derived from actual annotations and attached TSDoc. The
renderer SHALL NOT synthesize generic empty sections,
`Parameters<T>`/`ReturnType<T>` lens programs, inferred hover text, duplicate
examples, or page-local documentation copies.

The document SHALL use Shiki for static syntax highlighting, browser Find,
fragments, browser Back, `scroll-margin-top`, and visible `:target` styling.
One compact sticky contents list SHALL project only these existing chapter
headings in order: `The model`, `A complete investigation`, `Investigation`,
`Attune`, `AttuneReceipt`, `Failures`, `AttuneToolkit`, and `Repository`. It
SHALL NOT list package/file provenance labels, `Attune` members, individual
failures, or the remaining declaration/member hierarchy and SHALL NOT become
a separately modeled sidebar.

The visual structure SHALL be a quiet technical chapter: one primary reading
column with a restrained prose measure; code that may widen or scroll to
preserve exact signatures; one readable prose font stack and one monospace
stack; short prose adjacent to the relevant signature/example; quiet links,
small source links, generous vertical rhythm, and minimal borders. Ordinary
declarations SHALL NOT render as cards, a card grid, dashboard panels, or a
separate guide/reference interface. Reader-facing headings SHALL NOT expose
the exact implementation terms MDAST, HAST, VFile, LSP, Shiki, unified, or
Oxlint. The HTML/CSS contract SHALL prove one semantic `<main>` flow, bounded
prose measure, horizontal code overflow, local prose/monospace stacks,
adjacent narrative/formal evidence, and no per-declaration card/grid wrapper.
The document SHALL contain no client JavaScript, hover card, editor scene,
router, per-symbol route, search index, copy UI, or not-found projection.

Whether prose is narratively clear and whether the visual rhythm feels quiet
or generous SHALL remain editorial judgments, not claimed compiler
guarantees. `.github/CODEOWNERS` SHALL designate a documentation-editorial
owner for the public source owners, guide compiler, and stylesheet, and
changes to that public spine SHALL have that owner's explicit approval. The
owner's explicit authoring context MAY supply the approval when it accepts the
feature size and editorial direction. This requirement SHALL NOT assert that
GitHub branch protection is configured. Word counts, screenshots, and
aesthetic scores SHALL NOT substitute for owner judgment.

The footer SHALL record the immutable source revision and exact TypeScript,
`@effect/tsgo`, and `@effect/language-service` versions. The supported API
artifact SHALL contain only `index.html`, `styles.css`, and hosting metadata
required by Pages. `index.html` SHALL reference `styles.css` and every other
local asset with relative base-path-safe URLs that also work from `file://`.

#### Scenario: Reader follows a type definition

- **WHEN** a reader clicks a resolved `Investigation` occurrence in a
  signature or example
- **THEN** the URL gains `#Investigation`
- **AND** the canonical declaration is scrolled into view and visibly targeted
- **AND** browser Back returns to the originating use site

#### Scenario: Declaration has no callable contract

- **WHEN** a non-callable declaration has no parameters, return, or failure
  channel
- **THEN** the document renders its actual type and applicable narrative
- **AND** omits placeholder callable sections

#### Scenario: Three-part model precedes its boundaries

- **WHEN** the rendered chapter order is inspected
- **THEN** authority, action, and evidence appear before failures and toolkit
- **AND** both errors are grouped under `Failures`
- **AND** `AttuneToolkit` follows that group

#### Scenario: Later sections return to one investigation

- **WHEN** the checked package program contains resolved uses of several
  lifecycle concepts and members
- **THEN** it appears once under `A complete investigation`
- **AND** those declaration sections refer to the canonical program rather
  than cloning it or creating reverse occurrence identities

#### Scenario: Lifecycle diagram is rendered

- **WHEN** package TSDoc contains the sole `text` code block beneath `The model`
- **THEN** exactly one ordinary code block renders under `The model`
- **AND** no diagram runtime, image artifact, or competing lifecycle diagram
  is emitted

#### Scenario: Repository appendix contains the exhaustive tail

- **WHEN** the public curriculum has rendered
- **THEN** every remaining eligible declaration appears exactly once beneath
  `Repository`
- **AND** package/file provenance uses non-heading labels rather than
  interrupting the public chapter

#### Scenario: Contents stays conceptual

- **WHEN** the sticky contents is inspected
- **THEN** its links and order exactly match the eight guide-level headings
- **AND** it contains no package, module, member, individual-error, or
  repository-declaration inventory

#### Scenario: Page uses a technical-book structure

- **WHEN** the HTML structure and stylesheet contract are checked
- **THEN** ordinary prose uses one primary reading column and exact signatures
  remain readable in wider or horizontally scrollable code
- **AND** ordinary declarations are not wrapped in cards, grids, dashboards,
  or separate guide/reference chrome

#### Scenario: Output inventory is inspected

- **WHEN** the API build output is listed
- **THEN** it contains one API HTML document, one stylesheet, and optional
  hosting metadata
- **AND** contains no API JSON, JavaScript, route, search, hover, or Twoslash
  artifact

### Requirement: Reproducible static Pages publication

The publication pipeline SHALL invoke one explicit
`nx run attune-docs:build` target on a clean committed worktree. That target
SHALL depend on `attune:lint`, current `attune-mcp:build`,
`joern-effect:build`, nonmutating `joern-effect:generated-check`, semantic
compilation, and focused tests. It SHALL be uncached because the artifact
embeds the exact revision. It SHALL fail closed on source/link/example/
provenance diagnostics, dependency-version mismatch, nondeterministic bytes,
a pre-existing tracked or staged `attune-docs` publication output, or an
obsolete documentation artifact. No direct package build command SHALL bypass
these dependencies.

Nx and Pages inputs SHALL include production build roots/configs, package
identities, source TSDoc, `tsdoc.json`, `oxlint.config.ts`, the root-local
plugin, documentation source/CSS, exact TypeScript and `@effect/tsgo`
versions, Joern generator inputs, and approved experiment bundles only when
independent experiment publication is enabled. Rebuilding the same revision
with the same locked tools SHALL produce byte-identical API HTML and CSS.

The published API SHALL remain usable without JavaScript and without a server.
Approved experiment Markdown MAY be published independently under an
experiment namespace, but SHALL NOT change the API document tree, declaration
links, or artifact contract. This change SHALL select the disabled-publication
case: no approved experiment bundle, experiment namespace, experiment
publication adapter, or experiment-only Markdown dependency is present.

Pages SHALL validate every internal fragment and relative/base-path-safe asset
before upload. Deployment SHALL run only from an allowed repository branch.
Every third-party workflow action SHALL be pinned to an immutable revision,
and only the deploy job SHALL receive Pages-write and OIDC-token permissions.

#### Scenario: Documentation revision is published

- **WHEN** Pages publishes a committed revision
- **THEN** lint, upstream builds, generated drift, semantic checks, deterministic
  rebuild, HTML contracts, and the browser journey pass
- **AND** every source link names that same immutable revision
- **AND** internal links and relative assets are valid at the repository Pages
  base path

#### Scenario: Untrusted workflow context reaches deployment

- **WHEN** the workflow runs outside an allowed branch or an earlier build/test
  job is inspected
- **THEN** no Pages-write or OIDC-token permission is available
- **AND** no deployment occurs

#### Scenario: Same revision is rebuilt

- **WHEN** two clean builds use the same sources and locked inputs
- **THEN** `index.html` and `styles.css` are byte-identical

#### Scenario: No experiment bundle is approved

- **WHEN** the documentation publication inputs are selected for this change
- **THEN** independent experiment publication is disabled
- **AND** no experiment adapter, namespace, or output is created
- **AND** API `index.html` and `styles.css` depend on no experiment input

#### Scenario: Hybrid or stale artifact remains

- **WHEN** publication finds tracked or staged `attune-docs` publication
  output, an old route/search artifact, manifest/snapshot, browser JavaScript,
  or Twoslash output
- **THEN** publication fails instead of deploying a mixed architecture

### Requirement: Single TSDoc authoring rule

The repository SHALL load exactly one repository-specific Oxlint
source-authoring rule, `attune/tsdoc`, from one root-local source plugin
implemented with `effect-oxlint`. The plugin SHALL load on a clean checkout
without a generated plugin build or a separately published workspace package.
Documentation summary, ownership, tag, callable, example-structure, and
obvious prose obligations SHALL be facets of this one rule, not separately
configurable custom rules.

The rule SHALL inspect every exact handwritten production TypeScript root and
recognize named top-level functions and constants; classes, interfaces, type
aliases, enums, and namespaces; constructors, methods, accessors, properties,
interface/type members; call, construct, and index signatures; and direct
authored properties of an exported named constant's object-literal
initializer, including an object literal passed directly to `Object.assign`.
It SHALL normalize an overload family to one documentation owner, an accessor pair to
one property owner, a constructor parameter property to its constructor
parameter/heading, a constant to its variable statement, and legal same-scope
type/value declarations to one concept with all definition facets. Every
contract overload SHALL use compatible ordered parameter and type-parameter
names or the rule SHALL fail; semantic failure obligations SHALL cover the
distinct supported error atoms across the family. A unique facet with
substantive `@remarks` SHALL own a type/value narrative; when none has remarks,
the first source declaration SHALL own it, and multiple competing remarks
SHALL fail as ambiguous. Reexports, non-owning merge facets, overload
implementations, accessor halves, constructor parameter-property duplicates,
nested data records, local variables, anonymous callbacks, and implementation
expressions SHALL NOT become independent documentation owners.

Every canonical eligible handwritten production owner SHALL have attached
TSDoc with a meaningful summary or a structurally valid standalone
`{@inheritDoc}`.
Standalone inheritance SHALL provisionally satisfy local summary, remarks,
parameter/type-parameter, and return ownership without mixing a second
narrative; unified SHALL remain responsible for resolving and validating it.
The rule SHALL reject stale or unsupported tags, TODO/TBD/template filler,
name-only or type-only restatements, JSDoc type expressions that duplicate
TypeScript, any local documentation-ignore escape, and a second narrative on a
non-owning overload/accessor/type-value facet.

Every directly documented callable SHALL have exactly the ordered `@param`
and `@typeParam` sets present in syntax. An explicitly non-void return SHALL
have exactly one `@returns`; a constructor or setter SHALL NOT have
`@returns`. Standalone `{@inheritDoc}` SHALL provisionally own those tags
instead of duplicating them locally. Every module-level or exported callable
SHALL still have explicit parameter and return annotations. Every canonical
owner representing an exported top-level concept SHALL have substantive
`@remarks`, unless standalone `{@inheritDoc}` provisionally owns the remarks.
Every public callable member of an exported named declaration, including each
`Attune` lifecycle member, SHALL have the same remarks obligation. A leaf
property MAY satisfy its obligation with one precise semantic summary. The
syntax-only rule SHALL NOT infer semantic error or capability categories or
assert that free prose agrees with a resolved type.

The accepted vocabulary SHALL use standard TSDoc tags plus exactly one
Attune-specific block tag, `@failure`. The rule SHALL reject `@throws` on a
callable whose explicit return syntax is `Effect.Effect`; its error channel
SHALL use `@failure`. A non-Effect callable MAY use `@throws` for authored
synchronous-throw behavior, whose runtime truth remains an editorial and test
concern. `@failure` SHALL name a target and include a nonempty explanation
using exactly
`@failure {@link FailureType} - Nonempty explanation.`. The link SHALL have no
custom label and its destination SHALL be either one TSDoc declaration
reference or one exact in-scope type-parameter name. `@requires`, `@produces`,
`@transitionsTo`,
`@moduleDocumentation`, and local ignore tags SHALL NOT be accepted. Real
package entry points MAY retain `@packageDocumentation`.

Every authored `@example` SHALL contain a nonempty TypeScript or JavaScript
program. The rule SHALL validate balanced cut regions, relative virtual
filenames, expected-error directive syntax, and the structural grammar of
`@filename`, `@errors`, `---cut---`, `---cut-before---`,
`---cut-after---`, `---cut-start---`, and `---cut-end---`. It SHALL NOT claim
to compile an example, resolve a link, inspect an Effect channel, or validate
inheritance. `@errors` SHALL be the sole expected-diagnostic authority:
examples SHALL reject `@ts-nocheck`, `@ts-ignore`, `@ts-expect-error`,
`@effect-diagnostics`, `@effect-diagnostics-next-line`, and any equivalent
compiler/language-service diagnostic suppression supported by the pinned
toolchain. After complete semantic checking, visible lowering SHALL remove
`@errors` and every cut-control line. It SHALL retain a visible `@filename`
marker only when it labels a displayed virtual-file boundary; a normal cut MAY
hide that marker with its file.

The root SHALL replace `.oxlintrc.json` with `oxlint.config.ts`, load the
source plugin directly, set `options.typeAware` to true, leave
`options.typeCheck` false, and run
`oxlint --disable-nested-config --deny-warnings .`; the fix command SHALL use
the same nested-config boundary. Native
documentation rules, including `jsdoc/check-tag-names` and `jsdoc/require-*`,
SHALL NOT duplicate `attune/tsdoc`. At config evaluation, the rule's file
override SHALL be derived from the exact roots of every discovered production
`tsconfig.build.json` minus the fixed generated-source convention. Tests SHALL
prove:

```text
reader roots = handwritten production roots ∪ generated production roots
attune/tsdoc roots = handwritten production roots
```

Other files SHALL continue through normal lint without this documentation
rule. Generated documentation SHALL instead satisfy generator byte drift
followed by repository-wide parsed-TSDoc and semantic checks, so fixes
originate in generator inputs. Configuration evaluation SHALL fail if any
repository ignore pattern would omit an exact handwritten rule root.

Before returning the configuration, `oxlint.config.ts` SHALL scan the exact
handwritten rule roots and fail with path and line when an `oxlint-disable` or
`eslint-disable` directive would suppress `attune/tsdoc`, either by naming it
or by omitting a rule list and disabling all rules. File, line, and next-line
forms SHALL be covered. This configuration-integrity guard SHALL NOT be
implemented as a second suppressible lint rule. Disabling nested configs SHALL
prevent a package-local configuration from replacing the root contract.

The config migration SHALL preserve every unrelated
correctness setting, ignore, native plugin, and `effect-joern/src`
platform-neutral globals/import restriction.

Oxfmt SHALL enable canonical JSDoc formatting. The pinned Oxfmt release
indents fenced JSDoc bodies in a form that `@microsoft/tsdoc` rejects, so its
JSDoc pass SHALL be disabled only for the exact TypeScript files that contain
authored TSDoc fences; those files SHALL still receive ordinary TypeScript
formatting. Config-integrity tests SHALL derive that closed exception set from
the repository and fail if it grows or drifts. A formatter fixture SHALL prove
that fenced example source and its virtual-file, expected-error, and cut
directives remain unchanged and that the sole plain-text lifecycle diagram
preserves its fixed-width whitespace. Formatting SHALL NOT become a second
documentation validator or documentation-ignore escape.

Any fallible analysis inside the synchronous plugin boundary SHALL become a
diagnostic at a concrete source location rather than an exception, silent
pass, or failed Effect. Focused helper/event tests SHALL use
`effect-oxlint/testing`, and at least one integration fixture SHALL invoke the
real Oxlint CLI against TypeScript source.

#### Scenario: Callable parameter changes

- **WHEN** a documented callable adds, removes, renames, or reorders a
  parameter or type parameter without the same TSDoc change
- **THEN** `attune/tsdoc` reports the exact declaration/tag mismatch during the
  normal root lint

#### Scenario: Documentation is syntactically complete

- **WHEN** an exported function has explicit annotations, meaningful summary
  and remarks, exact callable tags, and any authored example is structurally
  valid
- **THEN** the one rule accepts its source-local authoring contract
- **AND** leaves semantic example, failure, link, and inheritance checks to the
  documentation compiler

#### Scenario: Example suppresses a diagnostic

- **WHEN** an authored example contains a TypeScript or Effect diagnostic
  suppression instead of an exact `@errors` expectation
- **THEN** `attune/tsdoc` rejects the example before semantic compilation

#### Scenario: Local suppression is attempted

- **WHEN** production source uses `@docsIgnore`, uses a qualified or all-rule
  Oxlint/ESLint disable directive that suppresses `attune/tsdoc`, or a package
  attempts to replace the root config
- **THEN** the rule, configuration-integrity scan, or disabled nested-config
  boundary fails root lint
- **AND** the declaration remains in the documentation universe

#### Scenario: Generated source reaches a different authoring boundary

- **WHEN** an exact production root matches the fixed generated-source
  convention
- **THEN** the `attune/tsdoc` override does not select it
- **AND** generator drift plus repository generated-TSDoc checking remain
  mandatory

#### Scenario: Inherited comment is locally well formed

- **WHEN** a canonical owner contains only a structurally valid
  `{@inheritDoc}` reference
- **THEN** `attune/tsdoc` accepts it provisionally without demanding copied
  summary/parameter text
- **AND** repository semantic checking must still resolve and prove the
  inheritance contract

#### Scenario: Plugin analysis cannot parse a comment

- **WHEN** TSDoc parsing or internal rule analysis fails
- **THEN** the rule emits an author-visible diagnostic at the owning source
  span
- **AND** Oxlint does not crash or silently accept the source

#### Scenario: Real parser integration drifts

- **WHEN** the real plugin API, source-loading behavior, or TypeScript AST
  shape drifts from the focused mocks
- **THEN** the real Oxlint CLI fixture fails before repository documentation is
  built

### Requirement: Ordinary MDAST documentation tree

The documentation compiler SHALL discover every workspace package production
`tsconfig.build.json` and read only each parsed config's exact root file names.
It SHALL NOT use an export entry point, the compiler program's transitive
source set, a central documentation policy, a manual project registry, or
newly invented build configs to define the documentation universe. Projects
and roots SHALL be ordered deterministically by package identity,
repository-relative path, and source position.

Universe discovery and curriculum order SHALL remain distinct.
`packages/attune-mcp/src/index.ts` package TSDoc SHALL own the guide opening,
model, lifecycle diagram, and complete-investigation example. Its direct
public reexport order SHALL schedule the six public sections, each resolved to
its canonical TSDoc/source owner, and the `Attune` interface's declaration
order SHALL schedule its public members. A transient visited set MAY prevent
those declarations from rendering again. Every unvisited eligible declaration
SHALL then appear under `Repository` in deterministic
project/file/source order. The compiler SHALL own only the fixed `Failures`
grouping before the two adjacent public errors and the `Repository` boundary
before the exhaustive tail. Package/file provenance under `Repository` SHALL
be non-heading labels. The compiler SHALL NOT persist a curriculum, guide, or
navigation model to express this projection.

Within those roots, `read` SHALL emit every eligible named top-level
declaration and every authored member of a named class, interface, enum,
namespace, or object type exactly once. It SHALL use the same eligible shapes
and overload/accessor/parameter-property/type-value/constant normalization as
`attune/tsdoc`; reexports SHALL point to the TSDoc-owning declaration, merged
definition facets SHALL target one heading, and generated declarations SHALL
carry the comments emitted from their existing generator inputs.

`read` SHALL use `@microsoft/tsdoc` for comment grammar, tags, and declaration
references, and SHALL use always-on `remark-parse` to parse the exact
CommonMark source bodies owned by those TSDoc sections. It SHALL preserve
TSDoc source ranges while reattaching links/tags and lower the result directly
into one ordinary MDAST `root`; it SHALL NOT implement a custom Markdown
parser. It SHALL use only standard `root`, `heading`,
`paragraph`, `text`, `emphasis`, `strong`, `inlineCode`, `code`, `link`,
`list`, `listItem`, `blockquote`, `table`, `tableRow`, and `tableCell` nodes.
Tables SHALL use the standard GFM MDAST extension. It SHALL NOT emit raw HTML,
custom MDAST node types, a documentation inventory, manifest, snapshot, graph,
page record, disposition, audience tier, exception ledger, or policy model.

For this repository, `packages/effect-joern/src/pure/generated/**` SHALL be
recognized as the output of `packages/effect-joern/scripts/codegen/**` and
`packages/effect-joern/schema/joern-cpg-schema.1.7.70.json`. A
`joern-effect:generated-check` prerequisite SHALL generate into a temporary
directory and compare the exact relative result set and bytes—currently four
files—with the tracked working generated files without mutating them.
Automatic build, typecheck, test, root-check, and documentation paths SHALL
remove mutating `generate` dependencies and invoke this nonmutating check where
drift authority is required; only the intentional manual regeneration command
SHALL write generated source. Thus no sibling task can regenerate first and
make the comparison tautological. The supported publication build's
clean-worktree precondition SHALL prove that the tracked working files equal
the immutable `HEAD` blobs. Unified SHALL validate current TSDoc/links but
SHALL NOT duplicate the generator drift algorithm or introduce per-declaration
provenance records.

A narrow `data.attune` augmentation MAY carry only compiler metadata needed
during the build: node role, stable fragment ID, repository-relative source
path and range, immutable source URL, declared-signature/documentation
digests, checked status, and resolved code ranges. Because one MDAST tree
contains many sources, semantic provenance SHALL use these explicit source
paths/ranges rather than treating MDAST `position` as a multi-file location.
Arbitrary metadata SHALL NOT be assumed to survive MDAST-to-HAST lowering.

Stable IDs SHALL derive from package name, repository-relative path, and
canonical symbol/member name, never compiler-internal symbol IDs. The six
public concepts and public `Attune` members SHALL retain concise friendly
fragments. Every declaration heading SHALL own one canonical source
destination, while aliases and implementation sites MAY resolve to it.

The MDAST tree SHALL be transient. It SHALL NOT be checked in, versioned as a
schema, published as JSON, or consumed by another target. Temporary lookup
maps inside transforms MAY exist only for the duration of the build.

Each authored example SHALL enter MDAST once as one `code` node whose value is
the complete program. After complete-project diagnostics and definitions,
`resolve` SHALL mutate that same node value to its visible cut result and
attach remapped links. A second visible/hidden example node or persistent
example model SHALL NOT be created.

The one package lifecycle diagram SHALL enter as the only ordinary `code` node
with language `text` beneath `The model`. Its section position SHALL identify
it without custom fence metadata. It SHALL NOT create a custom node, diagram
model, image asset, or client runtime.

#### Scenario: Internal production declaration is read

- **WHEN** an unexported named declaration occurs in an exact production root
- **THEN** `read` emits its canonical heading, signature, TSDoc, source range,
  and immutable source link once

#### Scenario: Non-production source is present

- **WHEN** a test, example, generator script, or docs compiler file is not an
  exact root of a production `tsconfig.build.json`
- **THEN** it does not enter the API MDAST tree
- **AND** no policy entry or exclusion disposition is created for it

#### Scenario: New production project appears

- **WHEN** a workspace package adds a production `tsconfig.build.json`
- **THEN** the next build discovers its exact roots automatically
- **AND** no central project registry must be updated

#### Scenario: Equivalent source forms appear

- **WHEN** source contains overload declarations and an implementation, an
  accessor pair, a constructor parameter property, a same-name type/value
  pair, or reexports of one declaration
- **THEN** the tree contains one canonical narrative heading
- **AND** every type-side and value-side definition/use site targets that
  heading

#### Scenario: Public curriculum is projected from source

- **WHEN** the package entrypoint and `Attune` interface are read
- **THEN** their authored reexport/member order schedules the public chapter
- **AND** each reexport resolves to the declaration that owns its TSDoc and
  canonical source anchor
- **AND** exact production roots still define the exhaustive universe

#### Scenario: Repository tail is emitted

- **WHEN** the source-authored public curriculum has been projected
- **THEN** every remaining eligible declaration appears exactly once beneath
  `Repository` in deterministic project/file/source order
- **AND** no package or module inventory is added to the guide contents

#### Scenario: Multi-source diagnostic is created

- **WHEN** a semantic defect belongs to a declaration in a TypeScript root
- **THEN** its message identifies the actual repository-relative source and
  range
- **AND** does not misattribute the defect to `index.html`

#### Scenario: Intermediate artifacts are inspected

- **WHEN** the documentation build completes
- **THEN** no manifest, snapshot, policy, inventory, page model, or MDAST JSON
  exists in the supported outputs

### Requirement: Unified compiler resolution and checking

The documentation build SHALL acquire exactly one executable from the pinned
`@effect/tsgo` package, start its supplied TypeScript-Go binary with
`--lsp --stdio`, and use one initialized JSON-RPC/LSP session for source and
example semantics. The exact `@effect/tsgo` and native TypeScript 7 versions
plus the exact `@effect/language-service` version SHALL be lockfile/build
inputs and publication metadata. The process SHALL be cancelled, shut down,
and exited within the build scope.

The workspace SHALL pin `@effect/language-service` and its production plugin
options in the applicable shared/project tsconfig. Every virtual example
project SHALL inherit the same plugin configuration. The blocking probe SHALL
exercise those real configs rather than a one-off Effect-enabled probe, and
the plugin package/options SHALL be build inputs.

Before the old semantic path is deleted, a blocking probe SHALL prove the
source plugin loads through the real Oxlint CLI and the installed language
process supports initialization, bounded server-initiated requests, project
and multi-file diagnostics, standard definitions, declaration-reference
resolution, explicit channel/state recognition, signature and visible-cut
range remapping, virtual-document cleanup, and clean shutdown. The client
SHALL offer only UTF-16 positions (or rely on the UTF-16 protocol default),
assert UTF-16 at initialization, and test astral/combining characters. The
implementation SHALL fail closed if the pinned contract changes; it SHALL NOT
invent an unpublished SDK, start a second TypeScript server, or parse hover
prose as a stable protocol.

Definitions requested from examples importing `attune-mcp` SHALL traverse the
built declaration/source-map boundary to the exact production-source ranges
that own canonical headings. The probe SHALL fail if the pinned project
configuration resolves only to unowned distribution declarations; the
implementation SHALL NOT patch that gap with a manifest.

The same disposable probe SHALL prove that the pinned TSDoc plus
`remark-parse` bridge preserves the package's CommonMark model heading/list,
plain-text diagram, declaration references, and canonical first-body-line
complete-investigation example title as the exact ordinary nodes expected by
the renderer. Failure SHALL block the clean fork rather than introduce a
custom chapter AST, Markdown parser, or tag language.

One asynchronous unified `resolve` transform SHALL enrich existing MDAST nodes
with checked diagnostics and definition ranges. Source syntax SHALL identify
explicit `Effect.Effect<Success, Error, Requirements>` and
`Investigation<State>` forms, and LSP definitions SHALL prove their canonical
identities. Omitted trailing Effect type arguments SHALL be accepted only when
the probed canonical declaration proves that their pinned default is `never`.
The supported Effect error grammar SHALL be `never`, a named type
reference, a type parameter, or an explicit top-level union of those atoms. A
named alias SHALL remain one atom. `any`, `unknown`, intersections,
conditionals, indexed access, inferred returns, type operators, and other
opaque forms SHALL require a more explicit documentable annotation; no hover
or custom type evaluator SHALL expand them. A named-type `@failure` target
SHALL resolve through a synthetic declaration-reference source. A
type-parameter target SHALL instead bind by exact name to the owning
callable's declared type-parameter slot, be confirmed by definitions within
the complete signature, and link to that callable's canonical heading; it
SHALL NOT be resolved as a free-standing global name.

Virtual-file directives SHALL partition an example before it is opened. The
complete project SHALL then be checked and resolved before cuts are applied.
`@errors` SHALL match exact numeric TypeScript error codes; every unmatched
error or warning from TypeScript or Effect SHALL fail, while informational
diagnostics/suggestions SHALL NOT become expected errors. The blocking probe
SHALL freeze diagnostic source, severity, code, and range normalization.
Definitions SHALL remap from complete source to extracted signatures and
visible cut, cut-before, cut-after, and paired-cut source.

TSDoc declaration references SHALL be parsed as TSDoc and resolved through a
small virtual TypeScript source rather than assuming definition requests work
inside comments, except for the context-bound error type parameter described
above. `{@inheritDoc}` SHALL resolve without a cycle, name an explicit source
`implements`, `extends`, or `override` relation, retain compatible ordered
parameter/type-parameter names, and pass a compiler-diagnosed virtual
bidirectional-assignability assertion. When either side cannot be safely
referenced by that assertion, direct local TSDoc SHALL be required instead.

One unified semantic `check` pass implemented with `unified-lint-rule` SHALL
run at error severity and report defects as VFile messages. It SHALL verify
exact production-root completeness,
unique canonical IDs, local links, the inheritance contract above, supported
Effect-error/`@failure` equality with nonempty explanations, checked examples,
exactly one canonical package `@example` whose first body line is
`A complete investigation`, exact public-section references to its one anchor,
parseable generated TSDoc with
applicable summary/callable-tag obligations and valid links after the upstream
byte-drift gate, valid source spans/digests/revisions, and immutable source
links. Those syntax obligations SHALL be applied in unified only to generated
declarations; handwritten declarations SHALL rely on the source rule rather
than a duplicated audit.

There SHALL be no deterministic example-bearing set or per-declaration
example quota. The package's one running program SHALL be mandatory, checked
as one complete project, rendered once, and resolve materialization,
activation, execution, receipt inspection, and finalization in causal order.
It SHALL narrow rejected materialization before activation, finalization SHALL
use the current active authority returned by execution, and the program SHALL
supply actual finalization input. Visible syntax SHALL annotate the activated
value as `Investigation<"active">`, assign `execution.receipt` to
`AttuneReceipt`, and read or branch on `execution.receipt.status`. The checker
SHALL establish this contract from resolved visible offsets and exact syntax
shapes, not a general dataflow model. Every additional authored example SHALL
be checked. A focused invalid-state, restart, or recovery variation MAY be
authored when it adds a distinct caller decision, but it SHALL reuse the
running investigation's vocabulary rather than construct a parallel tutorial.
Human editorial review, not unified, SHALL decide whether a focused variation
is warranted.

`check` SHALL NOT repeat the source rule's summary, `@param`, `@typeParam`,
`@returns`, or local example-structure checks. Every semantic message SHALL be
configured as an error, and the outer build SHALL fail on fatal VFile
messages. Documentation defects SHALL remain VFile messages; infrastructure
failures SHALL use one `DocsError` with `read`, `compile`, or `write` phase.

After `resolve` and `check`, remark-rehype SHALL lower the ordinary tree. A
custom code handler SHALL use one acquired Shiki highlighter and wrap only
compiler-resolved identifier ranges in validated static anchors. A custom
heading handler SHALL lower canonical IDs, immutable source links, and symbol
markers. These handlers SHALL explicitly lower required `data.attune`
properties. Raw HTML SHALL be forbidden, URI schemes SHALL be allowlisted, and
`rehype-sanitize` SHALL admit only renderer-owned heading IDs,
fragment/immutable-source links, Shiki classes/styles, and symbol data
attributes. The HTML contract SHALL revalidate link closure after sanitation.
No hover/editor/compiler payload SHALL be serialized.

#### Scenario: Language-server seam passes

- **WHEN** the exact pinned versions run the blocking probe
- **THEN** real Oxlint source loading, diagnostic normalization,
  representative code/TSDoc definitions, inheritance assertions,
  channel/state recognition, multi-file association, UTF-16 conversion,
  signature/cut remapping, cleanup, and shutdown all match the asserted
  contract

#### Scenario: Language-server seam is unsupported

- **WHEN** the executable, native TypeScript version, LSP capability, position
  behavior, or required resolved fact differs from the probed contract
- **THEN** the build fails before publishing or deleting its only known-good
  semantic implementation
- **AND** does not add a parallel compiler or guess a result

#### Scenario: Effect failure documentation drifts

- **WHEN** a supported non-`never` Effect error atom lacks `@failure`,
  `@failure` names a non-atom, or its explanation is empty
- **THEN** `check` emits an error at the owning source declaration

#### Scenario: Generic Effect failure is documented

- **WHEN** an explicit Effect error channel contains an owning callable type
  parameter such as `E` and `@failure` targets that exact parameter
- **THEN** `resolve` binds the target to the callable's type-parameter slot
- **AND** the rendered occurrence links to the callable heading without
  pretending `E` is a global declaration

#### Scenario: Complete cut example resolves

- **WHEN** a multi-file lifecycle example uses setup hidden by cut directives
- **THEN** the complete project has exactly its expected diagnostics
- **AND** every visible local identifier link retains the correct canonical
  destination after source remapping

#### Scenario: Running investigation supplies shared evidence

- **WHEN** the canonical package program is resolved
- **THEN** its lifecycle calls, receipt inspection, and post-execution active
  authority occur in causal order
- **AND** rejected materialization is narrowed and finalization input is
  supplied
- **AND** the visible program contains resolved `Attune`,
  `Investigation<"active">`, `AttuneReceipt`, and demonstrated lifecycle-member
  occurrences while `execution.receipt.status` is inspected

#### Scenario: Focused invalid transition is authored

- **WHEN** source TSDoc adds a checked invalid-state example
- **THEN** it uses the running investigation's state names and public
  operations
- **AND** it remains a focused variation rather than another complete
  lifecycle program

#### Scenario: Inherited documentation is invalid

- **WHEN** `{@inheritDoc}` is unresolved, cyclic, lacks explicit heritage,
  changes ordered names, fails the virtual assignability program, or cannot be
  safely referenced
- **THEN** semantic checking fails instead of copying stale prose

#### Scenario: Source-local rule already passed

- **WHEN** unified checks a handwritten callable with exact local summary and
  parameter tags
- **THEN** it consumes that parsed TSDoc without running a duplicate local
  authoring audit

#### Scenario: Generated declaration violates documentation structure

- **WHEN** a drift-current generated declaration lacks an applicable summary
  or callable tag
- **THEN** unified reports the defect against generated source
- **AND** the fix is made in the generator input rather than the emitted file

#### Scenario: Unsafe rendered content is attempted

- **WHEN** a comment or resolved destination contains raw HTML or a
  non-allowlisted URI scheme
- **THEN** lowering rejects or safely escapes it before HTML serialization

### Requirement: One build, focused verification, and implementation budget

The repository SHALL replace the current documentation implementation as an
in-place clean fork. It SHALL use the base revision only as a read-only
physical-LOC, source-owner, and deletion-target oracle, then delete the old source,
`schema/api-manifest.schema.json`, `docs-policy.json`, static JavaScript,
Twoslash package, obsolete probe, and obsolete tests while introducing the
replacement files. Existing `schema/experiment-*.schema.json` files SHALL be
preserved. The fork SHALL NOT commit a compatibility adapter, next-version
package, dual renderer, old-to-new converter, migration baseline, debt ledger,
parallel manifest, route/content parity layer, partial package rollout, or
supported hybrid build.

The only supported documentation build SHALL be an explicit uncached
`attune-docs:build` Nx target that requires a clean committed worktree and
depends on `attune:lint`, `attune-mcp:build`, `joern-effect:build`, and a
nonmutating `joern-effect:generated-check` before running
`read → resolve → check → lower → write`. Pages SHALL invoke that target
directly. After writing, the target SHALL invoke the focused
lint/unified/HTML Vitest contracts and Playwright journey directly against the
completed output. No package script SHALL bypass or recursively invoke its Nx
dependencies, and tests SHALL NOT depend back on the build target. The
repository SHALL NOT expose separate audit, manifest, snapshot, site, or
unchecked-render products.

Nx SHALL include both production packages and the relevant source, config,
lockfile/compiler, TSDoc, lint-plugin, CSS, generator, and optional approved-
experiment inputs. The docs package SHALL declare every Effect/platform,
`@effect/tsgo`, TypeScript/ts-morph, TSDoc,
unified/remark/rehype/VFile, always-on `remark-parse`, `rehype-sanitize`,
Shiki, and JSON-RPC/LSP package it directly imports; `remark-gfm` SHALL be
present only when API tables or approved experiment Markdown require it. The
root SHALL declare `effect-oxlint`, its compatible Effect peer,
`@microsoft/tsdoc`, `@microsoft/tsdoc-config`, and
`@effect/language-service`. The clean-checkout probe SHALL cover platform
optional dependencies and the lockfile.

Verification SHALL consist of four focused contracts:

1. one `attune/tsdoc` valid/invalid matrix plus one real Oxlint CLI fixture;
2. one representative unified fixture covering declaration order,
   diagnostics, definitions, Effect/lifecycle facts, inheritance, UTF-16,
   cuts, generated TSDoc after byte drift, the running program's causal order,
   visible core type/member links, and public-section references to its one
   anchor;
3. one fast HTML contract covering unique anchors, complete local links,
   immutable source links, checked-code markers, bounded source spans, absent
   obsolete artifacts, exact chapter/contents order, one running program, one
   lifecycle diagram, Repository containment, absent card/inventory
   structures, and byte determinism; and
4. one focused Playwright journey covering a type link, URL fragment,
   computed `:target` style, browser Back, and immutable source href without a
   live external navigation.

All production TypeScript implementing `attune-docs`, the root
`attune/tsdoc` plugin, and `oxlint.config.ts` root discovery/integrity guard
SHALL be counted together regardless of directory.
The LOC report SHALL require explicit documentation-architecture CODEOWNER
approval above 1,500 physical TypeScript lines. The expected production range
SHALL be 2,200–2,500 physical TypeScript lines, and CI SHALL fail above 2,500
TypeScript lines, above 350 CSS lines, on any browser JavaScript, or when
`packages/twoslash` remains. Tests and generated output SHALL be reported
separately and SHALL NOT hide relocated production code. The LOC report SHALL
identify the real LSP resolver—including process/UTF-16/project/definition
handling, `{@inheritDoc}` compatibility, and Effect-channel checking—as the
dominant implementation surface and SHALL retain the old 5,497-line
production stack as the replacement baseline.

The existing `attune-mcp` handwritten TypeScript consolidation gate SHALL
remain independent and unchanged: every `.ts` file beneath its `src` and
`test` directories, including source TSDoc, SHALL count toward the 8,000-line
limit. This change SHALL NOT raise the limit, reset the baseline, or exclude
comments. Consolidating the duplicated public examples and lenses SHALL fund
the new source documentation rather than reversing the application cut.

Merge and publication SHALL require the rule at error severity for all
handwritten production roots, generator drift plus generated-TSDoc checks for
generated roots, and the complete semantic/page contract. No package-scoped
opt-in, grandfathered exception, or partial mode SHALL exist.

#### Scenario: Clean fork is reviewed

- **WHEN** the replacement implementation is inspected
- **THEN** only `read.ts`, `docs.ts`, `main.ts`, the root-local lint plugin,
  the small stylesheet, and focused tests implement the documentation product
- **AND** no compatibility or migration architecture is present

#### Scenario: Normal documentation build runs

- **WHEN** the supported docs target executes from a clean committed worktree
- **THEN** lint and current upstream/generated inputs pass before one checked
  HTML compilation
- **AND** no unchecked render path is available

#### Scenario: Dirty worktree requests a site build

- **WHEN** current source bytes do not belong to the immutable revision used
  by source links
- **THEN** the supported full build fails before rendering
- **AND** authors continue to use root lint and focused fixtures until the
  revision is committed

#### Scenario: Production code exceeds the budget

- **WHEN** counted documentation/compiler-plugin TypeScript exceeds 1,500
  physical lines
- **THEN** the LOC report requires explicit documentation-architecture
  CODEOWNER approval on the change
- **AND** explicit approval MAY be supplied by owner-authored change context
  that accepts the feature size and architecture
- **AND** CI fails at 2,501 lines or more

#### Scenario: Source documentation threatens the application LOC gate

- **WHEN** rewritten `attune-mcp` TSDoc and tests are counted with handwritten
  production source
- **THEN** the existing `loc:check` total remains at or below 8,000
- **AND** the gate is not weakened by excluding comments or changing its
  baseline, limit, or directories

#### Scenario: Obsolete product leaks into the fork

- **WHEN** browser JavaScript, Twoslash, a manifest/snapshot, route records,
  search data, or a parallel renderer is present
- **THEN** artifact and LOC checks fail

#### Scenario: Browser definition journey works

- **WHEN** Playwright clicks `Investigation` in the opening complete
  investigation program
- **THEN** the browser targets `#Investigation` with visible target styling
- **AND** browser Back restores the original example use site
