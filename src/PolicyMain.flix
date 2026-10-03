/// Executable entry point for the compact Attune v2 policy evaluator.
///
/// The evaluation itself lives in `Attune.Policy`; this file only gives the
/// compiled program a root-module `main`, because a fat JAR is launched as a
/// standalone JVM and never through `flix run/test`.
def main(): Unit \ IO = Attune.Policy.check()
