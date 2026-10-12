package attune.tools.boundary;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;

/** Enumerate metadata only. Flix decides which paths belong to the project. */
final class Manifest {
    private Manifest() {}

    static void declared(Path output, List<String> relativePaths) throws IOException {
        List<String> lines = new ArrayList<>();
        lines.add("root\t-");
        for (String relative : relativePaths) {
            if (relative.isBlank()) continue;
            Path real = NativeLaunch.resolve(relative.trim()).toRealPath();
            lines.add(relative.trim() + "\t" + real + "\tfile\t" + Files.size(real) + "\t-");
        }
        Files.write(output, lines);
    }

    /** No pruning or symlink traversal. Preserved work is reported, never read. */
    static void audit(Path output, Path root) throws IOException {
        Path real = root.toRealPath();
        List<String> lines = new ArrayList<>();
        lines.add("root\t" + real);
        try (var paths = Files.walk(real)) {
            for (Path entry : paths.sorted().toList()) {
                var attributes = Files.readAttributes(entry, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
                if (attributes.isDirectory()) continue;
                String kind = attributes.isSymbolicLink() ? "symlink" : attributes.isRegularFile() ? "file" : "other";
                String target = "-";
                if (attributes.isSymbolicLink()) {
                    try { target = entry.toRealPath().toString(); }
                    catch (IOException dangling) { target = ""; }
                }
                lines.add(real.relativize(entry) + "\t" + entry + "\t" + kind + "\t" + attributes.size() + "\t" + target);
            }
        }
        Files.write(output, lines);
    }
}
