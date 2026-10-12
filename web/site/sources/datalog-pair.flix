// Actual source · ReadmeCorrespondence.flix
// /home/becker/projects/attune/attune/test/docs/ReadmeCorrespondence.flix:114-123
// Source SHA-256: 7fb2da641b8c44bd98372db26de6cff72b22d7c540307e24de708561b0f74cd8
def pairRules(): #{
    Imports(String, String, String),
    Pair(String, String, String, String)
} = #{
    Pair(s, a, b, center) :-
        Imports(s, a, center),
        Imports(s, b, center),
        if (a != b).
}

