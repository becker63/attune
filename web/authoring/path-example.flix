// Exact helper bodies copied from current Study.flix:2968–2990 and 3156–3163.
// Authored tests below; no corpus, extraction or model call.
mod PathExample {
    pub def lexicalTokens(text: String): List[String] =
        List.distinct(List.filter(token -> String.length(token) >= 3, tokenize(String.toList(String.toLowerCase(text)), "", Nil)))

    def tokenize(chars: List[Char], current: String, acc: List[String]): List[String] = match chars {
        case Nil => flushToken(current, acc)
        case c :: rest =>
            if (isTokenChar(c)) tokenize(rest, current + "${c}", acc)
            else tokenize(rest, "", flushToken(current, acc))
    }

    def flushToken(current: String, acc: List[String]): List[String] =
        if (String.isEmpty(current)) acc else current :: acc

    def isTokenChar(c: Char): Bool = Char.isLetterOrDigit(c) or c == '_'

    /// The deterministic lexical prior score of one candidate path against one
    /// issue text: the number of distinct issue tokens that occur as a whole token
    /// of the candidate path. The path is read with the same declared vocabulary,
    /// so the score is reproducible and no score is invented.
    pub def lexicalPriorScore(issueTokens: List[String], path: String): Int32 = {
        let pathTokens = lexicalTokens(path);
        List.foldLeft((score, token) -> if (List.memberOf(token, pathTokens)) score + 1 else score, 0, issueTokens)
    }

    def rankKey(entry: (String, Int32)): String = match entry {
        case (path, score) => padScore(99999999 - score) + "\t" + path
    }

    def padScore(value: Int32): String = {
        let text = Int32.toString(value);
        String.repeat(8 - String.length(text), "0") + text
    }

    @Test
    def wordsScoresAndTies(): Unit \ Assert = {
        let issue = lexicalTokens("receipt total incorrect");
        let paths = List#{"src/receipt_total.ts", "src/receiptTotal.ts", "src/pricing.ts", "src/receipt.ts", "src/receipt/total.ts"};
        let scored = List.map(path -> (path, lexicalPriorScore(issue, path)), paths);
        Assert.assertEq(expected = Set#{"receipt", "total", "incorrect"}, List.toSet(issue));
        Assert.assertEq(expected = List#{("src/receipt/total.ts", 2), ("src/receipt.ts", 1), ("src/pricing.ts", 0), ("src/receiptTotal.ts", 0), ("src/receipt_total.ts", 0)}, List.sortBy(rankKey, scored));
        Assert.assertEq(expected = Set#{"src", "receipttotal"}, List.toSet(lexicalTokens("src/receiptTotal.ts")));
        Assert.assertEq(expected = Set#{"src", "receipt_total"}, List.toSet(lexicalTokens("src/receipt_total.ts")));
        Assert.assertEq(expected = Set#{"café"}, List.toSet(lexicalTokens("CAFÉ café.ts")))
    }
}
