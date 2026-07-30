import type { Element, ElementContent, Root as HastRoot } from "hast";
import type { Code, Heading, Link, ListItem, Root, RootContent } from "mdast";
import type { Handler } from "mdast-util-to-hast";
import rehypeDocument from "rehype-document";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import type { Highlighter } from "shiki";
import { unified, type Plugin } from "unified";
import { lintRule } from "unified-lint-rule";
import { EXIT, visit } from "unist-util-visit";
import { VFile } from "vfile";

import type { AttuneData } from "./read.ts";

export interface DocumentationLanguage {
  readonly resolve: (tree: Root, file: VFile) => Promise<Root | undefined | void>;
}
export interface DocumentationOptions {
  readonly highlighter: Highlighter;
  readonly language: DocumentationLanguage;
  readonly metadata: Readonly<
    Record<"revision" | "typescriptVersion" | "tsgoVersion" | "languageServiceVersion", string>
  >;
}
const chapters =
  "the-thesis the-model activegraph the-artifacts the-tools the-packet Investigation Attune AttuneReceipt failures AttuneToolkit repository".split(
    " ",
  );
const required =
  "top the-thesis a-living-edge-a-durable-core the-model branches roots cuttings activegraph the-artifacts the-tools the-packet Investigation Attune Attune.materialize Attune.activate Attune.acquireActive Attune.execute Attune.finalize Attune.recoverTerminal AttuneReceipt failures InvestigationLifecycleError AttuneToolFailure AttuneToolkit repository".split(
    " ",
  );
const structural = new Set(
  "top the-thesis a-living-edge-a-durable-core the-model branches roots cuttings activegraph the-artifacts the-tools the-packet failures repository".split(
    " ",
  ),
);
const researchPackPath = "python/attune-activegraph/src/attune_activegraph/research/pack.py";
const researchPackMainSource = `https://github.com/becker63/attune/blob/main/${researchPackPath}#L111-L149`;
const researchPackSource = (revision: string) =>
  `https://github.com/becker63/attune/blob/${revision}/${researchPackPath}#L111-L149`;
const interpretationToolPath = "python/attune-activegraph/src/attune_activegraph/research/ledger.py";
const interpretationToolMainSource = `https://github.com/becker63/attune/blob/main/${interpretationToolPath}#L20-L41`;
const interpretationToolSource = (revision: string) =>
  `https://github.com/becker63/attune/blob/${revision}/${interpretationToolPath}#L20-L41`;
const treeRows = (
  "                                                                                                                                                \n                                            .::*ooooo**######o*:                                                                                \n                                         .*ooooo#####oo##########o:                                                                             \n                                        :**:***oooooooo########ooooo*:                                                                          \n                              ..        ***:****ooo\\oooooo##ooooooo*o*o:                                                                        \n                        ...:*oo#####o:  ...::::*****oo\\\\o|oooo******:*::.                                                                       \n                     ......:*ooo######o:...:*:*:****ooo*\\|ooo**|oo**::.:**                                                                      \n                 .:::.....::*ooooo##**:.:::::::**o###ooo*\\*oo#o|oo**:::::**.                                                                    \n               .:::*:.....::::*:|:::::..:......  .*o##o***\\:*oo|**|*:...:***:                                                                   \n               *oooo*::::\\\\\\....|........:.....      :o*:.|:::/***|*::**oooo*****::..                                                           \n               *###o***::.....\\.|.....|.::....      .**::.|://////|:***ooooo***:::.......                                                       \n                :oo*::::........\\...::|::::..::**.   :::::|/:::**::\\:**:*::**o*:::::......                      ....                            \n                   ::::::.....  :\\****/::::::::::*:   ....|:::**::::*\\oo*:..::***:.........              .:*o**:..:*o*:..                       \n                               .:*|@*///:::...:::::      .|:::::::**oo\\oo**/*:::*::..::::.             ...::***::::::......                     \n" +
  "                                *o|o/***::.........      |           :o|oo/o*:....:::*o*.             .....:*:*:::::........                    \n                                 :|oo::::........         \\\\           |:/::::::::::.                ....::**::://.::::::.:.                    \n                                  |  ...::..               \\\\          |/                             :******/:....:******:                     \n                                  |                 @       \\\\         |                               .::**/:*::::::**:.                       \n                                  \\\\                          \\        |                                   /:::*::..                            \n                                   \\\\                          \\       /                                 |/                                     \n                                     \\\\                         ||    //        .*oooo*:.                 |     @                               \n                                      \\\\                        ||   /  ///  ://**********o*.             |                                     \n                                        \\                       Y|  //     :****::/::***oooo*:            Y                                     \n                                         \\\\                     Y|//      .**::::::/:********:.           Y                                     \n                                           \\\\\\\\\\\\\\\\             Y|/        ::....:**/*:::::::..           Y                                     \n                                                     \\\\\\\\\\\\     ||         .:...::::::*::::....          //                                     \n                                                          \\\\\\   ||          .::::...:::**::...          //  .:///*******:::**.                  \n                                                           \\\\\\  ||             ......:::::..           ////::::.::**//**::**:*:.                \n" +
  "                                                             \\\\ ||                           @        // :o*oo*::**o##/*:**::::..               \n                                                              \\\\||                                   /   .oo###ooooo|#o/******:::.              \n                                                                \\\\                                  /     o############oooooo**o#*              \n                                                                 \\\\\\                           /////     .o##############ooooo*oo.              \n                                         @                         \\\\                     /////          *#########/####oooo#o*.                \n                                                                    \\\\\\             /////     ///       .ooo#########//#oooooo*.                \n                                                                      \\\\           //            ///     *######/#####oooooo**:                 \n                                                                       ||         //              / ///*o///########o#ooooo*::.                 \n                                                                       ||       ///                / :***oo###/######/####ooo*:.                \n                                                                       ||      ///     .:ooo*o****|/.:::**oooo/##oo#########oo:                 \n                                                                       ||     //     :*****:::::**|@/**::*:::**/*oo###ooooo*:                   \n                                                                       ||   ///     :o::::....::\\:|:*/*::::....:*o********                      \n                                                                       ||  ///      .****:....\\..|......//.::///:*:::.:::.                      \n                                                                       || //         :***:......../...../......::::......                       \n" +
  "                                                                       ||//            .........   /    ./    ........                          \n                                       @                               ||/                          /                                           \n                                                                       ||                                                                       \n                                                                       ||                                                                       \n                                                                       ||                                                                       \n                                                                       ||                                                                       \n                                                                       ||                                                                       \n                                                                       ||                                                                       \n                                                                       ||                                                                       \n                                                                    \\\\\\||///                                                                    \n                                                            \\\\\\\\\\\\\\\\   ||   /////////                                                           \n                                                       \\\\\\\\\\                         ///                                                        \n                                                                                                                                                \n                                                                                                                                                "
).split("\n");
const botanicalCopy = [
  ["branches", "Branches"],
  ["roots", "Roots"],
  ["cuttings", "Cuttings"],
] as const;
type BotanicalMode = (typeof botanicalCopy)[number][0];
const botanicalRows: Record<BotanicalMode, readonly string[]> = {
  branches:
    String.raw`  .:*ooo*:.       .:*oooo*:.~:oo######oo*:   :oo######oo*:~  :*oooo*:\      /:*oooo*:~          \\    //~ .:*oo*:.  \\  //       .:**:.~:oo####oo*:.Y  Y     :*oooooo*:~  :*ooo*:\  |  |   //:*oo##o*:~           \|  | //~            Y  Y~             \/~             Y`.split(
      "~",
    ),
  roots:
    String.raw`                       :o###*.~                      *#####o:~                     :o######:~                    .*#######o~                   :o###o####*.~                  :####*:o###o:~                 .*###o. *####:~             ..:*o####: :o#####o*:..~  .:*oo###########Y    Y#######oo*:.~:*o###oo*:.      /      \    .:*o#####o*:~:*:.            Y        \Y       .:*oo*:~      ..:*oooY/  \        \  \Yoo*:.~ .:*oo*::/        Y        Y   \  \:*:~.:*     /          \      / \   Y~      :/             \Y   Y   \   \o*:.`.split(
      "~",
    ),
  cuttings:
    String.raw`        .:*ooo*:      .:*oo*:.~      :oo#####oo*:  :oo####oo:~        :*ooo*:\      /:*oo*:~                \    /~   .:*oo*:.      \  /~ :oo####oo*:      \Y~   :*ooo*:\        Y~           \      /~            \    /~             \  /~              //`.split(
      "~",
    ),
};
const data = (node: { readonly data?: unknown }): AttuneData =>
  (node.data as { readonly attune?: AttuneData } | undefined)?.attune ?? {};
const textOf = (node: unknown): string => {
  if (typeof node !== "object" || node === null) return "";
  if ("value" in node && typeof node.value === "string") return node.value;
  return "children" in node && Array.isArray(node.children) ? node.children.map(textOf).join("") : "";
};
const proseOf = (node: unknown) => textOf(node).replace(/\s+/gu, " ").trim();
const record = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const stringList = (value: unknown, required = false): value is readonly string[] =>
  Array.isArray(value) && (!required || value.length > 0) && value.every(nonEmpty);
const exactKeys = (
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) && keys.every((key) => required.includes(key) || optional.includes(key))
  );
};
const packetShape = (code: Code) => {
  let value: unknown;
  try {
    value = JSON.parse(code.value);
  } catch {
    return false;
  }
  if (
    !record(value) ||
    !exactKeys(
      value,
      ["schema_version", "motif_id", "source_case_ids", "source_run_ids", "source_artifact_refs", "claim"],
      [
        "applicability",
        "exclusion_cues",
        "repository_signals",
        "joern_queries",
        "formal_artifacts",
        "falsifiers",
        "counterexamples",
        "lowerings",
        "ledgers",
        "unresolved_questions",
      ],
    ) ||
    value.schema_version !== 1 ||
    !nonEmpty(value.motif_id) ||
    !stringList(value.source_case_ids, true) ||
    !stringList(value.source_run_ids, true) ||
    !stringList(value.source_artifact_refs, true) ||
    !nonEmpty(value.claim)
  )
    return false;
  for (const field of [
    "applicability",
    "exclusion_cues",
    "repository_signals",
    "formal_artifacts",
    "falsifiers",
    "counterexamples",
    "unresolved_questions",
  ])
    if (value[field] !== undefined && !stringList(value[field])) return false;
  if (
    !Array.isArray(value.joern_queries) ||
    !value.joern_queries.every(
      (query) =>
        record(query) &&
        ((exactKeys(query, ["cpgql"]) && nonEmpty(query.cpgql)) || (exactKeys(query, ["dsl"]) && record(query.dsl))),
    ) ||
    !Array.isArray(value.lowerings) ||
    !value.lowerings.every(
      (lowering) =>
        record(lowering) &&
        exactKeys(lowering, [], ["artifact_ref", "kind", "proven_scope", "omitted_semantics"]) &&
        (lowering.artifact_ref === undefined || nonEmpty(lowering.artifact_ref)) &&
        (lowering.kind === undefined || lowering.kind === "ast-grep" || lowering.kind === "other") &&
        (lowering.proven_scope === undefined || nonEmpty(lowering.proven_scope)) &&
        (lowering.omitted_semantics === undefined || stringList(lowering.omitted_semantics)),
    ) ||
    !Array.isArray(value.ledgers) ||
    !value.ledgers.every(
      (ledger) =>
        record(ledger) &&
        exactKeys(
          ledger,
          ["schema_version", "case_id", "question", "source_refs", "retained", "next_step", "expected_discriminator"],
          ["omitted", "assumptions", "limitations", "supersedes"],
        ) &&
        ledger.schema_version === 1 &&
        nonEmpty(ledger.case_id) &&
        nonEmpty(ledger.question) &&
        stringList(ledger.source_refs, true) &&
        stringList(ledger.retained, true) &&
        stringList(ledger.omitted ?? []) &&
        stringList(ledger.assumptions ?? []) &&
        nonEmpty(ledger.next_step) &&
        nonEmpty(ledger.expected_discriminator) &&
        stringList(ledger.limitations ?? []) &&
        (ledger.supersedes === undefined || nonEmpty(ledger.supersedes)),
    )
  )
    return false;
  const strings: string[] = [];
  const collect = (item: unknown): void => {
    if (typeof item === "string") strings.push(item);
    else if (Array.isArray(item)) item.forEach(collect);
    else if (record(item)) Object.values(item).forEach(collect);
  };
  collect(value);
  return (
    !strings.some((item) => item.includes("<exact ActiveGraph run id>")) &&
    strings.every((item) => [...item.matchAll(/\{([^{}\n]+)\}/gu)].every((match) => match[1] === "id"))
  );
};
const safeId = (id: string) => /^(?!constructor$|prototype$|__proto__$)[A-Za-z][A-Za-z0-9._:-]*$/u.test(id);
const safeHref = (href: string) =>
  (href.startsWith("#") && safeId(href.slice(1))) || /^https:\/\/[^/\s]+\/\S+$/u.test(href);
const safeSourcePath = (path: string) =>
  !path.startsWith("/") &&
  !path.includes("\\") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
const immutable = (href: string, path: string) =>
  safeSourcePath(path) &&
  href.includes(`/${path}#L`) &&
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/blob\/[0-9a-f]{40}\/[^#\s]+#L[1-9]\d*(?:-L[1-9]\d*)?$/u.test(href);
const report = (file: VFile, reason: string, node?: RootContent) =>
  void (file.message(reason, node?.position).fatal = true);
const validOpeningItem = (item: ListItem) => {
  const paragraph = item.children[0];
  if (item.children.length !== 1 || paragraph?.type !== "paragraph") return false;
  const [lead, ...explanation] = paragraph.children;
  return lead?.type === "strong" && textOf(lead).trim() !== "" && explanation.map(textOf).join("").trim() !== "";
};
const botanicalSections = (nodes: readonly RootContent[]) =>
  botanicalCopy.map(([mode, title]) => {
    const index = nodes.findIndex(
      (node) => node.type === "heading" && node.depth === 3 && data(node).id === mode && textOf(node) === title,
    );
    const paragraph = nodes[index + 1];
    return {
      index,
      paragraph: paragraph?.type === "paragraph" ? paragraph : undefined,
    };
  });
const between = (tree: Root, from: string, until: string) => {
  const index = (id: string, after = -1) =>
    tree.children.findIndex((node, at) => at > after && node.type === "heading" && data(node).id === id);
  const start = index(from);
  const end = index(until, start);
  return start < 0 ? [] : tree.children.slice(start + 1, end < 0 ? undefined : end);
};
const checkDocumentation = lintRule<Root>("attune-docs:document", (tree, file) => {
  const headings: Heading[] = [];
  const codes: Code[] = [];
  const links: Link[] = [];
  visit(tree, (node) => {
    const override = node.data as
      | { readonly hChildren?: unknown; readonly hName?: unknown; readonly hProperties?: unknown }
      | undefined;
    if (node.type === "html") report(file, "Source-authored HTML is forbidden", node);
    if (node.type === "image" || node.type === "imageReference")
      report(file, "Source-authored runtime assets are forbidden", node);
    if (override !== undefined && ["hChildren", "hName", "hProperties"].some((key) => key in override))
      report(file, "Source-authored HTML overrides are forbidden");
    if (node.type === "heading") headings.push(node);
    else if (node.type === "code") codes.push(node);
    else if (node.type === "link") links.push(node);
  });
  const ids = new Map<string, Heading>();
  for (const heading of headings) {
    const metadata = data(heading);
    const id = metadata.id;
    if (id === undefined || !safeId(id)) report(file, "Heading has no safe canonical id", heading);
    else {
      if (ids.has(id)) report(file, `Duplicate canonical id #${id}`, heading);
      ids.set(id, heading);
      if (
        !structural.has(id) &&
        (metadata.sourcePath === undefined ||
          metadata.sourceHref === undefined ||
          !immutable(metadata.sourceHref, metadata.sourcePath))
      )
        report(file, `Declaration #${id} needs a normalized immutable source`, heading);
    }
  }
  if (
    headings.some((heading) => data(heading).id === "complete-investigation") ||
    links.some((link) => link.url === "#complete-investigation")
  )
    report(file, "The removed #complete-investigation chapter or a stale link to it remains");
  const fragments = new Set(ids.keys());
  for (const code of codes)
    for (const target of data(code).targets ?? []) {
      if (
        !safeId(target.id) ||
        !Number.isInteger(target.start) ||
        !Number.isInteger(target.end) ||
        target.start < 0 ||
        target.end <= target.start ||
        target.end > code.value.length
      )
        report(file, "Invalid code definition target", code);
      else if (fragments.has(target.id)) report(file, `Duplicate canonical id #${target.id}`, code);
      else fragments.add(target.id);
    }
  if (headings.filter(({ depth }) => depth === 1).length !== 1) report(file, "The document needs exactly one h1");
  const title = tree.children[0];
  const opening = tree.children[1];
  const thesis = tree.children[2];
  if (
    title?.type !== "heading" ||
    title.depth !== 1 ||
    data(title).id !== "top" ||
    textOf(title) !== "Attune" ||
    opening?.type !== "list" ||
    opening.ordered !== false ||
    opening.children.length !== 3 ||
    opening.children.some((item) => !validOpeningItem(item)) ||
    thesis?.type !== "heading" ||
    thesis.depth !== 2 ||
    data(thesis).id !== "the-thesis"
  )
    report(file, "The opening needs h1#top, one three-item value list, and h2#the-thesis in order");
  let previous = -1;
  for (const id of required) {
    const at = headings.findIndex((heading) => data(heading).id === id);
    if (at < 0) report(file, `Required heading #${id} is missing`);
    else if (at <= previous) report(file, `Required heading #${id} is out of curriculum order`);
    previous = Math.max(previous, at);
  }
  const thesisNodes = between(tree, "the-thesis", "the-model");
  const thesisWords = proseOf({ children: thesisNodes }).split(/\s+/u).filter(Boolean).length;
  if (
    thesisWords < 275 ||
    thesisWords > 340 ||
    thesisNodes.some(({ type }) => ["code", "list"].includes(type)) ||
    thesisNodes.filter(({ type }) => type === "blockquote").length !== 1
  )
    report(file, "The thesis needs one uninterrupted 275–340 word text argument and closing thesis statement");
  const modelNodes = between(tree, "the-model", "activegraph");
  const diagrams = modelNodes.filter((node): node is Code => node.type === "code" && node.lang === "text");
  if (
    diagrams.length !== 1 ||
    !/materialized[\s\S]*active[\s\S]*receipt[\s\S]*finalized[\s\S]*evidence/u.test(diagrams[0]?.value ?? "")
  )
    report(file, "The model needs its one plain-text lifecycle diagram");
  const botanical = botanicalSections(modelNodes);
  if (
    botanical.some(
      ({ index, paragraph }, position) =>
        index < 0 ||
        (position > 0 && index <= botanical[position - 1]!.index) ||
        paragraph === undefined ||
        proseOf(paragraph).length < 40,
    )
  )
    report(file, "The model needs three ordered h3 botanical sections with immediate introductory prose");
  const activeGraphNodes = between(tree, "activegraph", "the-artifacts");
  const activeGraphProse = activeGraphNodes.map(proseOf).join("\n");
  const activeGraphNarrative = activeGraphNodes
    .filter(({ type }) => type !== "code")
    .map(proseOf)
    .join("\n");
  const freeFormReference = headings.find((heading) => textOf(heading) === "FreeFormReference");
  const freeFormReferenceLink =
    freeFormReference !== undefined &&
    activeGraphNodes.some((node) => {
      let found = false;
      visit(node, "link", (link) => {
        if (textOf(link) === "FreeFormReference" && link.url === `#${data(freeFormReference).id ?? ""}`) found = true;
      });
      return found;
    });
  const researchPackLink = activeGraphNodes.some((node) => {
    let found = false;
    visit(node, "link", (link) => {
      if (
        textOf(link) === "make_research_pack" &&
        /^https:\/\/github\.com\/becker63\/attune\/blob\/[0-9a-f]{40}\/python\/attune-activegraph\/src\/attune_activegraph\/research\/pack\.py#L111-L149$/u.test(
          link.url,
        )
      )
        found = true;
    });
    return found;
  });
  const interpretationToolLink = activeGraphNodes.some((node) => {
    let found = false;
    visit(node, "link", (link) => {
      if (
        textOf(link) === "make_interpretation_tool" &&
        /^https:\/\/github\.com\/becker63\/attune\/blob\/[0-9a-f]{40}\/python\/attune-activegraph\/src\/attune_activegraph\/research\/ledger\.py#L20-L41$/u.test(
          link.url,
        )
      )
        found = true;
    });
    return found;
  });
  const activeGraphCode = activeGraphNodes.filter((node): node is Code => node.type === "code");
  const researchPackDeclaration = activeGraphCode[0];
  if (
    activeGraphCode.length !== 1 ||
    researchPackDeclaration?.lang !== "python" ||
    data(researchPackDeclaration).role !== "activegraph-declaration" ||
    !["Case", "Claim", "Evidence", "Result"].every((name) =>
      new RegExp(`\\b${name}\\b`, "u").test(activeGraphNarrative),
    ) ||
    !/\brecord_interpretation\b/u.test(activeGraphNarrative) ||
    !/\bmake_interpretation_tool\b/u.test(activeGraphNarrative) ||
    !/\bResult\.retained_ledger_refs\b/u.test(activeGraphNarrative) ||
    !/(?:not|never)[^.]{0,120}\bfifth\b[^.]{0,80}\bobject\b/iu.test(activeGraphNarrative) ||
    !/(?:not|never)[^.]{0,160}\bMCP\b/iu.test(activeGraphNarrative) ||
    !/\buniversal (?:intermediate representation|IR)\b/iu.test(activeGraphNarrative) ||
    !/\bnative files?\b/iu.test(activeGraphNarrative) ||
    !/\breceipt\b/iu.test(activeGraphNarrative) ||
    !/\bdef make_research_pack\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\bmake_workspace_tools\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\bmake_pack\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\bmake_interpretation_tool\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\bobject_types\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\brelation_types\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\bbehaviors\b/u.test(researchPackDeclaration?.value ?? "") ||
    !/\b_llm\("investigate"[\s\S]*\b_llm\("synthesize"/u.test(researchPackDeclaration?.value ?? "") ||
    !/\bdef make_interpretation_tool\(case_id:\s*str\)\s*->\s*Tool:/u.test(researchPackDeclaration?.value ?? "") ||
    !/@typed_tool\([\s\S]*?\bname="record_interpretation"[\s\S]*?\binput_model=InterpretationLedger[\s\S]*?\boutput_model=LedgerReference[\s\S]*?\bdeterministic=True[\s\S]*?\)\s*def record_interpretation\([\s\S]*?\bledger:\s*InterpretationLedger[\s\S]*?\)\s*->\s*LedgerReference:/u.test(
      researchPackDeclaration?.value ?? "",
    ) ||
    !/\bif ledger\.case_id != case_id:\s*raise ValueError\(\s*"interpretation ledger must address the configured case"\s*\)/u.test(
      researchPackDeclaration?.value ?? "",
    ) ||
    !/\breturn LedgerReference\(ref=ledger_reference\(ledger\)\)/u.test(researchPackDeclaration?.value ?? "") ||
    !/\breturn record_interpretation\b/u.test(researchPackDeclaration?.value ?? "") ||
    /\b(?:ToolCall|PAYMENT_(?:MODEL|PROPERTY|RULE)_(?:CALL|LEDGER(?:_REF)?))\b/u.test(activeGraphProse) ||
    /\bactiveGraph\.call\b/u.test(activeGraphProse) ||
    !freeFormReferenceLink ||
    !researchPackLink ||
    !interpretationToolLink
  )
    report(
      file,
      "ActiveGraph needs one source-faithful make_research_pack and make_interpretation_tool declaration, four-object ledger mechanics, native receipt continuations, and canonical links",
    );
  const headingFor = (label: string) => headings.find((heading) => textOf(heading) === label);
  const artifactNodes = between(tree, "the-artifacts", "the-tools");
  const artifactCodes = artifactNodes.filter((node): node is Code => node.type === "code");
  const artifactLayout = artifactCodes[0];
  const artifactText = artifactLayout?.value ?? "";
  const artifactNarrative = artifactNodes
    .filter(({ type }) => type !== "code")
    .map(proseOf)
    .join("\n");
  const artifactReference = headings.find((heading) => textOf(heading) === "ArtifactReference");
  const artifactReferenceLink =
    artifactReference !== undefined &&
    artifactNodes.some((node) => {
      let found = false;
      visit(node, "link", (link) => {
        if (textOf(link) === "ArtifactReference" && link.url === `#${data(artifactReference).id ?? ""}`) found = true;
      });
      return found;
    });
  const artifactOperationLinks = {
    repository_checkpoint: "RepositoryCheckpointTool",
    artifact_promote: "ArtifactPromoteTool",
  } as const;
  const linkedArtifactOperations = Object.entries(artifactOperationLinks).every(([name, symbol]) => {
    const target = headingFor(symbol);
    if (target === undefined) return false;
    return artifactNodes.some((node) => {
      let found = false;
      visit(node, "link", (link) => {
        if (textOf(link) === name && link.url === `#${data(target).id ?? ""}`) found = true;
      });
      return found;
    });
  });
  const artifactLines = artifactText.split("\n");
  const treeEntry = (name: string) =>
    artifactLines
      .map((line) => /^(?<indent>\s*)(?:├──|└──|\|--|`--)\s+(?<name>\S.*)$/u.exec(line))
      .find((match) => match?.groups?.name === name);
  const investigationEntry = treeEntry("investigation.json");
  const repoEntry = treeEntry("repo/");
  const artifactsEntry = treeEntry("artifacts/");
  const artifactSubtree = (tool: string, next?: string) => {
    const start = artifactText.indexOf(`${tool}/<invocationId>/`);
    const end = next === undefined ? artifactText.length : artifactText.indexOf(`${next}/<invocationId>/`, start);
    return start < 0 || end < 0 ? "" : artifactText.slice(start, end);
  };
  const orderedEnvelope = (subtree: string, nativeNames: readonly string[]) => {
    const request = subtree.indexOf("request.json");
    const references = subtree.indexOf("references.json");
    const native = nativeNames.map((name) => subtree.indexOf(name));
    const result = subtree.indexOf("result.json");
    const receipt = subtree.indexOf("receipt.json");
    return (
      request >= 0 &&
      references > request &&
      native.every((position) => position > references) &&
      result > Math.max(...native) &&
      receipt > result
    );
  };
  const joernTree = artifactSubtree("joern", "maude");
  const maudeTree = artifactSubtree("maude", "property");
  const propertyTree = artifactSubtree("property", "ast-grep");
  const astGrepTree = artifactSubtree("ast-grep");
  const artifactMechanics = {
    agentFsMount: /\bAgentFS database\b[^.]{0,140}\bFUSE mount\b/iu.test(artifactNarrative),
    attachedRepo: /\brepo\/[^.]{0,100}\bnormal attached Git worktree\b/iu.test(artifactNarrative),
    checkpoint:
      /\brepository_checkpoint\b[^.]{0,100}\bpolicy\b[^.]{0,40}\bcommit\b[^.]{0,160}\bstages?\b[^.]{0,120}\bnon-ignored\b/iu.test(
        artifactNarrative,
      ),
    exactSnapshot: /\b(?:checkpoint|Git commit)\b[^.]{0,180}\bexact snapshot\b/iu.test(artifactNarrative),
    operationScoped: /\boperation-scoped\b[^.]{0,180}\bFUSE mount\b/iu.test(artifactNarrative),
    overlay: /\bcopy-up\b[^.]{0,140}\bwhiteouts?\b[^.]{0,180}\b(?:immutable|base)\b/iu.test(artifactNarrative),
    privateMount: /\b(?:mount path|raw path)\b[^.]{0,180}\b(?:not|never)\b[^.]{0,100}\bMCP\b/iu.test(artifactNarrative),
    promotedProperty: /\bproperty\.ts\b[^.]{0,180}\brepo\/payment-retry\.property\.ts\b/iu.test(artifactNarrative),
    promotion: /\bartifact_promote\b[^.]{0,180}\bcaller-selected retained artifact\b[^.]{0,160}\brepo\//iu.test(
      artifactNarrative,
    ),
    remount: /\bremounts?\b[^.]{0,140}\b(?:same work|delta)\b/iu.test(artifactNarrative),
    requireClean: /\brequire-clean\b[^.]{0,160}\bHEAD\b/iu.test(artifactNarrative),
    terminalUnmount: /(?:\bterminal\b[\s\S]{0,220}\bunmounts?\b|\bunmounts?\b[\s\S]{0,220}\bterminal\b)/iu.test(
      artifactNarrative,
    ),
    toolExhaust: /\bTool exhaust\b[^.]{0,100}\bartifacts\//iu.test(artifactNarrative),
    worktreeLayout:
      /├── repo\/[\s\S]*src\/…[\s\S]*rules\/<rule>\.yml[\s\S]*payment-retry\.property\.ts[\s\S]*└── artifacts\//u.test(
        artifactText,
      ),
  } as const;
  const missingArtifactMechanics = Object.entries(artifactMechanics).flatMap(([name, present]) =>
    present ? [] : [name],
  );
  if (
    artifactCodes.length !== 1 ||
    artifactLayout?.lang !== "text" ||
    data(artifactLayout).role !== "artifact-layout" ||
    !artifactReferenceLink ||
    !linkedArtifactOperations ||
    artifactLines[0] !== "<investigation>/" ||
    investigationEntry == null ||
    repoEntry == null ||
    artifactsEntry == null ||
    repoEntry.groups?.indent !== artifactsEntry.groups?.indent ||
    (investigationEntry.groups?.indent?.length ?? 0) <= (artifactsEntry.groups?.indent?.length ?? 0) ||
    missingArtifactMechanics.length > 0 ||
    !/artifacts\/\{tool\}\/\{invocationId\}\//u.test(artifactNarrative) ||
    !orderedEnvelope(joernTree, ["query.cpgql", "environment.json", "joern-output.json"]) ||
    !orderedEnvelope(maudeTree, ["module.maude", "commands.maude", "stdout.txt", "stderr.txt", "process.json"]) ||
    !orderedEnvelope(propertyTree, [
      "property.ts",
      "parameters.json",
      "stdout.txt",
      "stderr.txt",
      "process.json",
      "run-details.json",
      "counterexample.json",
    ]) ||
    !orderedEnvelope(astGrepTree, [
      "inputs/",
      "stdout.txt",
      "stderr.txt",
      "process.json",
      "findings.jsonl",
      "patch.diff",
    ]) ||
    !/joern-server-output\.json[^\n]*server process output[^\n]*bounded/iu.test(artifactText) ||
    !/joern-error\.json[^\n]*query execution or diagnostic failure/iu.test(artifactText) ||
    !/counterexample\.json[^\n]*(?:optional|fail|failed|failing)/iu.test(artifactText) ||
    !/findings\.jsonl[^\n]*(?:optional|scan)/iu.test(artifactText) ||
    !/patch\.diff[^\n]*(?:optional|rewrite|apply)/iu.test(artifactText) ||
    !/\bopaque\b[^.]{0,100}\bledger\b[^.]{0,100}\b(?:address|reference)\b/iu.test(artifactNarrative) ||
    !/\bledger body\b[^.]{0,100}\bActiveGraph event history\b/iu.test(artifactNarrative) ||
    !/\bwithout\b[^.]{0,100}\b(?:retrieving|interpreting)\b/iu.test(artifactNarrative) ||
    !["uri", "mediaType", "sha256", "bytes", "complete"].every((field) =>
      new RegExp(`\\b${field}\\b`, "u").test(artifactNarrative),
    ) ||
    !/\breceipt(?:'s|s)?\b[^.]{0,100}\bartifacts\b[^.]{0,120}\bArtifactReference\b/iu.test(artifactNarrative) ||
    !/\bcomplete\b[^.]{0,100}\bfull byte (?:capture|stream)\b/iu.test(artifactNarrative) ||
    !/\bcomplete\b[^.]{0,140}(?:not|does not)[^.]{0,100}\b(?:semantic|correct|interpretation)\b/iu.test(
      artifactNarrative,
    ) ||
    !/\bresult\.json\b[^.]{0,100}\bbefore\b[^.]{0,100}\breceipt\.json\b/iu.test(artifactNarrative) ||
    !/\bneither\b[^.]{0,160}\breceipt artifact\b/iu.test(artifactNarrative) ||
    !/\binvestigation\.json\b[^.]{0,180}\bresolvedCommit\b/iu.test(artifactNarrative) ||
    !/(?:\bGit HEAD\b[^.]{0,80}\brepo\b|\brepo\b[^.]{0,80}\bHEAD\b)/iu.test(artifactNarrative) ||
    !/\bfinalSnapshot\b/iu.test(artifactNarrative) ||
    !/\bfinalizedAt\b/iu.test(artifactNarrative) ||
    /(?:\bbases\/|\bbindings\/|\bcapsules\/|\bmounts\/|\/(?:home|root)\/|~\/|runtime[-_ ]?root|internal home)/iu.test(
      `${artifactNarrative}\n${artifactText}`,
    )
  )
    report(
      file,
      `The artifacts needs one operation-scoped filesystem tree with exact envelopes, native evidence, opaque ledger linkage, ArtifactReference fields, and snapshot semantics${
        missingArtifactMechanics.length === 0 ? "" : `; missing mechanics: ${missingArtifactMechanics.join(", ")}`
      }`,
    );
  const toolNodes = between(tree, "the-tools", "the-packet");
  const packetNodes = between(tree, "the-packet", "Investigation");
  const toolCode = toolNodes.filter((node): node is Code => node.type === "code");
  const packetCode = packetNodes.filter((node): node is Code => node.type === "code");
  const researchPacketNodes = [...toolNodes, ...packetNodes];
  const researchPacketText = researchPacketNodes.map(proseOf).join("\n");
  const checkpointCalls = researchPacketText.match(/mcp\.call\("repository_checkpoint"/gu) ?? [];
  const toolCalls = researchPacketText.match(/mcp\.call\("[a-z_]+"/gu) ?? [];
  const strongRunIns = toolNodes.flatMap((node, index) =>
    node.type === "paragraph" && node.children[0]?.type === "strong"
      ? [[textOf(node.children[0]), index] as const]
      : [],
  );
  const orderedRunIns = (expected: readonly string[]) => {
    let previous = -1;
    return expected.every((label) => {
      const found = strongRunIns.find(([value, index]) => value === label && index > previous);
      if (found === undefined) return false;
      previous = found[1];
      return true;
    });
  };
  if (
    !orderedRunIns(["Observe.", "Formalize.", "Falsify.", "Enshrine."]) ||
    !orderedRunIns([
      "Repository source.",
      "Native query.",
      "Retained result.",
      "Agent-authored abstraction.",
      "Concrete falsifier.",
      "Deterministic residue.",
    ])
  )
    report(file, "The tools need ordered ordinary-prose epistemic and artifact run-ins");
  const operationTargets = {
    repository_materialize: "RepositoryMaterializeTool",
    repository_checkpoint: "RepositoryCheckpointTool",
    joern_query: "JoernQueryTool",
    maude_run: "MaudeRunTool",
    property_run: "PropertyRunTool",
    artifact_promote: "ArtifactPromoteTool",
    ast_grep_run: "AstGrepRunTool",
  } as const;
  for (const [name, symbol] of Object.entries(operationTargets)) {
    const target = headingFor(symbol);
    const proseLink = toolNodes.some((node) => {
      let found = false;
      visit(node, "link", (link) => {
        if (textOf(link) === name && link.url === `#${data(target ?? {}).id ?? ""}`) found = true;
      });
      return found;
    });
    if (target === undefined || !proseLink)
      report(file, `The tools prose operation ${name} does not resolve to ${symbol}`);
  }
  const toolTypescript = toolNodes.filter((node): node is Code => node.type === "code" && node.lang === "ts");
  const toolPython = toolNodes.filter((node): node is Code => node.type === "code" && node.lang === "python");
  const orderedArtifacts = [
    "joern-output.json",
    "stdout.txt",
    "run-details.json",
    "counterexample.json",
    "repo/payment-retry.property.ts",
    "inputs/rules/review-retryable-payment-without-operation-key.yml",
    "findings.jsonl",
  ];
  let artifactPosition = -1;
  const artifactOrderIsExact = orderedArtifacts.every((name) => {
    const found = researchPacketText.indexOf(name, artifactPosition + 1);
    if (found < 0) return false;
    artifactPosition = found;
    return true;
  });
  if (
    toolCode.map(({ lang }) => lang).join(" ") !==
      "ts ts scala ts json maude ts console ts ts json json yaml ts json" ||
    toolCode.length !== 15 ||
    packetCode.length !== 1 ||
    packetCode[0]?.lang !== "json" ||
    toolTypescript.length !== 7 ||
    toolPython.length !== 0 ||
    toolTypescript.some((code) => data(code).role !== "investigation" || data(code).checked !== true) ||
    !packetShape(packetCode[0] ?? ({ type: "code", value: "" } as Code)) ||
    !artifactOrderIsExact ||
    checkpointCalls.length !== 2 ||
    toolCalls.length !== 8 ||
    !/\b(?:materialized|versioned)\b[\s\S]{0,180}\brules\/review-retryable-payment-without-operation-key\.yml\b/iu.test(
      researchPacketText,
    ) ||
    !/receipt\.artifacts\.find\([\s\S]{0,240}\.endsWith\("\/property\.ts"\)[\s\S]{0,600}mcp\.call\("artifact_promote"[\s\S]{0,600}destinationPath:\s*"payment-retry\.property\.ts"[\s\S]{0,800}mcp\.call\("repository_checkpoint"[\s\S]{0,600}expectedSnapshot:\s*EXACT_SNAPSHOT[\s\S]{0,600}policy:\s*"commit"[\s\S]{0,800}expectedSnapshot:\s*\w+\.snapshotId/u.test(
      researchPacketText,
    ) ||
    /\b(?:workspace_write|ordinary access to the mounted worktree|agent writes the YAML)\b/iu.test(
      researchPacketText,
    ) ||
    /\b(?:joern\.summary|result\.json|attune:(?:joern|maude|property):|ToolCall|PAYMENT_(?:MODEL|PROPERTY|RULE)_(?:CALL|LEDGER_REF)|query_ref|output_ref|findings_ref)\b/u.test(
      researchPacketText,
    ) ||
    /<exact ActiveGraph run id>/u.test(researchPacketText) ||
    /\bactiveGraph\.call\b/u.test(researchPacketText) ||
    !/fulfillOrder[\s\S]*repository_materialize[\s\S]*repository_checkpoint[\s\S]*cpg\.method\.name\("fulfillOrder"\)[\s\S]*joern_query[\s\S]*joern-output\.json[\s\S]*PAYMENT-RETRY[\s\S]*maude_run[\s\S]*stdout\.txt[\s\S]*property_run[\s\S]*run-details\.json[\s\S]*counterexample\.json[\s\S]*review-retryable-payment-without-operation-key[\s\S]*severity:\s*warning[\s\S]*artifact_promote[\s\S]*repository_checkpoint[\s\S]*ast_grep_run[\s\S]*findings\.jsonl[\s\S]*"motif_id"[\s\S]*"ledgers"[\s\S]*"omitted_semantics"[\s\S]*"unresolved_questions"/u.test(
      researchPacketText,
    ) ||
    !/\bcrash-after-charge\b/u.test(researchPacketText)
  )
    report(
      file,
      "The tools and Packet need eight linked TypeScript calls and exact native artifact-file continuations without illustrative ActiveGraph calls",
    );
  for (const [name, symbol] of Object.entries(operationTargets)) {
    const target = headingFor(symbol);
    if (
      target !== undefined &&
      !toolTypescript.some((code) =>
        (data(code).links ?? []).some(
          (link) => code.value.slice(link.start, link.end) === name && link.href === `#${data(target).id}`,
        ),
      )
    )
      report(file, `The checked tools code operation ${name} does not link to ${symbol}`);
  }
  for (const code of codes) {
    const metadata = data(code);
    if (metadata.id !== undefined) report(file, "Code use sites cannot own fragment ids", code);
    if (["signature", "example", "investigation"].includes(metadata.role ?? "") && metadata.checked !== true)
      report(file, "Signature/example/investigation is not compiler checked", code);
    let end = -1;
    for (const range of [...(metadata.links ?? [])].sort((a, b) => a.start - b.start)) {
      if (
        !Number.isInteger(range.start) ||
        !Number.isInteger(range.end) ||
        range.start < 0 ||
        range.end <= range.start ||
        range.end > code.value.length ||
        range.start < end ||
        !safeHref(range.href)
      )
        report(file, "Invalid resolved definition range", code);
      end = Math.max(end, range.end);
      if (range.href.startsWith("#") && !fragments.has(range.href.slice(1)))
        report(file, `Code link ${range.href} has no heading`, code);
    }
  }
  for (const link of links) {
    if (!safeHref(link.url)) report(file, `Unsafe link ${link.url}`, link);
    if (link.url.startsWith("#") && !fragments.has(link.url.slice(1)))
      report(file, `Link ${link.url} has no canonical heading`, link);
  }
});

const resolveDocumentation: Plugin<[DocumentationLanguage], Root> = function (language) {
  return async (tree, file) => (await language.resolve(tree, file)) ?? tree;
};
const pinActiveGraphSources: Plugin<[DocumentationOptions["metadata"]], Root> = function (metadata) {
  return (tree) => {
    visit(tree, "link", (link) => {
      if (link.url === researchPackMainSource) link.url = researchPackSource(metadata.revision);
      else if (link.url === interpretationToolMainSource) link.url = interpretationToolSource(metadata.revision);
    });
    return tree;
  };
};
const element = (
  tagName: Element["tagName"],
  properties: Element["properties"] = {},
  children: ElementContent[] = [],
): Element => ({ type: "element", tagName, properties, children });
const text = (value: string): ElementContent => ({ type: "text", value });
type FlairMode = "hero" | BotanicalMode;
const treeClass = (glyph: string, x: number, y: number, mode: FlairMode) => {
  const tone = (x * 17 + y * 31 + glyph.charCodeAt(0)) % 4;
  return glyph === " "
    ? ""
    : mode === "roots"
      ? "tree-root tree-wood"
      : glyph === "@"
        ? `tree-accent tree-leaf tree-leaf-${tone}`
        : /[/\\|Y]/u.test(glyph)
          ? mode === "hero" && y >= 51
            ? "tree-root tree-wood"
            : `tree-wood tree-wood-${tone}`
          : `tree-leaf tree-leaf-${tone}`;
};
const treeLine = (row: string, y: number, mode: FlairMode) => {
  const children: ElementContent[] = [];
  let start = 0,
    key = treeClass(row[0] ?? " ", 0, y, mode);
  for (let x = 1; x <= row.length; x++) {
    const next = x === row.length ? "" : treeClass(row[x]!, x, y, mode);
    if (x < row.length && next === key) continue;
    const run = row.slice(start, x).replaceAll("@", "*");
    children.push(key === "" ? text(run) : element("span", { className: key.split(" ") }, [text(run)]));
    start = x;
    key = next;
  }
  return children;
};
const flairFallback = (mode: FlairMode): Element => {
  const rows = mode === "hero" ? treeRows : botanicalRows[mode];
  const columns = Math.max(...rows.map((row) => row.length));
  const botanical = mode !== "hero";
  return element(
    botanical ? "span" : "pre",
    {
      className: ["ascii-fallback", botanical ? "botanical-fallback" : "tree-fallback"],
      ariaHidden: "true",
    },
    rows.flatMap((row, y) => [
      ...treeLine(row.padEnd(columns), y, mode),
      ...(y === rows.length - 1 ? [] : [text("\n")]),
    ]),
  );
};
const flairHost = (mode: FlairMode): Element => {
  const botanical = mode !== "hero";
  return element(
    botanical ? "span" : "div",
    {
      className: ["ascii-flair", botanical ? "botanical-flair" : "tree-flair", `ascii-${mode}`],
      ariaHidden: "true",
      dataTreeMode: mode,
      dataTreeState: "fallback",
    },
    [
      flairFallback(mode),
      element("canvas", {
        className: ["ascii-canvas", botanical ? "botanical-canvas" : "tree-canvas"],
        ariaHidden: "true",
      }),
    ],
  );
};
const anchor = (href: string, label: string, className?: string, properties = {}): Element =>
  element("a", { href, ...properties, ...(className === undefined ? {} : { className: [className] }) }, [text(label)]);
const codeHandler =
  (highlighter: Highlighter): Handler =>
  (_state, code: Code) => {
    const metadata = data(code);
    const sourceLang = code.lang || "text";
    const lang = { ts: "typescript", js: "javascript", maude: "text" }[sourceLang] ?? sourceLang;
    const root = highlighter.codeToHast(code.value, {
      lang,
      theme: "github-light-default",
      decorations: [
        ...(metadata.targets ?? []).map(({ start, end, id }) => ({
          start,
          end,
          tagName: "span",
          alwaysWrap: true,
          properties: { id },
        })),
        ...(metadata.links ?? []).map(({ start, end, href }) => ({
          start,
          end,
          tagName: "a",
          alwaysWrap: true,
          properties: {
            href,
            className: ["definition-link"],
            ...(href.startsWith("#") ? {} : { rel: ["noreferrer"] }),
          },
        })),
      ].sort((left, right) => left.start - right.start),
    });
    const pre = root.children.find((child): child is Element => child.type === "element" && child.tagName === "pre");
    if (pre === undefined) throw new Error("Shiki did not return a pre element");
    pre.properties = {
      ...pre.properties,
      className: ["attune-code"],
      dataLanguage: sourceLang === "maude" ? "maude" : lang,
      ...(metadata.role === undefined ? {} : { dataCodeRole: metadata.role }),
      ...(metadata.checked === true ? { dataAttuneChecked: "true" } : {}),
    };
    return pre;
  };
const headingHandler: Handler = (state, heading: Heading) => {
  const metadata = data(heading);
  const title = element(
    `h${heading.depth}`,
    {
      ...(metadata.id === undefined ? {} : { id: metadata.id }),
      ...(["declaration", "member"].includes(metadata.role ?? "") ? { dataAttuneSymbol: "" } : {}),
    },
    state.all(heading) as ElementContent[],
  );
  return metadata.sourceHref === undefined
    ? title
    : element("div", { className: ["heading-row"] }, [
        title,
        anchor(metadata.sourceHref, "source ↗", "source-link", {
          rel: ["noreferrer"],
          ariaLabel: `View source for ${textOf(heading)}`,
        }),
      ]);
};
const layout =
  (metadata: DocumentationOptions["metadata"]) =>
  (tree: HastRoot): HastRoot => {
    let body: Element | undefined;
    visit(tree, "element", (node) => {
      if (node.tagName === "body") {
        body = node;
        return EXIT;
      }
    });
    if (body === undefined) throw new Error("rehype-document omitted body");
    const content = body.children.filter((node): node is Element => node.type === "element");
    const guideStart = content.findIndex((node) => node.tagName === "h2" && node.properties.id === "the-thesis");
    const openingContent = guideStart < 0 ? [] : content.slice(0, guideStart);
    const guide = guideStart < 0 ? [] : content.slice(guideStart);
    const [title, values] = openingContent;
    if (
      openingContent.length !== 2 ||
      title?.type !== "element" ||
      title.tagName !== "h1" ||
      title.properties.id !== "top" ||
      values?.type !== "element" ||
      values.tagName !== "ul"
    )
      throw new Error("The rendered opening is not the checked title and three-item value list");
    const modelStart = guide.findIndex((node) => node.tagName === "h2" && node.properties.id === "the-model");
    const modelEnd = guide.findIndex((node) => node.tagName === "h2" && node.properties.id === "activegraph");
    const thesis = modelStart < 0 ? [] : guide.slice(0, modelStart);
    const model = modelStart < 0 || modelEnd < 0 ? [] : guide.slice(modelStart, modelEnd);
    for (const node of thesis)
      if (["p", "blockquote"].includes(node.tagName)) {
        const current = Array.isArray(node.properties.className) ? node.properties.className : [];
        node.properties.className = [...current, "thesis-prose"];
      }
    const botanical = botanicalCopy.map(([mode, title]) => {
      const headingIndex = model.findIndex(
        (node) => node.tagName === "h3" && node.properties.id === mode && textOf(node) === title,
      );
      const anchor = model[headingIndex + 1];
      if (headingIndex < 0 || anchor?.tagName !== "p")
        throw new Error(`The checked ${mode} subsection has no immediate prose anchor`);
      return anchor;
    });
    for (const node of model)
      if (["p", "ul", "ol", "blockquote"].includes(node.tagName)) {
        const current = Array.isArray(node.properties.className) ? node.properties.className : [];
        node.properties.className = [...current, "model-prose"];
      }
    botanical.forEach((paragraph, index) => {
      const [mode] = botanicalCopy[index]!;
      const current = Array.isArray(paragraph.properties.className) ? paragraph.properties.className : [];
      paragraph.properties.className = [...current, "botanical-anchor", `botanical-${mode}`];
      paragraph.children = [flairHost(mode), ...paragraph.children];
    });
    const code = (value: string) => element("code", {}, [text(value)]);
    const host = flairHost("hero");
    body.children = [
      anchor("#main", "Skip to content", "skip-link"),
      element("nav", { className: ["contents"], ariaLabel: "Guide contents" }, [
        anchor("#top", "attune-mcp", "wordmark"),
        element(
          "ol",
          {},
          chapters.map((id) =>
            element("li", {}, [
              anchor(
                `#${id}`,
                id === "the-thesis"
                  ? "The thesis"
                  : id === "the-model"
                    ? "The model"
                    : id === "activegraph"
                      ? "ActiveGraph"
                      : id === "the-artifacts"
                        ? "The artifacts"
                        : id === "the-tools"
                          ? "The tools"
                          : id === "the-packet"
                            ? "The Packet"
                            : id[0]!.toUpperCase() + id.slice(1),
              ),
            ]),
          ),
        ),
      ]),
      element("main", { id: "main", className: ["guide"] }, [
        element("div", { className: ["opening"] }, [
          element("div", { className: ["opening-copy"] }, openingContent),
          host,
        ]),
        ...guide,
      ]),
      element("footer", { className: ["site-footer"] }, [
        text(`Source ${metadata.revision} · TypeScript `),
        code(metadata.typescriptVersion),
        text(" · @effect/tsgo "),
        code(metadata.tsgoVersion),
        text(" · @effect/language-service "),
        code(metadata.languageServiceVersion),
      ]),
      element("script", { src: "tree.js", defer: true }),
    ];
    return tree;
  };

const schema: typeof defaultSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    ..."html head body title meta link main nav footer canvas script".split(" "),
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...((defaultSchema.attributes?.["*"] ?? []) as string[]),
      ..."className ariaHidden ariaLabel dataAttuneSymbol dataTreeMode dataTreeState".split(" "),
    ],
    meta: ["name", "content", "charSet"],
    link: ["rel", "href"],
    a: ["href", "rel", "className", "ariaLabel"],
    pre: ["style", "dataLanguage", "dataCodeRole", "dataAttuneChecked"],
    span: ["style"],
    script: ["src", "defer"],
  },
  protocols: { ...defaultSchema.protocols, href: ["http", "https"], src: ["http", "https"] },
};
const classed = (node: Element, name: string) =>
  Array.isArray(node.properties.className) && node.properties.className.includes(name);
const checkHtml: Plugin<[], HastRoot> = function () {
  return (tree, file) => {
    const ids = new Set<string>();
    const local: string[] = [];
    const elements: Element[] = [];
    let charsets = 0;
    visit(tree, "element", (node) => {
      elements.push(node);
      const id = node.properties.id;
      if (typeof id === "string") {
        if (ids.has(id)) report(file, `Sanitized HTML duplicates #${id}`);
        ids.add(id);
      }
      const href = node.properties.href;
      if (node.tagName === "a" && typeof href === "string") {
        if (!safeHref(href)) report(file, `Sanitized HTML has unsafe ${href}`);
        if (href.startsWith("#")) local.push(href.slice(1));
      } else if (node.tagName === "link" && href !== "styles.css")
        report(file, "Sanitized HTML has an unexpected asset");
      if ("audio embed iframe img object source track video".split(" ").includes(node.tagName))
        report(file, "Sanitized HTML has an unexpected runtime asset");
      if (node.tagName === "meta" && node.properties.charSet === "utf-8") charsets += 1;
    });
    if (charsets !== 1) report(file, "Sanitized HTML needs exactly one UTF-8 charset");
    for (const target of local) if (!ids.has(target)) report(file, `Sanitized HTML link #${target} has no target`);
    const one = (tag: string, name?: string) => {
      const found = elements.filter((node) => node.tagName === tag && (name === undefined || classed(node, name)));
      return found.length === 1 ? found[0] : undefined;
    };
    const opening = one("div", "opening");
    const copy = one("div", "opening-copy");
    const host = one("div", "tree-flair");
    const fallback = one("pre", "tree-fallback");
    const canvas = one("canvas", "tree-canvas");
    const main = one("main", "guide");
    const botanicalAnchors = elements.filter((node) => node.tagName === "p" && classed(node, "botanical-anchor"));
    const botanicalHosts = elements.filter((node) => node.tagName === "span" && classed(node, "botanical-flair"));
    const guideChildren = main?.children.filter((node): node is Element => node.type === "element") ?? [];
    const script = one("script");
    const copyChildren = copy?.children.filter((node): node is Element => node.type === "element") ?? [];
    const title = copyChildren[0];
    const values = copyChildren[1];
    const items =
      values?.tagName === "ul" ? values.children.filter((node): node is Element => node.type === "element") : [];
    const rows = fallback === undefined ? [] : textOf(fallback).split("\n");
    if (
      copyChildren.length !== 2 ||
      title?.tagName !== "h1" ||
      title.properties.id !== "top" ||
      textOf(title) !== "Attune" ||
      values?.tagName !== "ul" ||
      items.length !== 3 ||
      items.some((item) => item.tagName !== "li")
    )
      report(file, "Sanitized HTML needs the checked opening title and three-item value list");
    const thesisStart = guideChildren.findIndex((node) => node.tagName === "h2" && node.properties.id === "the-thesis");
    const modelStart = guideChildren.findIndex((node) => node.tagName === "h2" && node.properties.id === "the-model");
    const activeGraphStart = guideChildren.findIndex(
      (node) => node.tagName === "h2" && node.properties.id === "activegraph",
    );
    const artifactsStart = guideChildren.findIndex(
      (node) => node.tagName === "h2" && node.properties.id === "the-artifacts",
    );
    const toolsStart = guideChildren.findIndex((node) => node.tagName === "h2" && node.properties.id === "the-tools");
    const thesisNodes = thesisStart < 0 || modelStart < 0 ? [] : guideChildren.slice(thesisStart, modelStart);
    const thesisProse = thesisNodes.filter((node) => ["p", "blockquote"].includes(node.tagName));
    if (
      thesisStart !== 1 ||
      modelStart <= thesisStart ||
      thesisProse.length < 8 ||
      thesisProse.some((node) => !classed(node, "thesis-prose")) ||
      thesisNodes.some((node) => classed(node, "botanical-anchor") || classed(node, "botanical-flair"))
    )
      report(file, "Sanitized HTML needs a text-only thesis chapter immediately after the hero");
    const activeGraphNodes =
      activeGraphStart < 0 || artifactsStart < 0 ? [] : guideChildren.slice(activeGraphStart, artifactsStart);
    const activeGraphProse = activeGraphNodes.filter((node) => node.tagName === "p");
    const activeGraphDeclarations = activeGraphNodes.filter(
      (node) => node.tagName === "pre" && node.properties.dataCodeRole === "activegraph-declaration",
    );
    if (
      activeGraphStart <= modelStart ||
      artifactsStart <= activeGraphStart ||
      activeGraphProse.length < 3 ||
      activeGraphDeclarations.length !== 1 ||
      activeGraphNodes.some(
        (node) =>
          (node.tagName === "pre" && !activeGraphDeclarations.includes(node)) ||
          ["thesis-prose", "model-prose", "botanical-anchor", "botanical-flair"].some((name) => classed(node, name)),
      )
    )
      report(file, "Sanitized HTML needs an ordinary full-width ActiveGraph prose chapter");
    const artifactNodes = artifactsStart < 0 || toolsStart < 0 ? [] : guideChildren.slice(artifactsStart, toolsStart);
    const artifactLayouts = artifactNodes.filter(
      (node) =>
        node.tagName === "pre" &&
        node.properties.dataLanguage === "text" &&
        node.properties.dataCodeRole === "artifact-layout",
    );
    if (
      toolsStart <= artifactsStart ||
      artifactNodes.filter((node) => node.tagName === "p").length < 4 ||
      artifactLayouts.length !== 1 ||
      artifactNodes.some(
        (node) =>
          (node.tagName === "pre" && !artifactLayouts.includes(node)) ||
          ["thesis-prose", "model-prose", "botanical-anchor", "botanical-flair"].some((name) => classed(node, name)),
      )
    )
      report(file, "Sanitized HTML needs one ordinary full-width public artifact filesystem layout");
    if (
      opening?.children.length !== 2 ||
      opening.children[0] !== copy ||
      opening.children[1] !== host ||
      host?.children.length !== 2 ||
      host.children[0] !== fallback ||
      host.children[1] !== canvas ||
      host.properties.ariaHidden !== "true" ||
      host.properties.dataTreeMode !== "hero" ||
      host.properties.dataTreeState !== "fallback" ||
      rows.length !== 56 ||
      rows.some((row) => row.length !== 144 || !/^[\x20-\x7e]+$/u.test(row)) ||
      fallback?.properties.ariaHidden !== "true" ||
      canvas?.properties.ariaHidden !== "true" ||
      canvas?.children.length !== 0 ||
      script?.properties.src !== "tree.js" ||
      script.properties.defer !== true ||
      script.children.length !== 0 ||
      Object.keys(script.properties).sort().join(" ") !== "defer src"
    )
      report(file, "Sanitized HTML needs the exact fixed tree shell and classic script");
    if (
      botanicalAnchors.length !== botanicalCopy.length ||
      botanicalHosts.length !== botanicalCopy.length ||
      botanicalHosts.some((botanicalHost, index) => {
        const [mode, title] = botanicalCopy[index]!;
        const headingIndex = guideChildren.findIndex(
          (node) => node.tagName === "h3" && node.properties.id === mode && textOf(node) === title,
        );
        const botanicalAnchor = guideChildren[headingIndex + 1];
        const [botanicalFallback, botanicalCanvas] = botanicalHost.children.filter(
          (child): child is Element => child.type === "element",
        );
        const botanicalLines = botanicalFallback === undefined ? [] : textOf(botanicalFallback).split("\n");
        const expectedRows = botanicalRows[mode];
        const expectedColumns = Math.max(...expectedRows.map((row) => row.length));
        const anchorProse =
          botanicalAnchor === undefined
            ? ""
            : proseOf({ children: botanicalAnchor.children.filter((child) => child !== botanicalHost) });
        return (
          headingIndex < 0 ||
          botanicalAnchor?.tagName !== "p" ||
          botanicalAnchor !== botanicalAnchors[index] ||
          botanicalHost.children.length !== 2 ||
          botanicalHost.properties.ariaHidden !== "true" ||
          botanicalHost.properties.dataTreeMode !== mode ||
          botanicalHost.properties.dataTreeState !== "fallback" ||
          botanicalAnchor.children[0] !== botanicalHost ||
          !classed(botanicalAnchor, "model-prose") ||
          !classed(botanicalAnchor, `botanical-${mode}`) ||
          anchorProse.length < 40 ||
          !classed(botanicalHost, `ascii-${mode}`) ||
          botanicalFallback?.tagName !== "span" ||
          !classed(botanicalFallback, "botanical-fallback") ||
          botanicalFallback.properties.ariaHidden !== "true" ||
          botanicalLines.length !== expectedRows.length ||
          botanicalLines.some(
            (row, rowIndex) =>
              row.length !== expectedColumns ||
              !/^[\x20-\x7e]+$/u.test(row) ||
              row !== expectedRows[rowIndex]!.padEnd(expectedColumns),
          ) ||
          botanicalCanvas?.tagName !== "canvas" ||
          !classed(botanicalCanvas, "botanical-canvas") ||
          botanicalCanvas.properties.ariaHidden !== "true" ||
          botanicalCanvas.children.length !== 0
        );
      })
    )
      report(file, "Sanitized HTML needs three exact inline botanical shader shells");
    if (
      elements.some((node) =>
        ["botanical-field", "botanical-item", "botanical-label", "botanical-prose"].some((name) => classed(node, name)),
      )
    )
      report(file, "Botanical shaders may not create list, row, label, or prose-wrapper UI");
  };
};

export const makeDocumentationProcessor = (options: DocumentationOptions) =>
  unified()
    .use(resolveDocumentation, options.language)
    .use(pinActiveGraphSources, options.metadata)
    .use(checkDocumentation, 2)
    .use(remarkRehype, {
      allowDangerousHtml: false,
      clobberPrefix: "",
      handlers: { code: codeHandler(options.highlighter), heading: headingHandler },
    })
    .use(rehypeDocument, {
      title: "Attune",
      language: "en",
      css: ["styles.css"],
      responsive: true,
      meta: [
        {
          name: "description",
          content: "Follow every branch, keep repository research rooted in evidence, and propagate what survives.",
        },
      ],
    })
    .use(layout, options.metadata)
    .use(rehypeSanitize, schema)
    .use(checkHtml)
    .use(rehypeStringify);

export const compileDocumentation = async (tree: Root, options: DocumentationOptions) => {
  const file = new VFile({ path: "index.html" });
  const processor = makeDocumentationProcessor(options);
  const hast = await processor.run(tree, file);
  for (const message of file.messages) message.fatal = true;
  if (file.messages.length > 0) throw new Error(file.messages.map(String).join("\n"));
  return { html: `<!doctype html>\n${processor.stringify(hast, file)}`, file };
};
