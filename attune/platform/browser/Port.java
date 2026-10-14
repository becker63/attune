package attune.browser;

/** One synchronous string boundary, installed by the compiled Flix main. */
public final class Port {
    public interface Program { String evaluate(String input); }
    private static Program program;
    public static void install(Program value) { program = value; }
    public static String evaluate(String input) { return program.evaluate(input); }
}
