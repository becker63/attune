package attune.tools.spine;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/** Resolves Bazel runfiles paths without a shell or the C++ runfiles library. */
final class Runfiles {
    private Runfiles() {}

    static Path resolve(String rlocation) {
        if (rlocation == null || rlocation.isEmpty()) {
            throw new IllegalStateException("missing runfiles location");
        }
        List<Path> roots = new ArrayList<>();
        addRoot(roots, System.getenv("RUNFILES_DIR"));
        addRoot(roots, System.getenv("TEST_SRCDIR"));
        addRoot(roots, System.getenv("JAVA_RUNFILES"));
        for (Path root : roots) {
            for (Path candidate : candidates(root, rlocation)) {
                if (Files.exists(candidate)) {
                    return candidate;
                }
            }
        }
        throw new IllegalStateException(
                "cannot resolve runfile " + rlocation + " under " + roots);
    }

    private static void addRoot(List<Path> roots, String value) {
        if (value != null && !value.isEmpty()) {
            roots.add(Paths.get(value));
        }
    }

    private static List<Path> candidates(Path root, String rlocation) {
        List<Path> candidates = new ArrayList<>();
        candidates.add(root.resolve(rlocation));
        int slash = rlocation.indexOf('/');
        if (slash > 0) {
            // `_main/<path>` or `<workspace>/<path>` -> `<path>`.
            candidates.add(root.resolve(rlocation.substring(slash + 1)));
        }
        candidates.add(root.resolve("_main").resolve(rlocation));
        return candidates;
    }
}
