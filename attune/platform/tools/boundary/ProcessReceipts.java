package attune.tools.boundary;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * The mechanical process-measurement boundary.
 *
 * <p>It executes one bounded, declared argv plan and records the raw facts of
 * each command: the request/source/command/runtime identities, whether the
 * command started, its raw exit status, the measured elapsed work, the bounded
 * stdout/stderr bytes actually drained, the effective timeout and log caps it
 * applied, whether a stream was truncated, whether the command timed out, the
 * process-tree cleanup state and a classified start/runtime error kind. It
 * decides no policy: which commands to run, what a nonzero exit means and
 * whether an obligation was satisfied are all Flix concerns. A measured nonzero
 * child exit is ordinary receipt data, so this boundary returns success whenever
 * it wrote the receipt; it fails only when it cannot produce one.
 *
 * <p>Logs are drained concurrently on two threads, each bounded to the declared
 * per-stream byte cap. Bytes beyond the cap are discarded while the stream is
 * still drained to end-of-stream, so a chatty child cannot block on a full pipe
 * and cannot exceed the declared artifact bound. A command that exceeds its
 * finite timeout is killed together with its descendants, and the cleanup state
 * is recorded rather than assumed. If a bounded drain cannot open or write its
 * log, or cannot read the child pipe to end-of-stream, the receipt records the
 * incomplete bytes as a runtime error rather than a clean measurement, so a
 * post-start log I/O failure can never be mistaken for a successful command even
 * when the child itself exited zero.
 */
final class ProcessReceipts {
    private ProcessReceipts() {}

    /** Executes a declared plan and writes `receipts.tsv` plus bounded logs. */
    static int run(Path planFile, Path outDir, String freshness, Path work) throws IOException {
        List<String> lines = Files.readAllLines(planFile, StandardCharsets.UTF_8);
        Files.createDirectories(outDir.resolve("logs"));
        List<String> receipts = new ArrayList<>();
        int index = 0;
        for (String line : lines) {
            if (line.isBlank()) {
                continue;
            }
            List<String> fields = split(line);
            if (fields.size() < 8) {
                throw new IOException("declared plan record has too few fields: " + line);
            }
            receipts.add(execute(fields, freshness, work, outDir, index));
            index++;
        }
        Files.write(outDir.resolve("receipts.tsv"), receipts, StandardCharsets.UTF_8);
        return 0;
    }

    private static String execute(List<String> fields, String freshness, Path work, Path outDir, int index) {
        String request = fields.get(0);
        String source = fields.get(1);
        String command = fields.get(2);
        String runtime = fields.get(3);
        String cwd = fields.get(4);
        String timeout = fields.get(5);
        String cap = fields.get(6);
        List<String> argv = new ArrayList<>(fields.subList(7, fields.size()));

        long startedAt = System.nanoTime();
        String observedRuntime = "os=" + System.getProperty("os.name") + ";arch=" + System.getProperty("os.arch")
                + ";java=" + System.getProperty("java.version");
        boolean started = false;
        boolean timedOut = false;
        boolean truncated = false;
        String cleanup = "none";
        String error = "-";
        String exit = "-";
        long outBytes = 0;
        long errBytes = 0;
        Path outLog = outDir.resolve("logs").resolve(index + ".out");
        Path errLog = outDir.resolve("logs").resolve(index + ".err");
        Process process = null;
        try {
            if (missingProgram(argv.get(0))) {
                error = "missing";
            } else {
                ProcessBuilder builder = new ProcessBuilder(argv);
                builder.directory(workingDirectory(cwd, work).toFile());
                Map<String, String> environment = builder.environment();
                environment.clear();
                environment.put("HOME", work.toString());
                environment.put("PATH", "/usr/bin:/bin");
                environment.put("LANG", "C");
                process = builder.start();
                started = true;
                Drain out = new Drain(process.getInputStream(), outLog, Integer.parseInt(cap));
                Drain err = new Drain(process.getErrorStream(), errLog, Integer.parseInt(cap));
                Thread outThread = new Thread(out, "attune-drain-out");
                Thread errThread = new Thread(err, "attune-drain-err");
                outThread.start();
                errThread.start();
                boolean finished = process.waitFor(Long.parseLong(timeout), TimeUnit.MILLISECONDS);
                if (!finished) {
                    timedOut = true;
                    killTree(process);
                    cleanup = "killed";
                    process.waitFor();
                } else {
                    cleanup = "ok";
                }
                outThread.join();
                errThread.join();
                truncated = out.truncated() || err.truncated();
                error = drainError(error, timedOut, out.failed(), err.failed());
                outBytes = out.written();
                errBytes = err.written();
                exit = Integer.toString(process.exitValue());
            }
        } catch (IOException failure) {
            error = "runtime";
            cleanup = "failed";
        } catch (InterruptedException interrupted) {
            error = "runtime";
            cleanup = "failed";
            Thread.currentThread().interrupt();
        } finally {
            if (process != null && process.isAlive()) {
                killTree(process);
                cleanup = "killed";
            }
        }
        long elapsedMillis = (System.nanoTime() - startedAt) / 1_000_000L;
        return recordLine(request, source, command, runtime, observedRuntime, freshness, started, exit,
                elapsedMillis, outBytes, errBytes, timeout, cap, truncated, timedOut, cleanup, error,
                "logs/" + index + ".out", "logs/" + index + ".err");
    }

    /**
     * Format one receipt record in the exact declared field order. The
     * production path and the test-only drain seam both call this, so a seam
     * record cannot drift from the production receipt shape.
     */
    static String recordLine(String request, String source, String command, String runtime,
            String observedRuntime, String freshness, boolean started, String exit, long elapsedMillis,
            long outBytes, long errBytes, String timeout, String cap, boolean truncated, boolean timedOut,
            String cleanup, String error, String outLog, String errLog) {
        return String.join("\t",
                request, source, command, runtime, observedRuntime, freshness,
                Boolean.toString(started), exit, Long.toString(elapsedMillis),
                Long.toString(outBytes), Long.toString(errBytes), timeout, cap,
                Boolean.toString(truncated), Boolean.toString(timedOut), cleanup, error, outLog, errLog);
    }

    /**
     * The receipt error state after a bounded drain. A drain that could not open
     * or write its bounded log, or could not read the child pipe to
     * end-of-stream, records incomplete bytes, so it is a runtime failure: the
     * receipt cannot prove a clean measurement. A timeout's own reason and any
     * already-classified start error are preserved, and cap-exceeded truncation
     * stays the separate `truncated` flag rather than an error reason.
     */
    static String drainError(String error, boolean timedOut, boolean outFailed, boolean errFailed) {
        if (error.equals("-") && !timedOut && (outFailed || errFailed)) {
            return "runtime";
        }
        return error;
    }

    /**
     * Test-only mechanical seam: run one production {@link Drain} to completion
     * over an injected stream and return it, so a native law can drive the real
     * bounded drain with a deterministic failing stream. It starts the same
     * drain the production path starts and decides no policy.
     */
    static Drain drain(InputStream input, Path file, int cap) throws InterruptedException {
        Drain drain = new Drain(input, file, cap);
        Thread thread = new Thread(drain, "attune-probe-drain");
        thread.start();
        thread.join();
        return drain;
    }

    /// True only for an absolute program path that does not exist. A relative
    /// program is left to the operating system, so this makes no PATH decision.
    private static boolean missingProgram(String program) {
        if (program.isEmpty() || program.indexOf('/') < 0) {
            return false;
        }
        Path path = Path.of(program);
        return path.isAbsolute() && !Files.exists(path);
    }

    private static Path workingDirectory(String cwd, Path work) {
        if (cwd.isEmpty() || cwd.equals("-")) {
            return work;
        }
        return Path.of(cwd);
    }

    /// Forcibly destroys the command and every descendant, children first.
    private static void killTree(Process process) {
        process.descendants().forEach(handle -> handle.destroyForcibly());
        process.destroyForcibly();
    }

    private static List<String> split(String line) {
        List<String> fields = new ArrayList<>();
        int start = 0;
        for (int index = 0; index < line.length(); index++) {
            if (line.charAt(index) == '\t') {
                fields.add(line.substring(start, index));
                start = index + 1;
            }
        }
        fields.add(line.substring(start));
        return fields;
    }

    /**
     * One concurrent bounded log drain. It writes at most the declared cap bytes
     * to the file and keeps reading to end-of-stream so the child never blocks on
     * a full pipe; the truncation flag records that the cap was exceeded. If
     * opening or writing the log, or reading the child pipe, fails before
     * end-of-stream, `failed` records that the drained bytes are incomplete so
     * the receipt is not mistaken for a clean measurement.
     */
    static final class Drain implements Runnable {
        private final InputStream input;
        private final Path file;
        private final int cap;
        private long written;
        private boolean truncated;
        private boolean failed;

        Drain(InputStream input, Path file, int cap) {
            this.input = input;
            this.file = file;
            this.cap = cap;
        }

        @Override
        public void run() {
            try (OutputStream output = Files.newOutputStream(file)) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    if (written < cap) {
                        int keep = (int) Math.min(read, cap - written);
                        output.write(buffer, 0, keep);
                        written += keep;
                        if (keep < read) {
                            truncated = true;
                        }
                    } else {
                        truncated = true;
                    }
                }
            } catch (IOException failure) {
                // A failed log open/write or an unreadable pipe is not a policy
                // verdict, but it does mean the drained bytes are incomplete:
                // the flag is propagated so the receipt stays unmeasured.
                failed = true;
            }
        }

        long written() {
            return written;
        }

        boolean truncated() {
            return truncated;
        }

        boolean failed() {
            return failed;
        }
    }
}
