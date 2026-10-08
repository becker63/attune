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
        receipt.arm = inspect ? "inspected" : "original";
        receipt.inspectMode = inspect;
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
                turnParams.append(",\"outputSchema\":").append(RESULT_SCHEMA);
            }
            turnParams.append(",\"input\":[{\"type\":\"text\",\"text\":")
                    .append(jsonString(prompt + "\n" + issue)).append("}]}");
            session.send("turn/start", turnParams.toString(), 3);
            String finalMessage = inspect
                    ? session.awaitInspectedTurn(receipt, threadId, toolRoundBudget, tokenBudget)
                    : session.awaitTurnCompletion(receipt);
            receipt.turnCompleted = true;
            receipt.endMillis = System.currentTimeMillis();
            receipt.rawResult = finalMessage;
            Structured structured = extractStructuredPaths(finalMessage);
            receipt.resultStatus = structured.status;
            receipt.paths = structured.paths;
            if (receipt.resultStatus.equals("malformed")) {
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

        Structured(String status, List<String> paths) {
            this.status = status;
            this.paths = paths;
        }
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
