import attune.grit.fixtures.GritFixtures

use Attune.Repository
use Attune.Repository.Grit
use Attune.Coverage

/// Native `@Test` laws for the retained native Grit frontends and the approved
/// bounded Ruby arm.
///
/// Every case here runs the real pinned engine through the ABI: the fixture
/// bytes are read from declared files, each relation program is the packaged
/// `.grit` frontend, and the resulting facts are projected by the canonical
/// envelope and admitted by the Flix repository layer. Nothing is stubbed, and
/// no expectation is copied from a previous run of the code under test: the
/// expected ranges come from the fixture bytes and the expected edges from the
/// declarations and requires those bytes write.
///
/// The Ruby cases cover the admitted outcomes the mission names: literal
/// requires and constant-qualified calls resolve, and a computed require, a
/// missing target, dynamic dispatch, an ambiguous receiver and a reopened
/// declaration each stay explicitly unresolved with their named reason.

def shopFiles(): List[String] =
    "shop/pricing.rb" :: "shop/receipt.rb" :: "shop/checkout.rb" :: Nil

def negativeFiles(): List[String] =
    "negative/computed_require.rb" :: "negative/missing_require.rb" :: "negative/dynamic_dispatch.rb"
        :: "negative/reopened_declaration.rb" :: "negative/ambiguous/caller.rb"
        :: "negative/ambiguous/left.rb" :: "negative/ambiguous/right.rb" :: Nil

/// The instance-method fixture: a bare `def` whose body calls a class-level
/// method by constant path, so the ordinary `def` classification and call
/// ownership are exercised without broad instance dispatch.
def instanceFiles(): List[String] =
    "instance/register.rb" :: Nil

/// The carried native/editor support files this fixture reads as source-as-data.
def supportAssets(): List[String] =
    "platform/build/grit_repository.bzl" :: "platform/zed/extension.toml" :: "platform/zed/languages/flix/brackets.scm"
        :: "platform/zed/languages/flix/config.toml" :: "platform/zed/languages/flix/highlights.scm"
        :: "platform/zed/languages/flix/outline.scm" :: Nil

/// The frozen Grit closure revision the one repository rule pins.
def gritRevision(): String = "c80b3026471b229f41b279c3eb0c162dcdacfdb1"

/// The one Flix grammar revision: Grit materializes it and the Zed extension
/// pins it, so the two never drift apart.
def flixGrammarRevision(): String = "78cff149b2e9897456f94844872353b5ee0ca93b"

def path(file: String): String = "test/grit/fixtures/" + file

def fixture(file: String): String \ IO = GritFixtures.source(path(file))

def fileEntry(file: String): (String, String) \ IO = (path(file), fixture(file))

def world(files: List[String]): List[(String, String)] \ IO = List.map(fileEntry, files)

/// Analyze one world and fail loudly when the world itself was not admitted.
def admitted(files: List[String]): Repository.Repository \ {Assert, IO} =
    admittedWorld(world(files))

/// Analyze one authored `(file id, exact source)` world.
def admittedWorld(files: List[(String, String)]): Repository.Repository \ {Assert, IO} =
    match Repository.analyze(files) {
        case Ok(repository) => repository
        case Err(error) =>
            Assert.assertEq(expected = "admitted", "${error}");
            emptyRepository()
    }

def emptyRepository(): Repository.Repository = {
    declarations = Nil,
    defines = Nil,
    definedIn = Nil,
    imports = Nil,
    importedBy = Nil,
    calls = Nil,
    callers = Nil,
    reopened = Nil,
    refusals = Nil
}

def sorted(values: List[String]): List[String] = List.sortBy(value -> value, values)

def edgeText(edge: (String, String)): String = match edge {
    case (left, right) => right + " -> " + left
}

def reversed(edges: List[(String, String)]): List[String] = List.map(edgeText, edges)

/// One relation program of one language over one source, through the one native
/// route the Repository owner uses, so the fixture never re-implements the
/// packaged program lookup or the wire projection.
def relationFacts(language: Grit.Language, file: String, source: String, program: Grit.Program): List[Grit.Fact] \ IO =
    Result.getWithDefault(Nil, Repository.factsOf(file, source, language, program))

/// A fact as kind, the exact source text before its logged value, that value and
/// both byte ranges: the construct, the syntax the value does not carry, the
/// logged value, the match range and the logged range.
def factLine(source: String, fact: Grit.Fact): String =
    "${fact#kind} ${Grit.substring(source, fact#startByte, fact#valueStart)}${fact#value}"
        + " [${fact#startByte},${fact#endByte}] [${fact#valueStart},${fact#valueEnd}]"

def factLines(language: Grit.Language, file: String, program: Grit.Program): List[String] \ IO = {
    let source = fixture(file);
    List.map(fact -> factLine(source, fact), relationFacts(language, path(file), source, program))
}

/// The fact lines of one relation program over one inline source.
def factLinesOf(language: Grit.Language, file: String, source: String, program: Grit.Program): List[String] \ IO =
    List.map(fact -> factLine(source, fact), relationFacts(language, file, source, program))

def surface(language: Grit.Language, file: String, source: String, callee: String): Unit \ {Assert, IO} =
    Assert.assertEq(
        expected = callee :: Nil,
        List.map(fact -> fact#value, relationFacts(language, file, source, Grit.Program.Calls)))

/// The declared population is exactly the authored Ruby world plus the carried
/// native/editor support files, read through the mechanical launcher binding
/// rather than guessed from a path.
@Test
def declaredFixturePopulationIsExact(): Unit \ {Assert, IO} =
    Assert.assertEq(
        expected = sorted(List.map(file -> path(file), shopFiles() ::: negativeFiles() ::: instanceFiles()) ::: supportAssets()),
        sorted(String.lines(GritFixtures.declared())))

/// The carried native and editor support corresponds: the one Grit repository
/// rule pins the frozen closure and the same Flix grammar revision the Zed
/// extension pins, the editor assets delegate to the compiler's own language
/// server, and no obsolete repository-owned shell launcher or new editor
/// implementation is carried beside them.
@Test
def nativeAndEditorPinsCorrespond(): Unit \ {Assert, IO} = {
    let rule = GritFixtures.source("platform/build/grit_repository.bzl");
    let extension = GritFixtures.source("platform/zed/extension.toml");
    Assert.assertEq(expected = true, String.contains(substr = gritRevision(), rule));
    Assert.assertEq(expected = true, String.contains(substr = "omarjatoi/tree-sitter-flix", rule));
    Assert.assertEq(expected = true, String.contains(substr = flixGrammarRevision(), rule));
    Assert.assertEq(
        expected = true,
        String.contains(substr = "rev = \"" + flixGrammarRevision() + "\"", extension));
    Assert.assertEq(expected = true, String.contains(substr = "[language_servers.flix]", extension));
    Assert.assertEq(expected = false, String.contains(substr = "flix-lsp", extension));
    Assert.assertEq(
        expected = false,
        List.exists(name -> String.endsWith(suffix = ".sh", name), supportAssets()))
}

/// All eight admitted surfaces run real Grit on authored sources: the seven
/// retained languages plus the approved Ruby arm.
@Test
def eightAdmittedSurfacesRunRealGrit(): Unit \ {Assert, IO} = {
    surface(Grit.Language.JavaScript, "src/helper.js", "helper(1);\n", "helper");
    surface(Grit.Language.Jsx, "src/view.jsx", "const view = render(1);\n", "render");
    surface(Grit.Language.TypeScript, "src/helper.ts", "helper(1);\n", "helper");
    surface(Grit.Language.Tsx, "src/view.tsx", "const view = render(1);\n", "render");
    surface(Grit.Language.Java, "src/Helper.java", "class Helper {\n    void run() {\n        helper(1);\n    }\n}\n", "helper");
    surface(Grit.Language.Flix, "src/Main.flix", "def main(): Int32 = helper(1)\n", "helper");
    surface(Grit.Language.Starlark, "src/build.bzl", "def _impl(ctx):\n    return helper(1)\n", "helper");
    surface(Grit.Language.Ruby, "src/helper.rb", "def run\n  helper(1)\nend\n", "helper")
}

/// The retained frontends keep the reference's per-language import dispatch: a
/// JS/JSX/TS/TSX quoted relative specifier, a Java dotted type, a Flix qualified
/// module reference and a Starlark repository label each resolve to exactly the
/// one authored file they name. Every language is exercised through the real
/// engine rather than a stub.
@Test
def retainedImportsResolvePerLanguage(): Unit \ {Assert, IO} = {
    let repository = admittedWorld(List#{
        ("src/helper.js", "const util = require(\"./util\");\n"),
        ("src/util.js", "function util() { return 1; }\n"),
        ("src/helper.ts", "import \"./verify\";\n"),
        ("src/verify.ts", "export function verify(): boolean { return true; }\n"),
        ("src/view.jsx", "const view = require(\"./render\");\n"),
        ("src/render.jsx", "function render() { return null; }\n"),
        ("src/view.tsx", "import \"./element\";\n"),
        ("src/element.tsx", "export function element(): boolean { return true; }\n"),
        ("src/a/Client.java", "package a;\n\nimport a.Other;\n\npublic class Client {}\n"),
        ("src/a/Other.java", "package a;\n\npublic class Other {}\n"),
        ("src/Demo.flix", "mod Demo {\n    use Repository.Structure.FileId\n\n    pub def helper(x: Int32): Int32 = x\n}\n"),
        ("src/Repository/Structure.flix", "mod Repository.Structure {\n    pub def x(): Int32 = 1\n}\n"),
        ("src/pkg/BUILD", "load(\"//tools:defs.bzl\", \"helper\")\n\ndef run():\n    helper(\"sample\")\n"),
        ("src/tools/defs.bzl", "def helper(name):\n    pass\n")
    });
    Assert.assertEq(expected = List#{
        "src/Demo.flix -> src/Repository/Structure.flix",
        "src/a/Client.java -> src/a/Other.java",
        "src/helper.js -> src/util.js",
        "src/helper.ts -> src/verify.ts",
        "src/pkg/BUILD -> src/tools/defs.bzl",
        "src/view.jsx -> src/render.jsx",
        "src/view.tsx -> src/element.tsx"
    }, Repository.edgeTexts(repository#imports))
}

/// A retained call is owned by the narrowest declaration that encloses it, and
/// it admits the uniquely named target in that same file before any
/// repository-wide fallback.
@Test
def retainedCallsUseNarrowestOwnerAndUniqueSameFileTarget(): Unit \ {Assert, IO} = {
    let repository = admittedWorld(List#{
        ("src/a/Client.java", "package a;\n\nimport a.Other;\n\npublic class Client {\n    public void helper(String name) {}\n    public void verify(String name) { helper(name); }\n}\n"),
        ("src/a/Other.java", "package a;\n\npublic class Other {}\n")
    });
    Assert.assertEq(expected = List#{"Client.verify -> Client.helper"}, Repository.edgeTexts(repository#calls))
}

/// With no same-file target, a uniquely named repository-wide target is
/// admitted instead of refused.
@Test
def retainedCallsFallBackToUniqueRepositoryTarget(): Unit \ {Assert, IO} = {
    let repository = admittedWorld(List#{
        ("src/a/Util.java", "package a;\n\npublic class Util {\n    public void shared(String name) {}\n}\n"),
        ("src/b/Caller.java", "package b;\n\npublic class Caller {\n    public void run(String name) { shared(name); }\n}\n")
    });
    Assert.assertEq(expected = List#{"Caller.run -> Util.shared"}, Repository.edgeTexts(repository#calls))
}

/// An ambiguous repository-wide name, an ownerless call and a dynamic callee
/// each stay unresolved with their own named reason, so the three conservative
/// outcomes are distinguished rather than collapsed into one.
@Test
def retainedAmbiguousOwnerlessAndDynamicCallsAreDistinguished(): Unit \ {Assert, IO} = {
    let ambiguous = admittedWorld(List#{
        ("src/a/Left.java", "package a;\n\npublic class Left {\n    public void shared(String name) {}\n}\n"),
        ("src/b/Right.java", "package b;\n\npublic class Right {\n    public void shared(String name) {}\n}\n"),
        ("src/c/Caller.java", "package c;\n\npublic class Caller {\n    public void run(String name) { shared(name); }\n}\n")
    });
    Assert.assertEq(expected = Nil, ambiguous#calls);
    Assert.assertEq(expected = List#{"ambiguous-target"}, refusalCodes(ambiguous));

    let ownerless = admittedWorld(("src/top.ts", "helper(1);\n") :: Nil);
    Assert.assertEq(expected = Nil, ownerless#calls);
    Assert.assertEq(expected = List#{"unscoped-call"}, refusalCodes(ownerless));

    let dynamic = admittedWorld(("src/dyn.ts", "function run(): number {\n  return handlers[kind](1);\n}\n") :: Nil);
    Assert.assertEq(expected = Nil, dynamic#calls);
    Assert.assertEq(expected = List#{"dynamic-dispatch"}, refusalCodes(dynamic))
}

/// A bare `def` is classified as an instance method, and a constant-qualified
/// call inside it is owned by that method and resolves to the unique singleton
/// declaration of the constant path.
@Test
def rubyInstanceMethodIsClassifiedAndOwnsItsCall(): Unit \ {Assert, IO} = {
    let repository = admitted(instanceFiles() ::: "shop/pricing.rb" :: Nil);
    Assert.assertEq(
        expected = true,
        List.exists(line -> String.startsWith(prefix = "Shop.Register.total ", line)
            and String.contains(substr = " instance ", line),
            Repository.declarationTexts(repository)));
    Assert.assertEq(
        expected = List#{"Shop.Register.total -> Shop.Pricing.total_cents"},
        List.filter(edge -> String.startsWith(prefix = "Shop.Register.total ", edge),
            Repository.edgeTexts(repository#calls)))
}

def refusalCodes(repository: Repository.Repository): List[String] =
    sorted(List.map(Repository.refusalCode, repository#refusals))

/// The Ruby frontends report the exact constructs, values and byte ranges of an
/// authored file: a declaration's whole body with its name, a require with its
/// argument list, and a call with its method.
@Test
def rubyFrontendsReportExactFactRanges(): Unit \ {Assert, IO} = {
    Assert.assertEq(
        expected = List#{
            "definition module Shop [31,269] [38,42]",
            "definition module Pricing [45,265] [52,59]",
            "definition def self.total_cents [126,259] [135,146]"
        },
        factLines(Grit.Language.Ruby, "shop/pricing.rb", Grit.Program.Defines));
    Assert.assertEq(
        expected = List#{
            "call items.sum [160,251] [166,169]",
            "call item.fetch [188,209] [193,198]",
            "call item.fetch [212,241] [217,222]"
        },
        factLines(Grit.Language.Ruby, "shop/pricing.rb", Grit.Program.Calls));
    Assert.assertEq(
        expected = List#{"import require_relative \"pricing\" [31,57] [48,57]"},
        factLines(Grit.Language.Ruby, "shop/receipt.rb", Grit.Program.Imports));
    Assert.assertEq(
        expected = List#{
            "call Pricing.total_cents [141,167] [149,160]",
            "call cents.divmod [195,212] [201,207]",
            "call format [220,287] [220,226]"
        },
        factLines(Grit.Language.Ruby, "shop/receipt.rb", Grit.Program.Calls))
}

/// Ruby declarations carry qualified repository identities and the declared
/// form read from the keyword the file wrote.
@Test
def rubyShopDeclarationsCarryQualifiedIdentities(): Unit \ {Assert, IO} = {
    let repository = admitted(shopFiles());
    Assert.assertEq(
        expected = List#{
            "Shop test/grit/fixtures/shop/pricing.rb namespace 31-269",
            "Shop.Pricing test/grit/fixtures/shop/pricing.rb namespace 45-265",
            "Shop.Pricing.total_cents test/grit/fixtures/shop/pricing.rb singleton 126-259",
            "Shop test/grit/fixtures/shop/receipt.rb namespace 59-305",
            "Shop.Receipt test/grit/fixtures/shop/receipt.rb namespace 73-301",
            "Shop.Receipt.render test/grit/fixtures/shop/receipt.rb singleton 92-295",
            "Shop test/grit/fixtures/shop/checkout.rb namespace 59-218",
            "Shop.Checkout test/grit/fixtures/shop/checkout.rb namespace 73-214",
            "Shop.Checkout.free_shipping? test/grit/fixtures/shop/checkout.rb singleton 93-208"
        },
        Repository.declarationTexts(repository))
}

/// Literal relative requires admit exact file edges, and the inverse relation is
/// derived from the admitted edges rather than extracted a second time.
@Test
def rubyShopImportsResolveToAuthoredFiles(): Unit \ {Assert, IO} = {
    let repository = admitted(shopFiles());
    Assert.assertEq(
        expected = List#{
            "test/grit/fixtures/shop/checkout.rb -> test/grit/fixtures/shop/pricing.rb",
            "test/grit/fixtures/shop/receipt.rb -> test/grit/fixtures/shop/pricing.rb"
        },
        Repository.edgeTexts(repository#imports));
    Assert.assertEq(
        expected = List#{
            "test/grit/fixtures/shop/pricing.rb -> test/grit/fixtures/shop/checkout.rb",
            "test/grit/fixtures/shop/pricing.rb -> test/grit/fixtures/shop/receipt.rb"
        },
        sorted(Repository.edgeTexts(repository#importedBy)));
    Assert.assertEq(
        expected = sorted(reversed(repository#imports)),
        sorted(Repository.edgeTexts(repository#importedBy)))
}

/// Constant-qualified calls admit exact symbol edges, the inverse relation is
/// derived, and a reopened namespace is recorded without blocking the distinct
/// symbols it encloses.
@Test
def rubyShopCallsResolveAndInvert(): Unit \ {Assert, IO} = {
    let repository = admitted(shopFiles());
    Assert.assertEq(
        expected = List#{
            "Shop.Checkout.free_shipping? -> Shop.Pricing.total_cents",
            "Shop.Receipt.render -> Shop.Pricing.total_cents"
        },
        Repository.edgeTexts(repository#calls));
    Assert.assertEq(
        expected = List#{
            "Shop.Pricing.total_cents -> Shop.Checkout.free_shipping?",
            "Shop.Pricing.total_cents -> Shop.Receipt.render"
        },
        sorted(Repository.edgeTexts(repository#callers)));
    Assert.assertEq(
        expected = sorted(reversed(repository#calls)),
        sorted(Repository.edgeTexts(repository#callers)));
    Assert.assertEq(expected = "Shop" :: Nil, repository#reopened);
    Assert.assertEq(expected = 9, List.length(repository#definedIn));
    Assert.assertEq(
        expected = sorted(reversed(repository#definedIn)),
        sorted(Repository.edgeTexts(repository#defines)));
    Assert.assertEq(
        expected = List#{
            "dynamic-dispatch test/grit/fixtures/shop/pricing.rb fetch",
            "dynamic-dispatch test/grit/fixtures/shop/pricing.rb fetch",
            "dynamic-dispatch test/grit/fixtures/shop/pricing.rb sum",
            "dynamic-dispatch test/grit/fixtures/shop/receipt.rb divmod",
            "dynamic-dispatch test/grit/fixtures/shop/receipt.rb format"
        },
        sorted(Repository.refusalTexts(repository)))
}

/// A require whose target is computed rather than written stays unresolved: the
/// import is refused as computed, and the call it makes sits outside any method,
/// so it names no caller and is refused as unscoped.
@Test
def computedRequireStaysUnresolved(): Unit \ {Assert, IO} = {
    let repository = admitted("negative/computed_require.rb" :: Nil);
    let file = "test/grit/fixtures/negative/computed_require.rb";
    Assert.assertEq(expected = Nil, repository#imports);
    Assert.assertEq(expected = Nil, repository#calls);
    Assert.assertEq(
        expected = List#{
            "computed-require " + file + " File.join(\"shop\", \"pricing\")",
            "unscoped-call " + file + " join"
        },
        sorted(Repository.refusalTexts(repository)))
}

/// A literal require naming no authored file stays unresolved.
@Test
def missingRequireStaysUnresolved(): Unit \ {Assert, IO} = {
    let repository = admitted("negative/missing_require.rb" :: Nil);
    let file = "test/grit/fixtures/negative/missing_require.rb";
    Assert.assertEq(expected = Nil, repository#imports);
    Assert.assertEq(
        expected = "missing-file " + file + " absent_pricing" :: Nil,
        Repository.refusalTexts(repository))
}

/// Calls on a receiver that is not a constant path stay unresolved.
@Test
def dynamicDispatchStaysUnresolved(): Unit \ {Assert, IO} = {
    let repository = admitted("negative/dynamic_dispatch.rb" :: Nil);
    let file = "test/grit/fixtures/negative/dynamic_dispatch.rb";
    Assert.assertEq(expected = Nil, repository#calls);
    Assert.assertEq(
        expected = List#{
            "dynamic-dispatch " + file + " fetch",
            "dynamic-dispatch " + file + " sum"
        },
        sorted(Repository.refusalTexts(repository)))
}

/// A constant path reachable from more than one enclosing scope stays
/// unresolved, and both candidate symbols are reported. Each authored call site
/// on a dynamic receiver is refused on its own, so a repeated site repeats.
@Test
def ambiguousReceiverStaysUnresolved(): Unit \ {Assert, IO} = {
    let repository = admitted(
        "negative/ambiguous/caller.rb" :: "negative/ambiguous/left.rb" :: "negative/ambiguous/right.rb" :: Nil);
    let file = "test/grit/fixtures/negative/ambiguous/caller.rb";
    Assert.assertEq(expected = Nil, repository#calls);
    Assert.assertEq(
        expected = List#{
            "ambiguous-receiver " + file + " total_cents",
            "dynamic-dispatch test/grit/fixtures/negative/ambiguous/left.rb fetch",
            "dynamic-dispatch test/grit/fixtures/negative/ambiguous/left.rb fetch",
            "dynamic-dispatch test/grit/fixtures/negative/ambiguous/left.rb sum",
            "dynamic-dispatch test/grit/fixtures/negative/ambiguous/right.rb fetch",
            "dynamic-dispatch test/grit/fixtures/negative/ambiguous/right.rb sum"
        },
        sorted(Repository.refusalTexts(repository)))
}

/// A symbol the world declares more than once is recorded as reopened and never
/// resolved, even though its constant path names exactly one candidate.
@Test
def reopenedDeclarationStaysUnresolved(): Unit \ {Assert, IO} = {
    let repository = admitted("negative/reopened_declaration.rb" :: Nil);
    let file = "test/grit/fixtures/negative/reopened_declaration.rb";
    Assert.assertEq(expected = Nil, repository#calls);
    Assert.assertEq(
        expected = "Shop" :: "Shop.Legacy" :: "Shop.Legacy.total_cents" :: Nil,
        repository#reopened);
    Assert.assertEq(
        expected = List#{
            "dynamic-dispatch " + file + " sum",
            "dynamic-dispatch " + file + " sum",
            "reopened-declaration " + file + " Shop.Legacy.total_cents"
        },
        sorted(Repository.refusalTexts(repository)))
}

/// A file kind outside the admitted vocabulary is refused by name instead of
/// being guessed at.
@Test
def unsupportedFileIsRefusedNotGuessed(): Unit \ {Assert, IO} =
    Assert.assertEq(
        expected = "unsupported-file README.md",
        match Repository.analyze(("README.md", "# notes\n") :: Nil) {
            case Ok(_) => "admitted"
            case Err(Grit.Error.UnsupportedFile(file)) => "unsupported-file " + file
            case Err(other) => "other ${other}"
        })

/// Traversing a repository keeps the first error and never returns partial success.
@Test
def aFailedFileStopsRepositoryAdmission(): Unit \ {Assert, IO} = {
    let world = List#{
        ("first.md", "# unsupported"),
        ("second.txt", "also unsupported")
    };
    Assert.assertEq(expected = "unsupported-file first.md", match Repository.analyze(world) {
        case Err(error) => errorName(error)
        case Ok(_) => "partial success"
    });
    Assert.assertEq(expected = "unsupported-file first.md",
        match Repository.analyze(("valid.rb", "module Shop; end") :: world) {
            case Err(error) => errorName(error)
            case Ok(_) => "partial success"
        })
}

/// The JavaScript and TypeScript frontends report exact facts through the real
/// engine on sources whose whole spans are stated independently: the matched
/// construct, the syntax before the logged name, that name and both byte ranges.
@Test
def javascriptAndTypescriptFrontendsReportExactFactRanges(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = "call helper [0,9] [0,6]" :: Nil,
        factLinesOf(Grit.Language.JavaScript, "src/helper.js", "helper(1)", Grit.Program.Calls));
    Assert.assertEq(expected = "definition function helper [0,31] [9,15]" :: Nil,
        factLinesOf(Grit.Language.JavaScript, "src/helper.js", "function helper() { return 1; }", Grit.Program.Defines));
    Assert.assertEq(expected = "call helper [0,9] [0,6]" :: Nil,
        factLinesOf(Grit.Language.TypeScript, "src/helper.ts", "helper(1)", Grit.Program.Calls));
    Assert.assertEq(expected = "definition function helper [0,31] [9,15]" :: Nil,
        factLinesOf(Grit.Language.TypeScript, "src/helper.ts", "function helper() { return 1; }", Grit.Program.Defines));
    Assert.assertEq(expected = "import require(\"./util\" [0,17] [8,16]" :: Nil,
        factLinesOf(Grit.Language.JavaScript, "src/helper.js", "require(\"./util\");\n", Grit.Program.Imports))
}

/// A source that carries a multi-byte character before a construct still reports
/// exact byte ranges: the range accessor agrees with the logged value, the
/// declaration keyword is read from the right bytes, and admission is not
/// refused merely because the bytes are not ASCII.
@Test
def nonAsciiSourceKeepsExactByteRanges(): Unit \ {Assert, IO} = {
    let source = "module Boutique\n  # café ☕\n  def self.total\n    1\n  end\nend\n";
    let facts = relationFacts(Grit.Language.Ruby, "src/boutique.rb", source, Grit.Program.Defines);
    Assert.assertEq(expected = true, List.exists(fact -> fact#value == "total", facts));
    Assert.assertEq(
        expected = Nil,
        List.filterMap(fact ->
            if (Grit.substring(source, fact#valueStart, fact#valueEnd) == fact#value) None
            else Some(fact#value), facts));
    let repository = admittedWorld(("src/boutique.rb", source) :: Nil);
    Assert.assertEq(
        expected = true,
        List.exists(line -> String.contains(substr = " singleton 32-", line), Repository.declarationTexts(repository)))
}

def decodeName(wire: String): String = match Grit.decode(wire) {
    case Ok(_)  => "ok"
    case Err(e) => errorName(e)
}

def factsName(path: String, source: String, wire: String): String = match Grit.facts(path, source, wire) {
    case Ok(_)  => "ok"
    case Err(e) => errorName(e)
}

def errorName(error: Grit.Error): String = match error {
    case Grit.Error.Wire(_)                     => "wire"
    case Grit.Error.Native(kind, _)             => "native " + kind
    case Grit.Error.UnsupportedVersion(version) => "unsupported-version ${version}"
    case Grit.Error.UnexpectedPath(_, actual)   => "unexpected-path " + actual
    case Grit.Error.InvalidRange(start, end)    => "invalid-range ${start} ${end}"
    case Grit.Error.LogOutsideMatch(start, end) => "log-outside-match ${start} ${end}"
    case Grit.Error.UnsupportedFile(file)       => "unsupported-file " + file
}

/// A malformed, mis-ranged or foreign native envelope is a classified failure,
/// never an admitted empty evaluation.
@Test
def malformedNativeRecordsAreClassified(): Unit \ Assert = {
    Assert.assertEq(expected = "wire", decodeName("matched\ttrue\n"));
    Assert.assertEq(expected = "wire", decodeName("version\t1\nmatched\ttrue\nmatch\tf.rb\tnope\t2\n"));
    Assert.assertEq(expected = "unsupported-version 2", decodeName("version\t2\n"));
    Assert.assertEq(expected = "native host", decodeName("version\t1\nerror\thost\tboom\n"));
    Assert.assertEq(expected = "invalid-range 5 2", factsName("f.rb", "abcdefgh", "version\t1\nmatch\tf.rb\t5\t2\n"));
    Assert.assertEq(expected = "unexpected-path other.rb", factsName("f.rb", "abcdefgh", "version\t1\nmatch\tother.rb\t0\t2\n"));
    Assert.assertEq(expected = "log-outside-match 5 7",
        factsName("f.rb", "abcdefgh", "version\t1\nmatch\tf.rb\t0\t2\nlog\tx\t5\t7\n"))
}

/// The three forward relations are the only extraction; each inverse is exactly
/// the reversal of its forward set, including the empty and multiple-edge cases.
@Test
def everyInverseIsTheExactReversalOfItsForwardRelation(): Unit \ {Assert, IO} = {
    let repository = admittedWorld(List#{
        ("src/a.js", "import { b } from \"./b\";\nimport { c } from \"./c\";\nfunction run() { b(1); }\n"),
        ("src/b.js", "function b(value) { return value; }\n"),
        ("src/c.js", "function c(value) { return value; }\n")
    });
    Assert.assertEq(expected = sorted(reversed(repository#imports)),
        sorted(Repository.edgeTexts(repository#importedBy)));
    Assert.assertEq(expected = sorted(reversed(repository#definedIn)),
        sorted(Repository.edgeTexts(repository#defines)));
    Assert.assertEq(expected = sorted(reversed(repository#calls)),
        sorted(Repository.edgeTexts(repository#callers)));
    let empty = admittedWorld(("src/only.ts", "function solo(): number { return 1; }\n") :: Nil);
    Assert.assertEq(expected = Nil, empty#imports);
    Assert.assertEq(expected = Nil, empty#importedBy);
    Assert.assertEq(expected = Nil, empty#calls);
    Assert.assertEq(expected = Nil, empty#callers)
}

/// The declared coverage claim of this fixture: the acquisition is the authored
/// Ruby shop, the extractor is the pinned Ruby `calls` frontend, the relation is
/// `calls`, the scope is one world named for that acquisition, and the bound is
/// the three authored shop files.
def acquisition(): String = "authored-ruby-shop"

def extractor(): Grit.Program = Grit.Program.Calls

def scopeBound(): Int32 = 3

def shopWorldName(): Attune.World = Attune.World.World(acquisition())

def callFacts(repository: Repository.Repository, scope: Attune.World): List[Attune.Fact] =
    List.map(pair -> match pair {
        case (caller, target) => { world = scope, source = caller, atom = Attune.Atom.Calls, target = target }
    }, repository#calls)

def supportOf(facts: List[Attune.Fact], status: Coverage.Status): List[Coverage.Support] =
    List.map(fact -> { fact = fact, status = status }, facts)

/// Earned scoped coverage over the real extraction. A positive witness survives
/// partial coverage, missing or failed evidence cannot become a complete
/// no-match, a same-named entity in another scope cannot donate a witness, and
/// support counts distinct entities rather than duplicated proof paths.
@Test
def earnedCoverageResistsForeignAndProposedDonation(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = scopeBound(), List.length(shopFiles()));
    let receipt = relationFacts(Grit.Language.Ruby, path("shop/receipt.rb"), fixture("shop/receipt.rb"), extractor());
    Assert.assertEq(expected = true, List.exists(fact -> fact#value == "total_cents", receipt));
    let repository = admitted(shopFiles());
    let facts = callFacts(repository, shopWorldName());
    let ask: Coverage.Query = { scope = shopWorldName(), subject = "Shop.Receipt.render", atom = Attune.Atom.Calls };
    Assert.assertEq(expected = Coverage.Outcome.Witness, Coverage.observe(ask, Coverage.Coverage.Partial, facts));
    Assert.assertEq(expected = Coverage.Outcome.Unknown, Coverage.observe(ask, Coverage.Coverage.Missing, Nil));
    Assert.assertEq(expected = Coverage.Outcome.Failed,
        Coverage.observe(ask, Coverage.Coverage.Failure("acquisition-error"), Nil));
    let foreign: Coverage.Query =
        { scope = Attune.World.World("shop-v2"), subject = "Shop.Receipt.render", atom = Attune.Atom.Calls };
    Assert.assertEq(expected = Coverage.Outcome.NoMatch, Coverage.observe(foreign, Coverage.Coverage.Complete, facts));
    let support = supportOf(facts, Coverage.Status.Observed);
    Assert.assertEq(expected = 2, List.length(Coverage.witnesses(shopWorldName(), "Shop.Pricing.total_cents", support)));
    Assert.assertEq(expected = 2,
        List.length(Coverage.witnesses(shopWorldName(), "Shop.Pricing.total_cents", support ::: support)));
    Assert.assertEq(expected = false,
        Coverage.meets(1, shopWorldName(), "Shop.Pricing.total_cents", supportOf(facts, Coverage.Status.Proposed)))
}

/// The one nominal world-bearing facts / earned scoped coverage bridge: the
/// admitted shop repository supplies its world-bearing facts and the coverage it
/// actually earned, and a scoped question resolves against that earned coverage
/// rather than against a claim supplied by the caller.
@Test
def theWorldFactsAndEarnedCoverageBridgeIsExact(): Unit \ {Assert, IO} = {
    let repository = admitted(shopFiles());
    let world = shopWorldName();
    let facts = Repository.worldFacts(world, repository);
    Assert.assertEq(expected = true, List.forAll(fact -> fact#world == world, facts));
    Assert.assertEq(expected = true, List.exists(fact ->
        fact#atom == Attune.Atom.Imports and fact#source == path("shop/receipt.rb")
            and fact#target == path("shop/pricing.rb"), facts));
    Assert.assertEq(expected = true, List.exists(fact ->
        fact#atom == Attune.Atom.ImportedBy and fact#source == path("shop/pricing.rb")
            and fact#target == path("shop/receipt.rb"), facts));
    // The shop has unresolved dynamic receivers, so the acquisition is partial;
    // a complete no-match is never claimed from partial coverage.
    Assert.assertEq(expected = Coverage.Coverage.Partial, Repository.scopeCoverage(repository));
    Assert.assertEq(expected = Coverage.Outcome.Witness,
        Repository.ask(world, repository, "Shop.Receipt.render", Attune.Atom.Calls));
    Assert.assertEq(expected = Coverage.Outcome.Unknown,
        Repository.ask(world, repository, "Shop.Nothing.render", Attune.Atom.Calls));
    Assert.assertEq(expected = true,
        List.length(Repository.scopedFacts(world, repository)#facts) == List.length(facts))
}
