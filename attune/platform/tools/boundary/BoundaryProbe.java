package attune.tools.boundary;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

/**
 * Mechanical boundary evidence.
 *
 * <p>It runs inside the declared pinned {@code unshare} user/network namespace
 * and records raw kernel facts: the run and host network-namespace identities,
 * the effective uid, the interface list, whether a default route exists, whether
 * an outbound socket connect is denied, and the environment keys. It never
 * contacts an application endpoint and makes no isolation verdict; the
 * Flix-owned isolation assertions read this record and decide whether the
 * boundary is the declared one.
 */
final class BoundaryProbe {
    private BoundaryProbe() {}

    static void write(Path output, String hostNetns) throws IOException {
        List<String> lines = new ArrayList<>();
        lines.add("host_netns=" + hostNetns);
        lines.add("run_netns=" + readLink("/proc/self/ns/net"));
        lines.add("uid=" + uid());
        lines.add("dev=" + String.join(",", interfaces()));
        lines.add("default_route=" + (defaultRoute() ? "yes" : "no"));
        lines.add("connect_denied=" + (connectDenied() ? "true" : "false"));
        lines.add("env=" + String.join(",", envKeys()));
        Files.write(output, lines, StandardCharsets.UTF_8);
    }

    private static String uid() {
        try {
            for (String line : Files.readString(Path.of("/proc/self/status"), StandardCharsets.UTF_8)
                    .split("\n")) {
                if (line.startsWith("Uid:")) {
                    return line.split("\\s+")[1];
                }
            }
        } catch (IOException | NumberFormatException ignored) {
            // Fall through to the shell-free default below.
        }
        return "-1";
    }

    private static String readLink(String path) {
        try {
            return Files.readSymbolicLink(Path.of(path)).toString();
        } catch (IOException exception) {
            return "unavailable";
        }
    }

    private static List<String> interfaces() {
        List<String> names = new ArrayList<>();
        try {
            for (String line : Files.readAllLines(Path.of("/proc/net/dev"))) {
                int colon = line.indexOf(':');
                if (colon > 0) {
                    names.add(line.substring(0, colon).trim());
                }
            }
        } catch (IOException ignored) {
            // No interfaces readable; the empty list is itself evidence.
        }
        return names;
    }

    private static boolean defaultRoute() {
        try {
            List<String> lines = Files.readAllLines(Path.of("/proc/net/route"));
            for (int index = 1; index < lines.size(); index++) {
                String[] fields = lines.get(index).trim().split("\\s+");
                if (fields.length > 1 && fields[1].equals("00000000")) {
                    return true;
                }
            }
        } catch (IOException ignored) {
            // An unreadable routing table means no usable host route.
        }
        return false;
    }

    private static boolean connectDenied() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("1.1.1.1", 443), 1500);
            return false;
        } catch (IOException denied) {
            return true;
        }
    }

    private static List<String> envKeys() {
        return new ArrayList<>(new TreeSet<>(System.getenv().keySet()));
    }
}
