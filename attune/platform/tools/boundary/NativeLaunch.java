package attune.tools.boundary;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
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
 * over the explicit declared files with an allowlisted environment. It decides
 * no policy, classifies nothing and formats no verdict; a non-zero exit from
 * the engine is this process's failure, and an isolation failure is fatal with
 * no fallback.
 *
 * <p>Isolation has exactly two declared modes and the launcher never claims
 * one it did not create. In {@code unshare} (the default, and the ordinary
 * local gate) the inner step runs inside the pinned util-linux user/network
 * namespace, so the mechanical boundary record reports a distinct network
 * namespace and the Flix-owned isolation assertions can hold. In
 * {@code platform}, declared by the opt-in remote profile, the inner step runs
 * directly in the declared BuildBuddy Linux container: no namespace is created
 * here and no such claim is made, and the guest network denial comes from the
 * platform's declared {@code dockerNetwork=off} execution property. The
 * boundary record is still written, so the facts of whichever mode ran remain
 * inspectable.
 *
 * <p>Two declared-artifact modes extend the same route without a new engine. In
 * {@code produce} the launcher runs the pinned compiler's authentic native
 * Tester over the explicit declared sources and jars and materializes one
 * declared output tree: an immutable regular-file copy of each exported source
 * beside a mechanical {@code closure.tsv} naming the exact source/jar/binding
 * closure. In a consumer test the launcher walks each declared producer tree,
 * writes the measured listing the Flix law classifies, and appends the tree's
 * own Flix sources to the pinned Tester's file list, so the consumer really
 * compiles the producer's exported source. Both modes only resolve declared
 * locations, copy bytes and record measured metadata.
 */
public final class NativeLaunch {
    private NativeLaunch() {}

    public static void main(String[] args) throws Exception {
        System.exit(run());
    }

    static int run() throws Exception {
        String mode = System.getProperty("attune.mode", "native");
        if (mode.equals("produce")) {
            return produce();
        }
        String isolation = isolation();
        Path flixJar = Runfiles.resolve(require("attune.flix"));
        Path unshare = isolation.equals("unshare") ? Runfiles.resolve(require("attune.unshare")) : null;
        List<String> tests = new ArrayList<>();
        for (String location : splitList(System.getProperty("attune.tests", ""))) {
            tests.add(Runfiles.resolve(location).toString());
        }
        Path work = workDir();
        Path java = Path.of(System.getProperty("java.home"), "bin", "java");

        if (mode.equals("check")) {
            return check(isolation, unshare, java, flixJar, tests, System.getProperty("attune.expect", ""), work);
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

        List<String> bindings = declaredBindings();
        List<Path> produced = producedTrees();
        if (!produced.isEmpty()) {
            Manifest.produced(work.resolve("attune-produced.tsv"), produced);
            bindings.add("produced_manifest=" + work.resolve("attune-produced.tsv"));
            for (int index = 0; index < produced.size(); index++) {
                bindings.add("produced" + index + "=" + produced.get(index));
            }
            for (Path tree : produced) {
                tests.addAll(flixSources(tree));
            }
        }
        if (!bindings.isEmpty()) {
            writeBindings(work.resolve("attune-bindings.tsv"), bindings);
        }
        String fixtures = bindings.isEmpty() ? "" : "-Dattune.fixtures=" + String.join(",", bindings);

        if (mode.equals("java")) {
            List<String> jars = jarPaths();
            List<String> command = new ArrayList<>();
            command.addAll(namespace(isolation, unshare));
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
            if (!fixtures.isEmpty()) {
                command.add(fixtures);
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
        command.addAll(namespace(isolation, unshare));
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
    private static int check(String isolation, Path unshare, Path java, Path flixJar, List<String> files,
            String expected, Path work) throws Exception {
        String diagnostic = expected.replace("_", " ");
        List<String> command = new ArrayList<>();
        command.addAll(namespace(isolation, unshare));
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

    /// The declared isolation mode this run uses.
    ///
    /// `unshare` is the default and the ordinary local gate: the inner step
    /// runs inside the pinned util-linux user/network namespace and the
    /// mechanical boundary record can therefore report a distinct network
    /// namespace. `platform` is declared by the opt-in remote profile
    /// (`--define=attune_native_isolation=platform`, wired in `.bazelrc`),
    /// where the action runs directly in the declared BuildBuddy container and
    /// creates no namespace here; the guest network denial is the platform's
    /// declared `dockerNetwork=off` property. An unknown value is refused
    /// rather than silently treated as isolated.
    private static String isolation() {
        String isolation = System.getProperty("attune.isolation", "unshare");
        if (!isolation.equals("unshare") && !isolation.equals("platform")) {
            throw new IllegalStateException("unknown attune.isolation: " + isolation);
        }
        return isolation;
    }

    /// The declared isolation prefix for the inner step, empty in the mode where
    /// the declared platform itself supplies the boundary.
    private static List<String> namespace(String isolation, Path unshare) {
        if (isolation.equals("unshare")) {
            return List.of(unshare.toString(), "--user", "--map-root-user", "--net", "--");
        }
        return List.of();
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
    private static List<String> fixtureBindings(String manifest) throws IOException {
        List<String> bindings = new ArrayList<>();
        for (String line : Files.readAllLines(Runfiles.resolve(manifest), StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                String name = line.trim();
                bindings.add(name + "=" + Runfiles.resolve(name));
            }
        }
        return bindings;
    }

    /// The documents that live at the checkout root, outside this nested
    /// workspace, bound as `name=absolute path`. The checkout root is the
    /// parent of the recorded Bazel workspace root; the names are the exact
    /// relative documents the caller declared, and this method decides nothing
    /// about their content.
    private static List<String> checkoutBindings(String names) throws IOException {
        Path workspace = Path.of(Files.readString(
                Runfiles.resolve(require("attune.workspace_root")), StandardCharsets.UTF_8).trim());
        Path checkout = workspace.getParent();
        List<String> bindings = new ArrayList<>();
        for (String name : splitList(names)) {
            bindings.add(name + "=" + checkout.resolve(name));
        }
        return bindings;
    }

    /// Every declared `name=absolute path` binding this run prepared: the
    /// declared fixture population and the live checkout documents. The produced
    /// tree roots are added by `run` after this, because their names are derived
    /// from the resolved trees rather than from a declared manifest.
    private static List<String> declaredBindings() throws IOException {
        List<String> bindings = new ArrayList<>();
        String declared = System.getProperty("attune.fixtures", "");
        String checkout = System.getProperty("attune.checkout_files", "");
        if (!declared.isEmpty()) {
            bindings.addAll(fixtureBindings(declared));
        }
        if (!checkout.isEmpty()) {
            bindings.addAll(checkoutBindings(checkout));
        }
        return bindings;
    }

    /// The produced declared trees named on `attune.produced`, resolved from the
    /// runfiles tree. This decides nothing about their content: it resolves the
    /// declared location the caller named and nothing else.
    private static List<Path> producedTrees() {
        List<Path> trees = new ArrayList<>();
        for (String location : splitList(System.getProperty("attune.produced", ""))) {
            trees.add(Runfiles.resolve(location));
        }
        return trees;
    }

    /// Write the prepared `name<TAB>path` table a Flix law reads to resolve a
    /// declared name onto its real prepared path. Formatting only; the law owns
    /// what the table means.
    private static void writeBindings(Path output, List<String> bindings) throws IOException {
        List<String> lines = new ArrayList<>();
        for (String binding : bindings) {
            int separator = binding.indexOf('=');
            if (separator > 0) {
                lines.add(binding.substring(0, separator) + "\t" + binding.substring(separator + 1));
            }
        }
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    /// The declared Flix sources inside a produced tree, resolved to absolute
    /// paths and sorted. The consumer compiles them through the pinned Tester,
    /// so the exported artifact is really consumed rather than only named.
    private static List<String> flixSources(Path tree) throws IOException {
        List<String> sources = new ArrayList<>();
        try (java.util.stream.Stream<Path> stream = Files.walk(tree.toRealPath())) {
            stream.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".flix"))
                    .sorted()
                    .forEach(path -> sources.add(path.toAbsolutePath().toString()));
        }
        return sources;
    }

    /// The producer action: run the pinned compiler's authentic native Tester
    /// over the explicit declared sources and dependency jars, then materialize
    /// the declared output tree. The tree holds one immutable regular-file copy
    /// of each exported source under `sources/` and a mechanical `closure.tsv`
    /// naming the exact source, jar and binding closure. This is compiler launch
    /// and filesystem mechanics: it decides no policy and classifies nothing,
    /// and a non-zero Tester verdict fails the action rather than being recorded.
    private static int produce() throws Exception {
        Path out = Path.of(require("attune.outputs"));
        List<String> tester = splitList(System.getProperty("attune.tests", ""));
        List<String> jars = splitList(System.getProperty("attune.jars", ""));
        List<String> export = splitList(System.getProperty("attune.export", ""));
        List<String> bindings = splitList(System.getProperty("attune.bindings", ""));
        int status = NativeTester.run(absolutes(jars), absolutes(tester));
        if (status != 0) {
            System.err.println("the pinned native Tester failed over the declared sources: exit " + status);
            return status;
        }
        Path sources = out.resolve("sources");
        Files.createDirectories(sources);
        List<String> closure = new ArrayList<>();
        for (String source : export) {
            Path input = Path.of(source);
            String name = input.getFileName().toString();
            Path artifact = sources.resolve(name);
            Files.copy(input, artifact, StandardCopyOption.REPLACE_EXISTING);
            closure.add("source\t" + source + "\t" + "sources/" + name + "\t" + Files.size(artifact));
        }
        for (String jar : jars) {
            closure.add("jar\t" + Path.of(jar).getFileName().toString() + "\t" + Files.size(Path.of(jar)));
        }
        for (String binding : bindings) {
            closure.add("binding\t" + Path.of(binding).getFileName().toString() + "\t" + Files.size(Path.of(binding)));
        }
        Files.write(out.resolve("closure.tsv"), closure, StandardCharsets.UTF_8);
        return 0;
    }

    private static List<Path> absolutes(List<String> paths) {
        List<Path> absolute = new ArrayList<>();
        for (String path : paths) {
            absolute.add(Path.of(path).toAbsolutePath());
        }
        return absolute;
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
