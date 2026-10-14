import attune.browser.Port;
import org.teavm.jso.JSExport;

/** TeaVM exports this mechanical entrypoint; all decisions stay in Flix. */
public final class Browser {
    private static boolean initialized;
    @JSExport public static java.lang.String evaluate(java.lang.String input) {
        try {
            if (!initialized) { Main.main(new java.lang.String[0]); initialized = true; }
            return Port.evaluate(input);
        } catch (java.lang.RuntimeException error) {
            // A readable transport failure, not an empty successful answer.
            java.lang.String message = error.getClass().getName() + ": " + error.getMessage();
            return "{\"error\":\"" + message.replace("\\", "\\\\").replace("\"", "\\\"")
                    .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"}";
        }
    }
    public static void main(java.lang.String[] args) { java.lang.System.out.println(evaluate(args[0])); }
}
