// Source: attune/src/Attune/Study/Qwen.flix:182–187
// Source SHA-256: 2233079fe110d58aca47a7cd202977b6539dad0628b85f3cc5a10df9577c6b78
    pub def artifactOf(row: Row): Study.Artifact = {
        schema = Study.Schema.Embedding,
        producer = row#modelRevision + "|" + row#recipe,
        input = row#inputSha,
        payload = row#values
    }
