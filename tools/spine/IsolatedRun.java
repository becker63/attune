package attune.tools.spine;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Isolated runtime boundary for already-compiled Flix fixtures.
 *
 * <p>The compiled fat JAR is executed behind the declared pinned {@code
 * unshare --user --map-root-user --net} boundary with a fresh allowlisted
 * environment. No compiler, dependency resolver or fallback runs here. Before
 * the fixture runs, a probe records the real kernel namespace, interface,
 * routing and socket-denial evidence from inside the same boundary; the test
 * fails closed if isolation cannot be established.
 */
public final class IsolatedRun {
    /** The exact environment this boundary passes to the isolated runtime. */
    private static final Set<String> ALLOWED_ENV =
            new TreeSet<>(List.of("HOME", "LANG", "PATH", "LD_LIBRARY_PATH"));

    /** Names that must never appear in an isolated runtime environment. */
    private static final List<String> FORBIDDEN_ENV_MARKERS =
            List.of("KEY", "TOKEN", "SECRET", "CREDENTIAL", "PASSWORD", "AUTH");

    private IsolatedRun() {}

    public static void main(String[] args) {
        try {
            Path unshare = Runfiles.resolve(requireProperty("attune.unshare"));
            Path jar = Runfiles.resolve(requireProperty("attune.jar"));
            Path java = Path.of(System.getProperty("java.home"), "bin", "java");

            List<String> boundary = List.of(
                    unshare.toString(), "--user", "--map-root-user", "--net", "--");

            Path evidence = Files.createTempFile("attune-boundary-", ".txt");
            int probeExit = launch(
                    boundary,
                    List.of(
                            java.toString(),
                            "-cp",
                            System.getProperty("java.class.path"),
                            "attune.tools.spine.NetworkProbe"),
                    evidence);
            String observed = Files.readString(evidence, StandardCharsets.UTF_8);
            System.out.println(observed);
            if (probeExit != 0) {
                fail("boundary probe exited " + probeExit);
            }
            verifyBoundary(observed);

            int exit = launch(boundary, List.of(java.toString(), "-jar", jar.toString()), null);
            if (exit != 0) {
                fail("compiled fixture exited " + exit);
            }
            System.out.println("isolated fixture passed under: " + String.join(" ", boundary));
        } catch (Exception exception) {
            fail("isolation failed closed: " + exception);
        }
    }

    private static int launch(List<String> boundary, List<String> command, Path evidence)
            throws Exception {
        List<String> full = new ArrayList<>(boundary);
        full.addAll(command);
        ProcessBuilder builder = new ProcessBuilder(full);
        Map<String, String> environment = builder.environment();
        environment.clear();
        environment.put("PATH", "/usr/bin:/bin");
        environment.put("HOME", "/nonexistent");
        environment.put("LANG", "C");
        if (evidence == null) {
            builder.inheritIO();
        } else {
            builder.redirectErrorStream(true);
            builder.redirectOutput(evidence.toFile());
        }
        return builder.start().waitFor();
    }

    private static void verifyBoundary(String observed) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (String line : observed.split("\n")) {
            int equals = line.indexOf('=');
            if (equals > 0) {
                fields.put(line.substring(0, equals).trim(), line.substring(equals + 1).trim());
            }
        }
        expect(fields, "uid", "0");
        expect(fields, "default_route", "no");
        expect(fields, "connect_denied", "true");
        expect(fields, "dev", "lo");

        String hostNetns = readLink("/proc/self/ns/net");
        String insideNetns = fields.getOrDefault("netns", "");
        if (insideNetns.isEmpty() || insideNetns.equals(hostNetns)) {
            fail("runtime did not enter a distinct network namespace: " + insideNetns);
        }

        Set<String> actualEnv = new TreeSet<>(List.of(fields.getOrDefault("env", "").split(",")));
        if (!ALLOWED_ENV.containsAll(actualEnv) || !actualEnv.containsAll(List.of("HOME", "LANG", "PATH"))) {
            fail("runtime environment was not the allowlist: " + actualEnv);
        }
        for (String name : actualEnv) {
            String upper = name.toUpperCase();
            for (String marker : FORBIDDEN_ENV_MARKERS) {
                if (upper.contains(marker)) {
                    fail("runtime environment carried a sensitive name: " + name);
                }
            }
        }
        // The pinned JDK injects LD_LIBRARY_PATH pointing at its own home; any
        // other value would mean the boundary leaked a caller's environment.
        String ldLibraryPath = fields.getOrDefault("ld_library_path", "");
        String javaHome = fields.getOrDefault("java_home", "");
        if (!ldLibraryPath.isEmpty() && !ldLibraryPath.startsWith(javaHome)) {
            fail("unexpected LD_LIBRARY_PATH inside the boundary: " + ldLibraryPath);
        }
        System.out.println(
                "boundary verified: uid=0, netns " + insideNetns + " != " + hostNetns
                        + ", no default route, socket denied, env " + actualEnv);
    }

    private static void expect(Map<String, String> fields, String key, String value) {
        String actual = fields.getOrDefault(key, "");
        if (!actual.equals(value)) {
            fail("expected " + key + "=" + value + " inside the boundary, observed " + actual);
        }
    }

    private static String readLink(String path) {
        try {
            return Files.readSymbolicLink(Path.of(path)).toString();
        } catch (Exception exception) {
            return "unavailable";
        }
    }

    private static String requireProperty(String key) {
        String value = System.getProperty(key);
        if (value == null || value.isEmpty()) {
            throw new IllegalStateException("missing system property " + key);
        }
        return value;
    }

    private static void fail(String message) {
        System.err.println(message);
        System.exit(1);
    }
}
