package attune.inference;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Host-only byte transport. Flix constructs requests and owns decision meaning. */
public final class ChoiceTransport {
    private ChoiceTransport() {}

    public static void main(String[] arguments) throws Exception {
        if (arguments.length != 2) throw new IllegalArgumentException("request-file response-file");
        String request = Files.readString(Path.of(arguments[0]), StandardCharsets.UTF_8);
        if (request.getBytes(StandardCharsets.UTF_8).length > 65536)
            throw new IllegalArgumentException("Native request exceeds 64 KiB.");
        long start = System.nanoTime();
        String response = AttuneDecisions.decide(request);
        Files.writeString(Path.of(arguments[1]), response, StandardCharsets.UTF_8);
        System.out.println("attempts=" + AttuneDecisions.lastAttempts()
            + " elapsed_ns=" + (System.nanoTime() - start));
    }
}
