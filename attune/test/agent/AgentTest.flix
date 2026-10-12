use Attune.Agent
use Attune.{World, FileId}
import dev.langchain4j.model.chat.ChatModel
import dev.langchain4j.model.chat.request.ChatRequest
import dev.langchain4j.model.chat.response.ChatResponse
import dev.langchain4j.data.message.{AiMessage, UserMessage, ChatMessage, ToolExecutionResultMessage}
import dev.langchain4j.agent.tool.ToolExecutionRequest
import java.util.ArrayList
import java.lang.IllegalStateException

def allowedRegion(): Agent.Grant \ IO = {
    let source = "def total; price * quantity; end\n";
    {world = World.World("shop@source-digest@ruby-v1"), path = FileId.FileId("cart.rb"), first = 1, last = 1,
        digest = Agent.sha256(source), readable = true, source = source}
}

def arguments(): String = "{\"world\":\"shop@source-digest@ruby-v1\",\"path\":\"cart.rb\",\"first\":1,\"last\":1}"

/// Real SDK requests and messages cross both sides of the loop. The fake
/// chooses a reply from the received conversation, without opening a socket.
def model(): ChatModel \ IO = new ChatModel {
    def doChat(_self: ChatModel, request: ChatRequest): ChatResponse \ IO = {
        let reply = if (request.messages().size() == 1) {
            let calls = new ArrayList();
            discard calls.add(ToolExecutionRequest.builder().id("read-1").name("read_evidence").arguments(arguments()).build());
            AiMessage.aiMessage(calls)
        } else {
            let expected = new ToolExecutionResultMessage("read-1", "read_evidence", "def total; price * quantity; end");
            AiMessage.aiMessage(if (request.messages().get(2).equals(expected))
                "The cart total multiplies price and quantity." else "wrong evidence")
        };
        ChatResponse.builder().aiMessage(reply).build()
    }
}

@Test
def aToolCallReturnsItsEvidenceBeforeTheFinalReply(): Unit \ {Assert, IO} = {
    let result = Agent.withModel(() -> Agent.talk(fixtureModel(), "How is the total computed?", List#{allowedRegion()}, 3), fixtureModel(), model());
    Assert.assertOk(result);
    match result {
        case Ok(messages) =>
            Assert.assertEq(expected = 4, List.length(messages));
            Assert.assertEq(expected = true, List.get(3, messages).equals(
                new AiMessage("The cart total multiplies price and quantity.")))
        case Err(_) => ()
    }
}

@Test
def budgetsStopBeforeAnotherModelCall(): Unit \ {Assert, IO} =
    Assert.assertEq(expected = Err(Agent.Failure.LimitReached),
        Result.map(_ -> (), Agent.withModel(() -> Agent.talk(fixtureModel(), "total?", List#{allowedRegion()}, 0), fixtureModel(), model())))

@Test
def changedContentAndPermissionsAreRefused(): Unit \ {Assert, IO} = {
    let good = allowedRegion();
    Assert.assertOk(Agent.read(arguments(), List#{good}));
    Assert.assertEq(expected = Err(Agent.Failure.ChangedContent), Agent.read(arguments(), List#{{source = "different" | good}}));
    Assert.assertEq(expected = Err(Agent.Failure.Denied), Agent.read(arguments(), List#{{readable = false | good}}));
    Assert.assertEq(expected = Err(Agent.Failure.Denied), Agent.read(arguments(), List#{{world = World.World("another-world") | good}}))
}

@Test
def malformedOrExpandedRequestsCannotRead(): Unit \ {Assert, IO} = {
    let allowed = List#{allowedRegion()};
    List.forEach(text -> Assert.assertErr(Agent.read(text, allowed)), List#{
        "not-json", "{}", "[]",
        String.replace(src = "\"first\":1", dst = "\"first\":1.5", arguments()),
        String.replace(src = "\"last\":1", dst = "\"last\":2", arguments()),
        String.replace(src = "cart.rb", dst = "../cart.rb", arguments()),
        String.replace(src = "\"first\":1", dst = "\"first\":1,\"first\":1", arguments()),
        String.replace(src = "\"first\":1", dst = "\"first\":1,\"readable\":true", arguments())
    });
    Assert.assertEq(expected = Err(Agent.Failure.Denied), Agent.read(arguments(), allowed ::: allowed))
}

@Test
def replayMatchesTheEntireRequest(): Unit \ {Assert, IO} = {
    let message: ChatMessage = checked_cast(new UserMessage("explain the cart"));
    let before = Agent.request(fixtureModel(), List#{message});
    let same = Agent.request(fixtureModel(), List#{message});
    let changedModel = Agent.request({name = "other-model" | fixtureModel()}, List#{message});
    let response = ChatResponse.builder().aiMessage(new AiMessage("saved answer")).build();
    let saved = List#{(fixtureModel(), before, response)};
    Assert.assertOk(Agent.withSavedReplies(() -> Agent.Conversation.reply(fixtureModel(), same), saved));
    Assert.assertEq(expected = Err(Agent.Failure.MissingReply),
        Result.map(_ -> (), Agent.withSavedReplies(() -> Agent.Conversation.reply(fixtureModel(), changedModel), saved)))
}

@Test
def aToolCallCannotSpendTheFinalReplyBudget(): Unit \ {Assert, IO} = {
    let allowed = List#{allowedRegion()};
    Assert.assertEq(expected = Err(Agent.Failure.LimitReached),
        Result.map(_ -> (), Agent.withModel(() -> Agent.talk(fixtureModel(), "total?", allowed, 2), fixtureModel(), model())))
}


def fixtureModel(): Agent.Model = {endpoint = "recorded://fixture", name = "fixture"}

@Test
def aDifferentProviderCannotReuseTheReply(): Unit \ {Assert, IO} = {
    let request = Agent.request(fixtureModel(), List#{(checked_cast(new UserMessage("question")): ChatMessage)});
    let answer = ChatResponse.builder().aiMessage(new AiMessage("saved")).build();
    let other = {endpoint = "recorded://different" | fixtureModel()};
    Assert.assertEq(expected = Err(Agent.Failure.MissingReply), Result.map(_ -> (),
        Agent.withSavedReplies(() -> Agent.Conversation.reply(other, request), List#{(fixtureModel(), request, answer)})));
    Assert.assertEq(expected = Err(Agent.Failure.Denied), Result.map(_ -> (),
        Agent.withModel(() -> Agent.Conversation.reply(other, request), fixtureModel(), model())))
}

@Test
def conflictingSavedRepliesAreRejected(): Unit \ {Assert, IO} = {
    let request = Agent.request(fixtureModel(), List#{(checked_cast(new UserMessage("question")): ChatMessage)});
    let first = ChatResponse.builder().aiMessage(new AiMessage("first")).build();
    let second = ChatResponse.builder().aiMessage(new AiMessage("second")).build();
    Assert.assertEq(expected = Err(Agent.Failure.InvalidReply), Result.map(_ -> (),
        Agent.withSavedReplies(() -> Agent.Conversation.reply(fixtureModel(), request),
            List#{(fixtureModel(), request, first), (fixtureModel(), request, second)})))
}

@Test
def duplicateToolIdsCannotProduceAmbiguousResults(): Unit \ {Assert, IO} = {
    let calls = new ArrayList();
    let call = ToolExecutionRequest.builder().id("duplicate").name("read_evidence").arguments(arguments()).build();
    discard calls.add(call);
    discard calls.add(call);
    let response = ChatResponse.builder().aiMessage(AiMessage.aiMessage(calls)).build();
    let result = run { Agent.talk(fixtureModel(), "question", List#{allowedRegion()}, 4) }
        with handler Agent.Conversation {
            def reply(_model, _request, continueWith) = continueWith(Ok(response))
        };
    Assert.assertEq(expected = Err(Agent.Failure.InvalidReply), Result.map(_ -> (), result))
}

@Test
def providerExceptionsStayClassified(): Unit \ {Assert, IO} = {
    let broken = new ChatModel {
        def doChat(_self: ChatModel, _request: ChatRequest): ChatResponse \ IO =
            throw new IllegalStateException("recorded transport failure")
    };
    Assert.assertEq(expected = Err(Agent.Failure.ProviderFailed), Result.map(_ -> (),
        Agent.withModel(() -> Agent.talk(fixtureModel(), "question", Nil, 1), fixtureModel(), broken)))
}
