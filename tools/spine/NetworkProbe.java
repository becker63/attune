package attune.tools.spine;

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
 * Records kernel namespace and network-capability evidence from inside the
 * declared boundary. It is launched inside the pinned {@code unshare}
 * user/network namespace; it never contacts an application endpoint.
 */
public final class NetworkProbe {
    private NetworkProbe() {}

    public static void main(String[] args) throws Exception {
        System.out.println("uid=" + uid());
        System.out.println("netns=" + readLink("/proc/self/ns/net"));
        System.out.println("userns=" + readLink("/proc/self/ns/user"));
        System.out.println("dev=" + String.join(",", interfacesWithTraffic()));
        System.out.println("default_route=" + (defaultRoute() ? "yes" : "no"));
        System.out.println("connect_denied=" + (connectDenied() ? "true" : "false"));
        System.out.println("env=" + String.join(",", envKeys()));
        System.out.println("java_home=" + System.getProperty("java.home", ""));
        System.out.println("ld_library_path=" + System.getenv().getOrDefault("LD_LIBRARY_PATH", ""));
    }

    private static String uid() {
        return Integer.toString(uidFromProc());
    }

    private static int uidFromProc() {
        try {
            String status = Files.readString(Path.of("/proc/self/status"), StandardCharsets.UTF_8);
            for (String line : status.split("\n")) {
                if (line.startsWith("Uid:")) {
                    return Integer.parseInt(line.split("\\s+")[1]);
                }
            }
        } catch (IOException | NumberFormatException ignored) {
            // Fall through to the shell-free default below.
        }
        return -1;
    }

    private static String readLink(String path) {
        try {
            return Files.readSymbolicLink(Path.of(path)).toString();
        } catch (IOException exception) {
            return "unavailable";
        }
    }

    private static List<String> interfacesWithTraffic() {
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
            // Unreadable routing table means no usable host route.
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
