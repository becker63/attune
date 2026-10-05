import attune.grit.AttuneGrit
import attune.grit.fixtures.GritFixtures

use Attune.Grit
use Attune.Repository

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

/// One relation program of one language over one source, through the ABI.
def relationFacts(language: Grit.Language, file: String, source: String, program: Grit.Program): List[Grit.Fact] \ IO = {
    let languageName = Grit.name(language);
    let text = AttuneGrit.program(languageName, Grit.programName(program));
    Result.getWithDefault(Nil, Grit.facts(file, source, AttuneGrit.evaluate(languageName, text, file, source)))
}

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
