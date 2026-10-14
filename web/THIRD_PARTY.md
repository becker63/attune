# Runtime distribution

The browser receives compiled Flix application/runtime classes and TeaVM's generated
WASM GC runtime. Grit and its maintained Tree-sitter grammars run in a separate,
statically linked server executable. The WASM Grit binding is a test oracle only.
It receives neither the Flix compiler nor LangChain4j, provider SDKs, native FFM,
or repository executables.

- [Flix 0.76.1](https://github.com/flix/flix/tree/v0.76.1): Apache-2.0.
- [TeaVM 0.16.0](https://github.com/konsoletyper/teavm/tree/0.16.0): Apache-2.0.
- [Grit, pinned commit](https://github.com/getgrit/gritql/tree/c80b3026471b229f41b279c3eb0c162dcdacfdb1): MIT.
- [Tree-sitter](https://github.com/tree-sitter/tree-sitter): MIT. Browser binding
  and grammar versions are frozen by `pnpm-lock.yaml` and the Grit source pin.
- The server executable links musl 1.2.6 from the pinned LLVM Bazel toolchain.
  Its [copyright and license notice](licenses/musl-COPYRIGHT.txt) is distributed
  with the other runtime notices. It requires no system dynamic loader.
- [Shiki 4.5.0](https://shiki.style/guide/bundles): MIT; only JS/JSX/TS/TSX
  grammars, the JavaScript regex engine and GitHub Dark theme are bundled.
- [react-pprof 1.5.1](https://github.com/platformatic/react-pprof): Apache-2.0;
  [pprof-format 2.3.2](https://github.com/DataDog/pprof-format): MIT.
- [Cosmograph 2.5.1](https://cosmograph.app/docs-lib/features/clustering/):
  CC-BY-NC-4.0. Studio uses its current clustering and label APIs, preserves its
  attribution, and distributes its license. The earlier research pages retain
  `site/vendor/cosmograph.js` and `/vendor/cosmograph.js.LEGAL.txt`.
- [DuckDB WASM 1.32.0](https://github.com/duckdb/duckdb-wasm/tree/v1.32.0): MIT;
  [Apache Arrow 17.0.0](https://github.com/apache/arrow/tree/apache-arrow-17.0.0):
  Apache-2.0 with bundled third-party notices. Cosmograph uses these for display
  records. Their database performs no Attune admission or ranking. Its 33 MiB
  WASM and worker are served by this site, separately from Flix and Grit.
- Next.js, React and esbuild: MIT; exact versions in `pnpm-lock.yaml`.

Cosmograph's default production telemetry sends its provider the page hostname,
browser user-agent, and graph row/column counts. It does not send file paths,
source or questions. Its upstream implementation skips localhost. `disableLogging`
only controls console logging; it does not disable this telemetry.

The deployment carries license notices under `/licenses/`. Registry dependency
checksums are recorded in `../attune/platform/browser/grit-Cargo.lock` and its
generated Bazel lock; JVM dependencies are pinned
separately in `../attune/browser_maven_install.json`. Generated artifacts stay out
of the authored source tree. `pnpm artifacts` rebuilds them from pinned inputs.
