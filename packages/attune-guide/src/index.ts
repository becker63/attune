/**
 * - **Follow every branch.** ActiveGraph records what the agent tried, where the
 *   investigation changed direction, and how each result shaped the next step.
 * - **Keep the work rooted.** Attune ties every accepted tool call to the exact
 *   repository state it used and preserves the evidence and artifacts it produced.
 * - **Propagate what survives.** Useful queries, models, counterexamples, tests,
 *   and rules can be carried into later repositories, so the next investigation
 *   begins with accumulated research rather than an empty transcript.
 *
 * @remarks
 * ## The thesis
 *
 * ### A living edge, a durable core
 *
 * A mature tree is mostly accumulated growth. New tissue forms at a thin living
 * edge; much of what it produces eventually becomes the wood that supports another
 * season. The tree remains capable of change because not every part of it has to
 * remain equally alive.
 *
 * {@link Attune} makes the same wager about repository research.
 *
 * An investigation should stay warm where judgment matters. An agent needs room
 * to follow a structural clue, form competing explanations, choose an experiment,
 * reverse course after a counterexample, or leave a relationship unresolved. That
 * movement is not waste. It is how the investigation discovers which distinctions
 * are real.
 *
 * But a distinction that survives should not remain expensive model work forever.
 * It should be allowed to cool into something another investigation can inspect
 * and run: an exact query, an executable model, a replayable counterexample, a
 * tested property, or a deterministic rule.
 *
 * [Joern](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--JoernQueryTool)
 * makes concrete program structure observable.
 * [Maude](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--MaudeRunTool)
 * makes a chosen abstraction executable.
 * [fast-check](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--PropertyRunTool)
 * searches for the case that breaks it.
 * [ast-grep](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--AstGrepRunTool)
 * preserves the portion simple and stable enough to enforce.
 *
 * These tools form a loop, not a conveyor belt. A counterexample can reopen the
 * search. A model can expose a distinction that syntax cannot preserve. A useful
 * discovery may remain a query, a property, or a carefully bounded refusal to
 * create a rule at all. Observation, formalization, falsification, and lowering
 * are distinct roles, and no run is required to pass through all four.
 *
 * The product thesis is economic as much as technical. The first investigation
 * may still bear the full cost of discovery. Later investigations should begin
 * with the structure it leaves behind and spend more of their time classifying,
 * adapting, and handling exceptions.
 *
 * The living edge remains free to notice what is different. The durable core
 * keeps what no longer needs to be rediscovered.
 *
 * \> **Attune grows by making successful reasoning unnecessary to repeat.**
 *
 * ## The model
 *
 * Attune gives this process two complementary records. **ActiveGraph preserves the
 * path of inquiry. Attune preserves the external work beneath it.** One explains
 * why the investigation moved; the other records what actually ran.
 *
 * ### Branches
 *
 * Repository research rarely moves in a straight line. An agent follows one call
 * path, notices a recurring property, forms an explanation, and chooses an
 * experiment that might distinguish it from a plausible alternative. Evidence may
 * strengthen that path, split it, or send the investigation back toward an earlier
 * question.
 *
 * Most agent systems flatten this movement into a transcript organized around the
 * final response. The conclusion may survive, while the inquiry that produced it
 * becomes difficult to recover. A later reader can see what the agent said, but
 * not necessarily why one explanation was abandoned, which result caused the
 * turn, or what remained unresolved.
 *
 * ActiveGraph preserves those branches. It records what the agent was trying to
 * understand, which capabilities it chose, how the investigation changed
 * direction, and how each result affected what happened next. Reversals, dead
 * ends, and competing explanations remain part of the durable history rather than
 * being compressed into one apparently inevitable path.
 *
 * ### Roots
 *
 * Branches matter only while they remain attached to evidence.
 *
 * Attune binds every accepted step to the exact repository state it observed, the
 * operation that was requested, its terminal result, the artifacts it produced,
 * and the receipt that records how it ended. That connection survives after the
 * model context or client process is gone.
 *
 * A shared invocation identity joins the two records. From an ActiveGraph event,
 * a reader can reach the corresponding mechanical evidence. From a retained
 * artifact, a later agent can recover the operation and research context that
 * produced it.
 *
 * ActiveGraph records how the inquiry moved. Attune records what actually happened
 * beneath each move.
 *
 * Shared roots do not require identical branches. A Joern query, a Maude theory, a
 * minimized property counterexample, and an ast-grep rule express different kinds
 * of knowledge. Attune preserves them in the forms that make them useful rather
 * than translating them into one universal intermediate representation.
 *
 * Their coherence comes from ordered history, exact snapshots, stable references,
 * and explicit interpretation. Attune standardizes the conditions under which
 * evidence is produced and retained; it does not pretend that every form of
 * evidence has the same meaning.
 *
 * ### Cuttings
 *
 * Research becomes cumulative when part of one investigation can travel into
 * another.
 *
 * A cutting may carry a structural query, an executable model, a falsifier, a
 * counterexample, an applicability cue, an exclusion, or a deterministic rule.
 * Together, those pieces preserve more than the answer. They preserve some of the
 * instruments by which the answer was reached and challenged.
 *
 * But a cutting is not a verdict. A related repository has its own architecture
 * and exceptions. The prior may fit, partially fit, or fail entirely. The next
 * investigation can adapt it, prune it, or reject it rather than treating inherited
 * knowledge as authority.
 *
 * Over time, the work should move away from unrestricted rediscovery and toward
 * classification, targeted falsification, adaptation, and exception handling. The
 * inquiry remains alive where the new repository differs; the parts that still
 * hold do not have to be grown again from nothing.
 *
 * Under that product model is a deliberately small mechanical one:
 *
 * 1. {@link Investigation | `Investigation<State>`} carries authority over one
 *    exact repository state.
 * 2. {@link Attune} changes or uses that authority.
 * 3. [`AttuneReceipt`](#AttuneReceipt) preserves evidence of what happened.
 *
 * ```text
 * materialized
 * │ activate
 * ▼
 * active ───── execute ─────▶ receipt
 * │                           │
 * │ finalize                  │ inspect
 * ▼                           ▼
 * finalized                durable evidence
 * ```
 *
 * ## ActiveGraph
 *
 * [ActiveGraph](https://github.com/yoheinakajima/activegraph) makes the changing
 * investigation a mechanical record. The Attune research pack keeps only four durable graph
 * objects: a `Case` states the bounded question, a `Claim` states an answer under
 * test, `Evidence` interprets retained external work, and a `Result` selects what
 * survived synthesis. `addresses`, `supports`, `challenges`, `refines`, and
 * `usesPacket` preserve their visible relationships.
 *
 * The semantic step between two tools is recorded separately. Before choosing a
 * materially different experiment or representation, the agent calls
 * `record_interpretation` with an immutable `InterpretationLedger`. The ledger
 * names the local question, source references, facts retained and omitted,
 * assumptions introduced, the next step, the observation expected to distinguish
 * the live alternatives, and known limitations. It is a typed value on one
 * decision edge—not a fifth ActiveGraph object, an MCP operation, or a universal
 * intermediate representation.
 *
 * ActiveGraph records that typed call before the dependent operation, including
 * its actor and exact position in event history, then returns a content address
 * such as `ledger:sha256:…`. The next Attune invocation carries only that address
 * through its existing
 * [`FreeFormReference`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--FreeFormReference).
 * Attune persists the opaque reference with the exact request and receipt. It does
 * not retrieve the ledger, decide whether the abstraction is sound, or certify the
 * semantic edge.
 *
 * This leaves a precise chain without teaching MCP a research ontology:
 * ActiveGraph remembers why the cut was made; Attune proves what happened after
 * it. `Evidence.refs` can retain the ledger, receipt, and native artifact
 * addresses together. `Result.retained_ledger_refs` selects the decision edges
 * that survived synthesis, and a packet embeds those small ledger bodies beside
 * native Joern, Maude, fast-check, and ast-grep artifacts.
 *
 * Every authored ledger remains in event history, including abandoned ones. If
 * later evidence challenges an assumption, a new ledger may cite the earlier
 * digest through `supersedes`; neither the old ledger nor packets that retained it
 * are silently rewritten. The digest-to-packet index is derived from immutable
 * packet contents, so only affected packets need review.
 *
 * The production pack is generic. Its
 * [`make_research_pack`](https://github.com/becker63/attune/blob/main/python/attune-activegraph/src/attune_activegraph/research/pack.py#L111-L149)
 * declaration composes the ordinary workspace tools, the case-bound
 * [`make_interpretation_tool`](https://github.com/becker63/attune/blob/main/python/attune-activegraph/src/attune_activegraph/research/ledger.py#L20-L41),
 * and—only in the Attune arm—the eight generated MCP wrappers. `Case` creation
 * activates the same `investigate` and `synthesize` behaviors for this payment
 * question or any other configured case.
 *
 * **Production declarations, condensed.** These are shortened from the real
 * consumer pack and ledger tool. They preserve the actual case guard, typed
 * boundary, deterministic recording contract, object and relation vocabulary,
 * behavior wiring, and tool composition while eliding only descriptions:
 *
 * ```python
 * def make_interpretation_tool(case_id: str) -> Tool:
 *     @typed_tool(
 *         name="record_interpretation",
 *         input_model=InterpretationLedger,
 *         output_model=LedgerReference,
 *         deterministic=True,
 *     )
 *     def record_interpretation(
 *         ledger: InterpretationLedger,
 *         _ctx: ToolContext,
 *     ) -> LedgerReference:
 *         if ledger.case_id != case_id:
 *             raise ValueError(
 *                 "interpretation ledger must address the configured case"
 *             )
 *         return LedgerReference(ref=ledger_reference(ledger))
 *
 *     return record_interpretation
 *
 *
 * def make_research_pack(
 *     *,
 *     settings: ResearchBenchSettings,
 *     workspace_root: str,
 *     caller: AttuneCaller | None = None,
 *     run_identity: str | None = None,
 * ) -> Pack:
 *     workspace = make_workspace_tools(Path(workspace_root))
 *     attune: tuple[Tool, ...] = ()
 *     if settings.capability_profile is CapabilityProfile.ATTUNE:
 *         attune = make_pack(caller=caller, run_identity=run_identity).tools
 *     interpretation = (make_interpretation_tool(settings.case_id),)
 *     tools = workspace + interpretation + attune
 *     return Pack(
 *         name="attune_researchbench",
 *         version=f"{PACK_VERSION}+{digest(settings)[:19]}",
 *         object_types=(
 *             ObjectType("Case", Case, ...),
 *             ObjectType("Claim", Claim, ...),
 *             ObjectType("Evidence", Evidence, ...),
 *             ObjectType("Result", Result, ...),
 *         ),
 *         relation_types=(
 *             RelationType("addresses", ("Claim",), ("Case",)),
 *             RelationType("supports", ("Evidence",), ("Claim",)),
 *             RelationType("challenges", ("Evidence",), ("Claim",)),
 *             RelationType("refines", ("Claim",), ("Claim",)),
 *             RelationType("usesPacket", ("Case",), ("Evidence",)),
 *         ),
 *         behaviors=(
 *             _llm("investigate", InvestigationOutput, _investigated, tools),
 *             _llm("synthesize", Result, _synthesized, tools),
 *         ),
 *         tools=tools,
 *         settings_schema=ResearchBenchSettings,
 *     )
 * ```
 *
 * The continuations below are therefore not miniature ActiveGraph APIs. They are
 * the native files named by each preceding Attune receipt. The agent sees the
 * bounded tool result, records the file's exact artifact URI in an
 * `InterpretationLedger`, and carries only the returned ledger digest into the
 * next generated MCP call.
 *
 * ## The artifacts
 *
 * Each investigation owns one AgentFS database, presented through an
 * operation-scoped FUSE mount when accepted work needs repository or artifact
 * bytes. Attune validates the investigation binding and immutable base before
 * giving the owned operation sibling `repo/` and `artifacts/` namespaces. The native mount
 * path is private runtime state: it is not returned through MCP and is not an
 * between-call filesystem lease for the caller.
 *
 * The mount remains alive while accepted work, native cleanup, and terminal
 * result publication drain. Attune then unmounts it. A later operation validates
 * the same binding and remounts the same capsule and delta, so the investigation's
 * copy-up changes and whiteout deletions reappear without mutating the immutable
 * base.
 *
 * `repo/` is a normal attached Git worktree on Attune's investigation branch.
 * Tool operations such as `artifact_promote` or ast-grep apply mode may leave
 * deliberate dirty bytes there. Those bytes become exact authority only after
 * [`repository_checkpoint`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--RepositoryCheckpointTool)
 * with `policy: "commit"`, which stages every current non-ignored worktree
 * change and returns the new full commit. The `require-clean` policy instead
 * proves that the existing `HEAD` already contains everything being observed.
 * The public MCP contract has no arbitrary worktree-write operation.
 *
 * `artifacts/` is the durable evidence namespace beside that mutable worktree.
 * Its `investigation.json` manifest records the immutable base
 * `resolvedCommit`; the current exact snapshot is the Git `HEAD` in `repo/`.
 * Finalization adds `finalSnapshot` and `finalizedAt` to the manifest rather
 * than replacing the history beneath it.
 *
 * Every accepted investigation-bound operation receives
 * `artifacts/{tool}/{invocationId}/`. Attune creates `request.json` from the
 * canonical request and writes `references.json` before external work begins.
 * Tool implementations then retain their native inputs, process evidence, and
 * outputs in that same directory. After validating a terminal outcome, Attune
 * writes `result.json` before the detached `receipt.json`; recovery trusts the
 * terminal pair only when both exist and agree.
 *
 * The shape below is one mounted investigation. An early failure can stop a
 * directory before later native files are written; operation- and outcome-specific
 * files are marked explicitly:
 *
 * ```text
 * <investigation>/
 * ├── repo/
 * │   ├── src/…                             [materialized repository files]
 * │   ├── sgconfig.yml                      [materialized ast-grep configuration]
 * │   ├── rules/<rule>.yml                  [materialized candidate rule]
 * │   └── payment-retry.property.ts          [promoted; exact after checkpoint]
 * └── artifacts/
 *     ├── investigation.json
 *     ├── joern/<invocationId>/
 *     │   ├── request.json
 *     │   ├── references.json
 *     │   ├── query.cpgql
 *     │   ├── query.dsl.json                  [DSL route only]
 *     │   ├── environment.json
 *     │   ├── joern-response.json             [server response available]
 *     │   ├── joern-diagnostic.json           [server response available]
 *     │   ├── joern-server-output.json        [server process output; bounded]
 *     │   ├── joern-output.json | joern-output.txt [successful query; selected format]
 *     │   ├── joern-error.json                [query execution or diagnostic failure]
 *     │   ├── result.json
 *     │   └── receipt.json
 *     ├── maude/<invocationId>/
 *     │   ├── request.json
 *     │   ├── references.json
 *     │   ├── module.maude
 *     │   ├── commands.maude
 *     │   ├── stdout.txt
 *     │   ├── stderr.txt
 *     │   ├── process.json
 *     │   ├── result.json
 *     │   └── receipt.json
 *     ├── property/<invocationId>/
 *     │   ├── request.json
 *     │   ├── references.json
 *     │   ├── property.ts
 *     │   ├── parameters.json
 *     │   ├── stdout.txt
 *     │   ├── stderr.txt
 *     │   ├── process.json
 *     │   ├── run-details.json                [runner completed]
 *     │   ├── report.txt                      [runner completed]
 *     │   ├── counterexample.json             [failed property only]
 *     │   ├── result.json
 *     │   └── receipt.json
 *     └── ast-grep/<invocationId>/
 *         ├── request.json
 *         ├── references.json
 *         ├── inputs/sgconfig.yml
 *         ├── inputs/rules/<rule>.yml
 *         ├── stdout.txt
 *         ├── stderr.txt
 *         ├── process.json
 *         ├── findings.jsonl                  [scan mode only]
 *         ├── patch.diff                      [apply mode with changes only]
 *         ├── result.json
 *         └── receipt.json
 * ```
 *
 * Tool exhaust stays in `artifacts/`; it does not silently appear in the Git
 * worktree. When native output itself should become repository content,
 * [`artifact_promote`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--ArtifactPromoteTool)
 * copies one caller-selected retained artifact to a contained `repo/`
 * destination. In the investigation below, the receipt-listed `property.ts`
 * becomes `repo/payment-retry.property.ts`. A later checkpoint makes that
 * promoted file part of an exact snapshot. Attune performs the copy and commit mechanics without deciding
 * whether the research deserves to survive.
 *
 * Each byte sequence listed in a receipt's `artifacts` array becomes an
 * [`ArtifactReference`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--ArtifactReference)
 * with its `uri`, `mediaType`, `sha256`, `bytes`, and `complete` flag. `complete`
 * says whether the full byte stream was captured; it does not assert that the
 * evidence is correct or that an interpretation is sound. The receipt's
 * `artifacts` array includes `request.json`, `references.json`, and the retained
 * tool-native files. `result.json` and `receipt.json` are the terminal envelope
 * files, so neither recursively lists itself as a receipt artifact.
 *
 * `references.json` contains the request's bounded
 * [`FreeFormReference`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--FreeFormReference)
 * values. An ActiveGraph transition puts an opaque ledger address such as
 * `ledger:sha256:…` there, optionally with a short note. The ledger body remains
 * in ActiveGraph event history; Attune retains the caller-supplied address without
 * retrieving or interpreting it.
 *
 * ## The tools
 *
 * The example below follows one question as it moves from open investigation into
 * narrower, reusable machinery:
 *
 * **Can a retry after partial failure charge the same order twice?**
 *
 * {@link AttuneToolkit | Attune's eight MCP operations} share one checked contract.
 * [`repository_materialize`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--RepositoryMaterializeTool)
 * and [`repository_checkpoint`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--RepositoryCheckpointTool)
 * establish exact state;
 * [`joern_query`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--JoernQueryTool),
 * [`maude_run`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--MaudeRunTool),
 * [`property_run`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--PropertyRunTool),
 * and [`ast_grep_run`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--AstGrepRunTool)
 * preserve observation, abstraction, falsification, and enforcement. The other two
 * preserve what survives and close the investigation. These are epistemic roles,
 * not a mandatory pipeline; any result can reopen an earlier question.
 *
 * Every path below is taken from the producing receipt's `artifacts` array. Its
 * full form is
 * `attune://investigations/{id}/artifacts/{tool}/{invocationId}/{file}`; `{id}`
 * is abbreviated only because materialization allocates it at runtime.
 *
 * **Repository source.** The investigation starts from a retryable payment handler.
 * The same materialized commit already contains `sgconfig.yml` and the candidate
 * review rule shown later; the investigation will test whether that existing
 * detector is a useful bounded residue rather than pretend that another tool
 * generated it:
 *
 * ```ts
 * export interface Order {
 *   readonly id: string
 *   readonly customerId: string
 *   readonly totalCents: number
 * }
 *
 * export interface OrderServices {
 *   readonly payments: {
 *     charge(
 *       customerId: string,
 *       totalCents: number,
 *       idempotencyKey?: string,
 *     ): Promise<{ id: string }>
 *   }
 *   readonly orders: {
 *     findPayment(orderId: string): Promise<string | undefined>
 *     recordPaid(orderId: string, paymentId: string): Promise<void>
 *   }
 *   readonly crashPoint: (label: "after-charge") => Promise<void>
 * }
 *
 * export async function fulfillOrder(
 *   order: Order,
 *   services: OrderServices,
 * ): Promise<string> {
 *   const recorded = await services.orders.findPayment(order.id)
 *   if (recorded !== undefined) return recorded
 *
 *   const payment = await services.payments.charge(
 *     order.customerId,
 *     order.totalCents,
 *   )
 *   await services.crashPoint("after-charge")
 *   await services.orders.recordPaid(order.id, payment.id)
 *   return payment.id
 * }
 * ```
 * If the process fails at `crashPoint`, the provider has charged the customer
 * but `findPayment` still returns nothing on replay. The optional third provider
 * argument is absent.
 *
 * **Observe.** Joern locates the concrete structure and retains the exact query that
 * produced it.
 *
 * The following transcript uses `mcp.call` only as shorthand for an ordinary MCP
 * client exchange; the request fields are the real Attune wire inputs:
 *
 * ```ts
 * import { cpg, prop } from "joern-effect"
 *
 * const succeeded = <Result extends { readonly receipt: { readonly status: string } }>(
 *   result: Result,
 * ): result is Extract<Result, { readonly receipt: { readonly status: "succeeded" } }> =>
 *   result.receipt.status === "succeeded"
 *
 * const materialized = await mcp.call("repository_materialize", {
 *   invocationId: "materialize-payment-retry-01",
 *   references: [],
 *   remote: "https://example.test/checkout.git",
 *   revision: "main",
 * })
 * if (!succeeded(materialized)) {
 *   throw new Error("repository materialization failed")
 * }
 * const INVESTIGATION_ID = materialized.investigationId
 * const SNAPSHOT_0 = materialized.resolvedCommit
 *
 * const clean = await mcp.call("repository_checkpoint", {
 *   investigationId: INVESTIGATION_ID,
 *   invocationId: "checkpoint-clean-01",
 *   expectedSnapshot: SNAPSHOT_0,
 *   references: [],
 *   policy: "require-clean",
 * })
 * if (!succeeded(clean)) {
 *   throw new Error("clean checkpoint failed")
 * }
 * const EXACT_SNAPSHOT = clean.snapshotId
 * const CASE_ID = "payment-retry"
 *
 * const PAYMENT_QUERY = cpg.method
 *   .name("fulfillOrder")
 *   .call.name(/findPayment|charge|crashPoint|recordPaid/u)
 *   .select({
 *     call: prop.name,
 *     code: prop.code,
 *     file: prop.filename,
 *     line: prop.lineNumber,
 *   })
 * ```
 * **Native query.** The typed traversal compiles through the pinned `joern-effect`
 * emitter.
 * [`joern_query`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--JoernQueryTool)
 * retains these exact `query.cpgql` bytes rather than an invented summary language:
 * ```scala
 * import io.shiftleft.semanticcpg.language.locationCreator
 * cpg.method.name("fulfillOrder").call.name("findPayment|charge|crashPoint|recordPaid")
 *   .map(n => Map(
 *     "call" -> n.name,
 *     "code" -> n.code,
 *     "file" -> n.location.filename,
 *     "line" -> n.lineNumber
 *   ))
 *   .toJson
 * ```
 * **Retained result.** The call returns a receipt whose native output artifact is
 * `artifacts/joern/joern-payment-retry-01/joern-output.json`:
 *
 * ```ts
 * const joern = await mcp.call("joern_query", {
 *   investigationId: INVESTIGATION_ID,
 *   invocationId: "joern-payment-retry-01",
 *   expectedSnapshot: EXACT_SNAPSHOT,
 *   references: [],
 *   cpgql: PAYMENT_QUERY.cpgql,
 *   frontend: "jssrc",
 *   importOptions: { schemaVersion: 1 },
 *   outputFormat: "json",
 *   timeoutMilliseconds: 300_000,
 * })
 * if (!succeeded(joern)) {
 *   throw new Error("Joern query failed")
 * }
 * ```
 *
 * **Ledger source — `joern-output.json`.** These are the exact bytes behind that
 * receipt artifact:
 *
 * ```json
 * [
 *   {
 *     "call": "findPayment",
 *     "code": "services.orders.findPayment(order.id)",
 *     "file": "src/fulfill-order.ts",
 *     "line": 26
 *   },
 *   {
 *     "call": "charge",
 *     "code": "services.payments.charge(order.customerId, order.totalCents)",
 *     "file": "src/fulfill-order.ts",
 *     "line": 29
 *   },
 *   {
 *     "call": "crashPoint",
 *     "code": "services.crashPoint(\"after-charge\")",
 *     "file": "src/fulfill-order.ts",
 *     "line": 33
 *   },
 *   {
 *     "call": "recordPaid",
 *     "code": "services.orders.recordPaid(order.id, payment.id)",
 *     "file": "src/fulfill-order.ts",
 *     "line": 34
 *   }
 * ]
 * ```
 * Nothing in this file says it belongs in Maude. The generic ActiveGraph behavior
 * records its exact artifact URI in `InterpretationLedger.source_refs`, carries
 * `order.id`, the unkeyed charge, and the crash window, and names the Maude search
 * as the next discriminator.
 *
 * **Formalize.** The agent chooses a deliberately smaller world in which the
 * suspected retry behavior can be executed.
 *
 * **Agent-authored abstraction.** The LLM carries `ORDER_KEY_EXPR` into one
 * `orderKey`, `CHARGE_MODE` into `unkeyed`, and `CRASH_WINDOW` into
 * `chargedNotRecorded` followed by `crash-before-record`. Its next
 * `InterpretationLedger` cites the exact `joern-output.json` artifact, makes
 * those choices visible, and states what the Maude search is expected to
 * distinguish:
 * ```maude
 * mod PAYMENT-RETRY is
 *   protecting NAT .
 *   sorts OrderKey ChargeMode Stage PaymentState .
 *   op orderKey : -> OrderKey [ctor] .
 *   ops keyed unkeyed : -> ChargeMode [ctor] .
 *   ops ready chargedNotRecorded recorded : -> Stage [ctor] .
 *   op <_;_;_;_> : OrderKey Stage ChargeMode Nat -> PaymentState [ctor] .
 *   vars K : OrderKey . vars M : ChargeMode . var N : Nat .
 *   rl [charge-unkeyed] : < K ; ready ; unkeyed ; N > => < K ; chargedNotRecorded ; unkeyed ; N + 1 > .
 *   rl [charge-keyed-first] : < K ; ready ; keyed ; 0 > => < K ; chargedNotRecorded ; keyed ; 1 > .
 *   rl [charge-keyed-replay] : < K ; ready ; keyed ; s(N) > => < K ; chargedNotRecorded ; keyed ; s(N) > .
 *   rl [crash-before-record] : < K ; chargedNotRecorded ; M ; N > => < K ; ready ; M ; N > .
 *   rl [record] : < K ; chargedNotRecorded ; M ; N > => < K ; recorded ; M ; N > .
 * endm
 * search [1] in PAYMENT-RETRY : < orderKey ; ready ; unkeyed ; 0 > =>* < orderKey ; chargedNotRecorded ; unkeyed ; 2 > .
 * search [1] in PAYMENT-RETRY : < orderKey ; ready ; keyed ; 0 > =>* < orderKey ; chargedNotRecorded ; keyed ; 2 > .
 * ```
 * The generated MCP wrapper receives the opaque digest returned by
 * `record_interpretation`; it does not receive a payment-specific ActiveGraph
 * object:
 *
 * ```ts
 * const runPaymentModel = async (ledgerRef: string) => {
 *   const maude = await mcp.call("maude_run", {
 *     investigationId: INVESTIGATION_ID,
 *     invocationId: "maude-payment-retry-01",
 *     expectedSnapshot: EXACT_SNAPSHOT,
 *     references: [
 *       {
 *         ref: ledgerRef,
 *         note: "payment retry abstraction",
 *       },
 *     ],
 *     moduleSource: PAYMENT_RETRY_MAUDE,
 *     commands: PAYMENT_RETRY_SEARCHES,
 *     timeoutMilliseconds: 30_000,
 *   })
 *   if (!succeeded(maude)) {
 *     throw new Error("Maude model failed")
 *   }
 *   return maude
 * }
 * ```
 *
 * **Ledger source — `stdout.txt`.** The relevant native answer records from
 * `artifacts/maude/maude-payment-retry-01/stdout.txt` are:
 *
 * ```console
 * search [1] in PAYMENT-RETRY :
 *   < orderKey ; ready ; unkeyed ; 0 >
 *   =>* < orderKey ; chargedNotRecorded ; unkeyed ; 2 > .
 * Solution 1 (state 4)
 * empty substitution
 *
 * search [1] in PAYMENT-RETRY :
 *   < orderKey ; ready ; keyed ; 0 >
 *   =>* < orderKey ; chargedNotRecorded ; keyed ; 2 > .
 * No solution.
 * ```
 * **Under the model's keyed-provider assumption**, the unkeyed two-charge state
 * is reachable and the keyed equivalent is not. The next ledger cites that exact
 * `stdout.txt` URI, retains the selected crash window and one-charge safety
 * claim, and omits Maude's rewrite scheduling before choosing a property run.
 *
 * **Falsify.** fast-check returns from the abstraction to the implementation and
 * looks for a concrete sequence that violates the claim.
 *
 * **Concrete falsifier.** The property imports and exercises the fixture. Its
 * doubles make the selected provider count and durable record observable; they do
 * not claim to simulate the rest of the checkout service:
 *
 * ```ts
 * import fc from "fast-check"
 * import {
 *   fulfillOrder,
 *   type OrderServices,
 * } from "./src/fulfill-order.ts"
 *
 * const CRASH_WINDOW = "crash-after-charge" as const
 * const ORDER = {
 *   id: "order-7",
 *   customerId: "customer-3",
 *   totalCents: 4200,
 * } as const
 *
 * const replay = async (
 *   attempts: readonly ("crash-after-charge" | "record")[],
 * ) => {
 *   let charges = 0
 *   let recorded: string | undefined
 *   let attempt = 0
 *
 *   const services: OrderServices = {
 *     payments: { charge: async () => ({ id: `pay-${++charges}` }) },
 *     orders: {
 *       findPayment: async () => recorded,
 *       recordPaid: async (_orderId, paymentId) => {
 *         recorded = paymentId
 *       },
 *     },
 *     crashPoint: async () => {
 *       if (attempts[attempt++] === CRASH_WINDOW) {
 *         throw new Error("crash")
 *       }
 *     },
 *   }
 *
 *   for (const _ of attempts) {
 *     await fulfillOrder(ORDER, services).catch(() => undefined)
 *   }
 *   return charges
 * }
 *
 * export default fc.asyncProperty(
 *   fc.array(fc.constantFrom(CRASH_WINDOW, "record"), {
 *     minLength: 1,
 *     maxLength: 6,
 *   }),
 *   async (attempts) => (await replay(attempts)) <= 1,
 * )
 * ```
 * The generated property wrapper again receives the ledger address rather than
 * interpreting its body:
 *
 * ```ts
 * const runPaymentProperty = async (ledgerRef: string) => {
 *   const property = await mcp.call("property_run", {
 *     investigationId: INVESTIGATION_ID,
 *     invocationId: "property-payment-retry-01",
 *     expectedSnapshot: EXACT_SNAPSHOT,
 *     references: [
 *       {
 *         ref: ledgerRef,
 *         note: "payment retry falsifier",
 *       },
 *     ],
 *     propertySource: PAYMENT_PROPERTY,
 *     parameters: {
 *       numRuns: 100,
 *       seed: 20260730,
 *       timeoutMilliseconds: 30_000,
 *     },
 *   })
 *   if (!succeeded(property)) {
 *     throw new Error("property run failed")
 *   }
 *   return property
 * }
 * ```
 *
 * **Replay coordinates — `run-details.json`.** The native runner writes the
 * reproducible coordinates to
 * `artifacts/property/property-payment-retry-01/run-details.json`:
 *
 * ```json
 * {
 *   "failed": true,
 *   "seed": 20260730,
 *   "counterexamplePath": "1:3:1",
 *   "numRuns": 2,
 *   "numShrinks": 2
 * }
 * ```
 *
 * **Ledger source — `counterexample.json`.** The minimized input itself is a
 * separate retained artifact at
 * `artifacts/property/property-payment-retry-01/counterexample.json`:
 *
 * ```json
 * [
 *   [
 *     "crash-after-charge",
 *     "crash-after-charge"
 *   ]
 * ]
 * ```
 * The next `InterpretationLedger` cites both files. The LLM retains the
 * two-argument call as a review candidate and `SAFE_AUTOFIX = false`, while
 * explicitly omitting the provider contract and the question of which order
 * expression is stable.
 *
 * **Enshrine.** ast-grep retains only the syntactic portion narrow enough to run
 * deterministically.
 *
 * **Deterministic residue.** The materialized repository already carries a candidate
 * review detector for calls that omit a third argument at
 * `rules/review-retryable-payment-without-operation-key.yml`. A keyed
 * three-argument call does not match this native YAML:
 * ```yaml
 * id: review-retryable-payment-without-operation-key
 * language: TypeScript
 * rule:
 *   pattern: $PAYMENTS.charge($CUSTOMER_ID, $TOTAL_CENTS)
 * severity: warning
 * message: >-
 *   This two-argument payment charge may be replayed after partial failure.
 *   Verify provider idempotency and supply a stable operation key where supported.
 * ```
 * The agent does not claim that fast-check synthesized this rule. It decides
 * whether the pre-materialized candidate is narrow enough to test, and first
 * preserves the exact falsifier that informed that decision. The successful
 * `property_run` receipt lists `property.ts`;
 * [`artifact_promote`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--ArtifactPromoteTool)
 * copies those exact retained bytes to
 * `repo/payment-retry.property.ts`. Promotion leaves `HEAD` unchanged,
 * so the following checkpoint still names `EXACT_SNAPSHOT`, commits the
 * promoted file, and returns the snapshot ast-grep scans:
 *
 * ```ts
 * const runPaymentRule = async (
 *   property: Awaited<ReturnType<typeof runPaymentProperty>>,
 *   ledgerRef: string,
 * ) => {
 *   const propertySource = property.receipt.artifacts.find(({ uri }) =>
 *     uri.endsWith("/property.ts"),
 *   )
 *   if (propertySource === undefined || !propertySource.complete) {
 *     throw new Error("complete retained property source is unavailable")
 *   }
 *
 *   const promotedProperty = await mcp.call("artifact_promote", {
 *     investigationId: INVESTIGATION_ID,
 *     invocationId: "promote-payment-property-01",
 *     expectedSnapshot: EXACT_SNAPSHOT,
 *     references: [
 *       {
 *         ref: ledgerRef,
 *         note: "retain the payment retry falsifier in Git",
 *       },
 *     ],
 *     artifactUri: propertySource.uri,
 *     destinationPath: "payment-retry.property.ts",
 *   })
 *   if (!succeeded(promotedProperty)) {
 *     throw new Error("property promotion failed")
 *   }
 *
 *   const ruleSnapshot = await mcp.call("repository_checkpoint", {
 *     investigationId: INVESTIGATION_ID,
 *     invocationId: "checkpoint-payment-research-01",
 *     expectedSnapshot: EXACT_SNAPSHOT,
 *     references: [
 *       {
 *         ref: ledgerRef,
 *         note: "payment retry evidence and review-rule evaluation",
 *       },
 *     ],
 *     policy: "commit",
 *     message: "Retain payment retry falsifier",
 *   })
 *   if (!succeeded(ruleSnapshot)) {
 *     throw new Error("research checkpoint failed")
 *   }
 *
 *   const scan = await mcp.call("ast_grep_run", {
 *     investigationId: INVESTIGATION_ID,
 *     invocationId: "ast-grep-payment-rule-01",
 *     expectedSnapshot: ruleSnapshot.snapshotId,
 *     references: [
 *       {
 *         ref: ledgerRef,
 *         note: "evaluate the materialized payment review rule",
 *       },
 *     ],
 *     mode: "scan",
 *     configPath: "sgconfig.yml",
 *     rulePaths: [
 *       "rules/review-retryable-payment-without-operation-key.yml",
 *     ],
 *     timeoutMilliseconds: 30_000,
 *   })
 *   if (!succeeded(scan)) {
 *     throw new Error("ast-grep scan failed")
 *   }
 *   return scan
 * }
 * ```
 *
 * **Retained rule input.** The scan receipt includes
 * `artifacts/ast-grep/ast-grep-payment-rule-01/inputs/rules/review-retryable-payment-without-operation-key.yml`;
 * those bytes are the same YAML shown above.
 *
 * **Ledger source — `findings.jsonl`.** Scan mode also retains the native stream at
 * `artifacts/ast-grep/ast-grep-payment-rule-01/findings.jsonl`. One match is one
 * JSON object followed by a newline:
 *
 * ```json
 * {"text":"services.payments.charge(\n    order.customerId,\n    order.totalCents,\n  )","range":{"byteOffset":{"start":750,"end":823},"start":{"line":28,"column":24},"end":{"line":31,"column":3}},"file":"src/fulfill-order.ts","lines":"  const payment = await services.payments.charge(\n    order.customerId,\n    order.totalCents,\n  )","charCount":{"leading":24,"trailing":0},"language":"TypeScript","metaVariables":{"single":{"TOTAL_CENTS":{"text":"order.totalCents","range":{"byteOffset":{"start":802,"end":818},"start":{"line":30,"column":4},"end":{"line":30,"column":20}}},"CUSTOMER_ID":{"text":"order.customerId","range":{"byteOffset":{"start":780,"end":796},"start":{"line":29,"column":4},"end":{"line":29,"column":20}}},"PAYMENTS":{"text":"services.payments","range":{"byteOffset":{"start":750,"end":767},"start":{"line":28,"column":24},"end":{"line":28,"column":41}}}},"multi":{},"transformed":{}},"ruleId":"review-retryable-payment-without-operation-key","severity":"warning","note":null,"message":"This two-argument payment charge may be replayed after partial failure. Verify provider idempotency and supply a stable operation key where supported.","labels":[{"text":"services.payments.charge(\n    order.customerId,\n    order.totalCents,\n  )","range":{"byteOffset":{"start":750,"end":823},"start":{"line":28,"column":24},"end":{"line":31,"column":3}},"style":"primary"}]}
 * ```
 *
 * **The investigation began as a question about replay and ended with a concrete
 * counterexample, a bounded detector, and a visible account of everything that
 * detector cannot know.**
 *
 * The detector sees a two-argument member call. It does not establish that the
 * surrounding operation is replayable, prove provider idempotency, choose a
 * suitable order key, make charge and record atomic, define retry policy, or cover
 * indirect wrappers.
 * [`artifact_promote`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--ArtifactPromoteTool)
 * and
 * [`investigation_finalize`](#attune-mcp--packages-attune-mcp-src-contract-schemas.ts--InvestigationFinalizeTool)
 * preserve and close accepted work; neither certifies the LLM's interpretation.
 *
 * ## The Packet
 *
 * A packet connects work at two levels. The mechanical connection is exact and
 * Attune-owned: investigation, snapshot, invocation, terminal receipt, and each
 * artifact’s URI, digest, byte length, media type, and completeness. ActiveGraph
 * supplies trace order; caller references can point backward without Attune
 * pretending to understand the edge.
 *
 * The semantic connection is local and investigator-owned. Joern did not request a
 * Maude run: the LLM read `joern-output.json`, chose `ORDER_KEY_EXPR`,
 * `CHARGE_MODE`, and `CRASH_WINDOW`, and recorded those choices before the Maude
 * call. Maude did not generate a property: the LLM read `stdout.txt`, selected
 * concrete attempt outcomes and `SAFETY_CLAIM`, and recorded another decision
 * edge. fast-check did not synthesize a rule: the LLM read `run-details.json` and
 * `counterexample.json`, retained the two-argument residue and
 * `SAFE_AUTOFIX = false`, promoted the exact property source into Git, then
 * chose to evaluate a pre-materialized warning-only detector. The ledgers are
 * local, ordered, and visibly lossy—not a general translation pipeline.
 *
 * A consumer-owned packet indexes native artifacts and loss at each boundary.
 * The readable `payment-retry-run-01` value identifies this example's ActiveGraph
 * run. `{id}` abbreviates only the runtime-allocated Attune investigation
 * identifier in the repeated artifact URIs; a frozen packet contains that exact
 * identifier:
 *
 * ```json
 * {
 *   "schema_version": 1,
 *   "motif_id": "retryable-payment-idempotency",
 *   "source_case_ids": ["payment-retry"],
 *   "source_run_ids": ["payment-retry-run-01"],
 *   "source_artifact_refs": [
 *     "attune://investigations/{id}/artifacts/joern/joern-payment-retry-01/query.cpgql",
 *     "attune://investigations/{id}/artifacts/joern/joern-payment-retry-01/joern-output.json",
 *     "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/module.maude",
 *     "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/stdout.txt",
 *     "attune://investigations/{id}/artifacts/property/property-payment-retry-01/property.ts",
 *     "attune://investigations/{id}/artifacts/property/property-payment-retry-01/run-details.json",
 *     "attune://investigations/{id}/artifacts/property/property-payment-retry-01/counterexample.json",
 *     "attune://investigations/{id}/artifacts/ast-grep/ast-grep-payment-rule-01/inputs/rules/review-retryable-payment-without-operation-key.yml",
 *     "attune://investigations/{id}/artifacts/ast-grep/ast-grep-payment-rule-01/findings.jsonl"
 *   ],
 *   "claim": "A retryable provider charge needs stable order identity before its side effect.",
 *   "applicability": [
 *     "TypeScript two-argument $PAYMENTS.charge($CUSTOMER_ID, $TOTAL_CENTS)"
 *   ],
 *   "exclusion_cues": [
 *     "non-retryable flow",
 *     "provider-supplied idempotency",
 *     "atomic charge-and-record"
 *   ],
 *   "repository_signals": [
 *     "durable lookup before charge",
 *     "crash boundary before durable record"
 *   ],
 *   "joern_queries": [
 *     {
 *       "cpgql": "import io.shiftleft.semanticcpg.language.locationCreator\ncpg.method.name(\"fulfillOrder\").call.name(\"findPayment|charge|crashPoint|recordPaid\").map(n => Map(\"call\" -> n.name, \"code\" -> n.code, \"file\" -> n.location.filename, \"line\" -> n.lineNumber)).toJson"
 *     }
 *   ],
 *   "formal_artifacts": [
 *     "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/module.maude",
 *     "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/stdout.txt"
 *   ],
 *   "falsifiers": [
 *     "attune://investigations/{id}/artifacts/property/property-payment-retry-01/property.ts",
 *     "attune://investigations/{id}/artifacts/property/property-payment-retry-01/run-details.json"
 *   ],
 *   "counterexamples": [
 *     "attune://investigations/{id}/artifacts/property/property-payment-retry-01/counterexample.json"
 *   ],
 *   "ledgers": [
 *     {
 *       "schema_version": 1,
 *       "case_id": "payment-retry",
 *       "question": "Can replay after the selected crash window charge one order twice?",
 *       "source_refs": [
 *         "attune://investigations/{id}/artifacts/joern/joern-payment-retry-01/joern-output.json"
 *       ],
 *       "retained": [
 *         "ORDER_KEY_EXPR = order.id",
 *         "CHARGE_MODE = unkeyed",
 *         "CRASH_WINDOW = charge -> crashPoint -> recordPaid"
 *       ],
 *       "omitted": ["exception delivery", "interprocedural retry policy"],
 *       "assumptions": [
 *         "the same operation key makes the provider reuse its first charge"
 *       ],
 *       "next_step": "execute keyed and unkeyed retry models in Maude",
 *       "expected_discriminator": "unkeyed reaches two charges while the keyed abstraction does not",
 *       "limitations": [
 *         "the provider contract and operation-key lifetime are not established"
 *       ]
 *     },
 *     {
 *       "schema_version": 1,
 *       "case_id": "payment-retry",
 *       "question": "Does the actual fixture violate the one-charge safety claim?",
 *       "source_refs": [
 *         "attune://investigations/{id}/artifacts/maude/maude-payment-retry-01/stdout.txt"
 *       ],
 *       "retained": [
 *         "CRASH_WINDOW = crash-after-charge",
 *         "SAFETY_CLAIM = providerCharges <= 1"
 *       ],
 *       "omitted": ["rewrite scheduling", "abstract stage names"],
 *       "assumptions": [
 *         "the fixture doubles expose provider count and durable record"
 *       ],
 *       "next_step": "falsify the safety claim against the TypeScript fixture",
 *       "expected_discriminator": "fast-check finds providerCharges greater than one",
 *       "limitations": ["the property does not simulate the full checkout service"]
 *     },
 *     {
 *       "schema_version": 1,
 *       "case_id": "payment-retry",
 *       "question": "Which falsified behavior is narrow enough for deterministic review?",
 *       "source_refs": [
 *         "attune://investigations/{id}/artifacts/property/property-payment-retry-01/property.ts",
 *         "attune://investigations/{id}/artifacts/property/property-payment-retry-01/run-details.json",
 *         "attune://investigations/{id}/artifacts/property/property-payment-retry-01/counterexample.json"
 *       ],
 *       "retained": [
 *         "TWO_ARG_CALL = $PAYMENTS.charge($CUSTOMER_ID, $TOTAL_CENTS)",
 *         "SAFE_AUTOFIX = false",
 *         "PROPERTY_DESTINATION = payment-retry.property.ts",
 *         "RULE_CANDIDATE = rules/review-retryable-payment-without-operation-key.yml"
 *       ],
 *       "omitted": ["which order expression is in scope", "provider contract"],
 *       "assumptions": [
 *         "a two-argument member charge is useful as a review candidate"
 *       ],
 *       "next_step": "promote and checkpoint the falsifier, then scan the pre-materialized warning detector",
 *       "expected_discriminator": "two arguments match while a keyed call does not",
 *       "limitations": [
 *         "the detector cannot establish retryability or provider idempotency"
 *       ]
 *     }
 *   ],
 *   "lowerings": [
 *     {
 *       "kind": "ast-grep",
 *       "artifact_ref": "attune://investigations/{id}/artifacts/ast-grep/ast-grep-payment-rule-01/inputs/rules/review-retryable-payment-without-operation-key.yml",
 *       "proven_scope": "Warns on two-argument member charge calls; no fix.",
 *       "omitted_semantics": [
 *         "provider contract",
 *         "order-key suitability",
 *         "atomicity",
 *         "retry policy"
 *       ]
 *     }
 *   ],
 *   "unresolved_questions": [
 *     "Which order expression is stable here?",
 *     "Can charge and record share one boundary?"
 *   ]
 * }
 * ```
 *
 * This is an index, not a universal IR. CPGQL remains CPGQL; Maude remains Maude;
 * the property and counterexample keep fast-check replay semantics; the rule
 * remains ast-grep YAML. A bad semantic projection can be revised while receipts
 * still tell the truth about what ran. An indefensible projection can remain an
 * unresolved gap.
 *
 * An LLM can read several native forms and explain a relationship for one question.
 * It has not thereby produced a stable ontology for every tool, motif, and
 * repository. Attune correlates durable evidence; the agent proposes, tests,
 * narrows, and sometimes rejects the meaning between artifacts.
 *
 * @packageDocumentation
 */
export type { Investigation } from "attune-mcp";
export {
  Attune,
  AttuneReceipt,
  AttuneToolkit,
  AttuneToolFailure,
  InvestigationLifecycleError,
} from "attune-mcp";
