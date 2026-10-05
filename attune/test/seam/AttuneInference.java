package attune.inference;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.langchain4j.exception.HttpException;
import dev.langchain4j.http.client.HttpClient;
import dev.langchain4j.http.client.HttpClientBuilder;
import dev.langchain4j.http.client.HttpRequest;
import dev.langchain4j.http.client.SuccessfulHttpResponse;
import dev.langchain4j.http.client.sse.ServerSentEventListener;
import dev.langchain4j.http.client.sse.ServerSentEventParser;
import dev.langchain4j.model.openai.internal.OpenAiClient;
import dev.langchain4j.model.openai.internal.ParsedAndRawResponse;
import dev.langchain4j.model.openai.internal.chat.ChatCompletionChoice;
import dev.langchain4j.model.openai.internal.chat.ChatCompletionRequest;
import dev.langchain4j.model.openai.internal.chat.ChatCompletionResponse;
import dev.langchain4j.model.openai.internal.embedding.Embedding;
import dev.langchain4j.model.openai.internal.embedding.EmbeddingRequest;
import dev.langchain4j.model.openai.internal.embedding.EmbeddingResponse;
import dev.langchain4j.model.openai.internal.shared.Usage;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * The typed LangChain4j inference seam, driven only by a recorded fake transport.
 *
 * <p>Adapted from the read-only reference {@code src/native/inference}
 * (HEAD {@code ce2e3f0a363f67217fa6f1f39ffc7b194d4aa3d7}); see the adaptation
 * record in {@code DESIGN.md}.
 * It preserves the approved typed embedding/decision shape while copying no live
 * acquisition workflow: there is no provider endpoint, no credential read and no
 * socket. The real SDK request builder and response decoder run against a
 * deterministic recorded exchange supplied by the caller, so a model-shaped API
 * is exercised without contacting a model.
 *
 * <p>Both entries return a small versioned JSON envelope. A successful exchange
 * carries {@code "status":"ok"}, the exact request identity and the decoded
 * result; a transport or decode failure carries {@code "status":"error"} and a
 * classified kind. An empty successful response is therefore a decoded result
 * with no vectors, never an error.
 */
public final class AttuneInference {
    private static final ObjectMapper JSON = new ObjectMapper();

    private AttuneInference() {}

    /** One recorded embedding exchange: typed request in, decoded vectors out. */
    public static String embed(String requestJson, int status, String providerBody) {
        try {
            JsonNode request = JSON.readTree(requestJson);
            String model = requiredText(request, "model");
            List<String> inputs = textArray(request, "inputs");
            EmbeddingRequest embedding = EmbeddingRequest.builder().model(model).input(inputs).build();

            ParsedAndRawResponse<EmbeddingResponse> parsed =
                    client(status, providerBody).embedding(embedding).executeRaw();
            EmbeddingResponse response = parsed.parsedResponse();

            ObjectNode root = envelope("embedding");
            ObjectNode identity = root.putObject("request");
            identity.put("model", model);
            ArrayNode inputNode = identity.putArray("inputs");
            for (String input : inputs) {
                inputNode.add(input);
            }
            identity.put("count", inputs.size());

            ArrayNode vectors = root.putArray("vectors");
            if (response.data() != null) {
                for (Embedding embeddingRow : response.data()) {
                    ArrayNode vector = vectors.addArray();
                    for (Float coordinate : embeddingRow.embedding()) {
                        vector.add(coordinate);
                    }
                }
            }
            putUsage(root, response.usage());
            return root.toString();
        } catch (Throwable error) {
            return failure(error);
        }
    }

    /** One recorded decision exchange: a chat completion decoded to its choice. */
    public static String decide(String requestJson, int status, String providerBody) {
        try {
            JsonNode request = JSON.readTree(requestJson);
            String model = requiredText(request, "model");
            List<String> messages = textArray(request, "messages");
            ChatCompletionRequest.Builder builder = ChatCompletionRequest.builder().model(model);
            for (String message : messages) {
                builder.addUserMessage(message);
            }

            ParsedAndRawResponse<ChatCompletionResponse> parsed =
                    client(status, providerBody).chatCompletion(builder.build()).executeRaw();
            ChatCompletionResponse response = parsed.parsedResponse();

            ObjectNode root = envelope("decision");
            ObjectNode identity = root.putObject("request");
            identity.put("model", model);
            ArrayNode messageNode = identity.putArray("messages");
            for (String message : messages) {
                messageNode.add(message);
            }
            identity.put("count", messages.size());

            ArrayNode choices = root.putArray("choices");
            if (response.choices() != null) {
                for (ChatCompletionChoice choice : response.choices()) {
                    ObjectNode row = choices.addObject();
                    row.put("index", choice.index());
                    row.put("content", choice.message() == null ? null : choice.message().content());
                    row.put("finish_reason", choice.finishReason());
                }
            }
            putUsage(root, response.usage());
            return root.toString();
        } catch (Throwable error) {
            return failure(error);
        }
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static OpenAiClient client(int status, String providerBody) {
        OpenAiClient.Builder builder = OpenAiClient.builder()
                .baseUrl("http://recorded.invalid")
                .httpClientBuilder(new Recorded(status, providerBody))
                .connectTimeout(Duration.ofSeconds(30))
                .readTimeout(Duration.ofMinutes(3))
                .logRequests(false)
                .logResponses(false);
        return (OpenAiClient) builder.build();
    }

    private static ObjectNode envelope(String kind) {
        ObjectNode root = JSON.createObjectNode();
        root.put("version", 1);
        root.put("status", "ok");
        root.put("kind", kind);
        return root;
    }

    private static void putUsage(ObjectNode root, Usage usage) {
        if (usage == null) {
            root.putNull("usage");
            return;
        }
        ObjectNode node = root.putObject("usage");
        node.put("prompt_tokens", usage.promptTokens());
        node.put("completion_tokens", usage.completionTokens());
        node.put("total_tokens", usage.totalTokens());
    }

    private static String requiredText(JsonNode request, String field) {
        JsonNode value = request.path(field);
        if (!value.isTextual() || value.textValue().isBlank()) {
            throw new IllegalArgumentException(field + " must be a non-empty string");
        }
        return value.textValue();
    }

    private static List<String> textArray(JsonNode request, String field) {
        JsonNode value = request.path(field);
        if (!value.isArray()) {
            throw new IllegalArgumentException(field + " must be a JSON array of strings");
        }
        List<String> result = new ArrayList<>(value.size());
        for (JsonNode item : value) {
            if (!item.isTextual()) {
                throw new IllegalArgumentException(field + " must be a JSON array of strings");
            }
            result.add(item.textValue());
        }
        return result;
    }

    private static String failure(Throwable error) {
        String kind = classify(error);
        ObjectNode root = JSON.createObjectNode();
        root.put("version", 1);
        root.put("status", "error");
        root.put("kind", kind);
        root.put("message", error.getClass().getSimpleName() + ": " + error.getMessage());
        return root.toString();
    }

    private static String classify(Throwable error) {
        if (error instanceof HttpException http) {
            return "http-" + http.statusCode();
        }
        if (error instanceof IllegalArgumentException) {
            return "request";
        }
        for (Throwable current = error; current != null; current = current.getCause()) {
            if (current instanceof JsonProcessingException) {
                return "decode";
            }
            if (current instanceof HttpException http) {
                return "http-" + http.statusCode();
            }
        }
        return "provider";
    }

    /**
     * Serves exactly one recorded provider exchange. It never opens a
     * connection: a non-2xx status becomes the same {@link HttpException} a real
     * transport would raise, and a 2xx status returns the recorded body for the
     * SDK's own decoder.
     */
    private static final class Recorded implements HttpClientBuilder, HttpClient {
        private final int status;
        private final String body;
        private Duration connectTimeout;
        private Duration readTimeout;

        Recorded(int status, String body) {
            this.status = status;
            this.body = body;
        }

        @Override public Duration connectTimeout() { return connectTimeout; }
        @Override public HttpClientBuilder connectTimeout(Duration value) { connectTimeout = value; return this; }
        @Override public Duration readTimeout() { return readTimeout; }
        @Override public HttpClientBuilder readTimeout(Duration value) { readTimeout = value; return this; }
        @Override public HttpClient build() { return this; }

        @Override
        public SuccessfulHttpResponse execute(HttpRequest request) {
            if (status < 200 || status >= 300) {
                throw new HttpException(status, body);
            }
            return SuccessfulHttpResponse.builder().statusCode(status).body(body).build();
        }

        @Override
        public void execute(HttpRequest request, ServerSentEventParser parser, ServerSentEventListener listener) {
            throw new UnsupportedOperationException("recorded replay serves no streams");
        }
    }
}
