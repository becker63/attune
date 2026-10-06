package attune.parquet;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.channels.Channels;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import org.apache.arrow.dataset.file.DatasetFileWriter;
import org.apache.arrow.dataset.file.FileFormat;
import org.apache.arrow.dataset.file.FileSystemDatasetFactory;
import org.apache.arrow.dataset.jni.NativeMemoryPool;
import org.apache.arrow.dataset.scanner.ScanOptions;
import org.apache.arrow.memory.BufferAllocator;
import org.apache.arrow.memory.RootAllocator;
import org.apache.arrow.vector.BigIntVector;
import org.apache.arrow.vector.BitVector;
import org.apache.arrow.vector.FieldVector;
import org.apache.arrow.vector.Float8Vector;
import org.apache.arrow.vector.IntVector;
import org.apache.arrow.vector.VarCharVector;
import org.apache.arrow.vector.VectorSchemaRoot;
import org.apache.arrow.vector.complex.ListVector;
import org.apache.arrow.vector.ipc.ArrowStreamReader;
import org.apache.arrow.vector.ipc.ArrowStreamWriter;
import org.apache.arrow.vector.types.pojo.ArrowType;
import org.apache.arrow.vector.types.pojo.Field;
import org.apache.arrow.vector.types.pojo.FieldType;
import org.apache.arrow.vector.types.pojo.Schema;

/**
 * Thin Arrow Dataset seam for the typed Parquet artifact.
 *
 * <p>Adapted from the read-only reference {@code src/native/parquet/AttuneParquet.java}
 * (HEAD {@code ce2e3f0a363f67217fa6f1f39ffc7b194d4aa3d7}); see the adaptation
 * record in {@code DESIGN.md}.
 * Flix owns every schema and row meaning: it passes the exact declared schema and
 * the authored rows as JSON and reads back the admitted rows. This class only
 * performs the unavoidable Arrow Dataset JNI write/read mechanics.
 *
 * <p>Every public entry returns a small versioned JSON envelope instead of
 * throwing, because Flix cannot catch a Java exception across the interop
 * boundary. A successful call carries {@code "status":"ok"} and the admitted
 * rows; a rejected call carries {@code "status":"error"} and a classified kind,
 * so a wrong schema or an unreadable file is a typed answer, never a crash.
 */
public final class AttuneParquet {
    static { System.setProperty("arrow.allocation.manager.type", "Unsafe"); }

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<List<Map<String, Object>>> TABLE_ROWS = new TypeReference<>() {};

    private AttuneParquet() {}

    /** Writes rows using the exact declared schema, then returns the admitted rows. */
    public static String writeTable(String name, String schemaPayload, String rowsPayload) {
        try {
            TableSpec spec = JSON.readValue(schemaPayload, TableSpec.class);
            List<Map<String, Object>> rows = JSON.readValue(rowsPayload, TABLE_ROWS);
            Schema schema = tableSchema(spec);
            write(name, schema, root -> fillTable(root, spec, rows));
            return ok(readRows(name, spec));
        } catch (Throwable error) {
            return failure(error);
        }
    }

    /** Reads only a table whose physical schema and identity exactly match the declaration. */
    public static String readTable(String name, String schemaPayload) {
        try {
            return ok(readRows(name, JSON.readValue(schemaPayload, TableSpec.class)));
        } catch (Throwable error) {
            return failure(error);
        }
    }

    // ------------------------------------------------ pinned public input mechanics
    //
    // The two methods below are the minimal projected/batched Arrow boundary the
    // streaming normalization consumes. They are mechanics only: `inspect`
    // reports the exact bytes and the recorded physical schema, and `project`
    // streams a declared column projection in declared batches into canonical
    // per-cell records. Which fields must exist, what a record means, which
    // columns a study projects and every comparison against a declared pin are
    // Flix decisions; neither method filters, selects or interprets a row. Both
    // return the same canonical record text and escape every value, so a value
    // can never collapse into a missing field and an unreadable file is a typed
    // answer rather than a crash across the interop boundary.
    //
    // Canonical records text:
    //   status<TAB>ok<TAB>parquet-inspect
    //   bytes<TAB><exact byte length>
    //   sha256<TAB><lower-case hex digest of exactly those bytes>
    //   field<TAB><depth><TAB><name><TAB><shallow type><TAB><nullable>
    // and, for a projection:
    //   status<TAB>ok<TAB>parquet-projection
    //   rows<TAB><rows written>   batches<TAB><batches scanned>
    //   column<TAB><index><TAB><name><TAB><declared type>
    //   cell<TAB><row><TAB><column index><TAB><item|-|null><TAB><escaped value>
    // A scalar cell carries `-` as its item; a list cell carries one record per
    // element with the element index; a null value is the unescaped token
    // `null`, an empty string is `\e`. A failure is
    // `status<TAB>error<TAB><kind><TAB><escaped message>`.
    //
    // The projection spec is the same canonical text:
    //   column<TAB><name><TAB><type>   (type in the flat table vocabulary, plus list<string>)
    //   batch<TAB><rows per batch>     (optional)
    //   limit<TAB><rows to write>      (optional; 0, the default, means every row)

    /**
     * Mechanically describe one Parquet file's exact bytes and physical schema.
     *
     * <p>It reads the file's real byte length, digests exactly those bytes with
     * SHA-256 and reports the Arrow physical schema the pinned codec observes,
     * one `field` record per node in pre-order. It decides nothing: the declared
     * identity and the expected schema live in Flix, and the caller compares.
     */
    public static String inspect(String name) {
        try {
            Path path = Path.of(name).toAbsolutePath();
            long bytes = Files.size(path);
            String sha256 = digest(path);
            StringBuilder out = new StringBuilder();
            out.append("status\tok\tparquet-inspect\n");
            out.append("bytes\t").append(bytes).append('\n');
            out.append("sha256\t").append(sha256).append('\n');
            try (BufferAllocator allocator = new RootAllocator();
                 var factory = new FileSystemDatasetFactory(allocator, NativeMemoryPool.getDefault(),
                         FileFormat.PARQUET, path.toUri().toString());
                 var dataset = factory.finish();
                 var scanner = dataset.newScan(new ScanOptions(4_096))) {
                for (Field field : scanner.schema().getFields()) {
                    appendPhysicalField(out, field, 0);
                }
            }
            return out.toString();
        } catch (Throwable error) {
            return catalogFailure(error);
        }
    }

    /**
     * Stream one declared column projection of one Parquet file into canonical per-cell records.
     *
     * <p>The scan is projected at the codec (only the declared top-level columns
     * are read) and batched at the declared batch size, and each batch's records
     * are written through to the declared output before the next batch loads, so
     * the whole raw catalog is never held as one row list. The method filters
     * nothing and ranks nothing.
     */
    public static String projectColumns(String name, String spec, String output) {
        Path cells = null;
        try {
            ProjectionSpec projection = parseProjection(spec);
            Path source = Path.of(name).toAbsolutePath();
            Path target = Path.of(output).toAbsolutePath();
            Files.createDirectories(target.getParent());
            cells = Files.createTempFile(target.getParent(), ".project-", ".cells");
            int rowIndex = 0;
            long batches = 0;
            try (BufferAllocator allocator = new RootAllocator();
                 var factory = new FileSystemDatasetFactory(allocator, NativeMemoryPool.getDefault(),
                         FileFormat.PARQUET, source.toUri().toString());
                 var dataset = factory.finish();
                 var scanner = dataset.newScan(new ScanOptions(
                         projection.names().toArray(String[]::new), projection.batchSize()));
                 var reader = scanner.scanBatches();
                 var writer = Files.newBufferedWriter(cells, StandardCharsets.UTF_8)) {
                var root = reader.getVectorSchemaRoot();
                while (reader.loadNextBatch()) {
                    int count = root.getRowCount();
                    batches++;
                    StringBuilder block = new StringBuilder();
                    for (int row = 0; row < count; row++) {
                        if (projection.limit() > 0 && rowIndex >= projection.limit()) {
                            break;
                        }
                        appendCells(block, rowIndex, projection, root, row);
                        rowIndex++;
                    }
                    writer.write(block.toString());
                    if (projection.limit() > 0 && rowIndex >= projection.limit()) {
                        break;
                    }
                }
            }
            StringBuilder head = new StringBuilder();
            head.append("status\tok\tparquet-projection\n");
            head.append("rows\t").append(rowIndex).append('\n');
            head.append("batches\t").append(batches).append('\n');
            for (int index = 0; index < projection.columns().size(); index++) {
                ProjectedColumn column = projection.columns().get(index);
                head.append("column\t").append(index).append('\t').append(column.name())
                        .append('\t').append(column.type()).append('\n');
            }
            Path assembled = Files.createTempFile(target.getParent(), ".project-", ".txt");
            try (var sink = Files.newOutputStream(assembled)) {
                sink.write(head.toString().getBytes(StandardCharsets.UTF_8));
                Files.copy(cells, sink);
            }
            Files.move(assembled, target, StandardCopyOption.REPLACE_EXISTING);
            return head.toString();
        } catch (Throwable error) {
            return catalogFailure(error);
        } finally {
            if (cells != null) {
                try {
                    Files.deleteIfExists(cells);
                } catch (IOException ignored) {
                    // The declared output is already complete; a leftover temp file is not a result.
                }
            }
        }
    }

    private static void appendPhysicalField(StringBuilder out, Field field, int depth) {
        out.append("field\t").append(depth).append('\t').append(field.getName()).append('\t')
                .append(typeName(field.getType())).append('\t').append(field.isNullable() ? "true" : "false")
                .append('\n');
        for (Field child : field.getChildren()) {
            appendPhysicalField(out, child, depth + 1);
        }
    }

    private static String typeName(ArrowType type) {
        if (type instanceof ArrowType.Utf8) {
            return "utf8";
        }
        if (type instanceof ArrowType.Bool) {
            return "bool";
        }
        if (type instanceof ArrowType.Int integer) {
            return "int" + integer.getBitWidth();
        }
        if (type instanceof ArrowType.FloatingPoint) {
            return "float64";
        }
        if (type instanceof ArrowType.List) {
            return "list";
        }
        if (type instanceof ArrowType.Struct) {
            return "struct";
        }
        return type.toString();
    }

    private static void appendCells(
            StringBuilder out, int row, ProjectionSpec projection, VectorSchemaRoot root, int index) {
        for (int columnIndex = 0; columnIndex < projection.columns().size(); columnIndex++) {
            ProjectedColumn column = projection.columns().get(columnIndex);
            FieldVector vector = root.getVector(column.name());
            if (vector == null) {
                throw new IllegalArgumentException("projected column is absent from the physical schema: " + column.name());
            }
            if (vector.isNull(index)) {
                cell(out, row, columnIndex, "-", "null");
                continue;
            }
            switch (column.type()) {
                case "string" -> cell(out, row, columnIndex, "-", text((VarCharVector) vector, index));
                case "int32" -> cell(out, row, columnIndex, "-", Integer.toString(((IntVector) vector).get(index)));
                case "int64" -> cell(out, row, columnIndex, "-", Long.toString(((BigIntVector) vector).get(index)));
                case "float64" -> cell(out, row, columnIndex, "-", Double.toString(((Float8Vector) vector).get(index)));
                case "boolean" -> cell(out, row, columnIndex, "-", ((BitVector) vector).get(index) != 0 ? "true" : "false");
                case "list<string>" -> {
                    List<?> items = (List<?>) ((ListVector) vector).getObject(index);
                    for (int item = 0; item < items.size(); item++) {
                        cell(out, row, columnIndex, Integer.toString(item), String.valueOf(items.get(item)));
                    }
                }
                default -> throw new IllegalArgumentException("unsupported projected column type: " + column.type());
            }
        }
    }

    private static void cell(StringBuilder out, int row, int column, String item, String value) {
        out.append("cell\t").append(row).append('\t').append(column).append('\t').append(item).append('\t')
                .append(escape(value)).append('\n');
    }

    private static ProjectionSpec parseProjection(String spec) {
        long limit = 0;
        long batchSize = 8_192;
        List<ProjectedColumn> columns = new ArrayList<>();
        for (String line : spec.split("\n")) {
            if (line.isBlank()) {
                continue;
            }
            String[] fields = line.split("\t", -1);
            switch (fields[0]) {
                case "limit" -> limit = Long.parseLong(fields[1].trim());
                case "batch" -> batchSize = Long.parseLong(fields[1].trim());
                case "column" -> columns.add(new ProjectedColumn(fields[1], fields[2]));
                default -> throw new IllegalArgumentException("unknown projection record: " + fields[0]);
            }
        }
        if (columns.isEmpty()) {
            throw new IllegalArgumentException("projection declares no columns");
        }
        if (batchSize <= 0) {
            throw new IllegalArgumentException("projection batch size must be positive");
        }
        return new ProjectionSpec(columns, limit, batchSize);
    }

    private static String digest(Path path) throws Exception {
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        try (var stream = Files.newInputStream(path)) {
            byte[] buffer = new byte[1 << 16];
            int read;
            while ((read = stream.read(buffer)) >= 0) {
                sha256.update(buffer, 0, read);
            }
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : sha256.digest()) {
            hex.append(String.format("%02x", value));
        }
        return hex.toString();
    }

    private static String catalogFailure(Throwable error) {
        Throwable root = rootCause(error);
        String kind = (root instanceof IllegalArgumentException) ? "schema"
                : (root instanceof IOException) ? "io" : "native";
        return "status\terror\t" + kind + "\t" + escape(root.getClass().getSimpleName() + ": " + root.getMessage()) + "\n";
    }

    private static String escape(String value) {
        if (value == null) {
            return "null";
        }
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

    private record ProjectedColumn(String name, String type) {}

    private record ProjectionSpec(List<ProjectedColumn> columns, long limit, long batchSize) {
        List<String> names() {
            return columns.stream().map(ProjectedColumn::name).toList();
        }
    }

    private static String readRows(String name, TableSpec spec) throws Exception {
        try (BufferAllocator allocator = new RootAllocator()) {
            Schema expected = tableSchema(spec);
            Path path = Path.of(name).toAbsolutePath();
            try (var factory = new FileSystemDatasetFactory(allocator, NativeMemoryPool.getDefault(),
                         FileFormat.PARQUET, path.toUri().toString());
                 var dataset = factory.finish();
                 var scanner = dataset.newScan(new ScanOptions(32_768));
                 var reader = scanner.scanBatches()) {
                if (!expected.getFields().equals(scanner.schema().getFields())) {
                    throw new IllegalArgumentException("typed Parquet schema does not match " + spec.format
                            + ": expected=" + expected + ", actual=" + scanner.schema());
                }
                List<Map<String, Object>> rows = new ArrayList<>();
                while (reader.loadNextBatch()) {
                    var root = reader.getVectorSchemaRoot();
                    for (int row = 0; row < root.getRowCount(); row++) {
                        Map<String, Object> values = new LinkedHashMap<>();
                        for (ColumnSpec column : spec.columns) {
                            values.put(column.name, read(root.getVector(column.name), column, row));
                        }
                        rows.add(values);
                    }
                }
                return JSON.writeValueAsString(rows);
            }
        }
    }

    private static Schema tableSchema(TableSpec spec) {
        if (spec.format == null || spec.format.isBlank()) {
            throw new IllegalArgumentException("typed Parquet format identity is empty");
        }
        if (spec.columns == null || spec.columns.isEmpty()) {
            throw new IllegalArgumentException("typed Parquet table has no columns");
        }
        Set<String> names = new java.util.HashSet<>();
        List<Field> fields = new ArrayList<>();
        for (ColumnSpec column : spec.columns) {
            if (column.name == null || column.name.isBlank() || !names.add(column.name)) {
                throw new IllegalArgumentException("invalid or duplicate typed Parquet column");
            }
            fields.add(switch (column.type) {
                case "string" -> field(column.name, new ArrowType.Utf8(), column.nullable, null);
                case "int32" -> field(column.name, new ArrowType.Int(32, true), column.nullable, null);
                case "int64" -> field(column.name, new ArrowType.Int(64, true), column.nullable, null);
                case "float64" -> field(column.name, new ArrowType.FloatingPoint(
                        org.apache.arrow.vector.types.FloatingPointPrecision.DOUBLE), column.nullable, null);
                case "boolean" -> field(column.name, new ArrowType.Bool(), column.nullable, null);
                case "list<string>" -> field(column.name, new ArrowType.List(), column.nullable,
                        List.of(field("element", new ArrowType.Utf8(), true, null)));
                default -> throw new IllegalArgumentException("unsupported typed Parquet column: " + column.type);
            });
        }
        // Arrow Dataset preserves the physical Parquet fields but does not
        // expose footer metadata on read. Scientific protocol/version values
        // therefore remain explicit typed columns owned and checked by Flix.
        return new Schema(fields);
    }

    private static void fillTable(VectorSchemaRoot root, TableSpec spec, List<Map<String, Object>> rows) {
        root.allocateNew();
        Set<String> names = spec.columns.stream().map(ColumnSpec::name).collect(java.util.stream.Collectors.toSet());
        for (int row = 0; row < rows.size(); row++) {
            Map<String, Object> values = rows.get(row);
            if (!values.keySet().equals(names)) {
                throw new IllegalArgumentException("typed Parquet row columns do not match schema");
            }
            for (ColumnSpec column : spec.columns) {
                write(root.getVector(column.name), column, row, values.get(column.name));
            }
        }
        for (var vector : root.getFieldVectors()) {
            vector.setValueCount(rows.size());
        }
        root.setRowCount(rows.size());
    }

    private static void write(FieldVector vector, ColumnSpec column, int row, Object value) {
        if (value == null) {
            if (!column.nullable) {
                throw new IllegalArgumentException("null in required column: " + column.name);
            }
            vector.setNull(row);
            return;
        }
        switch (column.type) {
            case "string" -> {
                if (!(value instanceof String text)) {
                    throw typeError(column);
                }
                set((VarCharVector) vector, row, text);
            }
            case "int64" -> {
                if (!(value instanceof Byte || value instanceof Short
                        || value instanceof Integer || value instanceof Long)) {
                    throw typeError(column);
                }
                ((BigIntVector) vector).setSafe(row, ((Number) value).longValue());
            }
            case "int32" -> {
                if (!(value instanceof Byte || value instanceof Short || value instanceof Integer)) {
                    throw typeError(column);
                }
                ((IntVector) vector).setSafe(row, ((Number) value).intValue());
            }
            case "float64" -> {
                if (!(value instanceof Number number)) {
                    throw typeError(column);
                }
                ((Float8Vector) vector).setSafe(row, number.doubleValue());
            }
            case "boolean" -> {
                if (!(value instanceof Boolean bool)) {
                    throw typeError(column);
                }
                ((BitVector) vector).setSafe(row, bool ? 1 : 0);
            }
            case "list<string>" -> {
                if (!(value instanceof List<?> values)) {
                    throw typeError(column);
                }
                var writer = ((ListVector) vector).getWriter();
                writer.setPosition(row);
                writer.startList();
                for (Object item : values) {
                    if (!(item instanceof String text)) {
                        throw typeError(column);
                    }
                    writer.writeVarChar(text);
                }
                writer.endList();
            }
            default -> throw typeError(column);
        }
    }

    private static Object read(FieldVector vector, ColumnSpec column, int row) {
        if (vector.isNull(row)) {
            if (!column.nullable) {
                throw new IllegalArgumentException("null in required column: " + column.name);
            }
            return null;
        }
        return switch (column.type) {
            case "string" -> text((VarCharVector) vector, row);
            case "int32" -> ((IntVector) vector).get(row);
            case "int64" -> ((BigIntVector) vector).get(row);
            case "float64" -> ((Float8Vector) vector).get(row);
            case "boolean" -> ((BitVector) vector).get(row) != 0;
            case "list<string>" -> ((List<?>) ((ListVector) vector).getObject(row)).stream()
                    .map(Object::toString).toList();
            default -> throw typeError(column);
        };
    }

    private static IllegalArgumentException typeError(ColumnSpec column) {
        return new IllegalArgumentException("invalid value for " + column.name + ": " + column.type);
    }

    private static void write(String name, Schema schema, Consumer<VectorSchemaRoot> fill) throws IOException {
        Path target = Path.of(name).toAbsolutePath();
        Files.createDirectories(target.getParent());
        Path directory = Files.createTempDirectory(target.getParent(), ".parquet-");
        try (BufferAllocator allocator = new RootAllocator();
             VectorSchemaRoot root = VectorSchemaRoot.create(schema, allocator)) {
            fill.accept(root);
            var bytes = new ByteArrayOutputStream();
            try (var writer = new ArrowStreamWriter(root, null, Channels.newChannel(bytes))) {
                writer.start();
                writer.writeBatch();
                writer.end();
            }
            try (var reader = new ArrowStreamReader(new ByteArrayInputStream(bytes.toByteArray()), allocator)) {
                DatasetFileWriter.write(allocator, reader, FileFormat.PARQUET,
                        directory.toUri().toString(), new String[0], 1, "part-{i}.parquet");
                reader.getVectorSchemaRoot().clear();
            }
            root.clear();
            awaitNativeRelease(allocator);
            try (var files = Files.walk(directory)) {
                List<Path> output = files.filter(Files::isRegularFile)
                        .filter(path -> path.toString().endsWith(".parquet")).toList();
                if (output.size() != 1) {
                    throw new IOException("Arrow writer did not produce one file");
                }
                Files.move(output.getFirst(), target, StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            remove(directory);
        }
    }

    private static Field field(String name, ArrowType type, boolean nullable, List<Field> children) {
        return new Field(name, new FieldType(nullable, type, null), children);
    }

    private static String text(VarCharVector vector, int i) {
        return new String(vector.get(i), StandardCharsets.UTF_8);
    }

    private static void set(VarCharVector vector, int i, String value) {
        if (value == null) {
            vector.setNull(i);
        } else {
            vector.setSafe(i, value.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void awaitNativeRelease(BufferAllocator allocator) {
        long deadline = System.nanoTime() + 5_000_000_000L;
        while (allocator.getAllocatedMemory() != 0 && System.nanoTime() < deadline) {
            Thread.yield();
        }
    }

    private static void remove(Path directory) {
        try (var paths = Files.walk(directory)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException error) {
                    throw new UncheckedIOException(error);
                }
            });
        } catch (IOException error) {
            throw new UncheckedIOException(error);
        }
    }

    private static String ok(String rowsJson) {
        return "{\"version\":1,\"status\":\"ok\",\"kind\":\"parquet\",\"rows\":" + rowsJson + "}";
    }

    private static String failure(Throwable error) {
        Throwable root = rootCause(error);
        String kind = (root instanceof IllegalArgumentException) ? "schema"
                : (root instanceof IOException) ? "io" : "native";
        String message = root.getClass().getSimpleName() + ": " + root.getMessage();
        return "{\"version\":1,\"status\":\"error\",\"kind\":\"" + kind + "\",\"message\":"
                + quote(message) + "}";
    }

    private static Throwable rootCause(Throwable error) {
        Throwable current = error;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private static String quote(String text) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> out.append(c);
            }
        }
        return out.append('"').toString();
    }

    private record ColumnSpec(String name, String type, boolean nullable) {}
    private record TableSpec(String format, List<ColumnSpec> columns) {}
}
