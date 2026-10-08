package attune.reviewbench;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;

import java.io.BufferedWriter;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/**
 * The mechanical boundary of the pinned ReviewBench corpus.
 *
 * <p>This adapter performs the unavoidable byte work a Flix law cannot: it
 * measures one declared file's identity (byte count, SHA-256 and the git blob
 * SHA-1 of the exact bytes), streams one top-level JSON array of flat scalar
 * objects into the declared canonical projection vocabulary, and exposes a
 * SHA-256 digest primitive the selection law hashes its seed with.
 *
 * <p>It decides nothing. It selects no task, groups no repository, ranks no
 * candidate and knows no language: the declared projection spec names exactly
 * which scalar columns are read and in which order, and every classification,
 * count, quota, split and admission decision lives in {@code Attune.Study}'s
 * ReviewBench owner. A missing, duplicated or non-scalar declared column makes
 * the whole cell absent rather than silently shifted.
 */
public final class AttuneReviewBench {

    private AttuneReviewBench() {}

    private static final JsonFactory FACTORY = new JsonFactory();

    /** The canonical projection-cell escape vocabulary, matching the Flix decoder. */
    private static String escape(String text) {
        if (text.isEmpty()) {
            // An empty declared value still occupies its cell. The empty sentinel
            // keeps the line from ending in a separator, because a trailing
            // separator is dropped by the reader and the row would silently lose
            // its cell and be classified absent.
            return "\\e";
        }
        StringBuilder out = new StringBuilder(text.length() + 8);
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '\\': out.append("\\\\"); break;
                case '\t': out.append("\\t"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                default: out.append(c);
            }
        }
        return out.toString();
    }

    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            out.append(Character.forDigit((b >> 4) & 0xf, 16));
            out.append(Character.forDigit(b & 0xf, 16));
        }
        return out.toString();
    }

    /** The declared SHA-256 digest of one declared text, as lowercase hex. */
    public static String sha256Hex(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return hex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("sha256 unavailable", error);
        }
    }

    /**
     * The identity of one declared file: {@code bytes}, {@code sha256} and the
     * git blob SHA-1 ({@code gitblob}) of its exact bytes, one
     * {@code key\\tvalue} line each. The git blob digest is the object name git
     * would give the bytes, so a corpus pin declared as a git blob is verified
     * against the real materialized bytes rather than a page fetch.
     */
    public static String inspect(String name) {
        try {
            byte[] content = Files.readAllBytes(Paths.get(name));
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
            sha1.update(("blob " + content.length + "\u0000").getBytes(StandardCharsets.US_ASCII));
            sha1.update(content);
            StringBuilder out = new StringBuilder();
            out.append("bytes\t").append(content.length).append("\n");
            out.append("sha256\t").append(hex(sha256.digest(content))).append("\n");
            out.append("gitblob\t").append(hex(sha1.digest())).append("\n");
            return out.toString();
        } catch (Exception error) {
            return "status\tfailed\terror\t" + escape(String.valueOf(error.getMessage())) + "\n";
        }
    }

    /**
     * Stream one top-level JSON array of flat scalar objects into the declared
     * projection vocabulary and write it to {@code output}.
     *
     * <p>The spec declares the columns in order ({@code column\\tname\\ttype}) and
     * one bounded batch size ({@code batch\\trows}); only the declared columns are
     * read, so an undeclared field of the input never reaches a record. The
     * output is one {@code status} line, one {@code cell} line per present
     * scalar ({@code cell\\trow\\tcolumn\\tname\\tvalue}) and nothing else; a
     * non-scalar or absent value contributes no cell, which the Flix reader
     * treats as an incomplete row rather than an invented one.
     *
     * <p>The declared batch size bounds the working set: rows are accumulated up
     * to the bound and flushed before the next batch is read, and the number of
     * flushes is recorded rather than predicted.
     */
    public static String projectArray(String name, String spec, String output) {
        List<String> columns = new ArrayList<>();
        List<Boolean> numeric = new ArrayList<>();
        int batch = 64;
        for (String line : spec.split("\n")) {
            String[] fields = line.split("\t", -1);
            if (fields.length >= 3 && fields[0].equals("column")) {
                columns.add(fields[1]);
                numeric.add(fields[2].equals("int"));
            } else if (fields.length >= 2 && fields[0].equals("batch")) {
                try { batch = Math.max(1, Integer.parseInt(fields[1].trim())); } catch (Exception ignored) { batch = 64; }
            }
        }
        if (columns.isEmpty()) {
            return "status\tfailed\terror\tno declared columns";
        }
        int rows = 0;
        int batches = 0;
        int cells = 0;
        List<String> buffered = new ArrayList<>();
        try (InputStream stream = new FileInputStream(name);
             JsonParser parser = FACTORY.createParser(stream);
             BufferedWriter writer = Files.newBufferedWriter(Paths.get(output), StandardCharsets.UTF_8)) {
            writer.write("status\tok\treviewbench-json-projection\n");
            JsonToken first = parser.nextToken();
            if (first != JsonToken.START_ARRAY) {
                return "status\tfailed\terror\tnot a json array";
            }
            while (parser.nextToken() == JsonToken.START_OBJECT) {
                String[] values = new String[columns.size()];
                boolean[] seen = new boolean[columns.size()];
                boolean[] scalar = new boolean[columns.size()];
                while (parser.nextToken() != JsonToken.END_OBJECT) {
                    String field = parser.currentName();
                    JsonToken value = parser.nextToken();
                    int index = columns.indexOf(field);
                    if (index < 0) {
                        parser.skipChildren();
                        continue;
                    }
                    if (seen[index]) {
                        // A duplicated declared column is not a declared scalar row.
                        seen[index] = false;
                        continue;
                    }
                    switch (value) {
                        case VALUE_STRING:
                            values[index] = parser.getText();
                            break;
                        case VALUE_NUMBER_INT:
                        case VALUE_NUMBER_FLOAT:
                            values[index] = parser.getText().trim();
                            break;
                        case VALUE_TRUE:
                            values[index] = "true";
                            break;
                        case VALUE_FALSE:
                            values[index] = "false";
                            break;
                        case VALUE_NULL:
                            break;
                        default:
                            parser.skipChildren();
                            break;
                    }
                    if (values[index] != null) {
                        seen[index] = true;
                        scalar[index] = true;
                    }
                }
                for (int i = 0; i < columns.size(); i++) {
                    if (seen[i] && scalar[i]) {
                        String value = values[i];
                        if (numeric.get(i)) {
                            value = Long.toString(Long.parseLong(value));
                        } else {
                            value = escape(value);
                        }
                        buffered.add("cell\t" + rows + "\t" + i + "\t" + columns.get(i) + "\t" + value + "\n");
                        cells++;
                    }
                }
                rows++;
                if (rows % batch == 0) {
                    batches++;
                    for (String cell : buffered) {
                        writer.write(cell);
                    }
                    buffered.clear();
                }
            }
            if (!buffered.isEmpty() || batches == 0) {
                batches++;
                for (String cell : buffered) {
                    writer.write(cell);
                }
            }
            writer.write("summary\tstatus\tok\n");
            writer.flush();
        } catch (Exception error) {
            return "status\tfailed\terror\t" + escape(String.valueOf(error.getMessage()));
        }
        StringBuilder summary = new StringBuilder();
        summary.append("rows\t").append(rows).append("\n");
        summary.append("batches\t").append(batches).append("\n");
        summary.append("columns\t").append(columns.size()).append("\n");
        summary.append("cells\t").append(cells).append("\n");
        summary.append("status\tok\n");
        return summary.toString();
    }

}
