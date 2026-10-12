import java.lang.System
use Fs.FileRead
use Fs.FileWrite

/// The declared locale and encoding boundary laws (`VAL-LOC-004`, `VAL-RUN-004`).
///
/// The pinned corpus carries arbitrary valid UTF-8 source paths: the Svelte kit
/// worlds ship `routes/encoded/反应.svelte` and `苗条.svelte`. A JVM derives its
/// filesystem encoding (`sun.jnu.encoding`) from the process locale; under the
/// C/POSIX locale that value is `ANSI_X3.4-1968`, and `Path.of` then rejects any
/// path that is not representable in ASCII. The repair names one explicit
/// locale boundary (`C.UTF-8`, provided by glibc itself from 2.35 on) for both
/// the launcher's own JVM and the inner step, and changes nothing about the
/// filenames or the source bytes.
///
/// These laws observe the boundary the pinned engine actually ran under and
/// exercise a real non-ASCII path end to end, so a regression to a non-UTF-8
/// boundary fails here instead of silently dropping a source. They are
/// separating: run with the boundary set to the C locale they fail, and run with
/// the declared `C.UTF-8` locale they pass. The same laws run under the portable
/// remote route and under the host namespace route.
///
/// They are corpus-free: no world, no Grit and no evaluator artifact is touched.

@Test
def theJvmRunsUnderTheDeclaredUtf8LocaleBoundary(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = "UTF-8", System.getProperty("sun.jnu.encoding"));
    Assert.assertEq(expected = "UTF-8", System.getProperty("file.encoding"))
}

@Test
def aNonAsciiNameIsNotAsciiAndAnAsciiNameIs(): Unit \ Assert = {
    Assert.assertEq(expected = false, String.isAscii("routes/encoded/反应.svelte"));
    Assert.assertEq(expected = true, String.isAscii("routes/encoded/plain.svelte"))
}

@Test
def aNonAsciiPathRoundTripsThroughTheRealFilesystem(): Unit \ {Assert, IO} = {
    let name = "反应-苗条.svelte";
    let content = "encoded route fixture\n";
    let written = FileWrite.runWithIO(_unit -> Result.isOk(FileWrite.write({str = content}, name)));
    Assert.assertEq(expected = true, written);
    let read = Result.getWithDefault("", FileRead.runWithIO(_unit -> FileRead.read(name)));
    Assert.assertEq(expected = content, read)
}
