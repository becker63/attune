package attune.tools.spine;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Accepts a recorded negative compiler verdict. The pinned compiler already
 * rejected the fixture in a prerequisite build action; this test only confirms
 * the recorded evidence, so the normal suite stays green while the rejection
 * itself is real.
 */
public final class NegativeVerdict {
    private NegativeVerdict() {}

    public static void main(String[] args) throws Exception {
        Path evidence = Runfiles.resolve(System.getProperty("attune.evidence"));
        String text = Files.readString(evidence, StandardCharsets.UTF_8);
        System.out.print(text);
        if (!text.contains("rejected: true")) {
            System.err.println("the pinned compiler did not record the expected rejection");
            System.exit(1);
        }
        System.out.println("accepted recorded compiler rejection from " + evidence);
    }
}
