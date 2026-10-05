package attune.tools.boundary;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

/**
 * Mechanical filesystem metadata boundary.
 *
 * <p>It decides nothing about policy: for each entry it records the path, the
 * measured kind (regular file or symbolic link), the byte size and, for a link,
 * the resolved target. It never reads file content, so a secret or protected
 * path is never opened here; the Flix-owned evaluator decides which recorded
 * entries it may read and how they classify.
 *
 * <p>The audit walk is bounded mechanically and applies no name heuristic: it
 * never descends into a symbolic link, and it never enters the exact top-level
 * directory names the caller names as designated protected boundaries. The
 * audited root is the nested workspace, whose VCS metadata, agent tooling and
 * read-only reference checkout all live outside it, so the caller names none;
 * the walk deliberately applies no dot-prefix rule, so an arbitrary hidden
 * directory is reported like any other directory and its forbidden content
 * cannot disappear from the live audit. The walk records the exact boundary
 * names it pruned so the Flix evaluator can verify them against its own
 * declaration.
 */
final class Manifest {
    private Manifest() {}

    /** The hermetic declared population: exactly the named relative paths. */
    static void declared(Path output, List<String> relativePaths) throws IOException {
        List<String> lines = new ArrayList<>();
        lines.add("root\t-");
        for (String relative : relativePaths) {
            if (relative.isBlank()) {
                continue;
            }
            Path real = Runfiles.resolve(relative.trim()).toRealPath();
            lines.add(relative.trim() + "\t" + real + "\tfile\t" + Files.size(real) + "\t-");
        }
        lines.sort(Comparator.naturalOrder());
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    /** The live read-only audit: every non-directory entry under the real root. */
    static void audit(Path output, Path root, Set<String> skipTop) throws IOException {
        Path realRoot = root.toRealPath();
        List<String> records = new ArrayList<>();
        walk(realRoot, realRoot, skipTop, records);
        records.sort(Comparator.naturalOrder());
        List<String> lines = new ArrayList<>();
        lines.add("root\t" + realRoot);
        // The exact prune set, reported so the Flix evaluator can assert it
        // equals the boundary names the policy declares; Java decides nothing.
        lines.add("boundaries\t" + String.join(",", new TreeSet<>(skipTop)));
        lines.addAll(records);
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    /**
     * The listing of one or more produced declared trees: for each root, its
     * resolved real path followed by every entry beneath it, measured the same
     * way the declared population is. The root is resolved first, because the
     * runfiles tree may present a declared tree artifact as a link to its real
     * directory; every child is then measured by its effective kind, so a
     * runfiles link to a regular file is still reported as the regular file the
     * declared artifact owns. The walk decides nothing about policy: the Flix
     * consumer classifies what the records mean.
     */
    static void produced(Path output, List<Path> roots) throws IOException {
        List<String> lines = new ArrayList<>();
        for (Path root : roots) {
            Path real = root.toRealPath();
            List<String> records = new ArrayList<>();
            walkProduced(real, real, records);
            records.sort(Comparator.naturalOrder());
            lines.add("root\t" + real);
            lines.addAll(records);
        }
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    private static void walkProduced(Path dir, Path root, List<String> out) throws IOException {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
            for (Path child : stream) {
                String relative = root.relativize(child).toString();
                if (Files.isDirectory(child)) {
                    walkProduced(child, root, out);
                } else if (Files.isRegularFile(child)) {
                    out.add(relative + "\t" + child + "\tfile\t" + Files.size(child) + "\t-");
                } else {
                    out.add(relative + "\t" + child + "\tsymlink\t0\t-");
                }
            }
        }
    }

    private static void walk(Path dir, Path root, Set<String> skipTop, List<String> out)
            throws IOException {
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
            for (Path child : stream) {
                String name = child.getFileName().toString();
                String relative = root.relativize(child).toString();
                if (Files.isSymbolicLink(child)) {
                    String target = "";
                    try {
                        target = child.toRealPath().toString();
                    } catch (IOException dangling) {
                        target = "";
                    }
                    out.add(relative + "\t" + child.toAbsolutePath() + "\tsymlink\t0\t" + target);
                } else if (Files.isDirectory(child, LinkOption.NOFOLLOW_LINKS)) {
                    // No hidden-name heuristic: only the exact top-level
                    // boundary names the caller designated are pruned.
                    if (root.relativize(child).getNameCount() == 1 && skipTop.contains(name)) {
                        continue;
                    }
                    walk(child, root, skipTop, out);
                } else if (Files.isRegularFile(child, LinkOption.NOFOLLOW_LINKS)) {
                    out.add(relative + "\t" + child.toAbsolutePath() + "\tfile\t"
                            + Files.size(child) + "\t-");
                }
            }
        }
    }
}
