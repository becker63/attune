// Source: attune/src/Attune/Study/Qwen.flix:198–202
// Source SHA-256: 2233079fe110d58aca47a7cd202977b6539dad0628b85f3cc5a10df9577c6b78
    pub def admitsAs(stored: Row, candidate: Row): Bool =
        match Study.accept(artifactOf(stored), artifactOf(candidate)) {
            case Ok(_)  => true
            case Err(_) => false
        }
