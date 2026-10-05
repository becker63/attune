package attune.grit;

import java.lang.foreign.Arena;
import java.lang.foreign.FunctionDescriptor;
import java.lang.foreign.Linker;
import java.lang.foreign.MemorySegment;
import java.lang.foreign.SymbolLookup;
import java.lang.foreign.ValueLayout;
import java.lang.invoke.MethodHandle;
import java.nio.charset.StandardCharsets;

/**
 * The package-private ownership adapter over the pinned Grit C ABI.
 *
 * <p>The header {@code attune_grit.h} declares exactly two functions. This
 * class binds them with the Java FFM API directly rather than generating
 * bindings with {@code jextract}: the ABI is two symbols and one struct-less
 * pointer pair, so a hand-written descriptor is smaller and adds no extra
 * toolchain to the build. The generated binding is replaced, not the native
 * library.
 *
 * <p>The prepared shared library is named on the {@code attune.libs} system
 * property, which the mechanical native test launcher fills with the resolved
 * runfiles paths of the declared shared libraries. Loading is the only
 * filesystem action this class performs; it opens no source file and decides
 * nothing.
 */
final class AttuneGritNative {
    private static final int ABI_OK = 0;
    private static final int ABI_HOST_ERROR = 1;
    private static final String LIBRARY_NAME = "libattune_grit_abi.so";

    private static final MethodHandle RUN;
    private static final MethodHandle FREE;

    private AttuneGritNative() {}

    static {
        Linker linker = Linker.nativeLinker();
        SymbolLookup lookup = loadPreparedLibrary();
        RUN = linker.downcallHandle(
                lookup.find("attune_grit_run").orElseThrow(
                        () -> new IllegalStateException("attune_grit_run is absent from " + LIBRARY_NAME)),
                FunctionDescriptor.of(
                        ValueLayout.JAVA_INT,
                        ValueLayout.ADDRESS, ValueLayout.JAVA_LONG,
                        ValueLayout.ADDRESS, ValueLayout.JAVA_LONG,
                        ValueLayout.ADDRESS, ValueLayout.JAVA_LONG,
                        ValueLayout.ADDRESS, ValueLayout.JAVA_LONG,
                        ValueLayout.ADDRESS, ValueLayout.ADDRESS));
        FREE = linker.downcallHandle(
                lookup.find("attune_grit_buffer_free").orElseThrow(
                        () -> new IllegalStateException("attune_grit_buffer_free is absent from " + LIBRARY_NAME)),
                FunctionDescriptor.ofVoid(ValueLayout.ADDRESS, ValueLayout.JAVA_LONG));
    }

    /** Loads the prepared shared library by absolute path and returns its symbols. */
    private static SymbolLookup loadPreparedLibrary() {
        String libraries = System.getProperty("attune.libs", "");
        for (String entry : libraries.split(",")) {
            String candidate = entry.trim();
            if (!candidate.isEmpty() && candidate.endsWith(LIBRARY_NAME)) {
                System.load(candidate);
                return SymbolLookup.loaderLookup();
            }
        }
        throw new IllegalStateException(
                "no prepared " + LIBRARY_NAME + " was named on the attune.libs property");
    }

    private record Input(MemorySegment data, long length) {}

    private static Input input(Arena arena, String value) {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        MemorySegment data = arena.allocate(Math.max(1, bytes.length), 1);
        data.asSlice(0, bytes.length).copyFrom(MemorySegment.ofArray(bytes));
        return new Input(data, bytes.length);
    }

    /** Runs one fixed Grit program over one in-memory source and returns the envelope. */
    static String evaluate(String language, String program, String path, String source) {
        try (Arena arena = Arena.ofConfined()) {
            Input lang = input(arena, language);
            Input grit = input(arena, program);
            Input name = input(arena, path);
            Input text = input(arena, source);
            MemorySegment outData = arena.allocate(ValueLayout.ADDRESS);
            MemorySegment outLength = arena.allocate(ValueLayout.JAVA_LONG);

            int status;
            try {
                status = (int) RUN.invokeExact(
                        lang.data(), lang.length(),
                        grit.data(), grit.length(),
                        name.data(), name.length(),
                        text.data(), text.length(),
                        outData, outLength);
            } catch (Throwable error) {
                throw new IllegalStateException("Attune Grit ABI invocation failed", error);
            }

            MemorySegment data = outData.get(ValueLayout.ADDRESS, 0);
            long length = outLength.get(ValueLayout.JAVA_LONG, 0);
            byte[] owned;
            try {
                if (length < 0 || (data.address() == 0 && length != 0)) {
                    throw new IllegalStateException("invalid Attune Grit output buffer");
                }
                owned = data.reinterpret(length).toArray(ValueLayout.JAVA_BYTE);
            } finally {
                if (data.address() != 0) {
                    try {
                        FREE.invokeExact(data, length);
                    } catch (Throwable error) {
                        throw new IllegalStateException("Attune Grit ABI release failed", error);
                    }
                }
            }

            // Rust classifies ordinary compile/language failures in the envelope.
            // ABI_HOST_ERROR likewise carries a stable host-error envelope.
            if (status != ABI_OK && status != ABI_HOST_ERROR) {
                throw new IllegalStateException("unknown Attune Grit ABI status: " + status);
            }
            if (status == ABI_HOST_ERROR && owned.length == 0) {
                throw new IllegalStateException("Attune Grit host failure returned no envelope");
            }

            // Decode only after Rust-owned memory has been released, so no Java
            // exception from here onward can leak a native buffer.
            return new String(owned, StandardCharsets.UTF_8);
        }
    }
}
