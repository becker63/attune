/// The Flix-owned isolation assertions.
///
/// The mechanical boundary records raw kernel and environment facts from inside
/// the declared pinned `unshare` user/network namespace: the run and host
/// network-namespace identities, the effective uid, the interface list, whether
/// a default route exists, whether an outbound socket connect was denied and the
/// environment keys. This module owns the meaning: it decides whether that
/// record is the declared isolated boundary or an unisolated host.
pub mod Attune.Isolation {

    /// One boundary record: the ordered key/value facts the probe wrote.
    pub enum Facts with Eq {
        case Facts(List[(String, String)])
    }

    /// The environment keys an isolated native test may carry. The pinned JDK
    /// injects `LD_LIBRARY_PATH` for its own home, so it is admitted.
    def allowlist(): List[String] = "HOME" :: "PATH" :: "LANG" :: "LD_LIBRARY_PATH" :: Nil

    /// Names that must never appear in an isolated test environment.
    def sensitiveMarkers(): List[String] =
        "KEY" :: "TOKEN" :: "SECRET" :: "CREDENTIAL" :: "PASSWORD" :: "AUTH" :: Nil

    def hasInfix(needle: String, s: String): Bool = String.contains(substr = needle, s)

    def parseLine(line: String): Option[(String, String)] =
        match String.split(regex = "=", line) {
            case key :: value :: Nil => Some((key, value))
            case _ => None
        }

    /// Parse the probe's `key=value` record.
    pub def parse(text: String): Facts =
        Facts.Facts(List.filterMap(parseLine, String.lines(text)))

    def lookup(key: String, entries: List[(String, String)]): Option[String] =
        match entries {
            case Nil => None
            case (k, v) :: rest => if (k == key) Some(v) else lookup(key, rest)
        }

    pub def get(f: Facts, key: String): Option[String] =
        match f { case Facts.Facts(entries) => lookup(key, entries) }

    def value(f: Facts, key: String): String =
        Option.getWithDefault("", get(f, key))

    /// The test ran in a distinct network namespace from the invoking process.
    pub def distinctNamespaces(f: Facts): Bool =
        let host = value(f, "host_netns");
        let inside = value(f, "run_netns");
        not String.isEmpty(host) and not String.isEmpty(inside)
            and host != "unavailable" and inside != "unavailable" and host != inside

    /// The mapped user namespace makes the test run as uid 0.
    pub def runsAsRoot(f: Facts): Bool = value(f, "uid") == "0"

    /// A fresh network namespace has no default route.
    pub def noDefaultRoute(f: Facts): Bool = value(f, "default_route") == "no"

    /// Only the loopback interface exists inside the boundary.
    pub def loopbackOnly(f: Facts): Bool = value(f, "dev") == "lo"

    /// An outbound socket connect was denied.
    pub def socketDenied(f: Facts): Bool = value(f, "connect_denied") == "true"

    /// The environment keys the probe recorded, split from the `env` fact.
    def environmentKeys(f: Facts): List[String] =
        List.filter(s -> not String.isEmpty(s), String.split(regex = ",", value(f, "env")))

    /// Every environment key is on the allowlist and the required ones are present.
    pub def environmentAllowlisted(f: Facts): Bool =
        let actual = environmentKeys(f);
        not List.exists(k -> not List.memberOf(k, allowlist()), actual)
            and List.memberOf("HOME", actual) and List.memberOf("PATH", actual)
            and List.memberOf("LANG", actual)

    /// No environment key carries a sensitive-looking name.
    pub def environmentHasNoSensitiveNames(f: Facts): Bool =
        not List.exists(k -> List.exists(marker -> hasInfix(marker, k), sensitiveMarkers()), environmentKeys(f))

    /// The whole declared boundary holds.
    pub def holds(f: Facts): Bool =
        distinctNamespaces(f) and runsAsRoot(f) and noDefaultRoute(f) and loopbackOnly(f)
            and socketDenied(f) and environmentAllowlisted(f) and environmentHasNoSensitiveNames(f)
}
