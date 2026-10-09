package attune.reviewbench;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;

import java.io.BufferedWriter;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import java.util.TreeSet;

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

    /**
     * The exact UTF-8 byte length of one declared text. It is the same encoding
     * {@link #sha256Hex(String)} hashes, so a stage can report the exact byte
     * count of a derived span with the same convention as its digest.
     */
    public static int utf8Bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8).length;
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
     * Whether the exact bytes are a well-formed UTF-8 sequence, decided
     * mechanically by a strict decode that reports malformed input instead of
     * replacing it. It classifies no admission, size, digest or policy: it only
     * reports whether the bytes can be delivered losslessly as text, so a caller
     * that cannot deliver them can say so rather than silently substituting
     * replacement characters.
     */
    private static boolean isWellFormedUtf8(byte[] content) {
        CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            decoder.decode(ByteBuffer.wrap(content));
            return true;
        } catch (CharacterCodingException error) {
            return false;
        }
    }

    /**
     * The identity of one declared file: {@code bytes}, {@code sha256}, the
     * git blob SHA-1 ({@code gitblob}) of its exact bytes and the mechanical
     * text-encoding classification ({@code utf8}), one {@code key\\tvalue} line
     * each. The git blob digest is the object name git
     * would give the bytes, so a corpus pin declared as a git blob is verified
     * against the real materialized bytes rather than a page fetch. The
     * {@code utf8} field is {@code supported} exactly when the bytes are a
     * well-formed UTF-8 sequence and {@code unsupported} otherwise, so a caller
     * can classify a file it cannot deliver losslessly as text without
     * re-encoding it.
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
            out.append("utf8\t").append(isWellFormedUtf8(content) ? "supported" : "unsupported").append("\n");
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

    /**
     * The declared cell vocabulary of the golden-reference projection. It is the
     * SAME bounded vocabulary the judge driver's own reference projection uses
     * (a tab, newline or carriage return becomes a space; an absent value is the
     * empty cell), so a reference population materialized here is byte-identical
     * to the one the judge action wrote and can be compared against it directly.
     */
    private static String cell(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
    }

    private static String scalarText(JsonToken token, JsonParser parser) throws IOException {
        if (token == null) {
            return null;
        }
        switch (token) {
            case VALUE_STRING:
            case VALUE_NUMBER_INT:
            case VALUE_NUMBER_FLOAT:
            case VALUE_TRUE:
            case VALUE_FALSE:
                return parser.getText();
            default:
                return null;
        }
    }

    private static Long numberText(JsonToken token, JsonParser parser) throws IOException {
        String text = scalarText(token, parser);
        if (text == null) {
            return null;
        }
        try {
            return Long.valueOf(text.trim());
        } catch (NumberFormatException error) {
            return null;
        }
    }

    /**
     * Project one pinned golden JSON file's {@code findings} array into the
     * declared reference vocabulary and write it to {@code output}: one
     * {@code reference <TAB> task <TAB> index <TAB> file <TAB> start <TAB> end
     * <TAB> tp|fp|unknown <TAB> severity <TAB> category <TAB> message} row per
     * golden finding, in the golden file's own order, exactly as the judge
     * driver's own reference projection writes it.
     *
     * <p>It decides nothing: it selects no task, labels no candidate and judges
     * nothing. The golden file is read once, the declared scalar columns are
     * projected in order and every count, severity classification, denominator
     * and eligibility statement stays in {@code Attune.Study}. A golden label
     * outside the declared {@code tp}/{@code fp} vocabulary is projected as
     * {@code unknown} rather than folded into {@code fp}, so an unlabelled
     * finding can never be scored as a negative; the owner reports the unknown
     * population separately. The golden file is a declared input of the caller;
     * this method reads exactly the path it is given and never searches for one.
     */
    public static String goldReferences(String task, String goldPath, String output) {
        List<String> rows = new ArrayList<>();
        int index = 0;
        try (InputStream stream = new FileInputStream(goldPath);
             JsonParser parser = FACTORY.createParser(stream)) {
            if (parser.nextToken() != JsonToken.START_OBJECT) {
                return "status\tfailed\terror\tnot a json object";
            }
            while (parser.nextToken() != JsonToken.END_OBJECT) {
                String field = parser.currentName();
                JsonToken value = parser.nextToken();
                if ("findings".equals(field) && value == JsonToken.START_ARRAY) {
                    while (parser.nextToken() == JsonToken.START_OBJECT) {
                        String file = null;
                        String label = null;
                        String severity = null;
                        String category = null;
                        String message = null;
                        Long start = null;
                        Long end = null;
                        while (parser.nextToken() != JsonToken.END_OBJECT) {
                            String name = parser.currentName();
                            JsonToken token = parser.nextToken();
                            switch (name) {
                                case "file": file = scalarText(token, parser); break;
                                case "start_line": start = numberText(token, parser); break;
                                case "end_line": end = numberText(token, parser); break;
                                case "tp_fp": label = scalarText(token, parser); break;
                                case "severity": severity = scalarText(token, parser); break;
                                case "category": category = scalarText(token, parser); break;
                                case "message": message = scalarText(token, parser); break;
                                default:
                                    if (token == JsonToken.START_OBJECT || token == JsonToken.START_ARRAY) {
                                        parser.skipChildren();
                                    }
                                    break;
                            }
                        }
                        if (file == null) {
                            continue;
                        }
                        index++;
                        rows.add("reference\t" + cell(task) + "\t" + index + "\t" + cell(file) + "\t"
                                + (start == null ? "" : start.toString()) + "\t"
                                + (end == null ? "" : end.toString()) + "\t"
                                + ("tp".equalsIgnoreCase(label) ? "tp"
                                        : ("fp".equalsIgnoreCase(label) ? "fp" : "unknown")) + "\t"
                                + cell(severity) + "\t" + cell(category) + "\t" + cell(message));
                    }
                } else if (value == JsonToken.START_OBJECT || value == JsonToken.START_ARRAY) {
                    parser.skipChildren();
                }
            }
            Files.writeString(Paths.get(output),
                    rows.isEmpty() ? "" : String.join("\n", rows) + "\n", StandardCharsets.UTF_8);
        } catch (Exception error) {
            return "status\tfailed\terror\t" + escape(String.valueOf(error.getMessage()));
        }
        return "references\t" + index + "\nstatus\tok\n";
    }

    /** The streaming SHA-256 of one declared file's exact bytes, as lowercase hex. */
    private static String digestOf(String path) {
        try (InputStream raw = new FileInputStream(path);
             DigestInputStream stream = new DigestInputStream(raw, MessageDigest.getInstance("SHA-256"))) {
            byte[] buffer = new byte[1 << 16];
            while (stream.read(buffer) >= 0) {
                // the digest is updated by the stream itself
            }
            return hex(stream.getMessageDigest().digest());
        } catch (Exception error) {
            return "unreadable";
        }
    }

    /**
     * The declared changed-file record of one exact world pair, written to
     * {@code output}.
     *
     * <p>The launcher's {@code worldsources} manifest names every declared source
     * byte of the two worlds by absolute path. For each declared path under the
     * world's own {@code /worlds/<world>/} marker the repository-relative path is
     * recovered by dropping that world's single leading archive directory, exactly
     * as the clean-source extraction does. A head file is <em>changed</em> when
     * its repository-relative path is absent from the base world or its exact
     * bytes differ; the record carries the head byte count and nothing else.
     *
     * <p>The adapter decides no classification, count, quota, threshold or
     * admission: it reports which declared files differ and how large they are,
     * and {@code Attune.Study}'s ReviewBench owner decides what that means. Two
     * files with the same bytes are never reported as changed, so a re-exported
     * identical tree yields no changed record rather than an invented one.
     */
    public static String changedFiles(String worldManifest, String baseWorld, String headWorld, String output) {
        String baseMarker = "/worlds/" + baseWorld + "/";
        String headMarker = "/worlds/" + headWorld + "/";
        TreeMap<String, String> base = new TreeMap<>();
        TreeMap<String, String> head = new TreeMap<>();
        TreeMap<String, String> headPath = new TreeMap<>();
        TreeSet<String> basePaths = new TreeSet<>();
        try {
            for (String line : Files.readAllLines(Paths.get(worldManifest), StandardCharsets.UTF_8)) {
                String path = line.trim();
                if (path.isEmpty()) {
                    continue;
                }
                if (path.contains(baseMarker)) {
                    String relative = dropLeadingDirectory(lastAfter(baseMarker, path));
                    if (!relative.isEmpty()) {
                        basePaths.add(relative);
                        base.put(relative, digestOf(path));
                    }
                } else if (path.contains(headMarker)) {
                    String relative = dropLeadingDirectory(lastAfter(headMarker, path));
                    if (!relative.isEmpty()) {
                        head.put(relative, digestOf(path));
                        headPath.put(relative, path);
                    }
                }
            }
            long changedBytes = 0L;
            TreeMap<String, Long> changed = new TreeMap<>();
            for (String relative : head.keySet()) {
                String baseDigest = base.get(relative);
                if (baseDigest == null || !baseDigest.equals(head.get(relative))) {
                    long size = Files.size(Paths.get(headPath.get(relative)));
                    changed.put(relative, size);
                    changedBytes += size;
                }
            }
            try (BufferedWriter writer = Files.newBufferedWriter(Paths.get(output), StandardCharsets.UTF_8)) {
                for (String relative : changed.keySet()) {
                    String status = basePaths.contains(relative) ? "modified" : "added";
                    writer.write("changed\t" + status + "\t" + escape(relative) + "\t"
                            + changed.get(relative) + "\t" + headerOf(headPath.get(relative)) + "\n");
                }
                writer.write("summary\t" + base.size() + "\t" + head.size() + "\t"
                        + changed.size() + "\t" + changedBytes + "\n");
            }
            return "basefiles\t" + base.size() + "\nheadfiles\t" + head.size()
                    + "\nchangedfiles\t" + changed.size() + "\nchangedbytes\t" + changedBytes + "\nstatus\tok\n";
        } catch (Exception error) {
            return "status\tfailed\terror\t" + escape(String.valueOf(error.getMessage())) + "\n";
        }
    }

    /**
     * A bounded sample of one declared file's first line, escaped with the
     * canonical cell vocabulary. The declared generated/minified/vendor header
     * rule is applied to this sample by the Flix owner; the adapter only reports
     * the bytes it actually read, and an unreadable file reports an empty sample
     * rather than an invented marker.
     */
    private static String headerOf(String path) {
        try (InputStream stream = new FileInputStream(path)) {
            byte[] buffer = new byte[400];
            int read = stream.read(buffer);
            if (read <= 0) {
                return "";
            }
            String text = new String(buffer, 0, read, StandardCharsets.UTF_8);
            int index = text.indexOf('\n');
            String line = index < 0 ? text : text.substring(0, index);
            if (line.length() > 200) {
                line = line.substring(0, 200);
            }
            return escape(line);
        } catch (Exception error) {
            return "";
        }
    }

    /** The substring after the last occurrence of {@code marker}. */
    private static String lastAfter(String marker, String text) {        int index = text.lastIndexOf(marker);
        return index < 0 ? text : text.substring(index + marker.length());
    }

    /** Drop the leading path segment, recovering the repository-relative path. */
    private static String dropLeadingDirectory(String relative) {
        int index = relative.indexOf('/');
        return index < 0 ? "" : relative.substring(index + 1);
    }

}
