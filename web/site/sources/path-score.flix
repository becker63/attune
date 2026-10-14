    pub def lexicalPriorScore(issueTokens: List[String], path: String): Int32 = {
        let pathTokens = lexicalTokens(path);
        List.foldLeft((score, token) -> if (List.memberOf(token, pathTokens)) score + 1 else score, 0, issueTokens)
    }
