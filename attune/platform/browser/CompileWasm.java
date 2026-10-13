package attune.browser;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Arrays;
import org.teavm.tooling.TeaVMTool;
import org.teavm.tooling.TeaVMTargetType;
import org.teavm.tooling.ConsoleTeaVMToolLog;
import org.teavm.tooling.TeaVMProblemRenderer;
import org.teavm.vm.TeaVMOptimizationLevel;

/** Invoke TeaVM with explicit application jars and retain its actual diagnostics. */
public final class CompileWasm {
    public static void main(String[] args) throws Exception {
        var tool = new TeaVMTool();
        tool.setMainClass("Browser");
        tool.setClassPath(Arrays.stream(args[1].split(":" )).map(File::new).toList());
        var urls = Arrays.stream(args[1].split(":" )).map(value -> {
            try { return Path.of(value).toUri().toURL(); }
            catch (Exception error) { throw new IllegalArgumentException(error); }
        }).toArray(URL[]::new);
        tool.setClassLoader(new URLClassLoader(urls, CompileWasm.class.getClassLoader()));
        tool.setTargetType(TeaVMTargetType.WEBASSEMBLY_GC);
        tool.setOptimizationLevel(TeaVMOptimizationLevel.SIMPLE);
        tool.setTargetDirectory(new File(args[0]));
        tool.setTargetFileName("attune.wasm");
        tool.generate();
        if (!tool.getProblemProvider().getSevereProblems().isEmpty()) {
            TeaVMProblemRenderer.describeProblems(tool.getDependencyInfo().getCallGraph(),
                    tool.getProblemProvider(), new ConsoleTeaVMToolLog(false));
            throw new IllegalStateException("TeaVM rejected the reachable runtime; no substitute was emitted.");
        }
        try (var runtime = CompileWasm.class.getResourceAsStream("/org/teavm/backend/wasm/wasm-gc-runtime.min.js")) {
            Files.copy(runtime, Path.of(args[0], "runtime.js"));
        }
    }
}
