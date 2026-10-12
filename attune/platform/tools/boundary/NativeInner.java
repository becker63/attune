package attune.tools.boundary;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Record the active isolation boundary, then compile and run declared Flix files. */
public final class NativeInner {
    private NativeInner() {}

    public static void main(String[] args) throws Exception {
        Path work = Path.of(args[0]);
        Path flixJar = Path.of(args[1]);
        String hostNetns = args[2];

        BoundaryProbe.write(work.resolve("attune-boundary.tsv"), hostNetns);

        if (args[3].equals("run")) {
            List<Path> files = Arrays.stream(args).skip(4).map(Path::of).toList();
            System.exit(NativeTester.run(List.of(), files, true));
        }

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
