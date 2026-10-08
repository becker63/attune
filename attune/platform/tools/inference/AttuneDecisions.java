package attune.inference;

/**
 * The native OpenRouter Decisions boundary of the ReviewBench shared-context JEV
 * memo (`VAL-REVIEW-002`, owner decision 2026-10-08).
 *
 * <p>This is the minimal Java/LangChain4j HTTP boundary the owner directed in
 * place of the MCP-stdio {@code jev-mcp} route: the SAME
 * {@code https://openrouter.ai/api/alpha/decisions} endpoint and the SAME raw
 * Decisions {@code state}/{@code questions} -&gt; {@code answers} shape as the
 * historical localization route, with the provider body returned unchanged or as
 * a redacted transport-failure envelope. No MCP child process is spawned and no
 * MCP tool is invoked.
 *
 * <p>The original requested alias is preserved verbatim and is the Flix owner's
 * declared identity; this boundary only names it for the receipt. It performs no
 * classification, no memo lookup and no retry-until-a-desired-answer: the Flix
 * owner builds the payload, applies the fail-closed provider/snapshot gate and
 * keeps the exact memo.
 */
public final class AttuneDecisions {

    /** The original requested model alias, preserved verbatim. */
    public static final String REQUESTED_MODEL = "typesafe/jev-1.13";

    private static final int MAX_ATTEMPTS = 5;

    private AttuneDecisions() {}

    /**
     * One Decisions exchange. Returns the provider body unchanged, or a redacted
     * transport-failure envelope whose {@code error.kind} names the failure. The
     * credential is never part of the result.
     */
    public static String decide(String payload) {
        return OpenRouterDecisions.decide(payload, MAX_ATTEMPTS);
    }

    /**
     * The observed transport attempt count of the last {@link #decide} call, so
     * the mechanical receipt can record observed attempt/retry evidence rather
     * than assuming none. The credential is never part of it.
     */
    public static int lastAttempts() {
        return OpenRouterDecisions.attempts();
    }
}
