package attune.tools.boundary;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * The in-namespace step of one native Flix test.
 *
 * <p>It runs inside the declared pinned {@code unshare} user/network namespace,
 * records the boundary evidence, then launches the pinned compiler's authentic
 * native test engine over the explicit declared files. It is pure process
 * mechanics: it decides no policy and inspects no source.
 */
public final class NativeInner {
    private NativeInner() {}

    public static void main(String[] args) throws Exception {
        Path work = Path.of(args[0]);
        Path flixJar = Path.of(args[1]);
        String hostNetns = args[2];
        List<String> files = new ArrayList<>(Arrays.asList(args).subList(3, args.length));

        BoundaryProbe.write(work.resolve("attune-boundary.tsv"), hostNetns);

        List<String> command = new ArrayList<>();
        command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
        command.add("-jar");
        command.add(flixJar.toString());
        command.add("test");
        command.addAll(files);

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(work.toFile());
        builder.inheritIO();
        System.exit(builder.start().waitFor());
    }
}
