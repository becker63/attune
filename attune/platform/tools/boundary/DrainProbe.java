package attune.tools.boundary;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Test-only mechanical seam for the bounded log drain.
 *
 * <p>The ordinary receipt action measures real declared commands, but a real
 * child cannot deterministically make the boundary's log drain fail. This seam
 * therefore drives the <em>exact production</em> {@link ProcessReceipts.Drain}
 * over injected streams whose failure the fixture declares, and emits each case
 * through the production record formatter and the production failure
 * propagation. It decides no policy: the Flix law parses the records through
 * {@code Attune.Study} and classifies them. It is not a production fault API and
 * has no main of its own; it runs only from the declared drain-probe action.
 *
 * <p>Three deterministic cases are recorded, each with the declared child exit
 * zero so only the drain state can keep the receipt from becoming a clean
 * measured success:
 *
 * <ul>
 *   <li>{@code read-failure}: the child pipe yields a bounded prefix and then
 *       fails, so the production drain records incomplete bytes and a runtime
 *       error;
 *   <li>{@code write-failure}: the bounded log cannot be opened because the
 *       case's {@code logs} store is a regular file, exactly as a full or
 *       unwritable store would fail;
 *   <li>{@code clean}: an ordinary bounded stream read to end-of-stream stays a
 *       normal measurement.
 * </ul>
 */
final class DrainProbe {
    private DrainProbe() {}

    /** Writes the declared drain fault fixture's `receipts.tsv`. */
    static void write(Path outDir) throws IOException, InterruptedException {
        Files.createDirectories(outDir);
        List<String> records = new ArrayList<>();
        records.add(readFailure(outDir));
        records.add(writeFailure(outDir));
        records.add(clean(outDir));
        Files.write(outDir.resolve("receipts.tsv"), records, StandardCharsets.UTF_8);
    }

    /// A post-start drain whose child pipe fails after a bounded prefix.
    private static String readFailure(Path outDir) throws IOException, InterruptedException {
        Path caseDir = outDir.resolve("read-failure");
        Files.createDirectories(caseDir.resolve("logs"));
        return measure("read-failure", caseDir, new ProbeStream("probe-prefix-", true));
    }

    /// A post-start drain whose bounded log cannot be opened. The case declares
    /// its `logs` store as a regular file, so the production
    /// `Files.newOutputStream` fails the way a full or unwritable store would.
    private static String writeFailure(Path outDir) throws IOException, InterruptedException {
        Path caseDir = outDir.resolve("write-failure");
        Files.createDirectories(caseDir);
        Files.writeString(caseDir.resolve("logs"), "not a directory\n", StandardCharsets.UTF_8);
        return measure("write-failure", caseDir, new ProbeStream("probe-prefix-", true));
    }

    /// An ordinary bounded drain read to end-of-stream: no failure.
    private static String clean(Path outDir) throws IOException, InterruptedException {
        Path caseDir = outDir.resolve("clean");
        Files.createDirectories(caseDir.resolve("logs"));
        return measure("clean", caseDir, new ProbeStream("probe-clean-", false));
    }

    /// Run the production drain for one case and format the production receipt
    /// record for it. The declared child exit is zero in every case.
    private static String measure(String command, Path caseDir, ProbeStream input)
            throws InterruptedException {
        long startedAt = System.nanoTime();
        ProcessReceipts.Drain drain = ProcessReceipts.drain(input, caseDir.resolve("logs").resolve("0.out"), 4096);
        long elapsedMillis = (System.nanoTime() - startedAt) / 1_000_000L;
        String observedRuntime = "os=" + System.getProperty("os.name") + ";arch=" + System.getProperty("os.arch")
                + ";java=" + System.getProperty("java.version");
        String error = ProcessReceipts.drainError("-", false, drain.failed(), false);
        return ProcessReceipts.recordLine("drain-fixture", "src-fixture", command, "runtime-fixture",
                observedRuntime, "-", true, "0", elapsedMillis, drain.written(), 0, "5000", "4096",
                drain.truncated(), false, "ok", error, "logs/0.out", "logs/0.err");
    }

    /**
     * One declared faulty stream: it yields a bounded ASCII prefix and then,
     * when {@code failAfter} is set, throws instead of reporting end-of-stream.
     */
    private static final class ProbeStream extends InputStream {
        private final byte[] bytes;
        private final boolean failAfter;
        private int position;

        ProbeStream(String text, boolean failAfter) {
            this.bytes = text.getBytes(StandardCharsets.UTF_8);
            this.failAfter = failAfter;
        }

        @Override
        public int read() throws IOException {
            if (position >= bytes.length) {
                if (failAfter) {
                    throw new IOException("declared probe read failure");
                }
                return -1;
            }
            return bytes[position++] & 0xff;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            if (position >= bytes.length) {
                if (failAfter) {
                    throw new IOException("declared probe read failure");
                }
                return -1;
            }
            int keep = Math.min(length, bytes.length - position);
            System.arraycopy(bytes, position, buffer, offset, keep);
            position += keep;
            return keep;
        }
    }
}
