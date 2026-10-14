package attune.grit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The only JVM surface visible to Flix.
 *
 * <p>The pinned native Grit engine returns a versioned JSON envelope. This
 * facade copies that envelope into a canonical, line-oriented record stream that
 * Flix can decode without a JSON library: the native schema is unchanged, and
 * the projection is mechanical. It owns no language, relation, identity,
 * admission or verdict decision.
 *
 * <p>Canonical record stream (one record per line, fields separated by a TAB,
 * values escaped with a backslash):
 *
 * <pre>
 * version&lt;TAB&gt;1
 * error&lt;TAB&gt;kind&lt;TAB&gt;message
 * matched&lt;TAB&gt;true|false
 * match&lt;TAB&gt;path&lt;TAB&gt;startByte&lt;TAB&gt;endByte
 * log&lt;TAB&gt;message&lt;TAB&gt;startByte&lt;TAB&gt;endByte
 * diagnostic&lt;TAB&gt;message
 * </pre>
 *
 * <p>The exact native bytes are preserved in the {@code version}/{@code matched}
 * shape; a native error keeps its classified {@code kind}.
 */
public final class AttuneGrit {
    private static final ObjectMapper JSON = new ObjectMapper();

    private AttuneGrit() {}

    /** Runs one fixed Grit program and returns its canonical record stream. */
    public static String evaluate(String language, String program, String path, String source) {
        return canonicalize(AttuneGritNative.evaluate(language, program, path, source));
    }

    /** Returns one packaged, admitted Attune Grit dialect entry point. */
    public static String program(String language, String name) {
        // Flix owns both closed enums and therefore the admitted cross-product.
        // This Java leaf only loads the corresponding immutable JAR resource.
        String resource = "/grit/" + name + "/" + language + ".grit";
        InputStream stream = AttuneGrit.class.getResourceAsStream(resource);
        if (stream == null) {
            // Bazel places resources at their repository-relative path, so the
            // same file can appear under the source root as well.
            stream = AttuneGrit.class.getResourceAsStream("/src" + resource);
        }
        if (stream == null) {
            throw new IllegalStateException("missing Attune Grit resource: " + resource);
        }
        try (InputStream owned = stream) {
            return new String(owned.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException error) {
            throw new IllegalStateException("cannot read Attune Grit resource: " + resource, error);
        }
    }

    /** Projects the native JSON envelope into the canonical record stream. */
    public static String canonicalize(String envelope) {
        JsonNode root;
        try {
            root = JSON.readTree(envelope);
        } catch (IOException error) {
            throw new IllegalStateException("native Grit envelope is not JSON: " + error, error);
        }
        int version = root.path("version").asInt(-1);
        StringBuilder out = new StringBuilder();
        record(out, "version", Integer.toString(version));
        if (root.has("error")) {
            JsonNode error = root.path("error");
            record(out, "error", error.path("kind").asText("host"), error.path("message").asText(""));
            return out.toString();
        }
        record(out, "matched", Boolean.toString(root.path("matched").asBoolean(false)));
        for (JsonNode span : root.path("matches")) {
            record(out, "match",
                    span.path("path").asText(""),
                    Integer.toString(span.path("start_byte").asInt(-1)),
                    Integer.toString(span.path("end_byte").asInt(-1)));
        }
        for (JsonNode log : root.path("logs")) {
            record(out, "log",
                    log.path("message").asText(""),
                    Integer.toString(log.path("start_byte").asInt(-1)),
                    Integer.toString(log.path("end_byte").asInt(-1)));
        }
        for (JsonNode diagnostic : root.path("diagnostics")) {
            record(out, "diagnostic", diagnostic.asText(""));
        }
        return out.toString();
    }

    private static void record(StringBuilder out, String... fields) {
        for (int index = 0; index < fields.length; index++) {
            if (index > 0) {
                out.append('\t');
            }
            escape(out, fields[index]);
        }
        out.append('\n');
    }

    private static void escape(StringBuilder out, String value) {
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '\\' -> out.append("\\\\");
                case '\t' -> out.append("\\t");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                default -> out.append(character);
            }
        }
    }

    /** The admitted packaged dialect names, for the mechanical loader probe. */
    public static List<String> relations() {
        return List.of("defines", "imports", "calls");
    }
}
