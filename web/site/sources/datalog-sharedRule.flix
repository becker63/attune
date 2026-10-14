// Actual source · the shared-import rule
// /home/becker/projects/attune/attune/test/docs/ReadmeCorrespondence.flix:118-121
// Source SHA-256: 7fb2da641b8c44bd98372db26de6cff72b22d7c540307e24de708561b0f74cd8
    Pair(s, a, b, center) :-
        Imports(s, a, center),
        Imports(s, b, center),
        if (a != b).
