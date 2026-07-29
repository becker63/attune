import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { chmod, copyFile, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import * as Path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import type { Code, Heading, Link, RootContent } from "mdast";
import { rolldown } from "rolldown";
import { createHighlighter } from "shiki";
import { ts } from "ts-morph";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { createMessageConnection, NullLogger } from "vscode-jsonrpc/node.js";

import { compileDocumentation, type DocumentationLanguage } from "./docs.ts";
import { read, type AttuneData } from "./read.ts";

type Data = { -readonly [K in keyof AttuneData]: AttuneData[K] };
type Pos = { readonly line: number; readonly character: number };
type Range = { readonly start: Pos; readonly end: Pos };
type Location = { readonly uri: string; readonly range: Range };
type Diagnostic = {
  readonly source?: string;
  readonly severity?: number;
  readonly code?: string | number;
  readonly range: Range;
};
type Virtual = { readonly name: string; readonly text: string; readonly from: number; readonly to: number };
type Visible = {
  readonly text: string;
  readonly errors: readonly number[];
  readonly ranges: readonly {
    readonly from: number;
    readonly to: number;
    readonly file: Virtual;
    readonly fileFrom: number;
  }[];
};

const repository = Path.resolve(import.meta.dirname, "../../..");
const treeEntry = "\0attune-docs-tree";
const identifiers = /[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*/gu;
const run = (command: string, args: string[], cwd = repository) =>
  execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
const load = (root: string, path: string) => readFileSync(Path.join(root, path), "utf8");
const lines = (value: string) => (value === "" ? 0 : value.split(/\r?\n/u).length - Number(/\r?\n$/u.test(value)));
const data = (node: RootContent): Data => {
  node.data ??= {};
  return (node.data.attune ??= {}) as Data;
};
const toPosition = (text: string, at: number): Pos => {
  const from = text.lastIndexOf("\n", at - 1) + 1;
  return { line: text.slice(0, from).split("\n").length - 1, character: at - from };
};
const toOffset = (text: string, position: Pos) => {
  let from = 0;
  for (let line = 0; line < position.line; line++) {
    const next = text.indexOf("\n", from);
    if (next < 0) throw new Error(`Invalid UTF-16 line ${position.line}`);
    from = next + 1;
  }
  const end = text.indexOf("\n", from);
  if (position.character > (end < 0 ? text.length : end) - from)
    throw new Error(`Invalid UTF-16 character ${position.character}`);
  return from + position.character;
};
const deadline = async <A>(promise: Promise<A>, label: string) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), 20_000);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};
const fatal = (file: VFile, reason: string, source: AttuneData = {}) => {
  const message = file.message(reason);
  message.fatal = true;
  if (source.sourcePath === undefined) return;
  message.file = source.sourcePath;
  message.name = `${source.sourcePath}:${source.sourceRange?.lineStart ?? 1}:1`;
  message.line = source.sourceRange?.lineStart;
  message.column = 1;
};
const lifecycleStates = new Set(["materialized", "active", "finalized"]);
const checkLifecycle = (
  parsed: ts.SourceFile,
  shownAt: (at: number) => number | undefined,
  links: readonly { readonly start: number; readonly end: number; readonly href: string }[],
  file: VFile,
  metadata: AttuneData,
) => {
  const inspect = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === "Investigation") {
      const start = shownAt(node.typeName.getStart(parsed));
      if (start !== undefined) {
        const href = links.find((link) => link.start === start && link.end === start + "Investigation".length)?.href;
        if (href !== "#Investigation")
          fatal(file, "Investigation lifecycle reference does not resolve to #Investigation", metadata);
        const state = node.typeArguments?.[0];
        if (node.typeArguments?.length !== 1)
          fatal(file, "Investigation lifecycle reference needs exactly one state", metadata);
        else if (
          state !== undefined &&
          ts.isLiteralTypeNode(state) &&
          ts.isStringLiteral(state.literal) &&
          !lifecycleStates.has(state.literal.text)
        )
          fatal(file, `Investigation state "${state.literal.text}" is not canonical`, metadata);
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(parsed);
};
const asLocations = (response: unknown): readonly Location[] =>
  (response == null ? [] : Array.isArray(response) ? response : [response]).flatMap((value) => {
    if (typeof value !== "object" || value === null) return [];
    if ("targetUri" in value && "targetRange" in value) {
      const link = value as {
        readonly targetUri: string;
        readonly targetRange: Range;
        readonly targetSelectionRange?: Range;
      };
      return [{ uri: link.targetUri, range: link.targetSelectionRange ?? link.targetRange }];
    }
    return "uri" in value && "range" in value ? [value as Location] : [];
  });
const pool = async <A>(values: readonly A[], use: (value: A) => Promise<void>) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(24, values.length) }, async () => {
      while (next < values.length) await use(values[next++]!);
    }),
  );
};

const generateTreeRuntime = async (root: string) => {
  const source = Path.join(root, "packages/attune-docs/src/tree.ts");
  const build = await rolldown({
    cwd: root,
    input: treeEntry,
    moduleTypes: { ".ts": "ts" },
    platform: "browser",
    plugins: [
      {
        name: "attune-docs-tree-entry",
        resolveId: (id) => (id === treeEntry ? treeEntry : undefined),
        load: (id) => (id === treeEntry ? `import ${JSON.stringify(source)};` : undefined),
      },
    ],
    tsconfig: Path.join(root, "packages/attune-docs/tsconfig.browser.json"),
  });
  try {
    const generated = await build.generate({
      codeSplitting: false,
      entryFileNames: "tree.js",
      exports: "none",
      format: "iife",
      minify: true,
      sourcemap: false,
    });
    if (generated.output.length !== 1 || generated.output[0].type !== "chunk")
      throw new Error("Tree runtime must produce exactly one JavaScript chunk");
    const chunk = generated.output[0];
    if (
      chunk.fileName !== "tree.js" ||
      chunk.imports.length > 0 ||
      chunk.dynamicImports.length > 0 ||
      chunk.map !== null ||
      chunk.exports.length > 0
    )
      throw new Error("Tree runtime emitted an import, export, source map, or unexpected name");
    if (![...chunk.moduleIds].some((id) => /[/\\]ogl[/\\]/u.test(id)))
      throw new Error("Tree runtime did not bundle OGL");
    return chunk.code;
  } finally {
    await build.close();
  }
};

export const bundleTreeRuntime = async (root = repository): Promise<string> => {
  const first = await generateTreeRuntime(root);
  const second = await generateTreeRuntime(root);
  if (first !== second) throw new Error("Tree runtime is not byte-deterministic");
  const raw = Buffer.byteLength(first);
  const gzip = gzipSync(first, { level: 9 }).byteLength;
  if (raw > 70 * 1024 || gzip > 20 * 1024)
    throw new Error(`Tree runtime is ${raw} bytes raw and ${gzip} bytes gzip (limits 71680/20480)`);
  return first;
};

export const replaceDirectory = async (staged: string, destination: string, move: typeof rename = rename) => {
  const backup = Path.join(Path.dirname(destination), ".dist-backup");
  if (existsSync(backup)) {
    if (existsSync(destination)) await rm(backup, { recursive: true, force: true });
    else await move(backup, destination);
  }
  const preserved = existsSync(destination);
  try {
    if (preserved) await move(destination, backup);
    await move(staged, destination);
    await rm(backup, { recursive: true, force: true });
  } catch (cause) {
    if (preserved && existsSync(backup)) {
      await rm(destination, { recursive: true, force: true });
      await move(backup, destination);
    }
    await rm(staged, { recursive: true, force: true });
    throw cause;
  }
};

const parseExample = (source: string): { readonly files: readonly Virtual[]; readonly visible: Visible } => {
  const lines = [...source.matchAll(/^.*(?:\r?\n|$)/gmu)]
    .filter((match) => match[0] !== "")
    .map((match) => ({ from: match.index, to: match.index + match[0].length, text: match[0] }));
  const markers = lines.filter((line) => /^\/\/\s*@filename:\s*/u.test(line.text));
  const files: Virtual[] =
    markers.length === 0
      ? [{ name: "index.ts", text: source, from: 0, to: source.length }]
      : markers.map((marker, index) => {
          const name = marker.text
            .replace(/^\/\/\s*@filename:\s*/u, "")
            .trim()
            .replace(/\.js$/u, ".ts");
          if (!/^[\p{L}\p{N}_.\-/]+$/u.test(name) || name.includes("..") || Path.isAbsolute(name))
            throw new Error(`Unsafe @filename ${name}`);
          const to = markers[index + 1]?.from ?? source.length;
          return { name, text: source.slice(marker.to, to), from: marker.to, to };
        });
  if (new Set(files.map((file) => file.name)).size !== files.length) throw new Error("Duplicate @filename");
  const removed: [number, number][] = [];
  const errors: number[] = [];
  let hidden: number | undefined;
  for (const line of lines) {
    const expected = /^\/\/\s*@errors:\s*(.*?)\s*$/u.exec(line.text.trimEnd());
    if (expected !== null) {
      if (!/^\d+(?:\s+\d+)*$/u.test(expected[1]!.trim())) throw new Error("Invalid @errors");
      errors.push(...expected[1]!.trim().split(/\s+/u).map(Number));
      removed.push([line.from, line.to]);
    }
    const cut = /^\/\/\s*---cut(?:(-before|-after|-start|-end))?---\s*$/u.exec(line.text.trimEnd());
    if (cut === null) continue;
    removed.push([line.from, line.to]);
    if (cut[1] === undefined || cut[1] === "-before") removed.push([0, line.to]);
    else if (cut[1] === "-after") removed.push([line.from, source.length]);
    else if (cut[1] === "-start") {
      if (hidden !== undefined) throw new Error("Nested cut-start");
      hidden = line.from;
    } else {
      if (hidden === undefined) throw new Error("Unpaired cut-end");
      removed.push([hidden, line.to]);
      hidden = undefined;
    }
  }
  if (hidden !== undefined) throw new Error("Unpaired cut-start");
  const merged = removed
    .sort((a, b) => a[0] - b[0])
    .reduce<[number, number][]>((all, part) => {
      const previous = all.at(-1);
      if (previous === undefined || part[0] > previous[1]) all.push([...part]);
      else previous[1] = Math.max(previous[1], part[1]);
      return all;
    }, []);
  const kept: [number, number][] = [];
  let cursor = 0;
  for (const [from, to] of merged) {
    if (cursor < from) kept.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < source.length) kept.push([cursor, source.length]);
  let text = "";
  const ranges: Visible["ranges"][number][] = [];
  for (const [from, to] of kept) {
    const shown = text.length;
    text += source.slice(from, to);
    for (const file of files) {
      const start = Math.max(from, file.from);
      const end = Math.min(to, file.to);
      if (start < end)
        ranges.push({
          from: shown + start - from,
          to: shown + end - from,
          file,
          fileFrom: start - file.from,
        });
    }
  }
  return { files, visible: { text, errors, ranges } };
};

export const createDocumentationLanguage = async (
  root = repository,
): Promise<{ readonly language: DocumentationLanguage; readonly close: () => Promise<void> }> => {
  const launcher = Path.join(root, "packages/attune-docs/node_modules/.bin/effect-tsgo");
  const executable = run(launcher, ["get-exe-path"], root);
  await chmod(executable, 0o755);
  const versions = JSON.parse(load(root, "packages/attune-docs/package.json")).devDependencies as Record<
    string,
    string
  >;
  if (run(executable, ["--version"], root) !== `Version ${versions.typescript}+effect-tsgo.${versions["@effect/tsgo"]}`)
    throw new Error("Unexpected compiler binary version");
  const child = spawn(executable, ["--lsp", "--stdio"], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
  if (child.stdin === null || child.stdout === null || child.stderr === null) throw new Error("Missing LSP stdio");
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += String(chunk)));
  const rpc = createMessageConnection(child.stdout, child.stdin, NullLogger);
  for (const method of ["client/registerCapability", "client/unregisterCapability", "window/workDoneProgress/create"])
    rpc.onRequest(method, () => null);
  rpc.onRequest("workspace/configuration", () => []);
  rpc.listen();
  const request = <A>(method: string, params?: object): Promise<A> =>
    deadline((params === undefined ? rpc.sendRequest(method) : rpc.sendRequest(method, params)) as Promise<A>, method);
  const rootUri = pathToFileURL(`${root}${Path.sep}`).href;
  try {
    const initialized = await request<{ readonly capabilities?: { readonly positionEncoding?: string } }>(
      "initialize",
      {
        processId: process.pid,
        rootUri,
        workspaceFolders: [{ uri: rootUri, name: "attune" }],
        capabilities: {
          general: { positionEncodings: ["utf-16"] },
          workspace: { configuration: true },
          window: { workDoneProgress: true },
          textDocument: { definition: {}, diagnostic: {} },
        },
      },
    );
    if (initialized.capabilities?.positionEncoding !== "utf-16") throw new Error("LSP did not select UTF-16");
  } catch (cause) {
    rpc.dispose();
    child.kill();
    throw cause;
  }
  void rpc.sendNotification("initialized", {});
  const scratch = await mkdtemp(Path.join(root, "packages/attune-mcp/src/.attune-docs-"));
  const temporary = [scratch];
  const syntheticOrigins = new Map<string, string>();
  const opened = new Map<string, string>();
  let sequence = 0;
  const open = (path: string, text: string) => {
    const uri = pathToFileURL(path).href;
    if (opened.has(uri)) return uri;
    opened.set(uri, text);
    void rpc.sendNotification("textDocument/didOpen", {
      textDocument: { uri, languageId: "typescript", version: 1, text },
    });
    return uri;
  };
  const closeDocument = (uri: string) => {
    if (!opened.delete(uri)) return;
    void rpc.sendNotification("textDocument/didClose", { textDocument: { uri } });
  };

  const language: DocumentationLanguage = {
    resolve: async (tree, file) => {
      const headings: Heading[] = [];
      const codes: Code[] = [];
      const references: Link[] = [];
      visit(tree, (node) => {
        if (node.type === "heading") headings.push(node);
        else if (node.type === "code") codes.push(node);
        else if (node.type === "link" && data(node).role === "reference") references.push(node);
      });
      const labels = new Map<string, string>();
      const headingById = new Map<string, Heading>();
      const owners = headings.flatMap((heading) => {
        const metadata = data(heading);
        if (metadata.id === undefined) return [];
        const href = `#${metadata.id}`;
        headingById.set(href, heading);
        labels.set(
          href,
          heading.children
            .map((child) => ("value" in child ? String(child.value) : ""))
            .join("")
            .replace(/<.*>$/u, ""),
        );
        return (
          metadata.definitionRanges ??
          (metadata.sourcePath !== undefined && metadata.sourceRange !== undefined
            ? [{ sourcePath: metadata.sourcePath, sourceRange: metadata.sourceRange }]
            : [])
        ).map(({ sourcePath, sourceRange }) => ({
          path: Path.resolve(root, sourcePath),
          from: sourceRange.start,
          to: sourceRange.end,
          href,
          scopeFrom: metadata.sourceRange?.start,
        }));
      });
      const sourceCache = new Map<string, string>();
      const source = (path: string) => {
        let value = sourceCache.get(path);
        if (value === undefined) {
          value = readFileSync(path, "utf8");
          sourceCache.set(path, value);
        }
        return value;
      };
      const ownerAt = (location: Location) => {
        if (!location.uri.startsWith("file:")) return undefined;
        const actual = fileURLToPath(location.uri);
        if (Path.relative(root, actual).startsWith("..") || !existsSync(actual)) return undefined;
        const at = toOffset(source(actual), location.range.start);
        const path = syntheticOrigins.get(actual) ?? actual;
        return owners
          .filter((owner) => Path.resolve(owner.path) === Path.resolve(path) && owner.from <= at && at < owner.to)
          .sort((left, right) => left.to - left.from - (right.to - right.from))[0]?.href;
      };
      const raw = async (uri: string, text: string, at: number) =>
        asLocations(
          await request("textDocument/definition", {
            textDocument: { uri },
            position: toPosition(text, at),
          }),
        );
      const sourceReports = new Map<string, Promise<readonly Diagnostic[]>>();
      const sourceErrors = (uri: string) => {
        let pending = sourceReports.get(uri);
        if (pending === undefined) {
          pending = request<{ readonly items?: readonly Diagnostic[] }>("textDocument/diagnostic", {
            textDocument: { uri },
          }).then(({ items = [] }) => items.filter((diagnostic) => (diagnostic.severity ?? 1) <= 2));
          sourceReports.set(uri, pending);
        }
        return pending;
      };
      const definitionCache = new Map<string, Promise<readonly string[]>>();
      const definitions = (uri: string, text: string, at: number, depth = 0): Promise<readonly string[]> => {
        const key = `${uri}\0${at}\0${depth}`;
        let pending = definitionCache.get(key);
        if (pending !== undefined) return pending;
        pending = (async () => {
          const locations = await raw(uri, text, at);
          const direct = locations.flatMap((location) => {
            const href = ownerAt(location);
            return href === undefined ? [] : [href];
          });
          if (direct.length > 0 || depth === 3) return [...new Set(direct)];
          const followed: string[] = [];
          for (const location of locations) {
            if (!location.uri.startsWith("file:")) continue;
            const path = fileURLToPath(location.uri);
            if (Path.relative(root, path).startsWith("..") || !existsSync(path)) continue;
            const target = source(path);
            followed.push(
              ...(await definitions(open(path, target), target, toOffset(target, location.range.start), depth + 1)),
            );
          }
          return [...new Set(followed)];
        })();
        definitionCache.set(key, pending);
        return pending;
      };
      const resolveAt = async (uri: string, text: string, at: number) => {
        const found = await definitions(uri, text, at);
        if (found.length === 1) return found[0];
        const publicTargets = found.filter((href) => !href.includes("--"));
        return publicTargets.length === 1 ? publicTargets[0] : undefined;
      };
      const signatures = new Map(
        codes.flatMap((code) => {
          const metadata = data(code);
          return metadata.role === "signature" && metadata.ownerId !== undefined
            ? [[metadata.ownerId, code] as const]
            : [];
        }),
      );
      const unresolved = new Map<string, Link[]>();
      for (const link of references) {
        const metadata = data(link);
        if (
          metadata.reference === undefined ||
          metadata.packageName === undefined ||
          metadata.sourcePath === undefined
        ) {
          fatal(file, "TSDoc reference lost source context", metadata);
          continue;
        }
        if (metadata.referenceKind === "failure" && metadata.ownerId !== undefined) {
          const signature = signatures.get(metadata.ownerId);
          if (signature !== undefined) {
            const prefix = "interface D{\n";
            const parsed = ts.createSourceFile("doc.ts", `${prefix}${signature.value}\n}`, 99, true);
            let parameter: ts.TypeParameterDeclaration | undefined;
            const find = (node: ts.Node): void => {
              if (ts.isTypeParameterDeclaration(node) && node.name.text === metadata.reference) parameter = node;
              ts.forEachChild(node, find);
            };
            find(parsed);
            if (parameter !== undefined) {
              const signatureData = data(signature);
              const shown = parameter.name.getStart(parsed) - prefix.length;
              const interval = signatureData.intervals?.find(
                ([from, to]) => shown >= from && shown + metadata.reference!.length <= to,
              );
              if (interval !== undefined) {
                const path = Path.resolve(root, signatureData.sourcePath!);
                const text = source(path);
                const uri = open(path, text);
                const at = interval[2] + shown - interval[0];
                const bound = (await raw(uri, text, at)).some(
                  (location) =>
                    location.uri === uri &&
                    toOffset(text, location.range.start) <= at &&
                    at < toOffset(text, location.range.end),
                );
                if (bound) {
                  link.url = `#${metadata.ownerId}`;
                  continue;
                }
              }
              fatal(file, `Type-parameter failure ${metadata.reference} did not bind to its owner`, metadata);
              continue;
            }
          }
        }
        const key = `${metadata.sourcePath}\0${metadata.ownerId}\0${metadata.reference}`;
        unresolved.set(key, [...(unresolved.get(key) ?? []), link]);
      }
      const bySource = new Map<string, (readonly [string, Link[]])[]>();
      for (const entry of unresolved)
        bySource.set(data(entry[1][0]!).sourcePath!, [...(bySource.get(data(entry[1][0]!).sourcePath!) ?? []), entry]);
      await pool([...bySource], async ([sourcePath, entries]) => {
        const originalPath = Path.resolve(root, sourcePath);
        const original = source(originalPath);
        const src = sourcePath.indexOf("/src/");
        if (src < 0) {
          for (const [, links] of entries)
            fatal(file, `TSDoc reference ${data(links[0]!).reference} has no source root`, data(links[0]!));
          return;
        }
        let program = original;
        const probes: { readonly links: Link[]; readonly positions: number[]; readonly expected: string }[] = [];
        for (const [, links] of entries) {
          const metadata = data(links[0]!);
          const reference = metadata.reference!;
          let [base, ...parts] = reference.replace(/^.*!/u, "").split(/[.#]/u);
          if (!/^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*$/u.test(base!)) {
            probes.push({ links, positions: [], expected: reference });
            continue;
          }
          let member = parts.at(-1);
          const ownerLabel = labels.get(`#${metadata.ownerId}`);
          if (
            member === undefined &&
            ownerLabel !== undefined &&
            /^[a-z]/u.test(base!) &&
            ![...labels.values()].includes(base!)
          ) {
            member = base;
            base = ownerLabel.includes(".") ? ownerLabel.slice(0, ownerLabel.lastIndexOf(".")) : ownerLabel;
          }
          const alias = `__AttuneReference${sequence++}`;
          const sourceRoot = Path.resolve(root, sourcePath.slice(0, src + 5));
          const specifier = (path: string) => {
            const relative = Path.relative(Path.dirname(originalPath), path).replaceAll(Path.sep, "/");
            return relative.startsWith(".") ? relative : `./${relative}`;
          };
          const imported = `${alias}P`;
          const local = `${alias}M`;
          const module = originalPath.replace(/\.ts$/u, ".js");
          let probe = `\nimport{${base} as ${imported}}from${JSON.stringify(
            specifier(Path.join(sourceRoot, "index.js")),
          )};import{${base} as ${local}}from${JSON.stringify(specifier(module))};`;
          probe +=
            member === undefined
              ? `type ${alias}A=${base};type ${alias}B=${imported};type ${alias}C=${local};`
              : `declare const ${alias}a:${base};declare const ${alias}g:${base}<any>;declare const ${alias}p:${imported};declare const ${alias}pg:${imported}<any>;declare const ${alias}m:${local};declare const ${alias}mg:${local}<any>;${alias}a.${member};${alias}g.${member};${alias}p.${member};${alias}pg.${member};${alias}m.${member};${alias}mg.${member};${base}.${member};${imported}.${member};${local}.${member};`;
          const from = program.length;
          program += probe;
          const pattern =
            member === undefined
              ? new RegExp(`\\b(?:${base}|${imported}|${local})\\b`, "gu")
              : new RegExp(`\\.${member}\\b`, "gu");
          const positions = [...probe.matchAll(pattern)].map(
            (match) => from + match.index + (member === undefined ? 0 : 1),
          );
          probes.push({
            links,
            positions,
            expected: reference.includes(".") ? reference : member === undefined ? reference : `${base}.${member}`,
          });
        }
        const syntheticPath = Path.join(
          Path.dirname(originalPath),
          `.attune-docs-reference-${process.pid}-${sequence++}.ts`,
        );
        await writeFile(syntheticPath, program);
        temporary.push(syntheticPath);
        syntheticOrigins.set(syntheticPath, originalPath);
        const uri = open(syntheticPath, program);
        for (const probe of probes) {
          const found = new Set<string>();
          let external = false;
          for (const at of probe.positions) {
            const locations = await raw(uri, program, at);
            external ||= locations.some((location) => /lib\..*\.d\.ts$/u.test(location.uri));
            const href = await resolveAt(uri, program, at);
            if (href !== undefined) found.add(href);
          }
          const reference = data(probe.links[0]!).reference!;
          const exact = [...found].filter((href) => {
            const label = labels.get(href);
            return label === probe.expected || label?.endsWith(`.${reference}`);
          });
          const href =
            exact.length === 1
              ? exact[0]
              : external && reference === "TypeError"
                ? "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError"
                : undefined;
          for (const link of probe.links)
            if (href === undefined)
              fatal(
                file,
                `TSDoc reference ${reference} has no canonical definition (candidates: ${
                  [...found].join(", ") || "none"
                })`,
                data(link),
              );
            else link.url = href;
        }
      });
      const inheritance = new Map<string, string>();
      for (const link of references) {
        const metadata = data(link);
        if (metadata.referenceKind !== "inherit" || metadata.ownerId === undefined || !link.url.startsWith("#"))
          continue;
        inheritance.set(metadata.ownerId, link.url.slice(1));
      }
      const cyclic = new Set<string>();
      for (const start of inheritance.keys()) {
        const seen = new Set<string>();
        let current: string | undefined = start;
        while (current !== undefined) {
          if (seen.has(current)) {
            fatal(file, `Cyclic inheritDoc chain at ${current}`, data(headingById.get(`#${start}`)!));
            for (const id of seen) cyclic.add(id);
            break;
          }
          seen.add(current);
          current = inheritance.get(current);
        }
      }
      const syntaxCache = new Map<string, ts.SourceFile>();
      const inheritedMember = (heading: Heading | undefined) => {
        const metadata = heading === undefined ? undefined : data(heading);
        if (metadata?.sourcePath === undefined || metadata.sourceRange === undefined) return undefined;
        const path = Path.resolve(root, metadata.sourcePath);
        let parsed = syntaxCache.get(path);
        if (parsed === undefined) {
          parsed = ts.createSourceFile(path, source(path), 99, true);
          syntaxCache.set(path, parsed);
        }
        let member: ts.SignatureDeclaration | undefined;
        const find = (node: ts.Node): void => {
          if (
            node.getStart(parsed) === metadata.sourceRange!.start &&
            node.getEnd() === metadata.sourceRange!.end &&
            ts.isFunctionLike(node)
          )
            member = node;
          ts.forEachChild(node, find);
        };
        find(parsed);
        if (
          member === undefined ||
          member.name === undefined ||
          !ts.isIdentifier(member.name) ||
          (!ts.isClassLike(member.parent) && !ts.isInterfaceDeclaration(member.parent)) ||
          member.parent.name === undefined
        )
          return undefined;
        return { path, parsed, member, name: member.name.text, container: member.parent, metadata };
      };
      for (const [ownerId, targetId] of inheritance) {
        if (cyclic.has(ownerId)) continue;
        const own = inheritedMember(headingById.get(`#${ownerId}`));
        const target = inheritedMember(headingById.get(`#${targetId}`));
        if (own === undefined || target === undefined) {
          fatal(
            file,
            `${ownerId} inheritDoc requires named callable class or interface members`,
            data(headingById.get(`#${ownerId}`)!),
          );
          continue;
        }
        const ownName = own.name;
        const targetName = target.name;
        const parameters = (member: ts.SignatureDeclaration) =>
          member.parameters.map((parameter) =>
            ts.isIdentifier(parameter.name) ? parameter.name.text : parameter.name.getText(),
          );
        const typeParameters = (member: ts.SignatureDeclaration) =>
          member.typeParameters?.map((parameter) => parameter.name.text) ?? [];
        if (
          ownName !== targetName ||
          parameters(own.member).join("\0") !== parameters(target.member).join("\0") ||
          typeParameters(own.member).join("\0") !== typeParameters(target.member).join("\0")
        ) {
          fatal(file, `${ownerId} inheritDoc callable names do not match ${targetId}`, own.metadata);
          continue;
        }
        const targetContainer = owners.find(
          (owner) =>
            Path.resolve(owner.path) === target.path && owner.scopeFrom === target.container.getStart(target.parsed),
        )?.href;
        const ownUri = open(own.path, source(own.path));
        let relation: ts.ExpressionWithTypeArguments | undefined;
        let relationKind: ts.SyntaxKind | undefined;
        for (const clause of own.container.heritageClauses ?? [])
          for (const candidate of clause.types)
            if (
              (await resolveAt(
                ownUri,
                source(own.path),
                Math.max(candidate.expression.getStart(own.parsed), candidate.expression.getEnd() - 1),
              )) === targetContainer
            ) {
              relation = candidate;
              relationKind = clause.token;
            }
        const modifiers = ts.canHaveModifiers(own.member) ? ts.getModifiers(own.member) : undefined;
        const targetIsClass = ts.isClassLike(target.container);
        if (
          relation === undefined ||
          targetContainer === undefined ||
          modifiers?.some(({ kind }) => kind === ts.SyntaxKind.StaticKeyword) ||
          (relationKind === ts.SyntaxKind.ExtendsKeyword &&
            targetIsClass &&
            !modifiers?.some(({ kind }) => kind === ts.SyntaxKind.OverrideKeyword))
        ) {
          fatal(file, `${ownerId} inheritDoc has no explicit implements or override relation`, own.metadata);
          continue;
        }
        const declarations =
          own.container.typeParameters?.map((parameter) => parameter.getText(own.parsed)).join(",") ?? "";
        const arguments_ = own.container.typeParameters?.map((parameter) => parameter.name.text).join(",") ?? "";
        const ownType = `${own.container.name!.text}${arguments_ === "" ? "" : `<${arguments_}>`}`;
        const targetType = relation.getText(own.parsed);
        const key = JSON.stringify(ownName);
        const probe = `\nfunction __attuneDocsInherit${sequence++}${
          declarations === "" ? "" : `<${declarations}>`
        }(s:${ownType}[${key}],t:${targetType}[${key}]):void{const f:${targetType}[${key}]=s;const r:${ownType}[${key}]=t;void f;void r}\n`;
        closeDocument(ownUri);
        const report = await request<{ readonly items?: readonly Diagnostic[] }>("textDocument/diagnostic", {
          textDocument: { uri: open(own.path, source(own.path) + probe) },
        });
        closeDocument(ownUri);
        open(own.path, source(own.path));
        const errors = (report.items ?? []).filter((diagnostic) => (diagnostic.severity ?? 1) <= 2);
        if (errors.length > 0)
          fatal(
            file,
            `${ownerId} inheritDoc is not bidirectionally assignable to ${targetId} (${errors
              .map(({ code }) => String(code))
              .join(", ")})`,
            own.metadata,
          );
      }
      const failures = new Map<string, Link[]>();
      for (const link of references) {
        const metadata = data(link);
        if (metadata.referenceKind === "failure" && metadata.ownerId !== undefined)
          failures.set(metadata.ownerId, [...(failures.get(metadata.ownerId) ?? []), link]);
      }
      const defaults = `import{Effect}from"effect";type E<T>=T extends Effect.Effect<unknown,infer X,unknown>?X:unknown;type R<T>=T extends Effect.Effect<unknown,unknown,infer X>?X:unknown;type N<T extends never>=T;type A=N<E<Effect.Effect<void>>>;type B=N<R<Effect.Effect<void>>>;`;
      const defaultsPath = Path.join(scratch, "effect-defaults.ts");
      await writeFile(defaultsPath, defaults);
      const defaultsReport = await request<{ readonly items?: readonly Diagnostic[] }>("textDocument/diagnostic", {
        textDocument: { uri: open(defaultsPath, defaults) },
      });
      if ((defaultsReport.items ?? []).some((diagnostic) => (diagnostic.severity ?? 1) <= 2))
        fatal(file, "Pinned Effect defaults are not never", codes[0] === undefined ? {} : data(codes[0]));

      for (const code of codes) {
        const metadata = data(code);
        if (metadata.role !== "signature" && metadata.role !== "example") continue;
        const links: { start: number; end: number; href: string }[] = [];
        if (metadata.role === "signature") {
          const path = Path.resolve(root, metadata.sourcePath!);
          const text = source(path);
          const uri = open(path, text);
          const parsed = ts.createSourceFile(path, text, 99, true);
          const signature = (node: ts.Node) => {
            const initializer = ts.isVariableDeclaration(node) ? node.initializer : undefined;
            if (initializer && ts.isFunctionLike(initializer)) return initializer;
            if (ts.isFunctionLike(node)) return node;
            const type =
              ts.isVariableDeclaration(node) ||
              ts.isPropertyDeclaration(node) ||
              ts.isPropertySignature(node) ||
              ts.isTypeAliasDeclaration(node)
                ? node.type
                : undefined;
            return type && ts.isFunctionLike(type) ? type : undefined;
          };
          const effects: ts.TypeReferenceNode[] = [];
          const ownerCount = owners.length;
          for (const origin of new Set(metadata.intervals?.map((interval) => interval[2]) ?? [])) {
            const inspect = (node: ts.Node): void => {
              if (node.getStart(parsed) === origin) {
                const callable = signature(node);
                let type = callable?.type;
                while (type && ts.isParenthesizedTypeNode(type)) type = type.type;
                if (type && ts.isTypeReferenceNode(type) && type.typeName.getText(parsed) === "Effect.Effect")
                  effects.push(type);
                for (const parameter of callable?.typeParameters ?? [])
                  owners.push({
                    path,
                    from: parameter.name.getStart(parsed),
                    to: parameter.name.getEnd(),
                    href: `#${metadata.ownerId}`,
                    scopeFrom: origin,
                  });
              }
              ts.forEachChild(node, inspect);
            };
            inspect(parsed);
          }
          if (owners.length !== ownerCount) definitionCache.clear();
          await pool([...code.value.matchAll(identifiers)], async (match) => {
            const interval = metadata.intervals?.find(
              ([from, to]) => match.index >= from && match.index + match[0]!.length <= to,
            );
            if (interval === undefined) return;
            const href = await resolveAt(uri, text, interval[2] + match.index - interval[0]);
            if (href !== undefined) links.push({ start: match.index, end: match.index + match[0]!.length, href });
          });
          const shownAt = (at: number) => {
            const interval = metadata.intervals?.find(([, , from, to]) => at >= from && at < to);
            return interval && interval[0] + at - interval[2];
          };
          checkLifecycle(parsed, shownAt, links, file, metadata);
          if (metadata.callable === true && metadata.ownerId !== undefined && effects.length > 0) {
            const atoms: string[] = [];
            for (const effect of effects) {
              const shown = shownAt(effect.typeName.getStart(parsed));
              const interval = metadata.intervals?.find(
                ([from, to]) => shown !== undefined && shown >= from && shown + 6 <= to,
              );
              const definitionsForEffect =
                shown === undefined || interval === undefined
                  ? []
                  : await raw(uri, text, interval[2] + shown - interval[0]);
              if (
                !definitionsForEffect.some((location) => {
                  if (!location.uri.startsWith("file:")) return false;
                  const target = fileURLToPath(location.uri);
                  if (/[/\\]effect[/\\](?:src[/\\]Effect\.ts|dist[/\\]dts[/\\]Effect)/u.test(target)) return true;
                  if (!existsSync(target)) return false;
                  const imported = source(target);
                  const at = toOffset(imported, location.range.start);
                  const from = imported.lastIndexOf("\n", at) + 1;
                  const to = imported.indexOf("\n", at);
                  return /from\s+["']effect["']/u.test(imported.slice(from, to < 0 ? undefined : to));
                })
              )
                fatal(file, `${metadata.ownerId} does not resolve canonical Effect.Effect`, metadata);
              const atom = (node: ts.TypeNode): void => {
                if (node.kind === ts.SyntaxKind.NeverKeyword) return;
                if (ts.isUnionTypeNode(node)) {
                  node.types.forEach(atom);
                  return;
                }
                if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
                  const name = node.typeName.text;
                  const start = shownAt(node.typeName.getStart(parsed));
                  const href = links.find((link) => link.start === start && link.end === start! + name.length)?.href;
                  if (href === undefined) fatal(file, `Error atom ${name} has no definition`, metadata);
                  else atoms.push(href);
                  return;
                }
                fatal(file, `Unsupported Effect error channel ${node.getText(parsed)}`, metadata);
              };
              if (effect.typeArguments?.[1] !== undefined) atom(effect.typeArguments[1]);
            }
            const documented = failures.get(metadata.ownerId) ?? [];
            const targets = documented.flatMap((link) => (link.url.startsWith("#") ? [link.url] : []));
            for (const link of documented)
              if ((data(link).explanation ?? "").trim() === "")
                fatal(file, `${metadata.ownerId} has an empty @failure explanation`, data(link));
            if ([...new Set(atoms)].sort().join("\0") !== [...new Set(targets)].sort().join("\0"))
              fatal(
                file,
                `${metadata.ownerId} error channel ${[...new Set(atoms)].join(" | ") || "never"} does not match @failure ${
                  [...new Set(targets)].join(" | ") || "none"
                }`,
                metadata,
              );
          }
          metadata.links = links.sort((a, b) => a.start - b.start);
          const diagnostics = await sourceErrors(uri);
          if (diagnostics.length === 0) metadata.checked = true;
          else {
            delete metadata.checked;
            fatal(
              file,
              `Signature source has compiler diagnostics ${diagnostics
                .map(({ source, severity, code }) => `${source ?? "typescript"}/${severity ?? 1}/${String(code)}`)
                .join(", ")}`,
              metadata,
            );
          }
          delete metadata.intervals;
          continue;
        }
        const project = parseExample(code.value);
        const directory = Path.join(scratch, `example-${sequence++}`);
        await mkdir(directory, { recursive: true });
        const documents = new Map<Virtual, { readonly uri: string; readonly path: string }>();
        for (const virtual of project.files) {
          const path = Path.join(directory, virtual.name);
          if (Path.relative(directory, path).startsWith("..")) throw new Error(`Unsafe virtual file ${virtual.name}`);
          await mkdir(Path.dirname(path), { recursive: true });
          await writeFile(path, virtual.text);
          documents.set(virtual, { path, uri: open(path, virtual.text) });
        }
        const diagnostics: Diagnostic[] = [];
        for (const document of documents.values()) {
          const report = await request<{ readonly items?: readonly Diagnostic[] }>("textDocument/diagnostic", {
            textDocument: { uri: document.uri },
          });
          diagnostics.push(...(report.items ?? []).filter((diagnostic) => (diagnostic.severity ?? 1) <= 2));
        }
        const actual = diagnostics
          .map(({ code }) => Number(code))
          .filter(Number.isFinite)
          .sort((a, b) => a - b);
        const expected = [...project.visible.errors].sort((a, b) => a - b);
        const clean =
          actual.join("\0") === expected.join("\0") && diagnostics.every(({ code }) => Number.isFinite(Number(code)));
        if (!clean)
          fatal(
            file,
            `Example diagnostics expected [${expected.join(", ")}], received [${diagnostics
              .map(
                (item) =>
                  `${item.source ?? "typescript"}/${item.severity ?? 1}/${String(item.code)}@${
                    item.range.start.line + 1
                  }:${item.range.start.character + 1}`,
              )
              .join(", ")}]`,
            metadata,
          );
        await pool([...project.visible.text.matchAll(identifiers)], async (match) => {
          const range = project.visible.ranges.find(
            (candidate) => match.index >= candidate.from && match.index + match[0]!.length <= candidate.to,
          );
          if (range === undefined) return;
          const document = documents.get(range.file)!;
          const href = await resolveAt(document.uri, range.file.text, range.fileFrom + match.index - range.from);
          if (href !== undefined) links.push({ start: match.index, end: match.index + match[0]!.length, href });
        });
        for (const [virtual, document] of documents) {
          const parsed = ts.createSourceFile(document.path, virtual.text, 99, true);
          checkLifecycle(
            parsed,
            (at) => {
              const range = project.visible.ranges.find(
                (candidate) =>
                  candidate.file === virtual &&
                  at >= candidate.fileFrom &&
                  at < candidate.fileFrom + candidate.to - candidate.from,
              );
              return range === undefined ? undefined : range.from + at - range.fileFrom;
            },
            links,
            file,
            metadata,
          );
        }
        for (const document of documents.values()) closeDocument(document.uri);
        code.value = project.visible.text;
        metadata.links = links.sort((a, b) => a.start - b.start);
        if (clean) metadata.checked = true;
        else delete metadata.checked;
      }
      return tree;
    },
  };

  return {
    language,
    close: async () => {
      for (const uri of [...opened.keys()]) closeDocument(uri);
      let failure: unknown;
      try {
        await Promise.all(temporary.map((path) => rm(path, { recursive: true, force: true })));
      } catch (cause) {
        failure = cause;
      }
      try {
        await request("shutdown");
      } catch (cause) {
        failure ??= cause;
      }
      void rpc.sendNotification("exit");
      rpc.dispose();
      try {
        await deadline(
          new Promise<void>((resolve) => {
            if (child.exitCode !== null) resolve();
            else child.once("exit", () => resolve());
          }),
          "language-server exit",
        );
      } catch (cause) {
        child.kill();
        failure ??= cause;
      }
      if (child.exitCode !== 0 && !(child.exitCode === 1 && stderr.trim().endsWith("context canceled")))
        failure ??= new Error(`Language server exited ${child.exitCode}: ${stderr}`);
      if (failure !== undefined) throw failure;
    },
  };
};

export class DocsError extends Error {
  readonly phase: "read" | "compile" | "write";
  override readonly cause: unknown;
  constructor(phase: "read" | "compile" | "write", cause: unknown) {
    super(`Documentation ${phase} failed`, { cause });
    this.phase = phase;
    this.cause = cause;
  }
}
const phase = async <A>(name: DocsError["phase"], work: () => Promise<A>) => {
  try {
    return await work();
  } catch (cause) {
    throw cause instanceof DocsError ? cause : new DocsError(name, cause);
  }
};
const assertFork = (root: string) => {
  if (run("git", ["status", "--porcelain=v1", "--untracked-files=all"], root) !== "")
    throw new Error("Documentation publication requires a clean committed worktree");
  if (run("git", ["ls-files", "packages/attune-docs/dist"], root) !== "")
    throw new Error("Generated documentation may not be tracked");
  const serverSource = ["docs.ts", "main.ts", "read.ts"];
  const source = [...serverSource, "tree.ts"];
  if (readdirSync(Path.join(root, "packages/attune-docs/src")).sort().join("\0") !== source.join("\0"))
    throw new Error("Documentation source inventory drifted");
  if (readdirSync(Path.join(root, "packages/attune-docs/static")).sort().join("\0") !== "styles.css")
    throw new Error("Documentation static inventory drifted");
  const allowed =
    "packages/attune-docs/.gitignore packages/attune-docs/README.md packages/attune-docs/package.json packages/attune-docs/playwright.config.ts packages/attune-docs/schema/experiment-approval.schema.json packages/attune-docs/schema/experiment-manifest.schema.json packages/attune-docs/schema/experiment-publication.schema.json packages/attune-docs/schema/experiment-report.schema.json packages/attune-docs/src/docs.ts packages/attune-docs/src/main.ts packages/attune-docs/src/read.ts packages/attune-docs/src/tree.ts packages/attune-docs/static/styles.css packages/attune-docs/test/docs.test.ts packages/attune-docs/test/e2e.spec.ts packages/attune-docs/test/fixtures/resolver.ts packages/attune-docs/test/tree.test.ts packages/attune-docs/tsconfig.browser.json packages/attune-docs/tsconfig.json packages/attune-docs/vitest.config.ts tooling/oxlint/attune.test.ts tooling/oxlint/attune.ts tooling/oxlint/fixtures/cli.config.ts tooling/oxlint/fixtures/invalid.ts tooling/oxlint/fixtures/nested/.oxlintrc.json tooling/oxlint/fixtures/nested/invalid.ts tooling/oxlint/fixtures/valid.ts"
      .split(" ")
      .sort();
  const tracked = run("git", ["ls-files", "packages/attune-docs", "tooling/oxlint"], root).split("\n").sort();
  if (tracked.join("\0") !== allowed.join("\0")) throw new Error("Documentation tracked-file inventory drifted");
  for (const path of [
    "packages/attune-docs-next",
    "packages/twoslash",
    "packages/attune-docs/docs-policy.json",
    "packages/attune-docs/schema/api-manifest.schema.json",
  ])
    if (existsSync(Path.join(root, path))) throw new Error(`Obsolete documentation artifact survives: ${path}`);
  const production = [
    "oxlint.config.ts",
    "tooling/oxlint/attune.ts",
    ...serverSource.map((path) => `packages/attune-docs/src/${path}`),
  ];
  const total = production.reduce((sum, path) => sum + lines(load(root, path)), 0);
  if (total > 2_700) throw new Error(`Documentation compiler is ${total} lines (limit 2700)`);
  if (lines(load(root, "packages/attune-docs/src/tree.ts")) > 450)
    throw new Error("Documentation browser/GLSL entry exceeds 450 lines");
  if (lines(load(root, "packages/attune-docs/static/styles.css")) > 350)
    throw new Error("Documentation CSS exceeds 350 lines");
  return { browser: lines(load(root, "packages/attune-docs/src/tree.ts")), compiler: total };
};

export const main = async (root = repository) => {
  const budget = await phase("read", async () => assertFork(root));
  const revision = await phase("read", async () => run("git", ["rev-parse", "HEAD"], root));
  for (const name of ["DOCS_SOURCE_COMMIT", "DOCS_SOURCE_REF"] as const) {
    const expected = process.env[name];
    if (expected !== undefined && (!/^[0-9a-f]{40}$/u.test(expected) || expected !== revision))
      throw new DocsError("read", `${name} does not equal HEAD`);
  }
  const dependencies = JSON.parse(load(root, "packages/attune-docs/package.json")).devDependencies as Record<
    string,
    string
  >;
  const highlighter = await phase("compile", () =>
    createHighlighter({ langs: ["typescript", "javascript", "text"], themes: ["github-light-default"] }),
  );
  let server: Awaited<ReturnType<typeof createDocumentationLanguage>> | undefined;
  try {
    server = await phase("compile", () => createDocumentationLanguage(root));
    const options = {
      highlighter,
      language: server.language,
      metadata: {
        revision,
        typescriptVersion: dependencies.typescript!,
        tsgoVersion: dependencies["@effect/tsgo"]!,
        languageServiceVersion: dependencies["@effect/language-service"]!,
      },
    };
    const first = await phase("compile", async () => compileDocumentation(await read(root, revision), options));
    const second = await phase("compile", async () => compileDocumentation(await read(root, revision), options));
    if (first.html !== second.html) throw new DocsError("compile", "Output is not byte-deterministic");
    const scripts = [...first.html.matchAll(/<script\b([^>]*)><\/script>/giu)];
    const attributes = scripts[0]?.[1]?.trim().split(/\s+/u).sort().join("\0");
    if (
      (first.html.match(/<script\b/giu) ?? []).length !== 1 ||
      scripts.length !== 1 ||
      attributes !== 'defer\0src="tree.js"' ||
      /twoslash|hover|search-index|route-manifest/iu.test(first.html)
    )
      throw new DocsError("compile", "Forbidden browser/runtime artifact");
    const tree = await phase("compile", () => bundleTreeRuntime(root));
    await phase("write", async () => {
      const temporary = Path.join(root, "packages/attune-docs/.tmp", `dist-${process.pid}`);
      const destination = Path.join(root, "packages/attune-docs/dist");
      await rm(temporary, { recursive: true, force: true });
      await mkdir(temporary, { recursive: true });
      await writeFile(Path.join(temporary, "index.html"), first.html);
      await copyFile(Path.join(root, "packages/attune-docs/static/styles.css"), Path.join(temporary, "styles.css"));
      await writeFile(Path.join(temporary, "tree.js"), tree);
      if (readdirSync(temporary).sort().join("\0") !== "index.html\0styles.css\0tree.js")
        throw new Error("Documentation output inventory drifted");
      await replaceDirectory(temporary, destination);
    });
    process.stdout.write(
      `attune-docs: ${budget.compiler}/2700 compiler lines, ${budget.browser}/450 browser lines, ` +
        `${Buffer.byteLength(tree)}/71680 raw bundle bytes, ${gzipSync(tree, { level: 9 }).byteLength}/20480 gzip bytes\n`,
    );
  } finally {
    try {
      if (server !== undefined) await phase("compile", () => server!.close());
    } finally {
      highlighter.dispose();
    }
  }
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(Path.resolve(process.argv[1])).href)
  await main();
