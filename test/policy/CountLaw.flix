use Attune.Policy.{Language, countLines, codeOf, commentOf, docOf, blankOf, codeText}

/// Honest-count laws for the compact Attune policy.
///
/// These run as native Flix tests against the policy's own pure counting
/// functions, so the counting rules are enforced by real assertions rather than
/// described in prose: a comment-only change cannot move the code count, a
/// trailing comment or a comment-like string still counts as code, a recognised
/// Starlark docstring is documentation, and a documented mention of a forbidden
/// token is not embedded executable code.

@Test
def commentOnlyChangesLeaveCodeCountUnchanged(): Unit \ Assert = {
    let before = "let x = 1;\nlet y = 2;\n";
    let after = "// why x\nlet x = 1;\n/* why y */\nlet y = 2;\n";
    Assert.assertEq(expected = 2, codeOf(countLines(Language.Flix, before)));
    Assert.assertEq(expected = 2, codeOf(countLines(Language.Flix, after)));
    Assert.assertEq(expected = 2, commentOf(countLines(Language.Flix, after)))
}

@Test
def trailingCommentAndCommentLikeStringStillCount(): Unit \ Assert = {
    let trailing = "let x = 1; // note\n";
    Assert.assertEq(expected = 1, codeOf(countLines(Language.Flix, trailing)));
    Assert.assertEq(expected = 0, commentOf(countLines(Language.Flix, trailing)));

    let stringy = "let url = \"a//b\";\n";
    Assert.assertEq(expected = 1, codeOf(countLines(Language.Flix, stringy)));
    Assert.assertEq(expected = 0, commentOf(countLines(Language.Flix, stringy)))
}

@Test
def blockCommentsAndJavadocAreNotCode(): Unit \ Assert = {
    let blocked = "/*\n * explanation\n */\n";
    Assert.assertEq(expected = 0, codeOf(countLines(Language.Flix, blocked)));
    Assert.assertEq(expected = 3, commentOf(countLines(Language.Flix, blocked)));

    let javadoc = "/**\n * Documents a file.\n */\n";
    Assert.assertEq(expected = 0, codeOf(countLines(Language.Java, javadoc)));
    Assert.assertEq(expected = 3, docOf(countLines(Language.Java, javadoc)))
}

@Test
def starlarkDocstringsAreDocumentation(): Unit \ Assert = {
    let docstring = "\"\"\"A rule module.\nStill the docstring.\n\"\"\"\ndef f():\n    return 1\n";
    Assert.assertEq(expected = 2, codeOf(countLines(Language.Starlark, docstring)));
    Assert.assertEq(expected = 3, docOf(countLines(Language.Starlark, docstring)));

    let value = "x = \"\"\"value\nvalue\"\"\"\n";
    Assert.assertEq(expected = 2, codeOf(countLines(Language.Starlark, value)))
}

@Test
def blankLinesAreCountedSeparately(): Unit \ Assert = {
    let spaced = "let x = 1;\n\nlet y = 2;\n";
    Assert.assertEq(expected = 2, codeOf(countLines(Language.Flix, spaced)));
    Assert.assertEq(expected = 1, blankOf(countLines(Language.Flix, spaced)))
}

@Test
def markdownProseIsDocumentationNotCode(): Unit \ Assert = {
    // An apostrophe in prose is not a string literal: an unbalanced quote must
    // never silence the lines that follow it, because silencing them is how a
    // count hides content instead of reporting it.
    let prose = "# Title\n\nIt's prose.\n\nMore prose.\n";
    Assert.assertEq(expected = 0, codeOf(countLines(Language.Markdown, prose)));
    Assert.assertEq(expected = 3, docOf(countLines(Language.Markdown, prose)));
    Assert.assertEq(expected = 2, blankOf(countLines(Language.Markdown, prose)))
}

@Test
def dotfileCommentsAreCommentsNotCode(): Unit \ Assert = {
    let dotfile = "# one job only\nbuild --jobs=1\nkey = 'a\nkey = 'b\n";
    Assert.assertEq(expected = 3, codeOf(countLines(Language.Other, dotfile)));
    Assert.assertEq(expected = 1, commentOf(countLines(Language.Other, dotfile)));
    Assert.assertEq(expected = 0, blankOf(countLines(Language.Other, dotfile)))
}

@Test
def documentedForbiddenTokenIsNotEmbeddedCode(): Unit \ Assert = {
    let token = "run" + "_" + "shell";
    let mention = "// " + token + " is forbidden here\nlet x = 1;\n";
    Assert.assertFalse(String.contains(substr = token, codeText(Language.Flix, mention)));
    Assert.assertEq(expected = 1, codeOf(countLines(Language.Flix, mention)))
}
