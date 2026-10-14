// Source: attune/src/Attune/../../test/localization_qwen/QwenStages.flix:63–64
// Source SHA-256: bd55de33c028b2168faafcae8e83a4e476eaa6d7d77bcfa95f0f918b97f7308e
def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))
