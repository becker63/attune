/// Inspect the local execution boundary through ordinary JVM APIs.
/// Missing kernel evidence is an error; it cannot establish isolation.
pub mod Attune.Isolation {
    import java.io.{File, IOException}
    import java.nio.file.Files
    import java.net.{Socket, InetSocketAddress}
    import java.lang.System

    pub type alias Facts = {
        host = String, inside = String, uid = String, interfaces = List[String],
        defaultRoute = Bool, connectionDenied = Bool, environment = List[String]
    }

    /// The launcher supplies only the parent namespace identity. All other
    /// evidence is observed here, inside the running Flix test's namespace.
    pub def observe(): Result[String, Facts] \ IO = try {
        let status = String.lines(Files.readString(new File("/proc/self/status").toPath()));
        let devices = String.lines(Files.readString(new File("/proc/net/dev").toPath()));
        let routes = String.lines(Files.readString(new File("/proc/net/route").toPath()));
        let users = List.filterMap(line -> match words(line) {
            case "Uid:" :: uid :: _ => Some(uid)
            case _ => None
        }, status);
        let socket = new Socket();
        let denied = try {
            socket.connect(new InetSocketAddress("1.1.1.1", 443), 1500);
            false
        } catch { case _: IOException => true };
        socket.close();
        Ok({
            host = System.getProperty("attune.hostNetns", ""),
            inside = Files.readSymbolicLink(new File("/proc/self/ns/net").toPath()).toString(),
            uid = List.join("", users),
            interfaces = List.filterMap(line -> match String.split(regex = ":", line) {
                case name :: _data :: Nil => Some(String.trim(name))
                case _ => None
            }, devices),
            defaultRoute = List.exists(line -> match words(line) {
                case _device :: destination :: _ => destination == "00000000"
                case _ => false
            }, routes),
            connectionDenied = denied,
            environment = List.map(name -> name.toString(), Array.toList(System.getenv().keySet().toArray()))
        })
    } catch { case _: IOException => Err("Cannot inspect the local isolation boundary.") }

    def words(line: String): List[String] = String.split(regex = "\\s+", String.trim(line))

    pub def holds(facts: Facts): Bool =
        facts#host != "" and facts#inside != "" and facts#host != facts#inside and
        facts#uid == "0" and facts#interfaces == List#{"lo"} and
        not facts#defaultRoute and facts#connectionDenied and
        List.forAll(name -> List.memberOf(name, List#{"HOME", "PATH", "LANG", "LD_LIBRARY_PATH"}), facts#environment) and
        List.forAll(name -> List.memberOf(name, facts#environment), List#{"HOME", "PATH", "LANG"})
}
