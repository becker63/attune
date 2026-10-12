eff EmbeddingRequest {
    def vectorForIssue(): List[Float64]
}

// Deliberately invalid: a pure function cannot request outside work.
def pretendToBePure(): List[Float64] = EmbeddingRequest.vectorForIssue()
