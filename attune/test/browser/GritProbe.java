package attune.test;
import attune.grit.AttuneGritNative;
import java.nio.charset.StandardCharsets;
/** Native extraction oracle for browser parity. Source is data only. */
public final class GritProbe {
    public static void main(String[] args) throws Exception {
        String resource = "/grit/" + args[1] + "/" + args[0] + ".grit";
        try (var input = GritProbe.class.getResourceAsStream(resource)) {
            if (input == null) throw new IllegalArgumentException("Unknown extraction program");
            String program = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            String source = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
            System.out.println(AttuneGritNative.evaluate(args[0], program, args[2], source));
        }
    }
}
