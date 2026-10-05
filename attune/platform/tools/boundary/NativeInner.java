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

        BoundaryProbe.write(work.resolve("attune-boundary.tsv"), hostNetns);

        if (args[3].equals("java")) {
            int jarCount = Integer.parseInt(args[4]);
            List<Path> jars = new ArrayList<>();
            for (int i = 0; i < jarCount; i++) {
                jars.add(Path.of(args[5 + i]));
            }
            List<Path> files = new ArrayList<>();
            for (int i = 5 + jarCount; i < args.length; i++) {
                files.add(Path.of(args[i]));
            }
            System.exit(NativeTester.run(jars, files));
        }

        List<String> files = new ArrayList<>(Arrays.asList(args).subList(3, args.length));

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
