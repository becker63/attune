package attune.inference;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The mechanical ReviewBench JEV receipt writer (`VAL-REVIEW-002`, owner decision
 * 2026-10-08).
 *
 * <p>It is the mechanical substrate of the ReviewBench shared-context JEV memo
 * and nothing more: it reads the exact public Decisions payloads the Flix owner
 * built, speaks the native OpenRouter Decisions boundary (no MCP process, no MCP
 * tool, no chat endpoint, no model substitution), persists one sanitized receipt
 * per request BEFORE the next request is issued, and writes the observed-field
 * manifest the Flix owner classifies. It decides nothing: no prompt, no
 * condition, no outcome mapping, no memo policy and no fail-closed gate lives
 * here — those are the Flix owner's.
 *
 * <p>The credential is read only inside {@link OpenRouterDecisions}, from the
 * child process environment under the launcher-native name, and never appears in
 * an argument, a log, a receipt or the manifest. The exact public payload and the
 * sanitized raw provider body are retained locally so a replay needs no provider
 * call.
 *
 * <p>Usage:
 * <pre>
 *   ReviewBenchJev --requests &lt;tsv&gt; --questions &lt;tsv&gt; --out &lt;dir&gt;
 *                  [--prior &lt;manifest&gt;] [--dry-run]
 * </pre>
 */
public final class ReviewBenchJev {

    private static final ObjectMapper JSON = new ObjectMapper();

    private ReviewBenchJev() {}

    static final String MANIFEST_HEADER =
        "#decision\tcondition\ttask\tcandidate\trank\tpayload_sha256\tmodel\tprovider"
            + "\tprovider_request_id\tlatency_ms\tretries\tinput_tokens\toutput_tokens\tcost"
            + "\tstatus\tanswer_kind\tanswer_choice";

    public static void main(String[] args) throws Exception {
        Map<String, String> opt = new LinkedHashMap<>();
        for (int i = 0; i < args.length; i++) {
            if (args[i].startsWith("--")) {
                String name = args[i].substring(2);
                if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                    opt.put(name, args[++i]);
                } else {
                    opt.put(name, "true");
                }
            }
        }
        Path requests = Paths.get(opt.getOrDefault("requests", ""));
        Path questions = Paths.get(opt.getOrDefault("questions", ""));
        Path out = Paths.get(opt.getOrDefault("out", ""));
        boolean dryRun = "true".equals(opt.getOrDefault("dry-run", "false"));
        Path receipts = out.resolve("receipts");
        Files.createDirectories(receipts);

        Map<String, String> prior = opt.containsKey("prior") ? priorByHash(Paths.get(opt.get("prior"))) : new LinkedHashMap<>();
        Map<String, List<String[]>> questionsByTask = questionsByTask(questions);

        List<String[]> rows = new ArrayList<>();
        int batch = 0;
        int calls = 0;
        int reused = 0;
        long runStart = System.currentTimeMillis();
        for (String[] request : readRows(requests)) {
            if (request.length < 5 || !"request".equals(request[0])) {
                continue;
            }
            batch++;
            String condition = request[1];
            String task = request[2];
            String payloadHash = request[3];
            // A declared relative payload name resolves beside the request record,
            // so the acquisition reads the exact bytes the Flix owner wrote rather
            // than a sandbox path that does not survive the stage action.
            Path payloadPath = Paths.get(request[4]);
            if (!payloadPath.isAbsolute()) {
                Path parent = requests.toAbsolutePath().getParent();
                payloadPath = parent == null ? payloadPath : parent.resolve(payloadPath);
            }
            String payload = new String(Files.readAllBytes(payloadPath), StandardCharsets.UTF_8);
            if (!sha256(payload).equals(payloadHash)) {
                throw new IllegalStateException("declared payload hash does not match the payload bytes: " + task);
            }
            List<String[]> taskQuestions = questionsByTask.getOrDefault(task, new ArrayList<>());

            // Exact-payload memo, mechanical: a request whose exact payload hash was
            // already observed with an Ok status is never re-requested.
            String priorRow = prior.get(payloadHash);
            if (priorRow != null && priorRow.contains("\tOk\t")) {
                reused++;
                emitTaskRows(rows, condition, task, payloadHash, taskQuestions, priorRow, priorAnswerKey(priorRow));
                System.out.println("[" + batch + "] " + task + " reused-exact-payload");
                continue;
            }

            Map<String, Object> receipt = new LinkedHashMap<>();
            receipt.put("condition", condition);
            receipt.put("task", task);
            receipt.put("payload_sha256", payloadHash);
            receipt.put("requested_model", AttuneDecisions.REQUESTED_MODEL);
            receipt.put("payload", payload);
            receipt.put("batch_index", batch);
            if (dryRun) {
                receipt.put("status", "DryRun");
                writeJson(receipts.resolve(task + ".json"), receipt);
                continue;
            }
            calls++;
            long started = System.currentTimeMillis();
            String body = AttuneDecisions.decide(payload);
            long latency = System.currentTimeMillis() - started;
            int attempts = AttuneDecisions.lastAttempts();
            receipt.put("latency_ms", latency);
            receipt.put("attempts", attempts);
            receipt.put("retries", Math.max(0, attempts - 1));
            receipt.put("raw_response", body);

            JsonNode root;
            try {
                root = JSON.readTree(body);
            } catch (Exception malformed) {
                root = null;
            }
            if (root == null || root.has("error")) {
                String kind = root == null ? "decode" : root.path("error").path("kind").asText("provider");
                receipt.put("status", "Failed:" + kind);
                writeJson(receipts.resolve(task + ".json"), receipt);
                for (String[] question : taskQuestions) {
                    rows.add(new String[] {"decision", condition, task, question[3], question[4], payloadHash,
                        "", "", "", Long.toString(latency), Integer.toString(Math.max(0, attempts - 1)),
                        "", "", "", "Failed:" + kind, "", ""});
                }
                System.out.println("[" + batch + "] " + task + " Failed:" + kind + " " + latency + "ms");
                continue;
            }

            String model = root.path("model").asText("");
            String provider = root.path("provider").asText("");
            String id = root.path("id").asText("");
            JsonNode usage = root.path("usage");
            String inputTokens = usage.path("input_tokens").isNumber() ? usage.path("input_tokens").asText() : "";
            String outputTokens = usage.path("output_tokens").isNumber() ? usage.path("output_tokens").asText() : "";
            String cost = usage.path("cost").isNumber() ? usage.path("cost").asText() : "";
            receipt.put("resolved_model", model);
            receipt.put("provider", provider);
            receipt.put("provider_request_id", id);
            receipt.put("usage", JSON.convertValue(usage, Object.class));
            receipt.put("status", "Ok");
            JsonNode answers = root.path("answers");
            List<Object> decisions = new ArrayList<>();
            for (String[] question : taskQuestions) {
                JsonNode answer = answers.path(question[2]);
                String kind = answer.path("type").asText("");
                String choice = answer.path("choice").asText("");
                rows.add(new String[] {"decision", condition, task, question[3], question[4], payloadHash,
                    model, provider, id, Long.toString(latency), Integer.toString(Math.max(0, attempts - 1)),
                    inputTokens, outputTokens, cost, "Ok", kind, choice});
                Map<String, Object> decision = new LinkedHashMap<>();
                decision.put("question", question[2]);
                decision.put("candidate", question[3]);
                decision.put("rank", question[4]);
                decision.put("answer_kind", kind);
                decision.put("answer_choice", choice);
                decisions.add(decision);
            }
            receipt.put("decisions", decisions);
            // Persist BEFORE the next request is issued.
            writeJson(receipts.resolve(task + ".json"), receipt);
            System.out.println("[" + batch + "] " + task + " Ok n=" + taskQuestions.size()
                + " " + latency + "ms model=" + model + " provider=" + provider);
        }

        writeManifest(out.resolve("jev-observed.tsv"), rows);
        Map<String, Object> run = new LinkedHashMap<>();
        run.put("requests", batch);
        run.put("provider_calls", calls);
        run.put("reused_exact_payloads", reused);
        run.put("logical_decisions", rows.size());
        run.put("wall_ms", System.currentTimeMillis() - runStart);
        run.put("dry_run", dryRun);
        writeJson(out.resolve("run.json"), run);
        System.out.println("run complete: requests=" + batch + " calls=" + calls + " reused=" + reused
            + " decisions=" + rows.size());
    }

    /** The observed-field rows of one reused request, read back from its prior manifest row. */
    private static void emitTaskRows(List<String[]> rows, String condition, String task, String payloadHash,
        List<String[]> questions, String priorRow, String priorAnswerKey) {
        String[] cells = priorRow.split("\t", -1);
        for (String[] question : questions) {
            rows.add(new String[] {"decision", condition, task, question[3], question[4], payloadHash,
                cell(cells, 6), cell(cells, 7), cell(cells, 8), cell(cells, 9), cell(cells, 10),
                cell(cells, 11), cell(cells, 12), cell(cells, 13), "Ok", priorAnswerKey, ""});
        }
    }

    private static String priorAnswerKey(String priorRow) {
        return cell(priorRow.split("\t", -1), 15);
    }

    private static String cell(String[] cells, int index) {
        return index < cells.length ? cells[index] : "";
    }

    /** `payload_sha256 -> one manifest row` from a prior manifest, for exact-payload reuse. */
    private static Map<String, String> priorByHash(Path manifest) throws IOException {
        Map<String, String> index = new LinkedHashMap<>();
        if (!Files.exists(manifest)) {
            return index;
        }
        for (String line : Files.readAllLines(manifest, StandardCharsets.UTF_8)) {
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            String[] cells = line.split("\t", -1);
            if (cells.length > 5 && "decision".equals(cells[0])) {
                index.putIfAbsent(cells[5], line);
            }
        }
        return index;
    }

    /** `task -> [(question key, candidate, rank)]`, in declared order. */
    private static Map<String, List<String[]>> questionsByTask(Path questions) throws IOException {
        Map<String, List<String[]>> index = new LinkedHashMap<>();
        for (String[] row : readRows(questions)) {
            if (row.length >= 4 && "question".equals(row[0])) {
                index.computeIfAbsent(row[1], key -> new ArrayList<>()).add(row);
            }
        }
        return index;
    }

    private static List<String[]> readRows(Path path) throws IOException {
        List<String[]> rows = new ArrayList<>();
        if (!Files.exists(path)) {
            return rows;
        }
        for (String line : Files.readAllLines(path, StandardCharsets.UTF_8)) {
            if (!line.isEmpty()) {
                rows.add(line.split("\t", -1));
            }
        }
        return rows;
    }

    private static void writeManifest(Path path, List<String[]> rows) throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
            writer.write(MANIFEST_HEADER + "\n");
            for (String[] row : rows) {
                writer.write(String.join("\t", row) + "\n");
            }
        }
    }

    private static void writeJson(Path path, Map<String, Object> value) throws IOException {
        Files.createDirectories(path.getParent());
        ObjectNode node = JSON.createObjectNode();
        node.setAll(JSON.convertValue(value, ObjectNode.class));
        Files.write(path, JSON.writerWithDefaultPrettyPrinter().writeValueAsString(node)
            .getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256(String text) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] bytes = digest.digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            out.append(Character.forDigit((b >> 4) & 0xf, 16));
            out.append(Character.forDigit(b & 0xf, 16));
        }
        return out.toString();
    }
}
