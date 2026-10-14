package attune.inference;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.langchain4j.exception.HttpException;
import dev.langchain4j.http.client.HttpClient;
import dev.langchain4j.http.client.HttpClientBuilder;
import dev.langchain4j.http.client.HttpMethod;
import dev.langchain4j.http.client.HttpRequest;
import dev.langchain4j.http.client.SuccessfulHttpResponse;
import dev.langchain4j.http.client.jdk.JdkHttpClient;

import java.time.Duration;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.Callable;

/**
 * The shared LangChain4j transport of the ReviewBench native OpenRouter
 * Decisions boundary.
 *
 * <p>This is the mechanical substrate only, mirroring the frozen sibling's
 * read-only {@code attuneflix/src/native/inference/OpenRouter.java}: one POST to
 * the declared endpoint through the approved SDK's JDK HTTP client, with the
 * credential read only inside this package and redacted from every failure
 * envelope, and a bounded retry of transient statuses only. Request construction
 * and response meaning stay outside it — the Flix owner builds the payload and
 * classifies the answer.
 *
 * <p>The credential is read from the process environment under the
 * launcher-native name the localization JEV launcher itself uses. It never
 * enters a request identity, a receipt, an argument, a log or a commit.
 */
final class OpenRouterDecisions {

    static final String ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
    private static final String KEY = "OPENROUTER_API_KEY";
    private static final long INITIAL_BACKOFF_MILLIS = 250L;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = http().build();

    /**
     * The number of transport attempts the last exchange actually made, so the
     * mechanical runner can record observed attempt/retry evidence instead of
     * assuming none. It is per-thread because one request is one thread here.
     */
    private static final ThreadLocal<Integer> ATTEMPTS = ThreadLocal.withInitial(() -> 0);
    private static final ThreadLocal<String> LIVE_KEY = ThreadLocal.withInitial(() -> "");

    private OpenRouterDecisions() {}

    /** The credential is read only inside this package and never enters an identity. */
    static String apiKey() {
        String apiKey = System.getenv(KEY);
        if (apiKey == null || apiKey.isBlank()) {
            String configured = System.getProperty("attune.credentialFile", "");
            if (!configured.isBlank()) {
                try {
                    // Only this boundary opens the explicitly configured private file.
                    for (String line : Files.readAllLines(Path.of(configured))) {
                        String entry = line.strip();
                        if (entry.startsWith("export ")) entry = entry.substring(7).strip();
                        int split = entry.indexOf('=');
                        if (split >= 0 && entry.substring(0, split).strip().equals(KEY)) {
                            String value = entry.substring(split + 1).strip();
                            if (value.length() >= 2 && ((value.startsWith("\"") && value.endsWith("\""))
                                    || (value.startsWith("'") && value.endsWith("'"))))
                                value = value.substring(1, value.length() - 1);
                            apiKey = value;
                            break;
                        }
                    }
                } catch (java.io.IOException ignored) {
                    throw new MissingKey();
                }
            }
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new MissingKey();
        }
        LIVE_KEY.set(apiKey);
        return apiKey;
    }

    static HttpClientBuilder http() {
        return JdkHttpClient.builder()
                .connectTimeout(Duration.ofSeconds(30))
                .readTimeout(Duration.ofSeconds(60));
    }

    /**
     * One Decisions exchange, retried only on transient provider statuses
     * (408/429/5xx). Every other failure surfaces at once as a redacted failure
     * envelope rather than an invented answer.
     */
    static String decide(String payload, int maxAttempts) {
        ATTEMPTS.set(0);
        try {
            HttpRequest request = HttpRequest.builder()
                    .method(HttpMethod.POST)
                    .url(ENDPOINT)
                    .addHeader("Authorization", "Bearer " + apiKey())
                    .addHeader("Content-Type", "application/json")
                    .body(payload)
                    .build();
            return withRetry(() -> {
                ATTEMPTS.set(ATTEMPTS.get() + 1);
                SuccessfulHttpResponse response = HTTP.execute(request);
                return response.body();
            }, maxAttempts);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return failure("interrupted", error);
        } catch (Throwable error) {
            return failure(kind(error), error);
        }
    }

    /** The observed transport attempt count of the last exchange on this thread. */
    static int attempts() {
        return ATTEMPTS.get();
    }

    /** Retries only transient provider statuses; every other failure surfaces at once. */
    static <T> T withRetry(Callable<T> call, int maxAttempts) throws Exception {
        long backoff = INITIAL_BACKOFF_MILLIS;
        for (int attempt = 1; ; attempt++) {
            try {
                return call.call();
            } catch (HttpException error) {
                if (!retryable(error.statusCode()) || attempt >= maxAttempts) {
                    throw error;
                }
            }
            Thread.sleep(backoff);
            backoff *= 2;
        }
    }

    private static boolean retryable(int statusCode) {
        return statusCode == 408 || statusCode == 429 || statusCode >= 500;
    }

    static String failure(String kind, String message) {
        ObjectNode root = JSON.createObjectNode();
        root.put("version", 1);
        ObjectNode error = root.putObject("error");
        error.put("kind", kind);
        error.put("message", message);
        return root.toString();
    }

    private static String failure(String kind, Throwable error) {
        return failure(kind, safeMessage(error));
    }

    /** The failure kind of a transport error, in the retained envelope vocabulary. */
    static String kind(Throwable error) {
        if (error instanceof MissingKey) return "configuration";
        if (error instanceof HttpException http) return "http-" + http.statusCode();
        if (error instanceof InterruptedException) return "interrupted";
        return "provider";
    }

    /** The failure message with the credential redacted, if it ever reached it. */
    static String safeMessage(Throwable error) {
        if (error instanceof MissingKey) return KEY + " is not set";
        String message = error.getMessage();
        String apiKey = LIVE_KEY.get();
        if (message != null && apiKey != null && !apiKey.isEmpty()) {
            message = message.replace(apiKey, "[redacted]");
        }
        return error.getClass().getSimpleName() + (message == null ? "" : ": " + message);
    }

    static final class MissingKey extends IllegalStateException {
        MissingKey() {
            super(KEY + " is not set");
        }
    }
}
