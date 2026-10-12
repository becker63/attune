// Source: attune/src/Attune/Repository.flix:579–582
// Source SHA-256: 985d59d523e740bd320440ff2c4e211df6edd1d53e722efb04f7b201c972f5f3
    def importCandidates(base: String): List[String] = {
        let suffixes = ".ts" :: ".tsx" :: ".js" :: ".jsx" :: ".mts" :: ".cts" :: ".mjs" :: ".cjs" :: Nil;
        base :: (List.map(suffix -> base + suffix, suffixes) ::: List.map(suffix -> base + "/index" + suffix, suffixes))
    }
