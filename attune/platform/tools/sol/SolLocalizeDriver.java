package attune.tools.sol;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The mechanical substrate of the Sol localization arm.
 *
 * <p>This class is deliberately dumb: it launches the pinned Codex
 * {@code 0.160.1} app-server as a child process, speaks the documented JSON-RPC
 * {@code initialize}/{@code thread/start}/{@code turn/start} handshake over
 * stdio, collects the agent's final message, and writes one sanitized receipt
 * for exactly one task. It owns no scientific verdict: the frozen prompt bytes,
 * the public issue text and the clean world source are declared inputs, and the
 * raw structured result travels onward for the Flix owners to classify.
 *
 * <p>It never reads, prints, hashes or persists the SIWC access token; the
 * token reaches the child only through the platform's declared
 * {@code env-secrets} injection, and the one observable piece of it the driver
 * reports is the JWT expiry timestamp, which is metadata rather than a
 * credential.
 *
 * <p>The default {@code run} mode is the published original arm's mechanical
 * path and is unchanged. The opt-in {@code --inspect true} path is a distinct,
 * additive continuation for the enforced read-only inspection arm: it parses
 * the app-server's own JSON item events and the completed-turn item view
 * (de-duplicated by item id, so a tool action is never counted twice), records
 * each observed discovery/search/read command with the bytes the tool actually
 * returned, enforces the frozen client-mechanical budgets (wall clock, tool
 * rounds, observed cumulative tokens) by sending {@code turn/interrupt}, and
 * records the overshoot. It still owns no verdict: whether the observed reads
 * satisfy the declared inspection floor is decided downstream in
 * {@code Attune.Study.SolInspected}.
 */
public final class SolLocalizeDriver {

    private static final String CHATGPT_PLAN_PROVIDER = "openai_chatgpt_plan";
    private static final String APP_NAME = "Attune Localization Research";

    /**
     * The declared structured result of the frozen prompt, as a JSON Schema.
     *
     * <p>The binding contract fixes the required result as exactly
     * {@code {"paths":["src/example.ts"]}}: one object with one {@code paths}
     * array of strings. The app-server exposes
     * {@code turn/start.params.outputSchema} ("Optional JSON Schema used to
     * constrain the final assistant message for this turn"), and this is the
     * mechanical realization of that declared contract. It constrains the JSON
     * *shape* only: the count ceiling, ordering, uniqueness and existence rules
     * stay where the contract puts them, in the downstream Flix classification.
     */
    private static final String RESULT_SCHEMA =
            "{\"type\":\"object\",\"properties\":{\"paths\":{\"type\":\"array\","
                    + "\"items\":{\"type\":\"string\"}}},\"required\":[\"paths\"],"
                    + "\"additionalProperties\":false}";

    /**
     * The declared structured result of the frozen ReviewBench review prompt, as
     * a JSON Schema: one object with one {@code findings} array. Each finding
     * names the repository-relative file it is about, the line span it concerns
     * and a bounded message; the optional severity and category mirror the
     * benchmark's own candidate vocabulary. This is a *minimal extension* of the
     * localization schema: the same one-object/one-array shape, a different
     * member name, and the same "shape only" rule — the count ceiling, the
     * existence and uniqueness of paths and the classification stay in the
     * downstream Flix owner.
     *
     * <p>The provider's structured-output contract requires EVERY declared
     * property to appear in {@code required} (the same rule the localization
     * schema already satisfies); the optional members are therefore expressed as
     * nullable types rather than by omission, and the downstream extractor maps
     * a null span or vocabulary member to its declared empty value.
     */
    private static final String FINDINGS_SCHEMA =
            "{\"type\":\"object\",\"properties\":{\"findings\":{\"type\":\"array\",\"items\":"
                    + "{\"type\":\"object\",\"properties\":{\"file\":{\"type\":\"string\"},"
                    + "\"start_line\":{\"type\":[\"integer\",\"null\"]},"
                    + "\"end_line\":{\"type\":[\"integer\",\"null\"]},"
                    + "\"message\":{\"type\":\"string\"},"
                    + "\"severity\":{\"type\":[\"string\",\"null\"]},"
                    + "\"category\":{\"type\":[\"string\",\"null\"]}},"
                    + "\"required\":[\"file\",\"start_line\",\"end_line\",\"message\","
                    + "\"severity\",\"category\"],\"additionalProperties\":false}}},"
                    + "\"required\":[\"findings\"],\"additionalProperties\":false}";

    /**
     * The declared structured result of the frozen judge prompt (`VAL-REVIEW-004`),
     * as a JSON Schema: one object with one {@code matches} array. Each entry names
     * a blinded candidate id and the list of golden reference indices that
     * candidate refers to — possibly empty, because a candidate that refers to no
     * reference is an *unmatched* finding and is NEVER automatically a false
     * positive. The reference indices are the `G`-prefixed positions of the
     * golden-set order the mechanical boundary projected, and {@code reason} is the
     * matcher's own short rationale kept for audit. Like the other schemas this
     * constrains shape only: the claiming order, the classification and every
     * metric stay in the Flix owner.
     */
    private static final String JUDGE_SCHEMA =
            "{\"type\":\"object\",\"properties\":{\"matches\":{\"type\":\"array\",\"items\":"
                    + "{\"type\":\"object\",\"properties\":{\"candidate\":{\"type\":\"string\"},"
                    + "\"references\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},"
                    + "\"reason\":{\"type\":\"string\"}},"
                    + "\"required\":[\"candidate\",\"references\",\"reason\"],"
                    + "\"additionalProperties\":false}}},"
                    + "\"required\":[\"matches\"],\"additionalProperties\":false}";

    /**
     * The declared structured result of the frozen independent-adjudication prompt
     * (`VAL-REVIEW-004`), as a JSON Schema: one object with one {@code judgments}
     * array. Each entry names a blinded candidate id, the adjudicator's status
     * ({@code valid}, {@code invalid} or {@code unresolved}) and the
     * source-grounded evidence the adjudicator read. This is a SEPARATE,
     * independent agent review — never a claim of human or manual review — and its
     * status is kept apart from the automatic provisional reference-set match.
     */
    private static final String ADJUDICATE_SCHEMA =
            "{\"type\":\"object\",\"properties\":{\"judgments\":{\"type\":\"array\",\"items\":"
                    + "{\"type\":\"object\",\"properties\":{\"candidate\":{\"type\":\"string\"},"
                    + "\"status\":{\"type\":\"string\"},\"evidence\":{\"type\":\"string\"}},"
                    + "\"required\":[\"candidate\",\"status\",\"evidence\"],"
                    + "\"additionalProperties\":false}}},"
                    + "\"required\":[\"judgments\"],\"additionalProperties\":false}";

    /** The declared ceiling on the changed-file records a review turn carries. */
    private static final int REVIEW_CHANGED_FILE_LIMIT = 60;

    /** The declared byte ceiling on the whole bounded base-to-head change block. */
    private static final long REVIEW_CHANGE_BYTE_BUDGET = 400000L;

    /** The declared byte ceiling on one changed file's rendered hunk. */
    private static final long REVIEW_FILE_BYTE_BUDGET = 60000L;

    /** The declared per-file line ceiling before a hunk degrades to a whole-file note. */
    private static final int REVIEW_FILE_LINE_LIMIT = 3000;

    /** Thread-item types that represent one repository-inspection action. */
    private static final List<String> TOOL_ITEM_TYPES = List.of(
            "commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall",
            "webSearch", "imageView", "collabAgentToolCall");

    /** Command-action kinds that count as discovery rather than a file read. */
    private static final List<String> DISCOVERY_ACTION_TYPES = List.of("search", "listFiles");

    private SolLocalizeDriver() {}

    public static void main(String[] args) throws Exception {
        Map<String, String> options = parseOptions(args);
        String mode = options.getOrDefault("mode", "run");
        switch (mode) {
            case "route-check" -> routeCheck(options);
            case "run" -> run(options);
            default -> throw new IllegalArgumentException("unknown mode: " + mode);
        }
    }

    // ------------------------------------------------------------- route check

    /**
     * Report only observable, non-secret facts about the injected token: whether
     * it is present and, when it is a well-formed JWT, its expiry instant. The
     * token value itself is never written anywhere.
     */
    private static void routeCheck(Map<String, String> options) throws IOException {
        Path out = Paths.get(required(options, "out"));
        String token = System.getenv("ACCESS_TOKEN");
        long now = System.currentTimeMillis() / 1000L;
        List<String> lines = new ArrayList<>();
        lines.add("{");
        lines.add("  \"token_present\": " + (token != null && !token.isEmpty()) + ",");
        Long expiry = token == null ? null : jwtExpiry(token);
        lines.add("  \"token_expiry_unix\": " + (expiry == null ? "\"Unavailable\"" : expiry.toString()) + ",");
        lines.add("  \"now_unix\": " + now + ",");
        lines.add("  \"token_expired\": " + (expiry == null ? "\"Unavailable\"" : Boolean.toString(expiry <= now)));
        lines.add("}");
        Files.writeString(out, String.join("\n", lines) + "\n", StandardCharsets.UTF_8);
    }

    /**
     * The {@code exp} claim of a compact JWS, or {@code null} when the value is
     * not a parseable three-part token carrying an integer expiry. The signature
     * is deliberately not verified: this is a client-side metadata read of a
     * token we already hold, not an authorization decision.
     */
    private static Long jwtExpiry(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return null;
        }
        try {
            byte[] payload = Base64.getUrlDecoder().decode(pad(parts[1]));
            String json = new String(payload, StandardCharsets.UTF_8);
            int at = json.indexOf("\"exp\"");
            if (at < 0) {
                return null;
            }
            int colon = json.indexOf(':', at);
            int end = colon + 1;
            while (end < json.length() && (json.charAt(end) == ' ')) {
                end++;
            }
            int start = end;
            while (end < json.length() && Character.isDigit(json.charAt(end))) {
                end++;
            }
            if (end == start) {
                return null;
            }
            return Long.parseLong(json.substring(start, end));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String pad(String value) {
        int remainder = value.length() % 4;
        if (remainder == 0) {
            return value;
        }
        return value + "=".repeat(4 - remainder);
    }

    // -------------------------------------------------------------------- run

    private static void run(Map<String, String> options) throws Exception {
        Path out = Paths.get(required(options, "out"));
        Path predictions = Paths.get(required(options, "predictions"));
        String task = required(options, "task");
        String world = required(options, "world");
        String model = options.getOrDefault("model", "gpt-6.1-sol");
        String effort = options.getOrDefault("effort", "medium");
        String backend = options.getOrDefault("backend", "codex-app-server");
        long timeoutSeconds = Long.parseLong(options.getOrDefault("timeout", "300"));
        boolean inspect = Boolean.parseBoolean(options.getOrDefault("inspect", "false"));
        int toolRoundBudget = Integer.parseInt(options.getOrDefault("max-tool-rounds", "32"));
        long tokenBudget = Long.parseLong(options.getOrDefault("max-tokens", "256000"));
        Path codex = Paths.get(required(options, "codex"));
        Path repoManifest = Paths.get(required(options, "repo"));
        Path reads = options.containsKey("reads") ? Paths.get(options.get("reads")) : null;
        // The opt-in ReviewBench review path (owner-approved first paired
        // economics, VAL-REVIEW-003). It is a minimal additive continuation of the
        // verified inspected runner: a findings result schema, a bounded
        // base-to-head change block and an optional assisted-context block. When
        // every option is absent the original and inspected arms are byte-identical.
        boolean review = Boolean.parseBoolean(options.getOrDefault("review", "false"));
        String armName = options.getOrDefault("arm-name", "A");
        Path baseManifest = options.containsKey("base-repo") ? Paths.get(options.get("base-repo")) : null;
        Path changedRecords = options.containsKey("changed") ? Paths.get(options.get("changed")) : null;
        Path contextFile = options.containsKey("context") ? Paths.get(options.get("context")) : null;
        Path findings = options.containsKey("findings") ? Paths.get(options.get("findings")) : null;
        Path diffOut = options.containsKey("diff") ? Paths.get(options.get("diff")) : null;
        // The opt-in ReviewBench judge/adjudication path (`VAL-REVIEW-004`): the
        // SAME verified inspected runner over the SAME dedicated SIWC route, with
        // one fixed judge prompt and one fixed independent-adjudication prompt. The
        // judge turn sees the task's golden reference set and the blinded candidate
        // findings; the adjudication turn sees the blinded unmatched candidates and
        // NO reference set at all. The mechanical boundary only projects: the
        // matching, the dedup, the classification and every metric stay in Flix.
        String judgeRole = options.getOrDefault("judge-role", "");
        boolean judged = !judgeRole.isEmpty();
        boolean judge = "judge".equals(judgeRole);
        Path gold = options.containsKey("gold") ? Paths.get(options.get("gold")) : null;
        Path candidates = options.containsKey("candidates") ? Paths.get(options.get("candidates")) : null;
        Path judgments = options.containsKey("judgments") ? Paths.get(options.get("judgments")) : null;
        Path referencesOut = options.containsKey("references") ? Paths.get(options.get("references")) : null;
        Path unmatchedOut = options.containsKey("unmatched") ? Paths.get(options.get("unmatched")) : null;
        String prompt = Files.readString(Paths.get(required(options, "prompt")), StandardCharsets.UTF_8);
        // The declared issue projection is handed over either as the frozen
        // fixture's own file (`--issue-tsv`) or as the arm's public projection
        // tree (`--issue-tree`). The tree argument is accepted as the tree
        // directory or as the projection file inside it, so the declared input
        // cannot be double-appended into a nonexistent `issues.tsv/issues.tsv`.
        Path issueProjection;
        if (options.containsKey("issue-tsv")) {
            issueProjection = Paths.get(required(options, "issue-tsv"));
        } else {
            Path declared = Paths.get(required(options, "issue-tree"));
            issueProjection = declared.getFileName() != null
                    && declared.getFileName().toString().endsWith(".tsv")
                    ? declared
                    : declared.resolve("issues.tsv");
        }
        String issue = issueForTask(issueProjection, task);

        Receipt receipt = new Receipt(task, world, model, effort, backend);
        receipt.arm = judged ? judgeRole : (review ? armName : (inspect ? "inspected" : "original"));
        receipt.inspectMode = inspect || review || judged;
        receipt.reviewMode = review && !judged;
        receipt.judgeMode = judged;
        receipt.judgeRole = judgeRole;
        receipt.toolRoundBudget = toolRoundBudget;
        receipt.tokenBudget = tokenBudget;
        receipt.timeoutCapSeconds = timeoutSeconds;
        receipt.promptIdentity = options.getOrDefault("prompt-identity", "Unavailable");
        receipt.startMillis = System.currentTimeMillis();

        // The Codex read-only sandbox mounts a fresh tmpfs over /tmp, which
        // shadows a workspace that lives under /tmp, so a sandboxed `cat` of a
        // materialized file fails with "No such file or directory". The working
        // root is therefore created next to this action's declared outputs,
        // outside /tmp, so the materialized clean repository stays visible to the
        // sandboxed shell tool.
        Path workBase = out.toAbsolutePath().getParent();
        Path home = Files.createTempDirectory(workBase, "attune-sol-");
        Path repo = materializeRepo(repoManifest, home.resolve("repo"));
        // The bounded base-to-head change block of the review path. The base
        // revision is materialized beside the head only to render the change; it
        // is never exposed to the sandbox, which sees the clean head checkout
        // alone. When no base is declared the block is empty and the turn input
        // is exactly the declared prompt plus issue.
        String changeBlock = "";
        if ((review || judged) && baseManifest != null && changedRecords != null) {
            Path base = materializeRepo(baseManifest, home.resolve("base"));
            changeBlock = renderChangeBlock(changedRecords, base, repo);
            if (diffOut != null) {
                Files.writeString(diffOut, changeBlock, StandardCharsets.UTF_8);
            }
            receipt.changedFiles = countChanged(changedRecords);
            receipt.changeBytes = changeBlock.getBytes(StandardCharsets.UTF_8).length;
        }
        String assistedContext = "";
        if (review && contextFile != null) {
            assistedContext = readBounded(contextFile, 60000L);
            receipt.contextBytes = assistedContext.getBytes(StandardCharsets.UTF_8).length;
            receipt.contextIdentity = sha256(assistedContext);
        }
        // The judge turn's declared inputs: the task's golden reference set (mounted
        // ONLY here, never in a review or prediction closure) and the blinded
        // candidate findings. The adjudication turn declares the blinded unmatched
        // candidates alone: no reference set is present at all.
        List<Reference> goldReferences = judged && judge && gold != null
                ? parseGold(gold)
                : List.of();
        String referenceBlock = renderReferences(goldReferences);
        List<Candidate> candidateRows = candidates != null ? readCandidates(candidates) : List.of();
        String candidateBlock = renderCandidates(candidateRows);
        receipt.candidateCount = candidateRows.size();
        if (judged && gold != null) {
            receipt.goldIdentity = sha256(readBounded(gold, 4_000_000L));
        }
        Path codexExecutable = provisionCodex(
                codex, options.get("code-mode-host"), options.get("bwrap"), home);
        Process process = null;
        try {
            ProcessBuilder builder = new ProcessBuilder(launchCommand(codexExecutable));
            Map<String, String> env = builder.environment();
            env.clear();
            env.put("PATH", "/usr/bin:/bin");
            env.put("HOME", home.toString());
            env.put("CODEX_HOME", home.toString());
            env.put("LANG", "C.UTF-8");
            String token = System.getenv("ACCESS_TOKEN");
            if (token != null) {
                env.put("ACCESS_TOKEN", token);
            }
            builder.directory(repo.toFile());
            builder.redirectErrorStream(false);
            process = builder.start();

            BlockingQueue<String> messages = new ArrayBlockingQueue<>(4096);
            AtomicLong lastActivity = new AtomicLong(System.currentTimeMillis());
            StringBuilder stderr = new StringBuilder();
            Process child = process;
            Thread stdoutReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(child.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        lastActivity.set(System.currentTimeMillis());
                        messages.offer(line);
                    }
                } catch (IOException ignored) {
                    // The process ended; the completion queue closes out below.
                }
            });
            Thread stderrReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(child.getErrorStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        synchronized (stderr) {
                            if (stderr.length() < 8192) {
                                stderr.append(line).append('\n');
                            }
                        }
                    }
                } catch (IOException ignored) {
                    // Bounded diagnostic capture only.
                }
            });
            stdoutReader.setDaemon(true);
            stderrReader.setDaemon(true);
            stdoutReader.start();
            stderrReader.start();

            Session session = new Session(process, messages, timeoutSeconds * 1000L, lastActivity);
            session.send("initialize", "{\"clientInfo\":{\"name\":\"" + APP_NAME
                    + "\",\"title\":\"" + APP_NAME + "\",\"version\":\"0.1.0\"}}", 1);
            session.awaitResponse(1);
            session.notify("initialized", "{}");
            session.send("thread/start", "{\"model\":\"" + model + "\",\"modelProvider\":\""
                    + CHATGPT_PLAN_PROVIDER + "\",\"cwd\":\"" + jsonEscape(repo.toString())
                    + "\",\"ephemeral\":true,\"approvalPolicy\":\"never\",\"sandbox\":\"read-only\","
                    + "\"config\":{\"model_reasoning_effort\":\"" + effort + "\"}}", 2);
            String threadId = session.awaitThreadId(2, receipt);

            // The declared structured result is the protocol's one output-shaping
            // control, and the published original arm sends it on every turn. It
            // constrains only the final assistant message's JSON shape, but it is
            // the leading mechanical suspect for a turn that never opens the tool
            // loop (gen16 and the first inspected fixture both made zero tool
            // calls despite the prompt requiring inspection). The inspected arm
            // therefore opts out of it (`--output-schema false`): the frozen
            // prompt still demands the same `{"paths":[...]}` result and the
            // extractor is unchanged, so the declared contract is preserved while
            // the inspection phase runs as an ordinary tool-using turn. The
            // default stays `true`, so the original arm's request bytes are
            // byte-identical.
            boolean emitResultSchema = Boolean.parseBoolean(options.getOrDefault("output-schema", "true"));
            receipt.resultSchemaEmitted = emitResultSchema;
            StringBuilder turnParams = new StringBuilder();
            turnParams.append("{\"threadId\":\"").append(jsonEscape(threadId))
                    .append("\",\"model\":\"").append(model)
                    .append("\",\"effort\":\"").append(effort).append("\"");
            if (emitResultSchema) {
                turnParams.append(",\"outputSchema\":").append(
                        judged ? (judge ? JUDGE_SCHEMA : ADJUDICATE_SCHEMA)
                                : (review ? FINDINGS_SCHEMA : RESULT_SCHEMA));
            }
            StringBuilder turnText = new StringBuilder();
            turnText.append(prompt).append('\n').append(issue);
            if (!changeBlock.isEmpty()) {
                turnText.append("\n\n").append(changeBlock);
            }
            if (!assistedContext.isEmpty()) {
                turnText.append("\n\n").append(assistedContext);
            }
            if (!referenceBlock.isEmpty()) {
                turnText.append("\n\n").append(referenceBlock);
            }
            if (!candidateBlock.isEmpty()) {
                turnText.append("\n\n").append(candidateBlock);
            }
            turnParams.append(",\"input\":[{\"type\":\"text\",\"text\":")
                    .append(jsonString(turnText.toString())).append("}]}");
            session.send("turn/start", turnParams.toString(), 3);
            String finalMessage = inspect || review || judged
                    ? session.awaitInspectedTurn(receipt, threadId, toolRoundBudget, tokenBudget)
                    : session.awaitTurnCompletion(receipt);
            receipt.turnCompleted = true;
            receipt.endMillis = System.currentTimeMillis();
            receipt.rawResult = finalMessage;
            Structured structured = judged
                    ? (judge ? extractStructuredMatches(finalMessage)
                             : extractStructuredJudgments(finalMessage))
                    : (review ? extractStructuredFindings(finalMessage)
                              : extractStructuredPaths(finalMessage));
            receipt.resultStatus = structured.status;
            receipt.paths = structured.paths;
            receipt.findings = structured.findings;
            receipt.matches = structured.matches;
            receipt.judgments = structured.judgments;
            if (receipt.resultStatus.equals("malformed") && receipt.failure.isEmpty()) {
                receipt.failure = "structured result absent or unparseable";
            }
            String diagnostics = stderr.toString();
            Integer http = receipt.httpStatus.isEmpty()
                    ? firstHttpStatus(diagnostics)
                    : Integer.valueOf(receipt.httpStatus);
            if (http != null) {
                receipt.httpStatus = http.toString();
            }
            if ("401".equals(receipt.httpStatus) && !receipt.resultStatus.equals("ok")) {
                receipt.resultStatus = "auth";
                receipt.failure = "provider rejected the injected ACCESS_TOKEN with HTTP 401";
            }
        } catch (TaskTimeoutException e) {
            receipt.endMillis = System.currentTimeMillis();
            if ("Unavailable".equals(receipt.stopReason)) {
                receipt.stopReason = "timeout";
            }
            receipt.resultStatus = "timeout";
            receipt.failure = "task exceeded the declared " + timeoutSeconds + " s cap";
        } catch (Exception e) {
            receipt.endMillis = System.currentTimeMillis();
            receipt.resultStatus = "error";
            receipt.failure = e.getClass().getSimpleName() + ": " + e.getMessage();
        } finally {
            if (process != null) {
                process.destroy();
                if (!process.waitFor(5, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                }
            }
            deleteRecursively(home.toFile());
        }
        Files.writeString(out, receipt.render(), StandardCharsets.UTF_8);
        writePredictions(predictions, task, receipt.paths);
        if (reads != null) {
            writeReads(reads, receipt);
        }
        if (findings != null) {
            writeFindings(findings, task, receipt.findings);
        }
        if (judgments != null) {
            writeJudgments(judgments, task, judged && !judge, receipt.matches, receipt.judgments);
        }
        if (referencesOut != null && judged && judge) {
            writeReferences(referencesOut, task, goldReferences);
        }
        if (unmatchedOut != null && judged && judge) {
            writeUnmatched(unmatchedOut, task, candidateRows, receipt.matches);
        }
    }

    /**
     * Project the raw structured findings into the one bounded mechanical surface
     * the Flix owners consume: `finding <TAB> task <TAB> rank <TAB> file <TAB>
     * start <TAB> end <TAB> severity <TAB> category <TAB> message`, in the order
     * the model returned them. This is projection, not a verdict: existence,
     * uniqueness, the count ceiling and the classification are decided downstream.
     */
    private static void writeFindings(Path out, String task, List<Finding> findings) throws IOException {
        StringBuilder tsv = new StringBuilder();
        for (int i = 0; i < findings.size(); i++) {
            Finding finding = findings.get(i);
            tsv.append("finding\t").append(task).append('\t').append(i + 1).append('\t')
                    .append(cell(finding.file())).append('\t')
                    .append(finding.startLine() < 0 ? "" : Integer.toString(finding.startLine())).append('\t')
                    .append(finding.endLine() < 0 ? "" : Integer.toString(finding.endLine())).append('\t')
                    .append(cell(finding.severity())).append('\t')
                    .append(cell(finding.category())).append('\t')
                    .append(cell(finding.message())).append('\n');
        }
        Files.writeString(out, tsv.toString(), StandardCharsets.UTF_8);
    }

    /**
     * Project the raw structured paths into the one bounded declared ranking
     * surface the Flix owners consume: `prediction <TAB> task <TAB> rank <TAB>
     * path`, in the order the model returned. This is mechanical projection, not
     * a verdict: existence, uniqueness, the count ceiling and the resulting rank
     * tree are classified downstream. An absent or broken result writes no rows,
     * which is exactly the FAIL the contract declares.
     */
    private static void writePredictions(Path out, String task, List<String> paths) throws IOException {
        StringBuilder tsv = new StringBuilder();
        for (int i = 0; i < paths.size(); i++) {
            String path = paths.get(i).replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
            tsv.append("prediction\t").append(task).append('\t').append(i + 1).append('\t')
                    .append(path).append('\n');
        }
        Files.writeString(out, tsv.toString(), StandardCharsets.UTF_8);
    }

    /**
     * Project the observed inspection activity into the one bounded mechanical
     * surface the Flix owners consume: one `read` row per observed command
     * action (its declared action kind, the path or query it names, the output
     * byte count the tool actually returned, the digest of that output and the
     * action's own tool status and elapsed offset) and one `tool` row per
     * observed inspection item. This is projection, not a verdict: whether the
     * floor is met is classified downstream.
     */
    private static void writeReads(Path out, Receipt receipt) throws IOException {
        StringBuilder tsv = new StringBuilder();
        for (ToolItem item : receipt.toolItems) {
            tsv.append("tool\t").append(cell(item.type)).append('\t').append(cell(item.status))
                    .append('\t').append(item.bytes).append('\t').append(item.atMillis).append('\n');
        }
        for (ReadAction action : receipt.reads) {
            tsv.append("read\t").append(cell(action.actionType)).append('\t').append(cell(action.target))
                    .append('\t').append(action.bytes).append('\t').append(cell(action.sha256))
                    .append('\t').append(cell(action.exitCode)).append('\t').append(cell(action.status))
                    .append('\t').append(action.atMillis).append('\n');
        }
        Files.writeString(out, tsv.toString(), StandardCharsets.UTF_8);
    }

    private static String cell(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (Exception e) {
            return "Unavailable";
        }
    }

    private static List<String> launchCommand(Path codex) {
        List<String> command = new ArrayList<>();
        command.add(codex.toAbsolutePath().toString());
        command.add("app-server");
        command.add("--listen");
        command.add("stdio://");
        for (String config : List.of(
                "model_provider=\"openai_chatgpt_plan\"",
                "model_providers.openai_chatgpt_plan.name=\"ChatGPT plan\"",
                "model_providers.openai_chatgpt_plan.base_url=\"https://api.openai.com/v1\"",
                "model_providers.openai_chatgpt_plan.env_key=\"ACCESS_TOKEN\"",
                "model_providers.openai_chatgpt_plan.wire_api=\"responses\"",
                "model_providers.openai_chatgpt_plan.requires_openai_auth=false",
                "model_providers.openai_chatgpt_plan.supports_websockets=false",
                "model_reasoning_effort=\"medium\"")) {
            command.add("-c");
            command.add(config);
        }
        return command;
    }

    /**
     * Stage the pinned Codex app-server and, when one is declared, its companion
     * code-mode host in a single directory.
     *
     * <p>The app-server resolves its shell/read tool executor as a sibling file
     * named exactly {@code codex-code-mode-host} next to the running binary, so
     * the declared host artifact is copied under that name. Without it the tool
     * path fails closed and no model turn can inspect a repository (the
     * diagnosed defect of the inspected arm). When no host is declared the
     * original binary is launched in place, unchanged.
     */
    private static Path provisionCodex(Path codex, String hostPath, String bwrapPath, Path home)
            throws IOException {
        if (hostPath == null || hostPath.isEmpty()) {
            return codex;
        }
        Path runtime = Files.createDirectories(home.resolve("runtime"));
        Path codexCopy = runtime.resolve(codex.getFileName().toString());
        Files.copy(codex, codexCopy);
        codexCopy.toFile().setExecutable(true, false);
        Path hostCopy = runtime.resolve("codex-code-mode-host");
        Files.copy(Paths.get(hostPath), hostCopy);
        hostCopy.toFile().setExecutable(true, false);
        if (bwrapPath != null && !bwrapPath.isEmpty()) {
            // The code-mode host's Linux sandbox launcher looks for the bundled
            // sandbox helper at `codex-resources/bwrap` next to the Codex
            // executable, so the declared artifact is staged under exactly that
            // relative path.
            Path resources = Files.createDirectories(runtime.resolve("codex-resources"));
            Path bwrapCopy = resources.resolve("bwrap");
            Files.copy(Paths.get(bwrapPath), bwrapCopy);
            bwrapCopy.toFile().setExecutable(true, false);
        }
        return codexCopy;
    }

    // ------------------------------------------------------------ task inputs

    /**
     * Materialize the declared clean world source into one ordinary repository
     * directory. Each manifest line is `action-path <TAB> repository-relative
     * path`; the file is copied so the model inspects real bytes inside its own
     * working directory rather than a symlink farm pointing outside it.
     */
    private static Path materializeRepo(Path manifest, Path destination) throws IOException {
        Files.createDirectories(destination);
        for (String line : Files.readAllLines(manifest, StandardCharsets.UTF_8)) {
            if (line.isBlank()) {
                continue;
            }
            int tab = line.indexOf('\t');
            if (tab <= 0) {
                continue;
            }
            Path source = Paths.get(line.substring(0, tab));
            String relative = line.substring(tab + 1);
            Path target = destination.resolve(relative).normalize();
            if (!target.startsWith(destination)) {
                throw new IOException("declared world source escapes the repository root: " + relative);
            }
            Files.createDirectories(target.getParent());
            Files.copy(source, target);
        }
        return destination;
    }

    /**
     * The public issue text of exactly one task, read from the declared issue
     * projection. An absent row is the empty string, which the contract treats as
     * a missing input rather than a silently unrelated prompt.
     */
    private static String issueForTask(Path issues, String taskId) throws IOException {
        for (String line : Files.readAllLines(issues, StandardCharsets.UTF_8)) {
            if (line.isBlank()) {
                continue;
            }
            String[] fields = line.split("\t", 3);
            if (fields.length == 3 && fields[0].equals("issue") && fields[1].equals(taskId)) {
                return unescapeCell(fields[2]);
            }
        }
        return "";
    }

    /** Reverse the projection's backslash escapes for one declared cell. */
    private static String unescapeCell(String cell) {
        StringBuilder value = new StringBuilder(cell.length());
        for (int i = 0; i < cell.length(); i++) {
            char c = cell.charAt(i);
            if (c == '\\' && i + 1 < cell.length()) {
                char next = cell.charAt(i + 1);
                switch (next) {
                    case 'n' -> {
                        value.append('\n');
                        i++;
                    }
                    case 'r' -> {
                        value.append('\r');
                        i++;
                    }
                    case 't' -> {
                        value.append('\t');
                        i++;
                    }
                    case '\\' -> {
                        value.append('\\');
                        i++;
                    }
                    default -> value.append(c);
                }
            } else {
                value.append(c);
            }
        }
        return value.toString();
    }

    // ------------------------------------------------------------- JSON-RPC

    private static final class Session {
        private final Process process;
        private final BlockingQueue<String> messages;
        private final long timeoutMillis;
        private final AtomicLong lastActivity;
        private final long start = System.currentTimeMillis();

        Session(Process process, BlockingQueue<String> messages, long timeoutMillis, AtomicLong lastActivity) {
            this.process = process;
            this.messages = messages;
            this.timeoutMillis = timeoutMillis;
            this.lastActivity = lastActivity;
        }

        void send(String method, String params, int id) throws IOException {
            String message = "{\"jsonrpc\":\"2.0\",\"method\":\"" + method + "\",\"params\":" + params
                    + ",\"id\":" + id + "}";
            process.getOutputStream().write((message + "\n").getBytes(StandardCharsets.UTF_8));
            process.getOutputStream().flush();
            lastActivity.set(System.currentTimeMillis());
        }

        void notify(String method, String params) throws IOException {
            String message = "{\"jsonrpc\":\"2.0\",\"method\":\"" + method + "\",\"params\":" + params + "}";
            process.getOutputStream().write((message + "\n").getBytes(StandardCharsets.UTF_8));
            process.getOutputStream().flush();
            lastActivity.set(System.currentTimeMillis());
        }

        private String receive() throws IOException, TaskTimeoutException {
            long deadline = start + timeoutMillis;
            while (true) {
                if (System.currentTimeMillis() > deadline) {
                    throw new TaskTimeoutException();
                }
                String line;
                try {
                    line = messages.poll(500, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IOException("interrupted while awaiting the app-server", e);
                }
                if (line == null) {
                    if (!process.isAlive()) {
                        throw new IOException("app-server exited before completing the turn");
                    }
                    continue;
                }
                lastActivity.set(System.currentTimeMillis());
                if (line.isBlank()) {
                    continue;
                }
                return line;
            }
        }

        String awaitResponse(int id) throws IOException, TaskTimeoutException {
            while (true) {
                String line = receive();
                if (jsonInt(line, "\"id\"") == null || jsonInt(line, "\"id\"") != id) {
                    continue;
                }
                if (line.contains("\"error\"")) {
                    throw new IOException("app-server protocol error during handshake");
                }
                return line;
            }
        }

        String awaitThreadId(int id, Receipt receipt) throws IOException, TaskTimeoutException {
            String response = awaitResponse(id);
            // The resolved model is observable metadata the provider actually
            // returned on `thread/start`; it is captured rather than assumed so
            // requested-vs-resolved stays a measured fact.
            String resolved = jsonStringField(response, "model");
            if (resolved != null && !resolved.isEmpty()) {
                receipt.resolvedModel = resolved;
            }
            String marker = "\"thread\"";
            int at = response.indexOf(marker);
            if (at < 0) {
                throw new IOException("thread/start returned no thread identity");
            }
            String threadId = jsonStringField(response.substring(at), "id");
            if (threadId == null) {
                throw new IOException("thread/start returned no thread identity");
            }
            return threadId;
        }

        String awaitTurnCompletion(Receipt receipt) throws IOException, TaskTimeoutException {
            List<String> texts = new ArrayList<>();
            long deadline = start + timeoutMillis;
            while (true) {
                if (System.currentTimeMillis() > deadline) {
                    throw new TaskTimeoutException();
                }
                String line;
                try {
                    line = messages.poll(500, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IOException("interrupted while awaiting the app-server", e);
                }
                if (line == null) {
                    if (!process.isAlive()) {
                        throw new IOException("app-server exited before completing the turn");
                    }
                    continue;
                }
                lastActivity.set(System.currentTimeMillis());
                if (line.contains("tokenUsage")) {
                    captureThreadUsage(line, receipt);
                }
                if (line.contains("\"item/completed\"")) {
                    for (String type : TOOL_ITEM_TYPES) {
                        if (line.contains("\"type\":\"" + type + "\"")) {
                            receipt.toolCalls++;
                            break;
                        }
                    }
                    String text = jsonStringField(line, "text");
                    if (line.contains("\"agentMessage\"") && text != null && !texts.contains(text)) {
                        texts.add(text);
                    }
                }
                if (line.contains("\"turn/completed\"")) {
                    captureUsage(line, receipt);
                    String inline = jsonStringField(line, "text");
                    if (inline != null && !texts.contains(inline)) {
                        texts.add(inline);
                    }
                    return texts.isEmpty() ? "" : texts.get(texts.size() - 1);
                }
                if (line.contains("\"error\"")) {
                    Integer status = firstHttpStatus(line);
                    if (status != null) {
                        receipt.httpStatus = status.toString();
                    }
                }
            }
        }

        // ------------------------------------------------- inspected path

        /**
         * The opt-in inspected pump. Unlike the original substring scan it
         * routes every app-server message itself, parses the app-server's own
         * JSON item events *and* the completed-turn item view with a real JSON
         * reader, de-duplicates items by id (so a tool action is never counted
         * twice), records every observed discovery/search/read command with the
         * bytes the tool actually returned, and stops the turn with
         * {@code turn/interrupt} at the first observable update past a frozen
         * client-mechanical bound. Every bound is a client-side stop, never a
         * claimed provider hard limit.
         */
        String awaitInspectedTurn(Receipt receipt, String threadId, int toolRoundBudget, long tokenBudget)
                throws IOException, TaskTimeoutException {
            long deadline = start + timeoutMillis;
            List<String> texts = new ArrayList<>();
            Set<String> seenItems = new LinkedHashSet<>();
            boolean boundReached = false;
            while (true) {
                if (System.currentTimeMillis() > deadline) {
                    if ("Unavailable".equals(receipt.stopReason)) {
                        receipt.stopReason = "timeout";
                    }
                    throw new TaskTimeoutException();
                }
                String line;
                try {
                    line = messages.poll(500, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IOException("interrupted while awaiting the app-server", e);
                }
                if (line == null) {
                    if (!process.isAlive()) {
                        throw new IOException("app-server exited before completing the turn");
                    }
                    continue;
                }
                lastActivity.set(System.currentTimeMillis());
                if (line.isBlank()) {
                    continue;
                }
                Object parsed = Json.parse(line);
                if (!(parsed instanceof Map<?, ?> envelope)) {
                    continue;
                }
                String method = Json.asText(envelope.get("method"));
                if (method == null) {
                    captureTurnStartResponse(envelope, receipt);
                    continue;
                }
                // A sanitized census of what the app-server actually emitted:
                // notification method names and counts only, never payloads. It
                // is the direct evidence that separates a counter gap (items on
                // a channel the old counter never read) from a turn in which the
                // model genuinely opened no tool at all.
                receipt.notificationsSeen++;
                receipt.methodCounts.merge(method, 1, Integer::sum);
                Object params = envelope.get("params");
                switch (method) {
                    case "turn/started" -> {
                        String id = Json.nestedText(params, "turn", "id");
                        if (id != null) {
                            receipt.turnId = id;
                        }
                    }
                    case "thread/tokenUsage/updated" -> captureUsageEvent(params, receipt);
                    case "item/started" -> {
                        // The old counter never read `item/started`; recording its
                        // item types distinguishes a stream that announced a tool
                        // it never completed from one that announced no tool.
                        if (params instanceof Map<?, ?> p) {
                            String type = Json.asText(p.get("item") instanceof Map<?, ?> item
                                    ? item.get("type") : null);
                            if (type != null) {
                                receipt.startedItemTypes.merge(type, 1, Integer::sum);
                            }
                        }
                    }
                    case "item/completed" -> {
                        if (params instanceof Map<?, ?> p) {
                            captureItem(p.get("item"), receipt, seenItems, texts);
                        }
                    }
                    case "turn/completed" -> {
                        captureTurnCompleted(params, receipt, seenItems, texts);
                        if ("Unavailable".equals(receipt.stopReason)) {
                            receipt.stopReason = "natural";
                        }
                        receipt.toolRounds = receipt.toolItems.size();
                        return texts.isEmpty() ? "" : texts.get(texts.size() - 1);
                    }
                    case "error" -> {
                        Integer status = firstHttpStatus(line);
                        if (status != null) {
                            receipt.httpStatus = status.toString();
                        }
                        // The app-server's own error text is the only place it
                        // states why a turn failed. It carries no credential and
                        // no request payload, and the retained copy is bounded.
                        captureServerDiagnostic("error", params, receipt);
                    }
                    case "warning", "deprecationNotice", "configWarning" ->
                            captureServerDiagnostic(method, params, receipt);
                    default -> {
                        // Every other declared notification is outside this arm's
                        // observation surface.
                    }
                }
                if (!boundReached) {
                    if (receipt.toolItems.size() > toolRoundBudget) {
                        receipt.stopReason = "tool-rounds";
                        receipt.overshootToolRounds = receipt.toolItems.size() - toolRoundBudget;
                        boundReached = true;
                        if (!receipt.turnId.isEmpty()) {
                            interruptTurn(threadId, receipt.turnId);
                            receipt.interruptSent = true;
                        }
                    } else if (receipt.totalTokens != null && receipt.totalTokens > tokenBudget) {
                        receipt.stopReason = "tokens";
                        receipt.overshootTokens = receipt.totalTokens - tokenBudget;
                        boundReached = true;
                        if (!receipt.turnId.isEmpty()) {
                            interruptTurn(threadId, receipt.turnId);
                            receipt.interruptSent = true;
                        }
                    }
                }
            }
        }

        /** Capture the turn identity from the `turn/start` response. */
        private static void captureTurnStartResponse(Map<?, ?> envelope, Receipt receipt) {
            Long id = Json.asNumber(envelope.get("id"));
            if (id == null || id != 3L) {
                return;
            }
            String turnId = Json.nestedText(envelope.get("result"), "turn", "id");
            if (turnId != null) {
                receipt.turnId = turnId;
            }
        }

        /** The app-server's own `thread/tokenUsage/updated` breakdown. */
        private static void captureUsageEvent(Object params, Receipt receipt) {
            if (!(params instanceof Map<?, ?> p) || !(p.get("tokenUsage") instanceof Map<?, ?> usage)) {
                return;
            }
            if (usage.get("total") instanceof Map<?, ?> total) {
                applyBreakdown(total, receipt);
            }
            if (usage.get("modelContextWindow") instanceof Number window) {
                receipt.modelContextWindow = window.longValue();
            }
        }

        /**
         * Apply one token breakdown. `totalTokens` is the provider's own
         * input-plus-output total, in which cached input is already included and
         * is therefore counted once; when it is absent the total is the observed
         * input plus output.
         */
        private static void applyBreakdown(Map<?, ?> total, Receipt receipt) {
            if (total.get("inputTokens") instanceof Number value) {
                receipt.inputTokens = value.longValue();
            }
            if (total.get("cachedInputTokens") instanceof Number value) {
                receipt.cachedInputTokens = value.longValue();
            }
            if (total.get("outputTokens") instanceof Number value) {
                receipt.outputTokens = value.longValue();
            }
            if (total.get("reasoningOutputTokens") instanceof Number value) {
                receipt.reasoningTokens = value.longValue();
            }
            if (total.get("cacheWriteInputTokens") instanceof Number value) {
                receipt.cacheWriteInputTokens = value.longValue();
            }
            if (total.get("totalTokens") instanceof Number value) {
                receipt.totalTokens = value.longValue();
            } else if (receipt.inputTokens != null && receipt.outputTokens != null) {
                receipt.totalTokens = receipt.inputTokens + receipt.outputTokens;
            }
        }

        /**
         * Record one observed thread item. The item id is the de-duplication
         * key, so the same item seen through `item/completed` and through the
         * completed turn's item view is counted exactly once.
         */
        private static void captureItem(Object item, Receipt receipt, Set<String> seenItems, List<String> texts) {
            if (!(item instanceof Map<?, ?> map)) {
                return;
            }
            String type = Json.asText(map.get("type"));
            if (type == null) {
                return;
            }
            // Every observed item type is counted, tool or not, so the census
            // shows whether the turn carried reasoning/agentMessage items only
            // (no inspection at all) or any tool item.
            receipt.itemTypes.merge(type, 1, Integer::sum);
            long at = Math.max(0, System.currentTimeMillis() - receipt.startMillis);
            if ("agentMessage".equals(type)) {
                if (receipt.firstAgentMessageMillis == null) {
                    receipt.firstAgentMessageMillis = at;
                }
                String text = Json.asText(map.get("text"));
                if (text != null && !texts.contains(text)) {
                    texts.add(text);
                }
                return;
            }
            if (!TOOL_ITEM_TYPES.contains(type)) {
                return;
            }
            String id = Json.asText(map.get("id"));
            String key = id == null ? type + "@" + receipt.toolItems.size() : id;
            if (!seenItems.add(key)) {
                return;
            }
            String status = Json.asText(map.get("status"));
            String aggregated = Json.asText(map.get("aggregatedOutput"));
            long bytes = aggregated == null ? 0 : aggregated.getBytes(StandardCharsets.UTF_8).length;
            receipt.toolItems.add(new ToolItem(type, status, bytes, at));
            if (!"commandExecution".equals(type)) {
                return;
            }
            // The exact command text is recorded separately from the declared
            // read projection (which keeps its pinned row layout). It is the
            // verifiable record of what the tool actually ran, so a read can be
            // corroborated rather than inferred from the app-server's coarse
            // action classification alone.
            String command = Json.asText(map.get("command"));
            if (command != null && !command.isEmpty()) {
                String bounded = command.length() > 300 ? command.substring(0, 300) : command;
                if (receipt.readCommands.size() < 16) {
                    receipt.readCommands.add(bounded);
                }
            }
            String exitCode = map.get("exitCode") == null
                    ? "Unavailable"
                    : String.valueOf(map.get("exitCode"));
            Object actions = map.get("commandActions");
            if (!(actions instanceof List<?> list)) {
                return;
            }
            for (Object raw : list) {
                if (!(raw instanceof Map<?, ?> action)) {
                    continue;
                }
                String actionType = Json.asText(action.get("type"));
                String target = Json.asText(action.get("path"));
                if (target == null) {
                    target = Json.asText(action.get("name"));
                }
                if (target == null) {
                    target = Json.asText(action.get("query"));
                }
                receipt.reads.add(new ReadAction(
                        actionType == null ? "unknown" : actionType,
                        target == null ? "" : target,
                        bytes,
                        aggregated == null ? "" : sha256(aggregated),
                        exitCode,
                        status,
                        at));
            }
        }

        /** The completed turn: its status, item view and every item it carries. */
        private static void captureTurnCompleted(
                Object params, Receipt receipt, Set<String> seenItems, List<String> texts) {
            if (!(params instanceof Map<?, ?> p) || !(p.get("turn") instanceof Map<?, ?> turn)) {
                return;
            }
            String status = Json.asText(turn.get("status"));
            receipt.turnStatus = status == null ? "Unavailable" : status;
            String view = Json.asText(turn.get("itemsView"));
            receipt.turnItemsView = view == null ? "Unavailable" : view;
            if (turn.get("items") instanceof List<?> items) {
                receipt.turnItemsCount = items.size();
                for (Object item : items) {
                    captureItem(item, receipt, seenItems, texts);
                }
            }
            if (turn.get("error") instanceof Map<?, ?> error) {
                String message = Json.asText(error.get("message"));
                if (message != null && !message.isEmpty()) {
                    receipt.failure = message;
                }
            }
            if (turn.get("durationMs") instanceof Number duration) {
                receipt.turnDurationMs = duration.longValue();
            }
        }

        /**
         * Record one bounded server diagnostic notification (`warning`,
         * `deprecationNotice`, `configWarning`). The app-server's own message
         * text is the only place it states why a turn behaved as it did (for
         * example a model without tool support); it carries no credential and no
         * request payload, and the retained copy is capped so the receipt stays
         * small.
         */
        private static void captureServerDiagnostic(String method, Object params, Receipt receipt) {
            if (!(params instanceof Map<?, ?> p)) {
                return;
            }
            String message = Json.asText(p.get("message"));
            if (message == null) {
                message = Json.asText(p.get("text"));
            }
            if (message == null || message.isEmpty()) {
                return;
            }
            String line = method + ": " + message;
            if (line.length() > 400) {
                line = line.substring(0, 400);
            }
            if (receipt.serverDiagnostics.size() < 8 && !receipt.serverDiagnostics.contains(line)) {
                receipt.serverDiagnostics.add(line);
            }
        }

        /** The one hard stop the protocol supports: `turn/interrupt`. */
        void interruptTurn(String threadId, String turnId) throws IOException {
            send("turn/interrupt",
                    "{\"threadId\":" + jsonString(threadId) + ",\"turnId\":" + jsonString(turnId) + "}",
                    4);
        }
    }

    private static void captureUsage(String line, Receipt receipt) {
        int at = line.indexOf("\"usage\"");
        if (at < 0) {
            return;
        }
        String slice = line.substring(at);
        receipt.inputTokens = jsonLongField(slice, "input_tokens");
        receipt.cachedInputTokens = jsonLongField(slice, "cached_input_tokens");
        receipt.outputTokens = jsonLongField(slice, "output_tokens");
        receipt.reasoningTokens = jsonLongField(slice, "reasoning_output_tokens");
    }

    /**
     * The app-server reports token usage as its own `thread/tokenUsage/updated`
     * notification carrying `tokenUsage.total` (camelCase breakdown). The
     * receipt keeps only the numbers the provider actually returned; every
     * absent one stays `Unavailable`.
     */
    private static void captureThreadUsage(String line, Receipt receipt) {
        int at = line.indexOf("\"total\"");
        String slice = at < 0 ? line : line.substring(at);
        Long input = jsonLongField(slice, "inputTokens");
        Long cached = jsonLongField(slice, "cachedInputTokens");
        Long output = jsonLongField(slice, "outputTokens");
        Long reasoning = jsonLongField(slice, "reasoningOutputTokens");
        Long total = jsonLongField(slice, "totalTokens");
        Long cacheWrite = jsonLongField(slice, "cacheWriteInputTokens");
        if (input != null) {
            receipt.inputTokens = input;
        }
        if (cached != null) {
            receipt.cachedInputTokens = cached;
        }
        if (output != null) {
            receipt.outputTokens = output;
        }
        if (reasoning != null) {
            receipt.reasoningTokens = reasoning;
        }
        if (total != null) {
            receipt.totalTokens = total;
        }
        if (cacheWrite != null) {
            receipt.cacheWriteInputTokens = cacheWrite;
        }
    }

    // ------------------------------------------------------- minimal JSON read

    /**
     * A minimal, bounded JSON reader for the app-server's own event stream.
     *
     * <p>The inspected path must report what the app-server actually said, so it
     * parses the message rather than searching it for an exact serialization
     * substring. The reader never resolves the message into a generic object
     * graph beyond maps, lists and scalars, and it holds no policy.
     */
    private static final class Json {
        private final String source;
        private int index;

        private Json(String source) {
            this.source = source;
        }

        static Object parse(String text) {
            try {
                Json reader = new Json(text);
                reader.skip();
                return reader.value();
            } catch (RuntimeException e) {
                return null;
            }
        }

        static String asText(Object value) {
            return value instanceof String string ? string : null;
        }

        static Long asNumber(Object value) {
            return value instanceof Number number ? number.longValue() : null;
        }

        static String nestedText(Object value, String... path) {
            Object cursor = value;
            for (String key : path) {
                if (!(cursor instanceof Map<?, ?> map)) {
                    return null;
                }
                cursor = map.get(key);
            }
            return asText(cursor);
        }

        private void skip() {
            while (index < source.length() && Character.isWhitespace(source.charAt(index))) {
                index++;
            }
        }

        private Object value() {
            skip();
            if (index >= source.length()) {
                throw new IllegalStateException("end of input");
            }
            char c = source.charAt(index);
            return switch (c) {
                case '{' -> object();
                case '[' -> array();
                case '"' -> string();
                case 't' -> {
                    literal("true");
                    yield Boolean.TRUE;
                }
                case 'f' -> {
                    literal("false");
                    yield Boolean.FALSE;
                }
                case 'n' -> {
                    literal("null");
                    yield null;
                }
                default -> numberValue();
            };
        }

        private void literal(String expected) {
            if (!source.startsWith(expected, index)) {
                throw new IllegalStateException("not a literal");
            }
            index += expected.length();
        }

        private Map<String, Object> object() {
            Map<String, Object> map = new LinkedHashMap<>();
            index++;
            skip();
            if (index < source.length() && source.charAt(index) == '}') {
                index++;
                return map;
            }
            while (true) {
                skip();
                String key = string();
                skip();
                if (source.charAt(index) != ':') {
                    throw new IllegalStateException("expected a colon");
                }
                index++;
                map.put(key, value());
                skip();
                char separator = source.charAt(index);
                index++;
                if (separator == '}') {
                    return map;
                }
                if (separator != ',') {
                    throw new IllegalStateException("expected an object separator");
                }
            }
        }

        private List<Object> array() {
            List<Object> list = new ArrayList<>();
            index++;
            skip();
            if (index < source.length() && source.charAt(index) == ']') {
                index++;
                return list;
            }
            while (true) {
                list.add(value());
                skip();
                char separator = source.charAt(index);
                index++;
                if (separator == ']') {
                    return list;
                }
                if (separator != ',') {
                    throw new IllegalStateException("expected an array separator");
                }
            }
        }

        private String string() {
            if (source.charAt(index) != '"') {
                throw new IllegalStateException("expected a string");
            }
            index++;
            StringBuilder builder = new StringBuilder();
            while (index < source.length()) {
                char c = source.charAt(index++);
                if (c == '"') {
                    return builder.toString();
                }
                if (c != '\\') {
                    builder.append(c);
                    continue;
                }
                char escape = source.charAt(index++);
                switch (escape) {
                    case 'n' -> builder.append('\n');
                    case 't' -> builder.append('\t');
                    case 'r' -> builder.append('\r');
                    case 'b' -> builder.append('\b');
                    case 'f' -> builder.append('\f');
                    case 'u' -> {
                        builder.append((char) Integer.parseInt(source.substring(index, index + 4), 16));
                        index += 4;
                    }
                    default -> builder.append(escape);
                }
            }
            throw new IllegalStateException("unterminated string");
        }

        private Object numberValue() {
            int start = index;
            while (index < source.length() && "+-.eE0123456789".indexOf(source.charAt(index)) >= 0) {
                index++;
            }
            if (index == start) {
                throw new IllegalStateException("expected a value");
            }
            String slice = source.substring(start, index);
            if (slice.indexOf('.') < 0 && slice.indexOf('e') < 0 && slice.indexOf('E') < 0) {
                try {
                    return Long.parseLong(slice);
                } catch (NumberFormatException e) {
                    // Fall through to the floating-point form.
                }
            }
            return Double.parseDouble(slice);
        }
    }

    private static final class TaskTimeoutException extends Exception {
        private static final long serialVersionUID = 1L;
    }

    // ------------------------------------------------------- result extraction

    private static final class Structured {
        final String status;
        final List<String> paths;
        final List<Finding> findings;
        final List<Match> matches;
        final List<Judgment> judgments;

        Structured(String status, List<String> paths, List<Finding> findings,
                List<Match> matches, List<Judgment> judgments) {
            this.status = status;
            this.paths = paths;
            this.findings = findings;
            this.matches = matches;
            this.judgments = judgments;
        }

        Structured(String status, List<String> paths, List<Finding> findings) {
            this(status, paths, findings, List.of(), List.of());
        }

        Structured(String status, List<String> paths) {
            this(status, paths, List.of(), List.of(), List.of());
        }
    }

    /** One observed review finding: the file it names, its line span and its text. */
    private record Finding(
            String file, int startLine, int endLine, String severity, String category, String message) {}

    /**
     * One golden-set reference finding of one task, in the order the pinned
     * golden JSON carries it. `index` is the 1-based position the judge prompt
     * names (`G1`, `G2`, ...) and the label is the corpus's own human-reviewed
     * `tp`/`fp` label. Gold is projected mechanically here and never enters a
     * review, prediction or assisted-context closure.
     */
    private record Reference(
            int index, String file, int startLine, int endLine, boolean truePositive,
            String severity, String category, String message) {}

    /** One blinded candidate finding of one task, as the judge prompt names it. */
    private record Candidate(
            String id, String file, int startLine, int endLine, String severity,
            String category, String message) {}

    /** One candidate's raw match correspondence to the golden set. */
    private record Match(String candidate, List<String> references, String reason) {}

    /** One unmatched candidate's independent source-grounded adjudication. */
    private record Judgment(String candidate, String status, String evidence) {}

    /** Parse the pinned golden JSON into its ordered reference findings. */
    private static List<Reference> parseGold(Path gold) throws IOException {
        List<Reference> references = new ArrayList<>();
        Object parsed = Json.parse(Files.readString(gold, StandardCharsets.UTF_8));
        if (!(parsed instanceof Map<?, ?> map) || !(map.get("findings") instanceof List<?> list)) {
            return references;
        }
        int index = 0;
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> entry)) {
                continue;
            }
            String file = Json.asText(entry.get("file"));
            if (file == null) {
                continue;
            }
            Long start = Json.asNumber(entry.get("start_line"));
            Long end = Json.asNumber(entry.get("end_line"));
            String label = Json.asText(entry.get("tp_fp"));
            String severity = Json.asText(entry.get("severity"));
            String category = Json.asText(entry.get("category"));
            String message = Json.asText(entry.get("message"));
            index++;
            references.add(new Reference(index, file, start == null ? -1 : start.intValue(),
                    end == null ? -1 : end.intValue(), "tp".equalsIgnoreCase(label),
                    severity == null ? "" : severity, category == null ? "" : category,
                    message == null ? "" : message));
        }
        return references;
    }

    /** The bounded judge prompt's reference block, in golden-set order. */
    private static String renderReferences(List<Reference> references) {
        if (references.isEmpty()) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        out.append("REFERENCE FINDINGS (the golden set for this PR; `tp` is a true positive and")
                .append(" `fp` a false positive, both human-reviewed; a candidate that refers to")
                .append(" none of these is an UNMATCHED finding, never automatically a false positive):");
        for (Reference reference : references) {
            out.append("\nG").append(reference.index()).append("  ").append(reference.file())
                    .append(":").append(span(reference.startLine(), reference.endLine()))
                    .append("  [").append(reference.truePositive() ? "tp" : "fp")
                    .append(" ").append(reference.severity()).append(" ").append(reference.category())
                    .append("] ").append(reference.message());
        }
        return out.toString();
    }

    /** The bounded candidate block, in the blinded order the input file carries. */
    private static String renderCandidates(List<Candidate> candidates) {
        if (candidates.isEmpty()) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        out.append("CANDIDATE FINDINGS (blinded; the arm that produced each is not shown):");
        for (Candidate candidate : candidates) {
            out.append("\n").append(candidate.id()).append("  ").append(candidate.file())
                    .append(":").append(span(candidate.startLine(), candidate.endLine()))
                    .append("  [").append(candidate.severity()).append(" ").append(candidate.category())
                    .append("] ").append(candidate.message());
        }
        return out.toString();
    }

    private static String span(int start, int end) {
        if (start < 0) {
            return "?";
        }
        if (end < 0 || end == start) {
            return Integer.toString(start);
        }
        return start + "-" + end;
    }

    /** Read the blinded candidate projection the provider-free stage wrote. */
    private static List<Candidate> readCandidates(Path path) throws IOException {
        List<Candidate> candidates = new ArrayList<>();
        if (!Files.isRegularFile(path)) {
            return candidates;
        }
        for (String line : Files.readAllLines(path, StandardCharsets.UTF_8)) {
            String[] cells = line.split("\t", -1);
            if (cells.length < 8 || !cells[0].equals("candidate")) {
                continue;
            }
            candidates.add(new Candidate(cells[1], cells[2], intOr(cells[3], -1), intOr(cells[4], -1),
                    cells[5], cells[6], cells[7]));
        }
        return candidates;
    }

    private static int intOr(String text, int fallback) {
        try {
            return text.isEmpty() ? fallback : Integer.parseInt(text);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    /**
     * Project the golden set into the one bounded mechanical surface the Flix
     * owner consumes: `reference <TAB> task <TAB> index <TAB> file <TAB> start
     * <TAB> end <TAB> tp <TAB> severity <TAB> category <TAB> message`. It is
     * written by the JUDGE action alone, so the golden bytes are reachable only
     * from the judge closure; the evaluator reads this projection. This is
     * projection, not a verdict.
     */
    private static void writeReferences(Path out, String task, List<Reference> references) throws IOException {
        StringBuilder tsv = new StringBuilder();
        for (Reference reference : references) {
            tsv.append("reference\t").append(cell(task)).append('\t').append(reference.index()).append('\t')
                    .append(cell(reference.file())).append('\t')
                    .append(reference.startLine() < 0 ? "" : Integer.toString(reference.startLine())).append('\t')
                    .append(reference.endLine() < 0 ? "" : Integer.toString(reference.endLine())).append('\t')
                    .append(reference.truePositive() ? "tp" : "fp").append('\t')
                    .append(cell(reference.severity())).append('\t').append(cell(reference.category())).append('\t')
                    .append(cell(reference.message())).append('\n');
        }
        Files.writeString(out, tsv.toString(), StandardCharsets.UTF_8);
    }

    /**
     * Project the blinded candidates the judge found no reference for, in the
     * same bounded `candidate` row shape the candidate projection uses, so the
     * separate independent-adjudication action reads exactly those candidates and
     * never the golden set. "No reference" is the judge's own answer, so this is
     * mechanical filtering, not a verdict: the adjudication status and the
     * classification stay downstream.
     */
    private static void writeUnmatched(
            Path out, String task, List<Candidate> candidates, List<Match> matches) throws IOException {
        StringBuilder tsv = new StringBuilder();
        for (Candidate candidate : candidates) {
            boolean matched = false;
            for (Match match : matches) {
                if (match.candidate().equals(candidate.id()) && !match.references().isEmpty()) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                continue;
            }
            tsv.append("candidate\t").append(cell(candidate.id())).append('\t').append(cell(candidate.file()))
                    .append('\t').append(candidate.startLine() < 0 ? "" : Integer.toString(candidate.startLine()))
                    .append('\t').append(candidate.endLine() < 0 ? "" : Integer.toString(candidate.endLine()))
                    .append('\t').append(cell(candidate.severity())).append('\t')
                    .append(cell(candidate.category())).append('\t').append(cell(candidate.message())).append('\n');
        }
        Files.writeString(out, tsv.toString(), StandardCharsets.UTF_8);
    }

    /**
     * Project the judge or adjudication result into the one bounded mechanical
     * surface the Flix owner consumes. The judge writes `judged <TAB> task <TAB>
     * candidate <TAB> references <TAB> reason` rows (references comma-joined, `-`
     * when none). The adjudicator writes `adjudged <TAB> task <TAB> candidate
     * <TAB> status <TAB> evidence` rows. This is projection, not a verdict: the
     * claiming order, the dedup, the classification and every metric stay
     * downstream.
     */
    private static void writeJudgments(
            Path out, String task, boolean adjudication, List<Match> matches, List<Judgment> judgments)
            throws IOException {
        StringBuilder tsv = new StringBuilder();
        if (adjudication) {
            for (Judgment judgment : judgments) {
                tsv.append("adjudged\t").append(cell(task)).append('\t').append(cell(judgment.candidate()))
                        .append('\t').append(cell(judgment.status())).append('\t')
                        .append(cell(judgment.evidence())).append('\n');
            }
        } else {
            for (Match match : matches) {
                String referencesOf = match.references().isEmpty() ? "-" : String.join(",", match.references());
                tsv.append("judged\t").append(cell(task)).append('\t').append(cell(match.candidate()))
                        .append('\t').append(cell(referencesOf)).append('\t')
                        .append(cell(match.reason())).append('\n');
            }
        }
        Files.writeString(out, tsv.toString(), StandardCharsets.UTF_8);
    }

    /**
     * Extract the last {@code {"matches": [...]}} object from the judge's final
     * message. Mechanical JSON scanning, not a verdict: the claiming order, the
     * dedup and the classification stay downstream.
     */
    private static Structured extractStructuredMatches(String message) {
        if (message == null) {
            return new Structured("malformed", List.of(), List.of());
        }
        int searchFrom = message.length();
        while (true) {
            int at = message.lastIndexOf("\"matches\"", searchFrom);
            if (at < 0) {
                return new Structured("malformed", List.of(), List.of());
            }
            int open = message.lastIndexOf('{', at);
            if (open >= 0) {
                List<Match> matches = matchesOf(Json.parse(message.substring(open)));
                if (matches != null) {
                    return new Structured("ok", List.of(), List.of(), matches, List.of());
                }
            }
            searchFrom = at - 1;
            if (searchFrom <= 0) {
                return new Structured("malformed", List.of(), List.of());
            }
        }
    }

    private static List<Match> matchesOf(Object parsed) {
        if (!(parsed instanceof Map<?, ?> map) || !(map.get("matches") instanceof List<?> list)) {
            return null;
        }
        List<Match> matches = new ArrayList<>();
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> entry)) {
                return null;
            }
            String candidate = Json.asText(entry.get("candidate"));
            if (candidate == null || !(entry.get("references") instanceof List<?> refs)) {
                return null;
            }
            List<String> references = new ArrayList<>();
            for (Object reference : refs) {
                String value = Json.asText(reference);
                if (value == null) {
                    return null;
                }
                // The judge prompt names the references `G1`, `G2`, ...; the
                // projection carries the declared 1-based index alone so the
                // downstream owner parses one canonical integer vocabulary.
                references.add(value.startsWith("G") || value.startsWith("g") ? value.substring(1) : value);
            }
            String reason = Json.asText(entry.get("reason"));
            matches.add(new Match(candidate, references, reason == null ? "" : reason));
        }
        return matches;
    }

    /**
     * Extract the last {@code {"judgments": [...]}} object from the adjudicator's
     * final message. Mechanical JSON scanning, not a verdict.
     */
    private static Structured extractStructuredJudgments(String message) {
        if (message == null) {
            return new Structured("malformed", List.of(), List.of());
        }
        int searchFrom = message.length();
        while (true) {
            int at = message.lastIndexOf("\"judgments\"", searchFrom);
            if (at < 0) {
                return new Structured("malformed", List.of(), List.of());
            }
            int open = message.lastIndexOf('{', at);
            if (open >= 0) {
                List<Judgment> judgments = judgmentsOf(Json.parse(message.substring(open)));
                if (judgments != null) {
                    return new Structured("ok", List.of(), List.of(), List.of(), judgments);
                }
            }
            searchFrom = at - 1;
            if (searchFrom <= 0) {
                return new Structured("malformed", List.of(), List.of());
            }
        }
    }

    private static List<Judgment> judgmentsOf(Object parsed) {
        if (!(parsed instanceof Map<?, ?> map) || !(map.get("judgments") instanceof List<?> list)) {
            return null;
        }
        List<Judgment> judgments = new ArrayList<>();
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> entry)) {
                return null;
            }
            String candidate = Json.asText(entry.get("candidate"));
            String status = Json.asText(entry.get("status"));
            if (candidate == null || status == null) {
                return null;
            }
            String evidence = Json.asText(entry.get("evidence"));
            judgments.add(new Judgment(candidate, status, evidence == null ? "" : evidence));
        }
        return judgments;
    }

    /**
     * Extract the last {@code {"paths": [...]}} object from the agent's final
     * message. This is mechanical JSON scanning, not a verdict: existence,
     * uniqueness, order and the declared count ceiling are checked downstream.
     */
    private static Structured extractStructuredPaths(String message) {
        if (message == null) {
            return new Structured("malformed", List.of());
        }
        int searchFrom = message.length();
        while (true) {
            int at = message.lastIndexOf("\"paths\"", searchFrom);
            if (at < 0) {
                return new Structured("malformed", List.of());
            }
            int open = message.lastIndexOf('{', at);
            int close = message.indexOf(']', at);
            int objectEnd = close < 0 ? -1 : message.indexOf('}', close);
            if (open >= 0 && close >= 0 && objectEnd >= 0 && objectEnd >= open) {
                List<String> paths = parseStringArray(message.substring(at, close + 1));
                if (paths != null) {
                    return new Structured("ok", paths);
                }
            }
            searchFrom = at - 1;
            if (searchFrom <= 0) {
                return new Structured("malformed", List.of());
            }
        }
    }

    private static List<String> parseStringArray(String slice) {
        int open = slice.indexOf('[');
        int close = slice.lastIndexOf(']');
        if (open < 0 || close < open) {
            return null;
        }
        List<String> values = new ArrayList<>();
        String body = slice.substring(open + 1, close);
        int index = 0;
        while (index < body.length()) {
            int quote = body.indexOf('"', index);
            if (quote < 0) {
                break;
            }
            StringBuilder value = new StringBuilder();
            int cursor = quote + 1;
            while (cursor < body.length()) {
                char c = body.charAt(cursor);
                if (c == '\\' && cursor + 1 < body.length()) {
                    value.append(body.charAt(cursor + 1));
                    cursor += 2;
                    continue;
                }
                if (c == '"') {
                    break;
                }
                value.append(c);
                cursor++;
            }
            if (cursor >= body.length()) {
                return null;
            }
            values.add(value.toString());
            index = cursor + 1;
        }
        return values;
    }

    /**
     * Extract the last {@code {"findings": [...]}} object from the agent's final
     * message. Like the path extractor this is mechanical JSON scanning, not a
     * verdict: the count ceiling, path existence, uniqueness and the
     * classification are checked downstream. A message that carries no parseable
     * findings object is `malformed`, which the Flix owner keeps as a retained
     * failure rather than a fabricated empty review.
     */
    private static Structured extractStructuredFindings(String message) {
        if (message == null) {
            return new Structured("malformed", List.of(), List.of());
        }
        int searchFrom = message.length();
        while (true) {
            int at = message.lastIndexOf("\"findings\"", searchFrom);
            if (at < 0) {
                return new Structured("malformed", List.of(), List.of());
            }
            int open = message.lastIndexOf('{', at);
            if (open >= 0) {
                List<Finding> findings = findingsOf(Json.parse(message.substring(open)));
                if (findings != null) {
                    return new Structured("ok", List.of(), findings);
                }
            }
            searchFrom = at - 1;
            if (searchFrom <= 0) {
                return new Structured("malformed", List.of(), List.of());
            }
        }
    }

    private static List<Finding> findingsOf(Object parsed) {
        if (!(parsed instanceof Map<?, ?> map) || !(map.get("findings") instanceof List<?> list)) {
            return null;
        }
        List<Finding> findings = new ArrayList<>();
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> entry)) {
                return null;
            }
            String file = Json.asText(entry.get("file"));
            if (file == null) {
                return null;
            }
            Long start = Json.asNumber(entry.get("start_line"));
            Long end = Json.asNumber(entry.get("end_line"));
            String severity = Json.asText(entry.get("severity"));
            String category = Json.asText(entry.get("category"));
            String text = Json.asText(entry.get("message"));
            findings.add(new Finding(file, start == null ? -1 : start.intValue(),
                    end == null ? -1 : end.intValue(),
                    severity == null ? "" : severity, category == null ? "" : category,
                    text == null ? "" : text));
        }
        return findings;
    }

    // ------------------------------------------------- bounded change block

    private static int countChanged(Path changed) throws IOException {
        int count = 0;
        for (String line : Files.readAllLines(changed, StandardCharsets.UTF_8)) {
            if (line.startsWith("changed\t")) {
                count++;
            }
        }
        return count;
    }

    private static String readBounded(Path path, long budget) throws IOException {
        if (!Files.isRegularFile(path)) {
            return "";
        }
        String text = Files.readString(path, StandardCharsets.UTF_8);
        if (text.getBytes(StandardCharsets.UTF_8).length <= budget) {
            return text;
        }
        return text.substring(0, (int) Math.min((long) text.length(), budget));
    }

    /**
     * Render the bounded base-to-head change block one review turn carries: the
     * changed-file record (the measured PR change) followed by a unified diff of
     * the changed files. The diff is the permitted PR metadata; the base revision
     * itself is never exposed to the sandbox. Both the file count and the byte
     * volume are bounded, and a bound that bites is stated rather than hidden.
     */
    private static String renderChangeBlock(Path changed, Path base, Path head) throws IOException {
        StringBuilder out = new StringBuilder();
        List<String[]> records = new ArrayList<>();
        for (String line : Files.readAllLines(changed, StandardCharsets.UTF_8)) {
            if (!line.startsWith("changed\t")) {
                continue;
            }
            String[] fields = line.split("\t", -1);
            if (fields.length >= 4) {
                records.add(fields);
            }
        }
        out.append("The pull request under review changes the following files "
                + "(base revision -> head revision):\n\n");
        for (String[] record : records) {
            out.append("- ").append(record[1]).append(' ').append(record[2])
                    .append(" (").append(record[3]).append(" bytes)\n");
        }
        out.append("\nBounded unified diff of the changed files:\n");
        long budget = REVIEW_CHANGE_BYTE_BUDGET;
        int files = 0;
        boolean truncated = false;
        for (String[] record : records) {
            if (files >= REVIEW_CHANGED_FILE_LIMIT || budget <= 0) {
                truncated = true;
                break;
            }
            String hunk = fileHunk(record[2], base, head, Math.min(budget, REVIEW_FILE_BYTE_BUDGET));
            if (hunk.isEmpty()) {
                continue;
            }
            out.append(hunk);
            budget -= hunk.getBytes(StandardCharsets.UTF_8).length;
            files++;
        }
        if (truncated) {
            out.append("\n[diff bounded: further changed files omitted by the declared cap]\n");
        }
        return out.toString();
    }

    private static String fileHunk(String path, Path base, Path head, long budget) throws IOException {
        Path baseFile = base.resolve(path).normalize();
        Path headFile = head.resolve(path).normalize();
        if (!baseFile.startsWith(base) || !headFile.startsWith(head)) {
            return "";
        }
        boolean hasBase = Files.isRegularFile(baseFile);
        boolean hasHead = Files.isRegularFile(headFile);
        if (!hasBase && !hasHead) {
            return "";
        }
        if (hasBase && hasHead && sameBytes(baseFile, headFile)) {
            return "";
        }
        if (hasBase && hasHead && Files.size(baseFile) > 262144L && Files.size(headFile) > 262144L) {
            return "--- a/" + path + "\n+++ b/" + path + "\n[large file: " + Files.size(baseFile)
                    + " -> " + Files.size(headFile) + " bytes; content not inlined]\n";
        }
        List<String> baseLines = hasBase ? boundedLines(baseFile) : List.of();
        List<String> headLines = hasHead ? boundedLines(headFile) : List.of();
        if (baseLines == null || headLines == null) {
            return "--- a/" + path + "\n+++ b/" + path + "\n[binary or unreadable file; content not inlined]\n";
        }
        int prefix = 0;
        int max = Math.min(baseLines.size(), headLines.size());
        while (prefix < max && baseLines.get(prefix).equals(headLines.get(prefix))) {
            prefix++;
        }
        int suffix = 0;
        while (suffix < max - prefix && baseLines.get(baseLines.size() - 1 - suffix)
                .equals(headLines.get(headLines.size() - 1 - suffix))) {
            suffix++;
        }
        StringBuilder hunk = new StringBuilder();
        hunk.append("--- ").append(hasBase ? "a/" + path : "/dev/null").append('\n');
        hunk.append("+++ ").append(hasHead ? "b/" + path : "/dev/null").append('\n');
        hunk.append("@@ -").append(prefix + 1).append(',')
                .append(baseLines.size() - prefix - suffix).append(" +")
                .append(prefix + 1).append(',').append(headLines.size() - prefix - suffix).append(" @@\n");
        for (int i = prefix; i < baseLines.size() - suffix; i++) {
            hunk.append('-').append(baseLines.get(i)).append('\n');
        }
        for (int i = prefix; i < headLines.size() - suffix; i++) {
            hunk.append('+').append(headLines.get(i)).append('\n');
        }
        String rendered = hunk.toString();
        if (rendered.getBytes(StandardCharsets.UTF_8).length > budget) {
            return "--- a/" + path + "\n+++ b/" + path
                    + "\n[changed file exceeds the declared per-file diff cap]\n";
        }
        return rendered;
    }

    private static boolean sameBytes(Path a, Path b) throws IOException {
        return Files.size(a) == Files.size(b) && Files.mismatch(a, b) < 0;
    }

    /** Read a file as lines, or null when it is not decodable UTF-8 text. */
    private static List<String> boundedLines(Path file) {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
                if (lines.size() >= REVIEW_FILE_LINE_LIMIT) {
                    lines.add("[truncated at the declared per-file line cap]");
                    break;
                }
            }
        } catch (IOException e) {
            return null;
        }
        return lines;
    }

    // ----------------------------------------------------------------- receipt

    /** One observed inspection item: its type, status, output bytes and offset. */
    private record ToolItem(String type, String status, long bytes, long atMillis) {}

    /** One observed command action, with the output bytes the tool returned. */
    private record ReadAction(
            String actionType, String target, long bytes, String sha256, String exitCode,
            String status, long atMillis) {}

    private static final class Receipt {
        final String task;
        final String world;
        final String model;
        final String effort;
        final String backend;
        String promptIdentity = "Unavailable";
        long startMillis;
        long endMillis;
        long timeoutCapSeconds = 300;
        boolean turnCompleted;
        String resultStatus = "error";
        String failure = "";
        String rawResult = "";
        List<String> paths = List.of();
        long toolCalls;
        String httpStatus = "";
        Long inputTokens;
        Long cachedInputTokens;
        Long outputTokens;
        Long reasoningTokens;
        Long totalTokens;
        Long cacheWriteInputTokens;
        // The opt-in inspected path's observation surface. In the original mode
        // these stay at their declared defaults: the original receipt keeps its
        // published shape and is never rewritten by the new path.
        String arm = "original";
        boolean inspectMode;
        // The opt-in ReviewBench review path's observation surface. In every
        // other mode these stay at their declared defaults, so the original and
        // inspected receipts keep their published shape.
        boolean reviewMode;
        // The opt-in ReviewBench judge/adjudication path's observation surface. In
        // every other mode these stay at their declared defaults, so the original,
        // inspected and review receipts keep their published shape.
        boolean judgeMode;
        String judgeRole = "";
        long candidateCount;
        String goldIdentity = "Unavailable";
        List<Match> matches = List.of();
        List<Judgment> judgments = List.of();
        long changedFiles;
        long changeBytes;
        long contextBytes;
        String contextIdentity = "Unavailable";
        Long firstAgentMessageMillis;
        List<Finding> findings = List.of();
        String resolvedModel = "Unavailable";
        boolean resultSchemaEmitted = true;
        long notificationsSeen;
        long turnItemsCount;
        int toolRoundBudget = 32;
        long tokenBudget = 256000;
        long toolRounds;
        int overshootToolRounds;
        long overshootTokens;
        String stopReason = "Unavailable";
        String turnStatus = "Unavailable";
        String turnItemsView = "Unavailable";
        String turnId = "";
        boolean interruptSent;
        Long modelContextWindow;
        long turnDurationMs;
        final List<ToolItem> toolItems = new ArrayList<>();
        final List<ReadAction> reads = new ArrayList<>();
        final Map<String, Integer> itemTypes = new LinkedHashMap<>();
        final Map<String, Integer> startedItemTypes = new LinkedHashMap<>();
        final Map<String, Integer> methodCounts = new LinkedHashMap<>();
        final List<String> serverDiagnostics = new ArrayList<>();
        final List<String> readCommands = new ArrayList<>();

        Receipt(String task, String world, String model, String effort, String backend) {
            this.task = task;
            this.world = world;
            this.model = model;
            this.effort = effort;
            this.backend = backend;
        }

        String render() {
            StringBuilder json = new StringBuilder();
            json.append("{\n");
            field(json, "task", jsonString(task));
            field(json, "world", jsonString(world));
            field(json, "prompt_identity", jsonString(promptIdentity));
            field(json, "requested_model", jsonString(model));
            field(json, "resolved_model", jsonString(resolvedModel));
            field(json, "result_schema_emitted", Boolean.toString(resultSchemaEmitted));
            field(json, "effort", jsonString(effort));
            field(json, "backend", jsonString(backend));
            field(json, "start_unix_ms", Long.toString(startMillis));
            field(json, "end_unix_ms", Long.toString(endMillis));
            field(json, "turn_wall_ms", Long.toString(Math.max(0, endMillis - startMillis)));
            field(json, "remote_wall_ms", jsonString("Unavailable"));
            field(json, "queue_wall_ms", jsonString("Unavailable"));
            field(json, "timeout_cap_seconds", Long.toString(timeoutCapSeconds));
            field(json, "timed_out", Boolean.toString(resultStatus.equals("timeout")));
            field(json, "turn_completed", Boolean.toString(turnCompleted));
            field(json, "result_status", jsonString(resultStatus));
            field(json, "failure", jsonString(failure));
            field(json, "http_status", httpStatus.isEmpty() ? jsonString("Unavailable") : jsonString(httpStatus));
            field(json, "tool_calls", Long.toString(toolCalls));
            field(json, "input_cached_tokens", orUnavailable(cachedInputTokens));
            field(json, "input_tokens", orUnavailable(inputTokens));
            field(json, "output_tokens", orUnavailable(outputTokens));
            field(json, "reasoning_tokens", orUnavailable(reasoningTokens));
            field(json, "total_tokens", orUnavailable(totalTokens));
            field(json, "cache_write_input_tokens", orUnavailable(cacheWriteInputTokens));
            field(json, "arm", jsonString(arm));
            field(json, "inspect_mode", Boolean.toString(inspectMode));
            field(json, "review_mode", Boolean.toString(reviewMode));
            field(json, "judge_mode", Boolean.toString(judgeMode));
            field(json, "judge_role", jsonString(judgeRole));
            field(json, "gold_identity", jsonString(goldIdentity));
            field(json, "candidate_count", Long.toString(candidateCount));
            field(json, "match_count", Integer.toString(matches.size()));
            field(json, "judgment_count", Integer.toString(judgments.size()));
            field(json, "changed_files", Long.toString(changedFiles));
            field(json, "change_bytes", Long.toString(changeBytes));
            field(json, "context_bytes", Long.toString(contextBytes));
            field(json, "context_identity", jsonString(contextIdentity));
            field(json, "finding_count", Integer.toString(findings.size()));
            field(json, "first_finding_ms",
                    firstAgentMessageMillis == null ? jsonString("Unavailable") : firstAgentMessageMillis.toString());
            field(json, "tool_rounds", Long.toString(toolRounds));
            field(json, "tool_round_budget", Integer.toString(toolRoundBudget));
            field(json, "token_budget", Long.toString(tokenBudget));
            field(json, "overshoot_tool_rounds", Integer.toString(overshootToolRounds));
            field(json, "overshoot_tokens", Long.toString(overshootTokens));
            field(json, "stop_reason", jsonString(stopReason));
            field(json, "interrupt_sent", Boolean.toString(interruptSent));
            field(json, "turn_status", jsonString(turnStatus));
            field(json, "turn_items_view", jsonString(turnItemsView));
            field(json, "turn_items_count", Long.toString(turnItemsCount));
            field(json, "notifications_seen", Long.toString(notificationsSeen));
            field(json, "method_counts", jsonString(histogram(methodCounts)));
            field(json, "observed_item_types", jsonString(histogram(itemTypes)));
            field(json, "started_item_types", jsonString(histogram(startedItemTypes)));
            field(json, "server_diagnostics", jsonString(String.join(" | ", serverDiagnostics)));
            field(json, "read_commands", jsonString(String.join(" | ", readCommands)));
            field(json, "turn_duration_ms",
                    turnDurationMs == 0 ? jsonString("Unavailable") : Long.toString(turnDurationMs));
            field(json, "model_context_window",
                    modelContextWindow == null ? jsonString("Unavailable") : modelContextWindow.toString());
            field(json, "tool_item_types", jsonString(toolItemTypes()));
            field(json, "read_count", Integer.toString(reads.size()));
            field(json, "read_bytes_total", Long.toString(readBytesTotal()));
            field(json, "nonempty_read_count", Integer.toString(nonemptyReadCount()));
            field(json, "first_nonempty_read_ms", firstNonemptyReadMillis());
            field(json, "usage", jsonString(usageSummary()));
            field(json, "path_count", Integer.toString(paths.size()));
            json.append("  \"paths\": [");
            for (int i = 0; i < paths.size(); i++) {
                json.append(i == 0 ? "" : ", ").append(jsonString(paths.get(i)));
            }
            json.append("],\n");
            field(json, "raw_result", jsonString(rawResult));
            json.append("  \"raw_result_present\": ").append(!rawResult.isEmpty()).append("\n");
            json.append("}\n");
            return json.toString();
        }

        /** Total output bytes the observed inspection commands returned. */
        private long readBytesTotal() {
            long total = 0;
            for (ReadAction action : reads) {
                total += action.bytes();
            }
            return total;
        }

        /** Observed actions that returned nonempty output, reads and discovery alike. */
        private int nonemptyReadCount() {
            int count = 0;
            for (ReadAction action : reads) {
                if (action.bytes() > 0) {
                    count++;
                }
            }
            return count;
        }

        /**
         * The offset of the first observed inspection action that returned
         * nonempty output, or `Unavailable`. This is a byte observation, not a
         * relevance judgment: the first action that *returned bytes* is not
         * claimed to be the first *relevant* read.
         */
        private String firstNonemptyReadMillis() {
            long first = Long.MAX_VALUE;
            for (ReadAction action : reads) {
                if (action.bytes() > 0 && action.atMillis() < first) {
                    first = action.atMillis();
                }
            }
            return first == Long.MAX_VALUE ? jsonString("Unavailable") : Long.toString(first);
        }

        /** The observed inspection-item-type histogram, e.g. `commandExecution=3;fileChange=1`. */
        private String toolItemTypes() {
            Map<String, Integer> counts = new LinkedHashMap<>();
            for (ToolItem item : toolItems) {
                counts.merge(item.type(), 1, Integer::sum);
            }
            return histogram(counts);
        }

        /** A stable `name=count;name=count` rendering of one bounded census. */
        private static String histogram(Map<String, Integer> counts) {
            StringBuilder summary = new StringBuilder();
            for (Map.Entry<String, Integer> entry : counts.entrySet()) {
                if (summary.length() > 0) {
                    summary.append(';');
                }
                summary.append(entry.getKey()).append('=').append(entry.getValue());
            }
            return summary.toString();
        }

        private String usageSummary() {
            if (inputTokens == null && outputTokens == null) {
                return "Unavailable";
            }
            return "input=" + orUnavailable(inputTokens) + " cached=" + orUnavailable(cachedInputTokens)
                    + " output=" + orUnavailable(outputTokens) + " reasoning=" + orUnavailable(reasoningTokens)
                    + " total=" + orUnavailable(totalTokens);
        }

        private static String orUnavailable(Long value) {
            return value == null ? jsonString("Unavailable") : value.toString();
        }

        private static void field(StringBuilder json, String name, String value) {
            json.append("  \"").append(name).append("\": ").append(value).append(",\n");
        }
    }

    private static String jsonString(String value) {
        if (value == null) {
            return "null";
        }
        return "\"" + jsonEscape(value) + "\"";
    }

    private static String jsonEscape(String value) {
        StringBuilder escaped = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                default -> {
                    if (c < 0x20) {
                        escaped.append(String.format("\\u%04x", (int) c));
                    } else {
                        escaped.append(c);
                    }
                }
            }
        }
        return escaped.toString();
    }

    // ------------------------------------------------------------ small helpers

    private static Integer jsonInt(String line, String marker) {
        int at = line.indexOf(marker);
        if (at < 0) {
            return null;
        }
        int cursor = line.indexOf(':', at);
        if (cursor < 0) {
            return null;
        }
        cursor++;
        while (cursor < line.length() && line.charAt(cursor) == ' ') {
            cursor++;
        }
        int start = cursor;
        while (cursor < line.length() && (Character.isDigit(line.charAt(cursor)) || line.charAt(cursor) == '-')) {
            cursor++;
        }
        if (cursor == start) {
            return null;
        }
        try {
            return Integer.parseInt(line.substring(start, cursor));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Long jsonLongField(String slice, String name) {
        int at = slice.indexOf("\"" + name + "\"");
        if (at < 0) {
            return null;
        }
        int cursor = slice.indexOf(':', at);
        if (cursor < 0) {
            return null;
        }
        cursor++;
        while (cursor < slice.length() && slice.charAt(cursor) == ' ') {
            cursor++;
        }
        int start = cursor;
        while (cursor < slice.length() && Character.isDigit(slice.charAt(cursor))) {
            cursor++;
        }
        if (cursor == start) {
            return null;
        }
        try {
            return Long.parseLong(slice.substring(start, cursor));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String jsonStringField(String slice, String name) {
        int at = slice.indexOf("\"" + name + "\"");
        while (at >= 0) {
            int colon = slice.indexOf(':', at);
            if (colon < 0) {
                return null;
            }
            int cursor = colon + 1;
            while (cursor < slice.length() && slice.charAt(cursor) == ' ') {
                cursor++;
            }
            if (cursor < slice.length() && slice.charAt(cursor) == '"') {
                StringBuilder value = new StringBuilder();
                int index = cursor + 1;
                while (index < slice.length()) {
                    char c = slice.charAt(index);
                    if (c == '\\' && index + 1 < slice.length()) {
                        char next = slice.charAt(index + 1);
                        value.append(next == 'n' ? '\n' : next == 't' ? '\t' : next);
                        index += 2;
                        continue;
                    }
                    if (c == '"') {
                        return value.toString();
                    }
                    value.append(c);
                    index++;
                }
                return null;
            }
            at = slice.indexOf("\"" + name + "\"", at + 1);
        }
        return null;
    }

    private static int countOccurrences(String haystack, String needle) {
        int count = 0;
        int at = haystack.indexOf(needle);
        while (at >= 0) {
            count++;
            at = haystack.indexOf(needle, at + needle.length());
        }
        return count;
    }

    /**
     * The first HTTP status the app-server surfaced, read from its bounded
     * stderr diagnostics. The token value is never persisted, so the status code
     * is the only auth/rate-limit evidence a receipt carries. Detection errs
     * toward the safe direction: a code must stand alone as a number, and the
     * rate-limit code additionally needs an explicit rate-limit marker, so no
     * speculative job reduction can follow a coincidental `429` in unrelated
     * text. A missed code only leaves the default fan-out in place.
     */
    private static Integer firstHttpStatus(String text) {
        for (String code : new String[] {"401", "429", "403", "400", "500", "502", "503"}) {
            if (hasStatus(text, code, code.equals("429"))) {
                return Integer.parseInt(code);
            }
        }
        return null;
    }

    private static boolean hasStatus(String text, String code, boolean requireRateLimitMarker) {
        int from = 0;
        while (true) {
            int at = text.indexOf(code, from);
            if (at < 0) {
                return false;
            }
            int end = at + code.length();
            boolean standalone = (at == 0 || !Character.isDigit(text.charAt(at - 1)))
                    && (end >= text.length() || !Character.isDigit(text.charAt(end)));
            if (standalone) {
                if (!requireRateLimitMarker) {
                    return true;
                }
                String window = text.substring(Math.max(0, at - 80), Math.min(text.length(), end + 80))
                        .toLowerCase();
                if (window.contains("too many requests") || window.contains("rate limit")
                        || window.contains("status")) {
                    return true;
                }
            }
            from = at + 1;
        }
    }

    private static void deleteRecursively(File file) {
        if (file == null) {
            return;
        }
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) {
                deleteRecursively(child);
            }
        }
        file.delete();
    }

    private static String required(Map<String, String> options, String name) {
        String value = options.get(name);
        if (value == null || value.isEmpty()) {
            throw new IllegalArgumentException("missing required option --" + name);
        }
        return value;
    }

    private static Map<String, String> parseOptions(String[] args) {
        Map<String, String> options = new LinkedHashMap<>();
        for (int i = 0; i < args.length; i++) {
            String arg = args[i];
            if (!arg.startsWith("--")) {
                continue;
            }
            String name = arg.substring(2);
            int equals = name.indexOf('=');
            if (equals >= 0) {
                options.put(name.substring(0, equals), name.substring(equals + 1));
            } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                options.put(name, args[++i]);
            } else {
                options.put(name, "true");
            }
        }
        return options;
    }
}
