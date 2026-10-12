package attune.tools.boundary;

import ca.uwaterloo.flix.api.Flix;
import ca.uwaterloo.flix.language.ast.shared.SecurityContext;
import ca.uwaterloo.flix.language.CompilationMessage;
import ca.uwaterloo.flix.util.Formatter;
import ca.uwaterloo.flix.runtime.CompilationResult;
import ca.uwaterloo.flix.runtime.JvmLoader;
import ca.uwaterloo.flix.runtime.LoadedProgram;
import ca.uwaterloo.flix.tools.Tester;
import ca.uwaterloo.flix.util.Options;
import ca.uwaterloo.flix.util.Result;
import java.nio.file.Path;
import java.util.List;
import scala.collection.immutable.Nil$;
import scala.jdk.javaapi.CollectionConverters;

/**
 * Invoke the pinned Flix compiler with explicit source files and dependency jars.
 * The compiler supplies main execution and its native test engine. No generated
 * project or dependency resolution is needed inside an action.
 */
public final class NativeTester {
    private NativeTester() {}

    /** Compile explicit sources, then run main, native tests, or expect rejection. */
    public static int run(List<Path> jars, List<Path> files, boolean application, String expected) {
        Flix flix = new Flix(empty(), CollectionConverters.asScala(jars).toList());
        flix.setOptions(Options.Default());
        for (Path file : files) {
            flix.addFile(file, SecurityContext.Unrestricted$.MODULE$);
        }
        Result<CompilationResult, scala.collection.immutable.List<CompilationMessage>> compiled = flix.compile();
        if (compiled instanceof Result.Err<CompilationResult, scala.collection.immutable.List<CompilationMessage>> failure) {
            String diagnostic = CompilationMessage.formatAll(failure.e(), Formatter.getDefault(), scala.Option.empty());
            if (!expected.isEmpty() && diagnostic.contains(expected)) {
                System.out.println("Compiler rejection verified: " + expected);
                return 0;
            }
            System.err.println(diagnostic);
            return 2;
        }
        if (!expected.isEmpty()) {
            System.err.println("Expected compiler rejection, but the program compiled.");
            return 1;
        }
        CompilationResult result = ((Result.Ok<CompilationResult, ?>) compiled).t();
        LoadedProgram program = JvmLoader.load(result);
        if (application) {
            if (program.main().isEmpty()) {
                System.err.println("the declared Flix application has no main");
                return 2;
            }
            program.main().get().apply(new String[0]);
            return 0;
        }
        Result<?, ?> tests = Tester.run(empty(), program, flix);
        if (!(tests instanceof Result.Ok)) {
            System.err.println("native tests failed: " + tests);
            return 1;
        }
        return 0;
    }

    @SuppressWarnings("unchecked")
    private static <T> scala.collection.immutable.List<T> empty() {
        return (scala.collection.immutable.List<T>) (Object) Nil$.MODULE$;
    }
}
