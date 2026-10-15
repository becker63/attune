package attune.tools.boundary;

import com.google.devtools.build.runfiles.Runfiles;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * One isolated JVM for each declared Flix program or test.
 * Inputs are resolved before entering the boundary; Flix owns their meaning.
 */
public final class NativeLaunch {
    private NativeLaunch() {}

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("inner")) {
            if (property("attune.mode").equals("compiled")) {
                Class.forName("Main").getMethod("main", String[].class)
                    .invoke(null, (Object) new String[0]);
                return;
            }
            System.exit(NativeTester.run(paths("attune.jars"), paths("attune.tests"),
                    property("attune.mode").equals("run"), property("attune.expect").replace("_", " ")));
        }
        System.exit(launch());
    }

    private static int launch() throws Exception {
        String mode = property("attune.mode");
        String isolation = require("attune.isolation");
        if (!Set.of("unshare", "platform").contains(isolation)) {
            throw new IllegalArgumentException("unknown isolation: " + isolation);
        }
        Path work = Files.createTempDirectory(
                Path.of(System.getenv().getOrDefault("TEST_TMPDIR", System.getProperty("java.io.tmpdir"))),
                "attune-");
        List<Path> sources = resolveAll(property("attune.tests"));
        List<Path> jars = new ArrayList<>();
        if (!property("attune.jars").isEmpty()) {
            for (String jar : Files.readAllLines(resolve(property("attune.jars")))) {
                if (!jar.isBlank()) jars.add(resolve(jar));
            }
        }
        if (mode.equals("declared")) {
            Manifest.declared(work.resolve("attune-manifest.tsv"),
                    Files.readAllLines(resolve(require("attune.manifest"))));
        } else if (mode.equals("audit")) {
            Path root = Path.of(Files.readString(resolve(require("attune.root"))).trim());
            Manifest.audit(work.resolve("attune-manifest.tsv"), root);
        }

        List<String> bindings = new ArrayList<>();
        if (!property("attune.fixtures").isEmpty()) {
            for (String line : Files.readAllLines(resolve(property("attune.fixtures")))) {
                if (line.isBlank()) continue;
                String[] fields = line.split("\t", -1);
                String location = fields.length == 1 ? fields[0] : fields[1];
                bindings.add(fields[0] + "\t" + resolve(location));
            }
        }
        Files.write(work.resolve("attune-bindings.tsv"), bindings);

        List<String> command = new ArrayList<>();
        if (isolation.equals("unshare")) {
            command.addAll(List.of(resolve(require("attune.unshare")).toString(),
                    "--user", "--map-root-user", "--net", "--"));
        }
        command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
        command.add("--enable-native-access=ALL-UNNAMED");
        command.add("-Dattune.mode=" + mode);
        command.add("-Dattune.tests=" + joined(sources));
        command.add("-Dattune.jars=" + joined(jars));
        command.add("-Dattune.expect=" + property("attune.expect"));
        command.add("-Dattune.hostNetns=" + Files.readSymbolicLink(Path.of("/proc/self/ns/net")));
        command.add("-Dattune.libs=" + joined(resolveAll(property("attune.libs"))));
        command.add("-Dattune.fixtures=" + String.join(",",
                bindings.stream().map(line -> line.replaceFirst("\t", "=")).toList()));
        if (!property("attune.output").isEmpty()) {
            command.add("-Dattune.output=" + Path.of(property("attune.output")).toAbsolutePath());
        }
        if (!property("attune.jfrOutput").isEmpty()) {
            Path recording = Path.of(property("attune.jfrOutput")).toAbsolutePath();
            command.add("-XX:StartFlightRecording=filename=" + recording
                    + ",settings=profile,dumponexit=true");
        }
        List<String> classpath = new ArrayList<>();
        // Exported Flix runtime classes precede the compiler's mock runtime.
        if (mode.equals("compiled")) {
            for (Path jar : jars) classpath.add(jar.toAbsolutePath().toString());
        }
        for (String entry : System.getProperty("java.class.path").split(File.pathSeparator)) {
            classpath.add(Path.of(entry).toAbsolutePath().toString());
        }
        command.addAll(List.of("-cp", String.join(File.pathSeparator, classpath),
                NativeLaunch.class.getName(), "inner"));

        ProcessBuilder process = new ProcessBuilder(command).directory(work.toFile()).inheritIO();
        process.environment().clear();
        process.environment().putAll(java.util.Map.of("HOME", work.toString(),
                "PATH", "/usr/bin:/bin", "LANG", "C.UTF-8"));
        Process child = process.start();
        String limit = property("attune.timeoutSeconds");
        long seconds = limit.isEmpty() ? 0 : Long.parseLong(limit);
        if (seconds <= 0) return child.waitFor();
        if (child.waitFor(seconds, java.util.concurrent.TimeUnit.SECONDS)) return child.exitValue();
        child.descendants().forEach(ProcessHandle::destroyForcibly);
        child.destroyForcibly();
        child.waitFor();
        System.err.println("ResourceLimited: declared action timeout " + seconds + " seconds");
        return 124;
    }

    static Path resolve(String name) throws IOException {
        Path direct = Path.of(name);
        if (Files.exists(direct)) return direct.toAbsolutePath();
        String location = name.startsWith("../") ? name.substring(3) : name;
        Runfiles runfiles = Runfiles.create();
        String resolved = runfiles.rlocation(location);
        if (resolved == null || !Files.exists(Path.of(resolved))) {
            resolved = runfiles.rlocation("_main/" + location);
        }
        if (resolved == null || !Files.exists(Path.of(resolved))) {
            throw new IOException("Missing declared input: " + name);
        }
        return Path.of(resolved).toAbsolutePath();
    }

    private static List<Path> resolveAll(String value) throws IOException {
        List<Path> result = new ArrayList<>();
        for (String entry : value.split(",")) {
            if (!entry.isBlank()) result.add(resolve(entry));
        }
        return result;
    }

    private static List<Path> paths(String key) {
        return Arrays.stream(property(key).split(",")).filter(s -> !s.isEmpty()).map(Path::of).toList();
    }

    private static String joined(List<Path> paths) {
        return String.join(",", paths.stream().map(Path::toString).toList());
    }

    private static String property(String key) {
        return System.getProperty(key, "");
    }

    private static String require(String key) {
        String value = property(key);
        if (value.isEmpty()) throw new IllegalArgumentException("Missing " + key);
        return value;
    }
}
