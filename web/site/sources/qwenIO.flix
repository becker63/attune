// Source: attune/src/Attune/../../test/localization_qwen/QwenStages.flix:63–67
// Source SHA-256: bd55de33c028b2168faafcae8e83a4e476eaa6d7d77bcfa95f0f918b97f7308e
def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))
