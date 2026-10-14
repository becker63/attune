package attune.browser;

import ca.uwaterloo.flix.api.Flix;
import ca.uwaterloo.flix.language.CompilationMessage;
import ca.uwaterloo.flix.language.ast.shared.SecurityContext;
import ca.uwaterloo.flix.runtime.CompilationResult;
import ca.uwaterloo.flix.util.Formatter;
import ca.uwaterloo.flix.util.Options;
import ca.uwaterloo.flix.util.Result;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import scala.jdk.javaapi.CollectionConverters;

/** Export the pinned compiler's classes. No compiler or SDK goes in the result. */
public final class CompileFlix {
    public static void main(String[] args) throws Exception {
        var jars = Arrays.stream(args[1].split(":" )).filter(path -> !path.isBlank()).map(Path::of).toList();
        var flix = new Flix(scala.collection.immutable.List$.MODULE$.empty(),
                CollectionConverters.asScala(jars).toList());
        flix.setOptions(Options.Default());
        for (int i = 2; i < args.length; i++) flix.addFile(Path.of(args[i]), SecurityContext.Unrestricted$.MODULE$);
        var compiled = flix.compile();
        if (compiled instanceof Result.Err<CompilationResult, scala.collection.immutable.List<CompilationMessage>> error) {
            throw new IllegalStateException(CompilationMessage.formatAll(error.e(), Formatter.getDefault(), scala.Option.empty()));
        }
        var result = ((Result.Ok<CompilationResult, ?>) compiled).t();
        var classes = CollectionConverters.asJava(result.getClasses());
        try (var output = new JarOutputStream(Files.newOutputStream(Path.of(args[0])))) {
            for (var name : classes.keySet().stream().sorted(java.util.Comparator.comparing(Object::toString)).toList()) {
                var descriptor = name.descriptorString();
                var entry = new JarEntry(descriptor.substring(1, descriptor.length() - 1) + ".class");
                entry.setTime(0);
                output.putNextEntry(entry);
                output.write(classes.get(name).bytecode());
                output.closeEntry();
            }
        }
        System.out.println("Exported " + classes.size() + " Flix application/runtime classes.");
    }
}
