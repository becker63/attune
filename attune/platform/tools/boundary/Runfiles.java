package attune.tools.boundary;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Mechanical Bazel runfiles resolution without a shell or the C++ runfiles
 * library. It resolves a location only; it makes no policy decision.
 */
final class Runfiles {
    private Runfiles() {}

    static Path resolve(String rlocation) {
        if (rlocation == null || rlocation.isEmpty()) {
            throw new IllegalStateException("missing runfiles location");
        }
        Path direct = Paths.get(rlocation);
        if (direct.isAbsolute() && Files.exists(direct)) {
            return direct;
        }
        Path here = Paths.get("").toAbsolutePath().resolve(rlocation);
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
            for (Path candidate : candidates(root, rlocation)) {
                if (Files.exists(candidate)) {
                    return candidate;
                }
            }
        }
        throw new IllegalStateException("cannot resolve runfile " + rlocation + " under " + roots);
    }

    private static List<Path> candidates(Path root, String rlocation) {
        List<Path> list = new ArrayList<>();
        list.add(root.resolve(rlocation));
        int slash = rlocation.indexOf('/');
        if (slash > 0) {
            // `<repo>/<path>` -> `<path>` when the repo tree is flattened.
            list.add(root.resolve(rlocation.substring(slash + 1)));
        }
        list.add(root.resolve("_main").resolve(rlocation));
        return list;
    }
}
