use Attune.Policy

/// Honest-count laws for the compact Attune policy.
///
/// These are compiled with the policy's own pure counting functions and then
/// executed under the isolated runtime, so the counting rules are enforced by
/// real assertions rather than described in prose: a comment-only change cannot
/// move the code count, a trailing comment or a comment-like string still
/// counts as code, a recognised Starlark docstring is documentation, and a
/// documented mention of a forbidden token is not embedded executable code.
def main(): Unit \ {IO, Assert} = {
    // Comment-only changes leave the code count unchanged.
    let before = "let x = 1;\nlet y = 2;\n";
    let after = "// why x\nlet x = 1;\n/* why y */\nlet y = 2;\n";
    Assert.assertEq(expected = 2, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, before)));
    Assert.assertEq(expected = 2, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, after)));
    Assert.assertEq(expected = 2, Attune.Policy.commentOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, after)));

    // A trailing comment is code, not a comment-only line.
    let trailing = "let x = 1; // note\n";
    Assert.assertEq(expected = 1, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, trailing)));
    Assert.assertEq(expected = 0, Attune.Policy.commentOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, trailing)));

    // A comment-like string is code.
    let stringy = "let url = \"a//b\";\n";
    Assert.assertEq(expected = 1, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, stringy)));
    Assert.assertEq(expected = 0, Attune.Policy.commentOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, stringy)));

    // A multi-line block comment is commented, not coded.
    let blocked = "/*\n * explanation\n */\n";
    Assert.assertEq(expected = 0, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, blocked)));
    Assert.assertEq(expected = 3, Attune.Policy.commentOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, blocked)));

    // A Java javadoc block is documentation, not code.
    let javadoc = "/**\n * Documents a file.\n */\n";
    Assert.assertEq(expected = 0, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Java, javadoc)));
    Assert.assertEq(expected = 3, Attune.Policy.docOf(Attune.Policy.countLines(Attune.Policy.Language.Java, javadoc)));

    // A recognised Starlark module docstring is documentation; a triple-quoted
    // string used as a value stays code.
    let docstring = "\"\"\"A rule module.\nStill the docstring.\n\"\"\"\ndef f():\n    return 1\n";
    Assert.assertEq(expected = 2, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Starlark, docstring)));
    Assert.assertEq(expected = 3, Attune.Policy.docOf(Attune.Policy.countLines(Attune.Policy.Language.Starlark, docstring)));

    let value = "x = \"\"\"value\nvalue\"\"\"\n";
    Assert.assertEq(expected = 2, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Starlark, value)));

    // Blank lines are counted separately from code.
    let spaced = "let x = 1;\n\nlet y = 2;\n";
    Assert.assertEq(expected = 2, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, spaced)));
    Assert.assertEq(expected = 1, Attune.Policy.blankOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, spaced)));

    // Prose in a markdown file is documentation rather than code, and an
    // apostrophe in it is not a string literal: an unbalanced quote must never
    // silence the lines that follow it, because silencing them is how a count
    // hides content instead of reporting it.
    let prose = "# Title\n\nIt's prose.\n\nMore prose.\n";
    Assert.assertEq(expected = 0, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Markdown, prose)));
    Assert.assertEq(expected = 3, Attune.Policy.docOf(Attune.Policy.countLines(Attune.Policy.Language.Markdown, prose)));
    Assert.assertEq(expected = 2, Attune.Policy.blankOf(Attune.Policy.countLines(Attune.Policy.Language.Markdown, prose)));

    // A shell-style comment in a dotfile is a comment, not code, while the
    // unbalanced apostrophes around it still leave every real line counted.
    let dotfile = "# one job only\nbuild --jobs=1\nkey = 'a\nkey = 'b\n";
    Assert.assertEq(expected = 3, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Other, dotfile)));
    Assert.assertEq(expected = 1, Attune.Policy.commentOf(Attune.Policy.countLines(Attune.Policy.Language.Other, dotfile)));
    Assert.assertEq(expected = 0, Attune.Policy.blankOf(Attune.Policy.countLines(Attune.Policy.Language.Other, dotfile)));

    // A documented mention of a forbidden token is not embedded executable
    // code, so comment stripping is what keeps the content rule honest.
    let token = "run" + "_" + "shell";
    let mention = "// " + token + " is forbidden here\nlet x = 1;\n";
    Assert.assertFalse(String.contains(substr = token, Attune.Policy.codeText(Attune.Policy.Language.Flix, mention)));
    Assert.assertEq(expected = 1, Attune.Policy.codeOf(Attune.Policy.countLines(Attune.Policy.Language.Flix, mention)));

    println("policy-count-law-ok")
}
