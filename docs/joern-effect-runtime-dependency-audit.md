# Joern Effect Runtime Dependency Audit

The current property/fuzzer runtime does not rely on tool-specific patches in the property harness. Joern CLI, CPG schema sources, astgen, Java, Node, pnpm, gzip, loader compatibility, certificates, and the astgen library path are modeled in the Nix toolchain, nix2container image, and Arion service environment.

If a future upstream binary needs another loader, library, or executable, add it to the Nix runtime closure or container contents rather than patching the fuzzer or property test tools at runtime.
