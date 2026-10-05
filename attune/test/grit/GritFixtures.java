package attune.grit.fixtures;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Mechanical reader for the declared fixture and metadata files of the Grit
 * fixture package.
 *
 * <p>The native test launcher resolves the declared runfiles locations to
 * absolute paths and binds each one to its workspace-relative name on the
 * {@code attune.fixtures} property. This class only maps the name a Flix
 * fixture asks for onto the prepared path and returns the exact bytes, and it
 * reports the declared name set so a Flix assertion can check the population.
 *
 * <p>It classifies nothing: which files form a world, which language each one
 * is, and what the bytes must mean are Flix decisions.
 */
public final class GritFixtures {
    private GritFixtures() {}

    /** The declared names this test prepared, one per line, in declaration order. */
    public static String declared() {
        List<String> names = new ArrayList<>(prepared().keySet());
        return String.join("\n", names) + "\n";
    }

    /** The exact bytes of one declared file, by its workspace-relative name. */
    public static String source(String name) {
        Map<String, Path> prepared = prepared();
        Path path = prepared.get(name);
        if (path == null) {
            throw new IllegalStateException("no declared file named " + name + " among " + prepared.keySet());
        }
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException error) {
            throw new IllegalStateException("cannot read declared file " + name, error);
        }
    }

    /** The prepared `name=absolute path` bindings, in the order they were given. */
    private static Map<String, Path> prepared() {
        Map<String, Path> prepared = new LinkedHashMap<>();
        for (String binding : System.getProperty("attune.fixtures", "").split(",")) {
            int separator = binding.indexOf('=');
            if (separator > 0) {
                prepared.put(binding.substring(0, separator), Path.of(binding.substring(separator + 1)));
            }
        }
        return prepared;
    }
}
