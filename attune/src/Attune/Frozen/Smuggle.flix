/// The anti-smuggling content scan: pure string analysis of allowed-carrier
/// bytes, specified by the retained adversarial corpus.
///
/// Every detector reads file content as inert data and reports a finding or
/// nothing. Nothing here executes, evaluates, or parses-as-code the scanned
/// content; the only compilers involved are the pinned Flix compiler and the
/// pinned Nix parser invoked by Attune.Frozen.Check, and both run in
/// check/parse modes that never evaluate the proposed tree.
pub mod Attune.Frozen.Smuggle {

    use Attune.Frozen
    use Attune.Frozen.Finding

    /// File extensions whose presence as a generation-sink output name means
    /// an allowed-language carrier is laundering an executable program.
    pub def executableSinkExtension(path: String): Bool =
        List.memberOf(Frozen.extension(path), List#{
            "py", "nim", "rs", "ts", "tsx", "js", "mjs", "java", "rb", "sh"
        })

    /// The nix constructors that write a derived file into the store. These
    /// are the laundering sinks for hidden programs; their output name must
    /// never be an executable-language artifact.
    def sinkConstructors(): List[String] = List#{
        "writeText", "writeScript", "writeScriptBin", "writeExecutable",
        "writeShellScript", "writeShellScriptBin"
    }

    /// Quoted-string endings that mark a forbidden sink output name. A nix
    /// string literal always closes with a quote, so `.py"` matches a quoted
    /// name like `"hidden.py"` and not a prose mention of the extension.
    def sinkNameMarkers(): List[String] = List.map(ext -> "." + ext + "\"", List#{
        "py", "nim", "rs", "ts", "tsx", "js", "mjs", "java", "rb", "sh"
    })

    /// Starlark has no dynamic-execution surface: any of these markers in a
    /// .bzl is foreign controller or downloader text, not Starlark. Repository
    /// rules execute only declared pinned tools (git, unshare); downloading
    /// from a Starlark action is a dynamic-download-eval attempt.
    def starlarkExecMarkers(): List[String] = List#{
        "os.system(", "subprocess.", "urllib", "requests.", "eval(\"", "exec(\"",
        "curl", "wget"
    }

    /// The one unambiguous whole-program Python signature: an executable
    /// main guard. Prose that merely discusses Python never carries one.
    def mainGuardMarker(): String = "if __name__ =="

    /// Whether any line of the content opens with a shell shebang.
    def hasShebang(content: String): Bool =
        List.exists(line -> String.startsWith(prefix = "#!", line), String.lines(content))

    def containsAny(markers: List[String], content: String): Bool =
        List.exists(marker -> String.contains({substr = marker}, content), markers)

    /// One carrier file's content shapes. `path` is used only for reporting;
    /// the scan never re-reads or executes anything.
    pub def scanCarrier(path: String, content: String): List[Finding] = {
        let shebang =
            if (hasShebang(content))
                List#{Finding.SmuggledContent(path, "shebang-in-allowed-carrier")}
            else Nil;
        let sink =
            if (containsAny(sinkConstructors(), content) and containsAny(sinkNameMarkers(), content))
                List#{Finding.SmuggledContent(path, "generation-sink-forbidden-extension")}
            else Nil;
        let downloadEval =
            if (String.contains({substr = "import (builtins.fetch"}, content) or
                String.contains({substr = "import (fetch"}, content) or
                (String.contains({substr = "builtins.fetchGit"}, content) and not String.contains({substr = "rev =" }, content)))
                List#{Finding.SmuggledContent(path, "dynamic-download-eval")}
            else Nil;
        let starlarkExec =
            if (Frozen.extension(path) == "bzl" and containsAny(starlarkExecMarkers(), content))
                List#{Finding.SmuggledContent(path, "dynamic-exec-in-starlark")}
            else Nil;
        let mainGuard =
            if (String.contains({substr = mainGuardMarker()}, content))
                List#{Finding.SmuggledContent(path, "python-main-guard-in-carrier")}
            else Nil;
        shebang ++ sink ++ downloadEval ++ starlarkExec ++ mainGuard
    }
}
