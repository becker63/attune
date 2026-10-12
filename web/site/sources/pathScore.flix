// Source: attune/src/Attune/Study.flix:2987–2990
// Source SHA-256: 817edf715933fe0e7661f2fae4d6e032efc761641fc5138b1d48ffb9aed29f8b
    pub def lexicalPriorScore(issueTokens: List[String], path: String): Int32 = {
        let pathTokens = lexicalTokens(path);
        List.foldLeft((score, token) -> if (List.memberOf(token, pathTokens)) score + 1 else score, 0, issueTokens)
    }
