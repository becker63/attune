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

/**
 * Mechanical filesystem metadata boundary.
 *
 * <p>It decides nothing about policy: for each entry it records the path, the
 * measured kind (regular file or symbolic link), the byte size and, for a link,
 * the resolved target. It never reads file content, so a secret or protected
 * path is never opened here; the Flix-owned evaluator decides which recorded
 * entries it may read and how they classify.
 *
 * <p>The audit walk is bounded mechanically: it never descends into a symbolic
 * link, into a hidden directory (VCS and agent tooling) or into a top-level
 * directory the caller names as a boundary. Everything else is reported so the
 * live tree cannot hide behind a stale inventory.
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
        lines.addAll(records);
        Files.write(output, lines, StandardCharsets.UTF_8);
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
                    if (name.startsWith(".")) {
                        continue;
                    }
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
