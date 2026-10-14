/// A bounded conversation: the model proposes a tool call; Flix decides whether
/// it may read evidence, records the result, and asks for the next reply.
pub mod Attune.Agent {
    use Util.Json
    use Attune.{World, FileId}
    use Util.Json.Json.{JObject, JString, JNumber}
    import dev.langchain4j.model.chat.ChatModel
    import dev.langchain4j.model.chat.request.ChatRequest
    import dev.langchain4j.model.chat.response.ChatResponse
    import dev.langchain4j.data.message.{ChatMessage, UserMessage, ToolExecutionResultMessage}
    import dev.langchain4j.agent.tool.{ToolSpecification, ToolExecutionRequest}
    import dev.langchain4j.model.chat.request.json.JsonObjectSchema
    import java.util.{ArrayList, HexFormat, Objects}
    import java.security.MessageDigest
    import java.nio.charset.StandardCharsets
    import java.lang.{RuntimeException, Boolean => JavaBoolean}

    pub enum Failure with Eq, ToString {
        case InvalidArguments
        case Denied
        case ChangedContent
        case MissingReply
        case ProviderFailed
        case InvalidReply
        case LimitReached
    }

    /// A caller grants an exact read-only entry of one immutable source.
    /// The model never supplies the digest, permission, or source bytes.
    pub type alias Grant = {
        world = World, path = FileId, first = Int32, last = Int32,
        digest = String, readable = Bool, source = String
    }

    /// A provider endpoint is part of replay identity, even for the same model name.
    pub type alias Model = { endpoint = String, name = String }

    pub eff Conversation {
        def reply(model: Model, request: ChatRequest): Result[Failure, ChatResponse]
    }

    /// The caller configures the SDK's endpoint, model, timeout and retries.
    /// This handler supplies transport, with no silent fallback.
    pub def withModel(program: Unit -> a \ ef, identity: Model, model: ChatModel): a \ (ef - Conversation) + IO =
        run { program() } with handler Conversation {
            def reply(requested, request, continueWith) =
                let answer = if ((requested#endpoint, requested#name) != (identity#endpoint, identity#name)) Err(Failure.Denied) else try { Ok(model.chat(request)) }
                    catch { case _: RuntimeException => Err(Failure.ProviderFailed) };
                continueWith(answer)
        }

    /// Match the complete SDK request, including messages and model parameters.
    /// Missing evidence never triggers a provider call.
    pub def withSavedReplies(program: Unit -> a \ ef, saved: List[(Model, ChatRequest, ChatResponse)]): a \ (ef - Conversation) + IO =
        run { program() } with handler Conversation {
            def reply(model, request, continueWith) =
                match List.filter(match (identity, before, _) -> (identity#endpoint, identity#name) == (model#endpoint, model#name) and before.equals(request), saved) {
                    case (_, _, answer) :: Nil => continueWith(Ok(answer))
                    case Nil => continueWith(Err(Failure.MissingReply))
                    case _ => continueWith(Err(Failure.InvalidReply))
                }
        }

    pub def specification(): ToolSpecification \ IO = {
        let schema = JsonObjectSchema.builder();
        discard schema.addStringProperty("world").addStringProperty("path");
        discard schema.addIntegerProperty("first").addIntegerProperty("last");
        discard schema.required(strings(List#{"world", "path", "first", "last"}));
        discard schema.additionalProperties(JavaBoolean.valueOf(false));
        let tool = ToolSpecification.builder().name("read_evidence");
        discard tool.description("Read an explicitly permitted source region in this repository world.");
        tool.parameters(schema.build()).build()
    }

    /// Both replies and tool calls spend the same finite budget. Calls run in
    /// order here. Parallel execution belongs in a declared Bazel stage.
    pub def talk(model: Model, question: String, regions: List[Grant], budget: Int32): Result[Failure, List[ChatMessage]] \ {Conversation, IO} =
        continueConversation(model, List#{(checked_cast(new UserMessage(question)): ChatMessage)}, regions, budget)

    def continueConversation(model: Model, messages: List[ChatMessage], regions: List[Grant], left: Int32): Result[Failure, List[ChatMessage]] \ {Conversation, IO} =
        if (left <= 0) Err(Failure.LimitReached)
        else forM (
            response <- Conversation.reply(model, request(model, messages));
            result <- accept(model, messages, regions, left - 1, response)
        ) yield result

    pub def request(model: Model, messages: List[ChatMessage]): ChatRequest \ IO = {
        let history = new ArrayList();
        List.forEach(message -> { discard history.add(message); () }, messages);
        let tools = new ArrayList();
        discard tools.add(specification());
        ChatRequest.builder().modelName(model#name).messages(history).toolSpecifications(tools).build()
    }

    def accept(model: Model, messages: List[ChatMessage], regions: List[Grant], left: Int32, response: ChatResponse): Result[Failure, List[ChatMessage]] \ {Conversation, IO} = {
        if (Objects.isNull(response) or Objects.isNull(response.aiMessage())) Err(Failure.InvalidReply)
        else {
            let answer = response.aiMessage();
            let history = messages ::: List#{(checked_cast(answer): ChatMessage)};
            if (answer.hasToolExecutionRequests()) {
                let calls = answer.toolExecutionRequests();
                if (calls.size() > left) Err(Failure.LimitReached)
                else {
                    let batch = List.map(index -> calls.get(index), List.range(0, calls.size()));
                    if (List.exists(call -> Objects.isNull(call), batch)) Err(Failure.InvalidReply)
                    else {
                        let ids = List.map(call -> call.id(), batch);
                        if (List.exists(id -> Objects.isNull(id) or String.isEmpty(id), ids) or
                            List.length(List.distinct(ids)) != List.length(ids)) Err(Failure.InvalidReply)
                        else forM (
                            replies <- Result.traverse(call -> execute(call, regions), batch);
                            result <- continueConversation(model, history ::: replies, regions, left - calls.size())
                        ) yield result
                    }
                }
            } else if (Objects.isNull(answer.text()) or String.isEmpty(answer.text())) Err(Failure.InvalidReply)
            else Ok(history)
        }
    }

    def execute(call: ToolExecutionRequest, regions: List[Grant]): Result[Failure, ChatMessage] \ IO =
        if (Objects.isNull(call) or call.name() != "read_evidence" or Objects.isNull(call.id()) or String.isEmpty(call.id())) Err(Failure.InvalidArguments)
        else Result.map(text -> (checked_cast(new ToolExecutionResultMessage(call.id(), call.name(), text)): ChatMessage), read(call.arguments(), regions))

    /// Flix's JSON parser replaces generated transport contracts. Permission
    /// and identity checks precede delivery of any source.
    pub def read(arguments: String, regions: List[Grant]): Result[Failure, String] \ IO =
        if (Objects.isNull(arguments)) Err(Failure.InvalidArguments) else match Json.parse(arguments) {
            case Ok(JObject(fields)) if Map.size(fields) == 4 =>
                match (Map.get("world", fields), Map.get("path", fields), Map.get("first", fields), Map.get("last", fields)) {
                    case (Some(JString(world)), Some(JString(path)), Some(JNumber(first)), Some(JNumber(last))) =>
                        match List.filter(entry -> entry#world == World.World(world) and entry#path == FileId.FileId(path) and
                            Int32.toBigDecimal(entry#first) == first and Int32.toBigDecimal(entry#last) == last, regions) {
                            case entry :: Nil => deliver(entry)
                            case _ => Err(Failure.Denied)
                        }
                    case _ => Err(Failure.InvalidArguments)
                }
            case _ => Err(Failure.InvalidArguments)
        }

    def deliver(entry: Grant): Result[Failure, String] \ IO = {
        let lines = String.lines(entry#source);
        if (not entry#readable or entry#first < 1 or entry#last < entry#first or
            entry#last > List.length(lines) or not safePath(entry#path)) Err(Failure.Denied)
        else if (sha256(entry#source) != entry#digest) Err(Failure.ChangedContent)
        else Ok(List.join("\n", List.take(entry#last - entry#first + 1, List.drop(entry#first - 1, lines))))
    }

    def safePath(file: FileId): Bool = {
        let FileId.FileId(path) = file;
        not String.startsWith(prefix = "/", path) and not String.contains(substr = "\\", path) and
        List.forAll(part -> part != "" and part != "." and part != "..", String.split(regex = "/", path))
    }

    pub def sha256(text: String): String \ IO =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)))

    def strings(items: List[String]): ArrayList[String] \ IO = {
        let result = new ArrayList();
        List.forEach(item -> { discard result.add(item); () }, items);
        result
    }
}
