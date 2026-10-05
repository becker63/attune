package attune.tools.boundary;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Mechanical launcher for the native Flix test targets.
 *
 * <p>Every first-party executable check is a native Flix {@code @Test}
 * declaration. This launcher only performs the unavoidable process and
 * filesystem interop: it prepares the metadata manifest the Flix evaluator
 * reads, then runs the pinned 0.76.1 compiler's authentic native test engine
 * over the explicit declared files inside the declared pinned {@code unshare}
 * user/network namespace with an allowlisted environment. It decides no policy,
 * classifies nothing and formats no verdict; a non-zero exit from the engine is
 * this process's failure, and isolation failure is fatal with no fallback.
 */
public final class NativeLaunch {
    private NativeLaunch() {}

    public static void main(String[] args) throws Exception {
        System.exit(run());
    }

    static int run() throws Exception {
        String mode = System.getProperty("attune.mode", "native");
        Path flixJar = Runfiles.resolve(require("attune.flix"));
        Path unshare = Runfiles.resolve(require("attune.unshare"));
        List<String> tests = new ArrayList<>();
        for (String location : splitList(System.getProperty("attune.tests", ""))) {
            tests.add(Runfiles.resolve(location).toString());
        }
        Path work = workDir();
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");

        if (mode.equals("check")) {
            return check(unshare, java, flixJar, tests, System.getProperty("attune.expect", ""), work);
        }

        if (mode.equals("declared")) {
            Path source = Runfiles.resolve(require("attune.manifest"));
            List<String> relative = new ArrayList<>();
            for (String line : Files.readAllLines(source, StandardCharsets.UTF_8)) {
                if (!line.isBlank()) {
                    relative.add(line);
                }
            }
            Manifest.declared(work.resolve("attune-manifest.tsv"), relative);
        } else if (mode.equals("audit")) {
            Path rootFile = Runfiles.resolve(require("attune.root"));
            Path root = Path.of(Files.readString(rootFile, StandardCharsets.UTF_8).trim());
            Manifest.audit(
                    work.resolve("attune-manifest.tsv"),
                    root,
                    new LinkedHashSet<>(splitList(System.getProperty("attune.skip", ""))));
        }

        if (mode.equals("java")) {
            List<String> jars = jarPaths();
            List<String> command = new ArrayList<>();
            command.add(unshare.toString());
            command.addAll(List.of("--user", "--map-root-user", "--net", "--"));
            command.add(java.toString());
            command.add("--add-opens=java.base/java.nio=ALL-UNNAMED");
            command.add("--enable-native-access=ALL-UNNAMED");
            List<String> libs = new ArrayList<>();
            for (String location : splitList(System.getProperty("attune.libs", ""))) {
                libs.add(Runfiles.resolve(location).toString());
            }
            if (!libs.isEmpty()) {
                command.add("-Dattune.libs=" + String.join(",", libs));
            }
            String declared = System.getProperty("attune.fixtures", "");
            String checkout = System.getProperty("attune.checkout_files", "");
            if (!declared.isEmpty() || !checkout.isEmpty()) {
                List<String> bindings = new ArrayList<>();
                if (!declared.isEmpty()) {
                    bindings.add(fixtureBindings(declared));
                }
                if (!checkout.isEmpty()) {
                    bindings.add(checkoutBindings(checkout));
                }
                command.add("-Dattune.fixtures=" + String.join(",", bindings));
            }
            command.add("-cp");
            command.add(innerClasspath(jars));
            command.add("attune.tools.boundary.NativeInner");
            command.add(work.toString());
            command.add(flixJar.toString());
            command.add(hostNetns());
            command.add("java");
            command.add(Integer.toString(jars.size()));
            command.addAll(jars);
            command.addAll(tests);
            return launch(command, work);
        }

        List<String> command = new ArrayList<>();
        command.add(unshare.toString());
        command.addAll(List.of("--user", "--map-root-user", "--net", "--"));
        command.add(java.toString());
        command.add("-cp");
        command.add(innerClasspath(List.of()));
        command.add("attune.tools.boundary.NativeInner");
        command.add(work.toString());
        command.add(flixJar.toString());
        command.add(hostNetns());
        command.addAll(tests);
        return launch(command, work);
    }

    /** Compile-only negative: the pinned compiler must reject with the diagnostic. */
    private static int check(Path unshare, Path java, Path flixJar, List<String> files,
            String expected, Path work) throws Exception {
        String diagnostic = expected.replace("_", " ");
        List<String> command = new ArrayList<>();
        command.add(unshare.toString());
        command.addAll(List.of("--user", "--map-root-user", "--net", "--"));
        command.add(java.toString());
        command.add("-jar");
        command.add(flixJar.toString());
        command.add("check");
        command.addAll(files);

        ProcessBuilder builder = process(command, work);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exit = process.waitFor();
        System.out.print(output);
        if (exit == 0) {
            System.err.println("expected the pinned compiler to reject the fixture, but it accepted it");
            return 1;
        }
        if (!output.contains(diagnostic)) {
            System.err.println("the pinned compiler rejected the fixture, but the diagnostic did not contain: "
                    + diagnostic);
            return 1;
        }
        System.out.println("pinned compiler rejection verified: exit " + exit);
        return 0;
    }

    private static int launch(List<String> command, Path work) throws Exception {
        ProcessBuilder builder = process(command, work);
        builder.inheritIO();
        return builder.start().waitFor();
    }

    private static ProcessBuilder process(List<String> command, Path work) {
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(work.toFile());
        Map<String, String> environment = builder.environment();
        environment.clear();
        environment.put("HOME", work.toString());
        environment.put("PATH", "/usr/bin:/bin");
        environment.put("LANG", "C");
        return builder;
    }

    /// The outer classpath, made absolute so the in-namespace step can resolve it
    /// after the working directory changes, plus any prepared dependency jars.
    private static String innerClasspath(List<String> extra) {
        List<String> parts = new ArrayList<>();
        for (String entry : System.getProperty("java.class.path", "").split(File.pathSeparator)) {
            if (!entry.isBlank()) {
                parts.add(Path.of(entry).toAbsolutePath().toString());
            }
        }
        parts.addAll(extra);
        return String.join(File.pathSeparator, parts);
    }

    /// The declared fixture manifest, resolved to `name=absolute path` bindings.
    private static String fixtureBindings(String manifest) throws IOException {
        List<String> bindings = new ArrayList<>();
        for (String line : Files.readAllLines(Runfiles.resolve(manifest), StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                String name = line.trim();
                bindings.add(name + "=" + Runfiles.resolve(name));
            }
        }
        return String.join(",", bindings);
    }

    /// The documents that live at the checkout root, outside this nested
    /// workspace, bound as `name=absolute path`. The checkout root is the
    /// parent of the recorded Bazel workspace root; the names are the exact
    /// relative documents the caller declared, and this method decides nothing
    /// about their content.
    private static String checkoutBindings(String names) throws IOException {
        Path workspace = Path.of(Files.readString(
                Runfiles.resolve(require("attune.workspace_root")), StandardCharsets.UTF_8).trim());
        Path checkout = workspace.getParent();
        List<String> bindings = new ArrayList<>();
        for (String name : splitList(names)) {
            bindings.add(name + "=" + checkout.resolve(name));
        }
        return String.join(",", bindings);
    }

    /// The prepared dependency jars named by the declared jar manifest.
    private static List<String> jarPaths() throws IOException {
        Path manifest = Runfiles.resolve(require("attune.jars"));
        List<String> jars = new ArrayList<>();
        for (String line : Files.readAllLines(manifest, StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                jars.add(Runfiles.resolve(line.trim()).toString());
            }
        }
        return jars;
    }

    private static Path workDir() throws IOException {
        String testTmp = System.getenv("TEST_TMPDIR");
        Path base = (testTmp == null || testTmp.isEmpty())
                ? Files.createTempDirectory("attune-native-")
                : Files.createDirectories(Path.of(testTmp).resolve("attune-native"));
        return base;
    }

    private static String hostNetns() {
        try {
            return Files.readSymbolicLink(Path.of("/proc/self/ns/net")).toString();
        } catch (IOException exception) {
            return "unavailable";
        }
    }

    private static List<String> splitList(String value) {
        List<String> items = new ArrayList<>();
        for (String piece : value.split(",")) {
            if (!piece.isBlank()) {
                items.add(piece.trim());
            }
        }
        return items;
    }

    private static String require(String key) {
        String value = System.getProperty(key);
        if (value == null || value.isEmpty()) {
            throw new IllegalStateException("missing system property " + key);
        }
        return value;
    }
}
