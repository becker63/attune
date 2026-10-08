package attune.tools.sol;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
 */
public final class SolLocalizeDriver {

    private static final String CHATGPT_PLAN_PROVIDER = "openai_chatgpt_plan";
    private static final String APP_NAME = "Attune Localization Research";

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
        String task = required(options, "task");
        String world = required(options, "world");
        String model = options.getOrDefault("model", "gpt-6.1-sol");
        String effort = options.getOrDefault("effort", "medium");
        String backend = options.getOrDefault("backend", "codex-app-server");
        long timeoutSeconds = Long.parseLong(options.getOrDefault("timeout", "300"));
        Path codex = Paths.get(required(options, "codex"));
        Path repoManifest = Paths.get(required(options, "repo"));
        String prompt = Files.readString(Paths.get(required(options, "prompt")), StandardCharsets.UTF_8);
        String issue = issueForTask(Paths.get(required(options, "issue-tree")), task);

        Receipt receipt = new Receipt(task, world, model, effort, backend);
        receipt.timeoutCapSeconds = timeoutSeconds;
        receipt.promptIdentity = options.getOrDefault("prompt-identity", "Unavailable");
        receipt.startMillis = System.currentTimeMillis();

        Path home = Files.createTempDirectory("attune-sol-");
        Path repo = materializeRepo(repoManifest, home.resolve("repo"));
        Process process = null;
        try {
            ProcessBuilder builder = new ProcessBuilder(launchCommand(codex));
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
            String threadId = session.awaitThreadId(2);
            session.send("turn/start", "{\"threadId\":\"" + jsonEscape(threadId) + "\",\"model\":\""
                    + model + "\",\"effort\":\"" + effort + "\",\"input\":[{\"type\":\"text\",\"text\":"
                    + jsonString(prompt + "\n" + issue) + "}]}", 3);
            String finalMessage = session.awaitTurnCompletion(receipt);
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

        String awaitThreadId(int id) throws IOException, TaskTimeoutException {
            String response = awaitResponse(id);
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
                if (line.contains("\"item/completed\"")) {
                    receipt.toolCalls += countOccurrences(line, "\"toolCall\"")
                            + countOccurrences(line, "\"commandExecution\"");
                    String text = jsonStringField(line, "text");
                    if (line.contains("\"agentMessage\"") && text != null) {
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
            field(json, "resolved_model", jsonString("Unavailable"));
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

        private String usageSummary() {
            if (inputTokens == null && outputTokens == null) {
                return "Unavailable";
            }
            return "input=" + orUnavailable(inputTokens) + " cached=" + orUnavailable(cachedInputTokens)
                    + " output=" + orUnavailable(outputTokens) + " reasoning=" + orUnavailable(reasoningTokens);
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
