// Source: attune/src/Attune/Study.flix:2968–2981
// Source SHA-256: 817edf715933fe0e7661f2fae4d6e032efc761641fc5138b1d48ffb9aed29f8b
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
