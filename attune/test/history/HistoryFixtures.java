package attune.history.fixtures;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import attune.parquet.AttuneParquet;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Mechanical reader for the declared corrected-v2 historical inputs.
 *
 * <p>The native test launcher resolves the declared runfiles locations to
 * absolute paths and binds each one to its workspace-relative name on the
 * {@code attune.fixtures} property. This class only maps a declared name onto
 * the prepared path, reports the exact bytes' SHA-256, and projects one declared
 * Parquet table through the existing Arrow seam into a canonical records text.
 *
 * <p>It classifies nothing. Which columns a table declares, which rows form a
 * pair, what the bytes must mean and how a record is interpreted are all Flix
 * decisions; this facade only copies and digests.
 *
 * <p>Canonical records format, one record per line:
 * <pre>
 *   status &lt;ok|error&gt; &lt;kind&gt;
 *   &lt;row&gt; &lt;column&gt; &lt;-|itemIndex&gt; &lt;escaped value&gt;
 * </pre>
 * A scalar record carries {@code -} as its item index. Tabs, newlines, carriage
 * returns, backslashes and the empty string are escaped, so one value is one
 * line and an empty recorded value can never collapse into a missing field.
 */
public final class HistoryFixtures {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> ENVELOPE = new TypeReference<>() {};

    private HistoryFixtures() {}

    /** The declared names this test prepared, one per line, in declaration order. */
    public static String declared() {
        return String.join("\n", new ArrayList<>(prepared().keySet())) + "\n";
    }

    /** The absolute path of one declared file, by its workspace-relative name. */
    public static String path(String name) {
        Path prepared = prepared().get(name);
        if (prepared == null) {
            throw new IllegalStateException("no declared file named " + name + " among " + prepared().keySet());
        }
        return prepared.toString();
    }

    /** The SHA-256 of one declared file's exact bytes, as lower-case hexadecimal. */
    public static String sha256(String name) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(Path.of(path(name))));
            StringBuilder hex = new StringBuilder();
            for (byte value : digest) {
                hex.append(String.format("%02x", value));
            }
            return hex.toString();
        } catch (Exception error) {
            throw new IllegalStateException("cannot digest declared file " + name, error);
        }
    }

    /** Project one declared Parquet table through the Arrow seam into canonical records. */
    public static String records(String name, String schemaJson) {
        String envelope = AttuneParquet.readTable(path(name), schemaJson);
        try {
            Map<String, Object> parsed = JSON.readValue(envelope, ENVELOPE);
            String status = String.valueOf(parsed.get("status"));
            String kind = String.valueOf(parsed.get("kind"));
            if (!"ok".equals(status)) {
                return "status\terror\t" + escape(kind) + "\n";
            }
            List<Map<String, Object>> rows = (List<Map<String, Object>>) parsed.get("rows");
            StringBuilder out = new StringBuilder("status\tok\t").append(escape(kind)).append('\n');
            for (int row = 0; row < rows.size(); row++) {
                Map<String, Object> values = rows.get(row);
                for (Map.Entry<String, Object> column : values.entrySet()) {
                    Object value = column.getValue();
                    if (value instanceof List<?> items) {
                        for (int item = 0; item < items.size(); item++) {
                            append(out, row, column.getKey(), Integer.toString(item), String.valueOf(items.get(item)));
                        }
                    } else if (value == null) {
                        append(out, row, column.getKey(), "-", "null");
                    } else {
                        append(out, row, column.getKey(), "-", String.valueOf(value));
                    }
                }
            }
            return out.toString();
        } catch (Exception error) {
            return "status\terror\tnative\n";
        }
    }

    private static void append(StringBuilder out, int row, String column, String item, String value) {
        out.append(row).append('\t').append(escape(column)).append('\t').append(item).append('\t').append(escape(value)).append('\n');
    }

    private static String escape(String value) {
        if (value.isEmpty()) {
            return "\\e";
        }
        StringBuilder out = new StringBuilder();
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
        return out.toString();
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
