package attune.tools.policy;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Accepts the recorded verdict evidence of a prerequisite policy-check action.
 *
 * <p>The evaluation itself already happened in the build action; this test only
 * confirms the recorded verdict, so `bazel test //...` stays green while the
 * check is genuinely enforced by the action that produced the evidence.
 */
public final class PolicyVerdict {
    private PolicyVerdict() {}

    public static void main(String[] args) throws Exception {
        Path evidence = resolve(requireProperty("attune.evidence"));
        String text = Files.readString(evidence, StandardCharsets.UTF_8);
        System.out.print(text);
        if (!text.contains("matched: true")) {
            System.err.println("the policy check did not record the expected verdict");
            System.exit(1);
        }
        System.out.println("accepted recorded policy verdict from " + evidence);
    }

    /** Resolves a Bazel runfiles location without a shell or the C++ library. */
    static Path resolve(String location) {
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

    private static String requireProperty(String key) {
        String value = System.getProperty(key);
        if (value == null || value.isEmpty()) {
            throw new IllegalStateException("missing system property " + key);
        }
        return value;
    }
}
