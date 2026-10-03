package attune.tools.spine;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Minimal Java boundary that launches the pinned Flix compiler.
 *
 * <p>The pinned Flix compiler resolves its project from the process working
 * directory rather than from a command-line flag, so a Starlark {@code
 * ctx.actions.run} action cannot select the generated project with an argument
 * alone. This launcher re-executes the compiler in the declared project
 * directory.
 *
 * <p>Two modes are supported:
 *
 * <ul>
 *   <li>{@code run <projectDir> <flixJar> <args...>} runs the compiler and
 *       exits with its status.
 *   <li>{@code reject <projectDir> <flixJar> <evidence> <expected> <args...>}
 *       runs the compiler, requires a non-zero exit, requires {@code expected}
 *       in the diagnostic, and records the verdict. If the compiler
 *       unexpectedly accepts the fixture, the action fails.
 * </ul>
 */
public final class FlixTool {
    private FlixTool() {}

    public static void main(String[] args) throws Exception {
        if (args.length < 3) {
            System.err.println(
                    "usage: FlixTool <run|reject> <projectDir> <flixJar> [evidence expected] <args...>");
            System.exit(2);
        }
        String mode = args[0];
        File project = new File(args[1]).getAbsoluteFile();
        File flixJar = new File(args[2]).getAbsoluteFile();
        switch (mode) {
            case "run" -> System.exit(run(project, flixJar, tail(args, 3)));
            case "reject" -> {
                if (args.length < 5) {
                    System.err.println("reject requires <evidence> <expected>");
                    System.exit(2);
                }
                System.exit(reject(project, flixJar, args[3], args[4], tail(args, 5)));
            }
            default -> {
                System.err.println("unknown mode: " + mode);
                System.exit(2);
            }
        }
    }

    private static List<String> tail(String[] args, int from) {
        return new ArrayList<>(Arrays.asList(args).subList(from, args.length));
    }

    private static ProcessBuilder compiler(File project, File flixJar, List<String> flixArgs) {
        List<String> command = new ArrayList<>();
        command.add(Paths.get(System.getProperty("java.home"), "bin", "java").toString());
        command.add("-cp");
        command.add(flixJar.getPath());
        command.add("ca.uwaterloo.flix.Main");
        command.addAll(flixArgs);
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(project);
        return builder;
    }

    private static int run(File project, File flixJar, List<String> flixArgs) throws Exception {
        ProcessBuilder builder = compiler(project, flixJar, flixArgs);
        builder.inheritIO();
        return builder.start().waitFor();
    }

    private static int reject(
            File project, File flixJar, String evidencePath, String expected, List<String> flixArgs)
            throws Exception {
        ProcessBuilder builder = compiler(project, flixJar, flixArgs);
        builder.redirectErrorStream(true);
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exit = process.waitFor();
        System.out.print(output);
        if (exit == 0) {
            System.err.println(
                    "expected the pinned compiler to reject the fixture, but it succeeded");
            return 1;
        }
        if (!output.contains(expected)) {
            System.err.println(
                    "the pinned compiler rejected the fixture, but the diagnostic did not contain: "
                            + expected);
            return 1;
        }
        Path evidence = Path.of(evidencePath);
        if (evidence.getParent() != null) {
            Files.createDirectories(evidence.getParent());
        }
        Files.writeString(evidence, "rejected: true\nexit: " + exit + "\n");
        return 0;
    }
}
