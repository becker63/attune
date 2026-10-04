package attune.tools.boundary;

import ca.uwaterloo.flix.api.Flix;
import ca.uwaterloo.flix.language.ast.shared.SecurityContext;
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
 * The explicit source/dependency route into the pinned compiler's authentic
 * native test engine.
 *
 * <p>Some fixtures must call into the approved JVM seams (the LangChain4j SDK
 * path and the Arrow Parquet codec). The Flix command line cannot be given
 * dependency jars for explicit files, and a synthesized {@code flix.toml}
 * project would run the Coursier resolver the correction removed. This class
 * therefore launches the compiler's own {@link Tester} over the explicit
 * declared sources with the dependency jars passed as the compiler's class
 * path. It is compiler launch mechanics, not a test engine: the assertions and
 * verdict are the pinned compiler's.
 */
public final class NativeTester {
    private NativeTester() {}

    /** Runs the pinned native test engine over the explicit files and jars. */
    public static int run(List<Path> jars, List<Path> files) {
        Flix flix = new Flix(empty(), CollectionConverters.asScala(jars).toList());
        flix.setOptions(Options.Default());
        for (Path file : files) {
            flix.addFile(file, SecurityContext.Unrestricted$.MODULE$);
        }
        Result<CompilationResult, ?> compiled = flix.compile();
        if (!(compiled instanceof Result.Ok)) {
            System.err.println("native compile failed: " + compiled);
            return 2;
        }
        CompilationResult result = ((Result.Ok<CompilationResult, ?>) compiled).t();
        LoadedProgram program = JvmLoader.load(result);
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
