package attune.tools.policy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * The minimal Java file boundary for the Flix-owned Attune policy.
 *
 * <p>This class decides nothing about policy. For the hermetic declared-source
 * check it reads the declared source manifest, resolves each entry inside the
 * action sandbox or the test runfiles tree, and writes an inventory record file.
 * For the separate local audit it walks the live workspace read-only. In both
 * modes it launches the compiled Flix policy program over those records and maps
 * the program's verdict onto this process's exit status.
 *
 * <p>Secret paths are recorded as metadata only: the boundary reports the path
 * and byte size and deliberately supplies no readable path, so no secret content
 * is ever read here or passed to the evaluator. Symbolic links that resolve
 * outside the audited root are recorded the same way.
 */
public final class PolicyCheck {
    /** Files larger than this are recorded as metadata rather than read. */
    private static final long MAX_TEXT_BYTES = 1L << 20;

    /** Directory names the read-only audit never descends into. */
    private static final List<String> WALK_SKIP = List.of(".git", "attuneflix", ".factory");

    /** The external mission archive is never parent source. */
    private static final String ARCHIVE = "ATTUNE_V2_BOOTSTRAP_MISSION_ALL_IN_ONE.md";

    private PolicyCheck() {}

    public static void main(String[] args) throws Exception {
        System.exit(run(args));
    }

    /** Runs one policy check and returns this process's exit status. */
    public static int run(String[] args) throws Exception {
        Map<String, String> options = parse(args);
        String mode = options.getOrDefault("mode", "audit");
        String jar = firstNonEmpty(options.get("policy-jar"), System.getProperty("attune.policy.jar", ""));
        if (jar.isEmpty()) {
            System.err.println("policy check requires --policy-jar (or -Dattune.policy.jar)");
            return 2;
        }
        Path policyJar = resolveRunfile(jar);

        Path records = options.containsKey("records")
                ? Path.of(options.get("records")).toAbsolutePath()
                : Files.createTempFile("attune-policy-records-", ".tsv");
        if (records.getParent() != null) {
            Files.createDirectories(records.getParent());
        }

        List<String> lines = switch (mode) {
            case "declared" -> declaredRecords(options);
            case "audit" -> auditRecords(rootOf(options));
            default -> throw new IllegalArgumentException("unknown mode: " + mode);
        };
        Files.write(records, lines, StandardCharsets.UTF_8);
        System.out.println("attune-policy-records: " + records + " (" + lines.size() + " entries, mode " + mode + ")");

        String output = launch(policyJar, mode, records);
        System.out.print(output);

        String verdict = verdictOf(output);
        String expect = options.getOrDefault("expect", "accept");
        String rule = options.getOrDefault("rule", "");
        boolean matched = !verdict.isEmpty() && (expect.equals("none") || expect.equals(verdict));
        if (!rule.isEmpty() && !output.contains("rule=" + rule + " ")) {
            matched = false;
        }

        String evidence = "mode: " + mode + "\nexpected: " + expect + "\nobserved: " + verdict
                + "\nrule: " + rule + "\nmatched: " + matched + "\n";
        if (options.containsKey("evidence")) {
            Path path = Path.of(options.get("evidence")).toAbsolutePath();
            if (path.getParent() != null) {
                Files.createDirectories(path.getParent());
            }
            Files.writeString(path, evidence, StandardCharsets.UTF_8);
        }

        if (!matched) {
            System.err.println("attune-policy-check failed: expected " + expect
                    + (rule.isEmpty() ? "" : " with rule " + rule) + ", observed " + verdict);
            return 1;
        }
        System.out.println("attune-policy-check: mode=" + mode + " verdict=" + verdict
                + (rule.isEmpty() ? "" : " rule=" + rule));
        return 0;
    }

    // ------------------------------------------------------------------ input

    private static Map<String, String> parse(String[] args) {
        Map<String, String> options = new LinkedHashMap<>();
        for (int index = 0; index < args.length; index++) {
            String arg = args[index];
            if (!arg.startsWith("--")) {
                throw new IllegalArgumentException("unexpected argument: " + arg);
            }
            String name = arg.substring(2);
            int equals = name.indexOf('=');
            if (equals >= 0) {
                options.put(name.substring(0, equals), name.substring(equals + 1));
            } else if (index + 1 < args.length && !args[index + 1].startsWith("--")) {
                options.put(name, args[++index]);
            } else {
                options.put(name, "");
            }
        }
        return options;
    }

    private static String firstNonEmpty(String a, String b) {
        if (a != null && !a.isEmpty()) {
            return a;
        }
        return b == null ? "" : b;
    }

    private static Path rootOf(Map<String, String> options) {
        String root = firstNonEmpty(options.get("root"), System.getProperty("user.dir"));
        return Path.of(root).toAbsolutePath().normalize();
    }

    /** Records for the hermetic declared-source check. */
    private static List<String> declaredRecords(Map<String, String> options) throws IOException {
        String manifest = options.getOrDefault("manifest", "");
        if (manifest.isEmpty()) {
            throw new IllegalArgumentException("declared mode requires --manifest");
        }
        Path manifestPath = resolveRunfile(manifest);
        List<String> records = new ArrayList<>();
        for (String line : Files.readAllLines(manifestPath, StandardCharsets.UTF_8)) {
            if (line.isBlank()) {
                continue;
            }
            String[] fields = line.split("\t", -1);
            String reported = fields[0];
            String actual = fields.length > 1 && !fields[1].isEmpty() ? fields[1] : reported;
            Path path = resolveRunfile(actual);
            records.add(record(reported, path, "declared"));
        }
        return sorted(records);
    }

    /** Records for the separate local, read-only, uncached workspace audit. */
    private static List<String> auditRecords(Path root) throws IOException {
        Path realRoot = root.toRealPath();
        List<String> records = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(root)) {
            walk.filter(path -> !path.equals(root))
                    .filter(path -> !skipped(root, path))
                    // Directories carry no policy of their own; only files,
                    // symlinks and metadata records are inventoried.
                    .filter(path -> !Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS))
                    .forEach(path -> {
                        try {
                            records.add(entry(root, realRoot, path));
                        } catch (IOException exception) {
                            throw new RuntimeException(exception);
                        }
                    });
        } catch (RuntimeException exception) {
            if (exception.getCause() instanceof IOException io) {
                throw io;
            }
            throw exception;
        }
        return sorted(records);
    }

    private static boolean skipped(Path root, Path path) {
        Path relative = root.relativize(path);
        for (Path segment : relative) {
            if (WALK_SKIP.contains(segment.toString())) {
                return true;
            }
            if (segment.toString().startsWith("bazel-")) {
                return true;
            }
        }
        return relative.toString().equals(ARCHIVE);
    }

    private static String entry(Path root, Path realRoot, Path path) throws IOException {
        String reported = root.relativize(path).toString();
        String name = path.getFileName().toString();
        if (isSecret(name)) {
            long size = Files.isRegularFile(path) ? Files.size(path) : 0L;
            return line("secret", "", reported, "", size);
        }
        if (Files.isSymbolicLink(path)) {
            Path target;
            try {
                target = path.toRealPath();
            } catch (IOException dangling) {
                return line("symlink", "escape", reported, "", 0L);
            }
            if (!target.startsWith(realRoot)) {
                return line("symlink", "escape", reported, "", 0L);
            }
            return line("symlink", "", reported, path.toAbsolutePath().toString(), 0L);
        }
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
            return line("skipped", "", reported, "", 0L);
        }
        long size = Files.size(path);
        if (size > MAX_TEXT_BYTES) {
            return line("skipped", "large", reported, "", size);
        }
        return line("file", "", reported, path.toAbsolutePath().toString(), size);
    }

    private static String record(String reported, Path path, String flags) throws IOException {
        if (isSecret(path.getFileName().toString())) {
            return line("secret", flags, reported, "", Files.size(path));
        }
        if (Files.isSymbolicLink(path)) {
            return line("symlink", flags, reported, path.toAbsolutePath().toString(), 0L);
        }
        if (!Files.isRegularFile(path)) {
            return line("skipped", flags, reported, "", 0L);
        }
        long size = Files.size(path);
        if (size > MAX_TEXT_BYTES) {
            return line("skipped", "large", reported, "", size);
        }
        return line("file", flags, reported, path.toAbsolutePath().toString(), size);
    }

    private static boolean isSecret(String name) {
        return name.equals(".env") || (name.startsWith(".env.") && !name.equals(".env.example"));
    }

    private static String line(String kind, String flags, String reported, String read, long size) {
        return kind + "\t" + flags + "\t" + reported + "\t" + read + "\t" + size;
    }

    private static List<String> sorted(List<String> records) {
        List<String> copy = new ArrayList<>(records);
        copy.sort(Comparator.naturalOrder());
        return copy;
    }

    // ------------------------------------------------------------ runfiles

    /** Resolve a runfiles location, an action-sandbox path or an absolute path. */
    private static Path resolveRunfile(String location) {
        Path direct = Paths.get(location);
        if (direct.isAbsolute() && Files.exists(direct)) {
            return direct;
        }
        Path here = Paths.get("").toAbsolutePath().resolve(location);
        if (Files.exists(here)) {
            return here;
        }
        List<Path> roots = new ArrayList<>();
        for (String name : List.of("RUNFILES_DIR", "TEST_SRCDIR", "JAVA_RUNFILES")) {
            String value = System.getenv(name);
            if (value != null && !value.isEmpty()) {
                roots.add(Paths.get(value));
            }
        }
        for (Path root : roots) {
            for (Path candidate : List.of(root.resolve(location), root.resolve("_main").resolve(location))) {
                if (Files.exists(candidate)) {
                    return candidate;
                }
            }
        }
        throw new IllegalStateException("cannot resolve " + location + " under " + roots);
    }

    // ------------------------------------------------------------- launching

    private static String launch(Path policyJar, String mode, Path records) throws Exception {
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");
        ProcessBuilder builder = new ProcessBuilder(
                java.toString(), "-Xmx256m", "-jar", policyJar.toString(), mode, records.toString());
        builder.redirectErrorStream(true);
        Map<String, String> environment = builder.environment();
        environment.clear();
        environment.put("PATH", "/usr/bin:/bin");
        environment.put("HOME", "/nonexistent");
        environment.put("LANG", "C");
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exit = process.waitFor();
        if (exit != 0) {
            throw new IllegalStateException("the compiled policy program exited " + exit + "\n" + output);
        }
        return output;
    }

    private static String verdictOf(String output) {
        String verdict = "";
        for (String line : output.split("\n")) {
            if (line.startsWith("attune-policy-verdict:")) {
                verdict = line.substring("attune-policy-verdict:".length()).trim();
            }
        }
        return verdict;
    }
}
