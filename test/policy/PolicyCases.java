package attune.tools.policy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * The named negative policy fixtures.
 *
 * <p>Each case materialises a small authored workspace in a temporary
 * directory, runs the real Flix-owned policy through the minimal Java boundary,
 * and requires the exact verdict and rule. Two cases (symlink escape and a newly
 * ignored forbidden file after a green run) can only be expressed against a live
 * tree, which is why the audit is a separate uncached read-only surface rather
 * than a declared inventory.
 *
 * <p>Forbidden payloads live in the authored fixture data, not in this source,
 * so the policy's own content rules never have to exempt this file.
 */
public final class PolicyCases {
    private static Path payloads;
    private static String policyJar;
    private static int failures;

    private PolicyCases() {}

    public static void main(String[] args) throws Exception {
        payloads = PolicyVerdict.resolve(requireProperty("attune.fixtures")).getParent();
        policyJar = requireProperty("attune.policy.jar");

        greenDeclared();
        greenAudit();
        forbiddenSuffix();
        embeddedScript();
        rawHttp();
        referenceSource();
        missingComment();
        missingCoreDoc();
        orphanedSource();
        nestedBuildEscape();
        symlinkEscape();
        ignoredAfterGreen();
        admittedExceptions();
        foreignAlgorithmSuffix();

        if (failures > 0) {
            System.err.println(failures + " policy case(s) failed");
            System.exit(1);
        }
        System.out.println("policy-cases-ok");
    }

    // ------------------------------------------------------------------ cases

    /** The authored green workspace accepts the declared policy. */
    private static void greenDeclared() throws Exception {
        Path root = green(true);
        expect("green-declared", declaredRun(root, "accept", ""), 0);
    }

    /** The same authored green workspace accepts the live audit. */
    private static void greenAudit() throws Exception {
        Path root = green(true);
        expect("green-audit", auditRun(root, "accept", ""), 0);
    }

    /** An authored executable suffix is rejected with its path and rule. */
    private static void forbiddenSuffix() throws Exception {
        Path root = green(true);
        payload(root, "deploy.sh.txt", "tools/deploy.sh");
        expect("forbidden-suffix", declaredRun(root, "reject", "forbidden-suffix"), 0);
    }

    /** An embedded shell action in executable code is rejected. */
    private static void embeddedScript() throws Exception {
        Path root = green(true);
        payload(root, "rule.bzl.txt", "build/rule.bzl");
        expect("embedded-script", declaredRun(root, "reject", "embedded-script"), 0);
    }

    /** A raw HTTP client substituted for the approved SDK is rejected. */
    private static void rawHttp() throws Exception {
        Path root = green(true);
        payload(root, "Boundary.java.txt", "src/Attune/Boundary.java");
        expect("raw-http", declaredRun(root, "reject", "raw-http"), 0);
    }

    /** Read-only reference source is never admissible as parent source. */
    private static void referenceSource() throws Exception {
        Path root = green(true);
        payload(root, "Atlas.flix.txt", "attuneflix/src/Atlas.flix");
        expect("reference-source", declaredRun(root, "reject", "reference-source"), 0);
    }

    /** A public module without its required documentation comment is rejected. */
    private static void missingComment() throws Exception {
        Path root = green(true);
        payload(root, "Undocumented.flix.txt", "src/Attune/Undocumented.flix");
        expect("missing-comment", declaredRun(root, "reject", "required-comment"), 0);
    }

    /** A missing required core document is rejected. */
    private static void missingCoreDoc() throws Exception {
        Path root = green(false);
        expect("missing-core-doc", declaredRun(root, "reject", "required-doc"), 0);
    }

    /** Source no BUILD file admits is orphaned. */
    private static void orphanedSource() throws Exception {
        Path root = green(true);
        write(root, "src/Attune/Orphan.flix", "/// An unadmitted module.\npub mod Attune.Orphan {\n}\n");
        expect("orphaned-source", auditRun(root, "reject", "orphaned-source"), 0);
    }

    /** A nested BUILD entry escaping its own package directory is rejected. */
    private static void nestedBuildEscape() throws Exception {
        Path root = green(true);
        write(root, "src/sub/BUILD.bazel",
                "filegroup(\n    name = \"sub\",\n    srcs = [\"../Secret.java\"],\n)\n");
        expect("nested-build-escape", auditRun(root, "reject", "nested-build-escape"), 0);
    }

    /** A symbolic link resolving outside the audited workspace is rejected. */
    private static void symlinkEscape() throws Exception {
        Path root = green(true);
        Path outside = Files.createTempDirectory("attune-policy-outside-");
        Path target = outside.resolve("outside.flix");
        Files.writeString(target, "/// Outside the workspace.\npub mod Outside {\n}\n");
        Files.createSymbolicLink(root.resolve("src/escape.flix"), target);
        expect("symlink-escape", auditRun(root, "reject", "symlink-escape"), 0);
    }

    /** A forbidden file added after a green run is detected live, uncached. */
    private static void ignoredAfterGreen() throws Exception {
        Path root = green(true);
        expect("ignored-before", auditRun(root, "accept", ""), 0);
        payload(root, "deploy.sh.txt", "tools/deploy.sh");
        expect("ignored-after-green", auditRun(root, "reject", "ignored-forbidden"), 0);
    }

    /**
     * The exact admitted exceptions stay admissible: inherited support, a future
     * approved test-only proposal, a maintained Grit query and Ruby
     * source-as-data, each admitted by a BUILD file and each accepted even where
     * its content would otherwise be forbidden.
     */
    private static void admittedExceptions() throws Exception {
        Path root = green(true);
        write(root, "support/inherited/Widget.java",
                "package support.inherited;\n"
                        + "\n"
                        + "import java.net.HttpURLConnection;\n"
                        + "\n"
                        + "final class Widget {\n"
                        + "    private Widget() {}\n"
                        + "\n"
                        + "    static Object inherited() {\n"
                        + "        return HttpURLConnection.class;\n"
                        + "    }\n"
                        + "}\n");
        write(root, "support/BUILD.bazel",
                "filegroup(\n    name = \"inherited\",\n    srcs = [\"inherited/Widget.java\"],\n)\n");
        write(root, "test/proposals/p01/Proposal.flix",
                "/// A future approved test-only proposal.\npub mod Attune.Proposal01 {\n}\n");
        write(root, "test/proposals/p01/BUILD.bazel",
                "filegroup(\n    name = \"proposal\",\n    srcs = [\"Proposal.flix\"],\n)\n");
        write(root, "tools/queries/attune.grit",
                "language java\n`HttpURLConnection` => `ApprovedSdk`\n");
        write(root, "tools/queries/BUILD.bazel",
                "filegroup(\n    name = \"queries\",\n    srcs = [\"attune.grit\"],\n)\n");
        write(root, "test/data/sample.rb", "# source as data\nputs 'sample'\n");
        write(root, "test/data/BUILD.bazel", "exports_files([\"sample.rb\"])\n");
        expect("admitted-exceptions", auditRun(root, "accept", ""), 0);
    }

    /** A new Rust, C or Scala algorithm is not one of the admitted exceptions. */
    private static void foreignAlgorithmSuffix() throws Exception {
        Path root = green(true);
        write(root, "src/Attune/Codec.rs", "fn main() {}\n");
        expect("foreign-algorithm-suffix", declaredRun(root, "reject", "forbidden-suffix"), 0);
    }

    // ------------------------------------------------------------- workspaces

    private static Path green(boolean withReadme) throws Exception {
        Path root = Files.createTempDirectory("attune-policy-green-");
        write(root, "README.md", "# Fixture workspace\n", withReadme);
        write(root, "AGENTS.md", "# Fixture policy\n", true);
        write(root, "DESIGN.md", "# Fixture design\n", true);
        write(root, "PROVENANCE.md", "# Fixture provenance\n", true);
        write(root, "LICENSE", "Fixture license text\n", true);
        write(root, "BUILD.bazel", "package(default_visibility = [\"//visibility:public\"])\n", true);
        write(root, "MODULE.bazel", "module(\n    name = \"fixture\",\n    version = \"0.0.0\",\n)\n", true);
        write(root, "src/Attune.flix", "/// The fixture module root.\npub mod Attune {\n}\n", true);
        write(root, "src/BUILD.bazel",
                "filegroup(\n    name = \"root\",\n    srcs = [\"Attune.flix\"],\n)\n", true);
        return root;
    }

    private static void write(Path root, String relative, String content) throws IOException {
        write(root, relative, content, true);
    }

    private static void write(Path root, String relative, String content, boolean include) throws IOException {
        if (!include) {
            return;
        }
        Path path = root.resolve(relative);
        Files.createDirectories(path.getParent());
        Files.writeString(path, content);
    }

    private static void payload(Path root, String payloadName, String target) throws IOException {
        Path source = payloads.resolve(payloadName);
        Path path = root.resolve(target);
        Files.createDirectories(path.getParent());
        Files.writeString(path, Files.readString(source));
    }

    // ------------------------------------------------------------------ runs

    private static int declaredRun(Path root, String expect, String rule) throws Exception {
        Path manifest = Files.createTempFile("attune-policy-manifest-", ".tsv");
        List<String> lines = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(root)) {
            for (Path path : walk.filter(Files::isRegularFile).sorted().toList()) {
                lines.add(root.relativize(path) + "\t" + path.toAbsolutePath());
            }
        }
        Files.write(manifest, lines);
        return PolicyCheck.run(new String[] {
                "--mode", "declared",
                "--manifest", manifest.toString(),
                "--policy-jar", policyJar,
                "--expect", expect,
                "--rule", rule,
        });
    }

    private static int auditRun(Path root, String expect, String rule) throws Exception {
        return PolicyCheck.run(new String[] {
                "--mode", "audit",
                "--root", root.toString(),
                "--policy-jar", policyJar,
                "--expect", expect,
                "--rule", rule,
        });
    }

    private static void expect(String name, int actual, int expected) {
        if (actual == expected) {
            System.out.println("policy-case " + name + ": ok");
        } else {
            failures++;
            System.err.println("policy-case " + name + ": expected exit " + expected + ", got " + actual);
        }
    }

    private static String requireProperty(String key) {
        String value = System.getProperty(key);
        if (value == null || value.isEmpty()) {
            throw new IllegalStateException("missing system property " + key);
        }
        return value;
    }
}
