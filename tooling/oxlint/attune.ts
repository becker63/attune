import { fileURLToPath } from "node:url";

import { TSDocConfiguration, TSDocParser, type DocNode } from "@microsoft/tsdoc";
import { TSDocConfigFile } from "@microsoft/tsdoc-config";
import { Diagnostic, type ESTree, Plugin, Rule, RuleContext, Visitor } from "effect-oxlint";
import * as Effect from "effect/Effect";

type Node = ESTree.Node & Record<string, unknown>;
type Source = RuleContext["Service"]["sourceCode"];
type Subject = {
  node: Node;
  key: string;
  name: string;
  public: boolean;
  annotated: boolean;
  call?: Node;
};

const set = (items: string) => new Set(items.split(" "));
const typeWords = set("string number boolean object array");
const hidden = set("private protected");
const calls = set(
  "FunctionDeclaration TSDeclareFunction TSEmptyBodyFunctionExpression FunctionExpression ArrowFunctionExpression TSMethodSignature TSCallSignatureDeclaration TSConstructSignatureDeclaration TSFunctionType TSConstructorType TSIndexSignature",
);
const declarations = set(
  "FunctionDeclaration TSDeclareFunction ClassDeclaration TSInterfaceDeclaration TSTypeAliasDeclaration TSEnumDeclaration TSModuleDeclaration",
);
const members = set(
  "MethodDefinition TSAbstractMethodDefinition PropertyDefinition TSAbstractPropertyDefinition AccessorProperty TSMethodSignature TSPropertySignature TSCallSignatureDeclaration TSConstructSignatureDeclaration TSIndexSignature TSEnumMember",
);
const node = (value: unknown): Node | undefined =>
  value !== null && typeof value === "object" && "type" in value ? (value as Node) : undefined;
const nodes = (value: unknown): readonly Node[] => (Array.isArray(value) ? (value as readonly Node[]) : []);
const name = (value: unknown): string | undefined => {
  const item = node(value);
  if (item?.type === "Identifier" || item?.type === "PrivateIdentifier")
    return `${item.type === "PrivateIdentifier" ? "#" : ""}${String(item.name)}`;
  return item?.type === "Literal" && typeof item.value === "string" ? item.value : undefined;
};
const annotation = (value: unknown) => {
  const item = node(value);
  return item?.type === "TSTypeAnnotation" ? node(item.typeAnnotation) : item;
};
const unwrap = (value: unknown): Node => {
  let item = value as Node;
  while (["TSParameterProperty", "RestElement", "AssignmentPattern"].includes(item.type))
    item = (item.parameter ?? item.argument ?? item.left) as Node;
  return item;
};
const syntheticNames: Readonly<Record<string, string>> = {
  TSCallSignatureDeclaration: "<call>",
  TSConstructSignatureDeclaration: "<construct>",
  TSIndexSignature: "<index>",
};
const subjectName = (item: Node) =>
  name(item.id) ?? name(item.key) ?? syntheticNames[item.type] ?? (item.computed === true ? "<computed>" : undefined);
const callable = (item: Node) => {
  if (calls.has(item.type)) return item;
  let value: unknown;
  if (item.type === "VariableDeclarator") {
    const typed = annotation(node(item.id)?.typeAnnotation);
    value = typed !== undefined && calls.has(typed.type) ? typed : (node(item.init) ?? typed);
  } else if (members.has(item.type) || item.type === "Property" || item.type === "TSTypeAliasDeclaration")
    value = node(item.value) ?? annotation(item.typeAnnotation);
  const result = node(value);
  return result !== undefined && calls.has(result.type) ? result : undefined;
};
const objectMembers = (value: unknown): readonly Node[] => {
  const item = node(value);
  if (item?.type === "ObjectExpression") return nodes(item.properties);
  const callee = node(item?.callee);
  if (
    item?.type === "CallExpression" &&
    callee?.type === "MemberExpression" &&
    name(callee.object) === "Object" &&
    name(callee.property) === "assign"
  )
    return nodes(item.arguments).flatMap((argument) =>
      argument.type === "ObjectExpression" ? nodes(argument.properties) : [],
    );
  return [];
};
const collect = (program: ESTree.Program, source: Source) => {
  const result: Subject[] = [];
  const add = (syntax: Node, prefix: string, isPublic: boolean, member = false, anchor = syntax) => {
    const itemName = subjectName(syntax);
    if (itemName === undefined) return;
    const call = callable(syntax);
    result.push({
      node: anchor,
      key: prefix + itemName,
      name: itemName,
      public: isPublic && (!member || call !== undefined),
      annotated: call !== undefined && (!member || isPublic),
      ...(call === undefined ? {} : { call }),
    });
  };
  const visit = (entry: Node, prefix = "", scopePublic = true): void => {
    const wrapper = entry.type.startsWith("Export") ? entry : undefined;
    const decl = node(wrapper?.declaration) ?? entry;
    const isPublic = scopePublic && wrapper !== undefined;
    if (decl.type === "VariableDeclaration") {
      for (const binding of nodes(decl.declarations)) {
        const itemName = subjectName(binding);
        if (itemName === undefined) continue;
        add(binding, prefix, isPublic, false, decl);
        if (isPublic)
          for (const member of objectMembers(binding.init)) add(member, `${prefix}${itemName}.`, true, true);
      }
      return;
    }
    if (!declarations.has(decl.type)) return;
    const itemName = subjectName(decl);
    if (itemName === undefined) return;
    add(decl, prefix, isPublic);
    const next = `${prefix}${itemName}.`;
    if (decl.type === "TSModuleDeclaration") {
      nodes(node(decl.body)?.body).forEach((child) => visit(child, next, isPublic));
      return;
    }
    const shape = decl.type === "TSTypeAliasDeclaration" ? annotation(decl.typeAnnotation) : node(decl.body);
    for (const member of nodes(shape?.body ?? shape?.members ?? decl.members)) {
      const memberName = subjectName(member);
      if (memberName === undefined) continue;
      const visible = isPublic && !memberName.startsWith("#") && !hidden.has(String(member.accessibility));
      add(member, next, visible, true);
    }
  };
  nodes((program as Node).body).forEach((entry) => visit(entry));
  const packageDoc = source
    .getAllComments()
    .find((comment) => comment.type === "Block" && comment.value.includes("@packageDocumentation"));
  if (packageDoc !== undefined)
    result.push({
      node: packageDoc as Node,
      key: "<package>",
      name: "package",
      public: true,
      annotated: false,
    });
  return result.sort((left, right) => left.node.start - right.node.start);
};

const prose = (item: DocNode | undefined): string => {
  if (item === undefined) return "";
  const text = (item as unknown as { text?: unknown }).text;
  const joined = [typeof text === "string" ? text : "", ...item.getChildNodes().map(prose)].join(" ");
  return joined.replace(/\s+/g, " ").trim();
};
const lines = (raw: string) =>
  raw
    .slice(3, -2)
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*\*\s?/u, ""));
let parser: TSDocParser | undefined;
const parse = (raw: string) => {
  if (parser === undefined) {
    const configuration = new TSDocConfiguration();
    const config = TSDocConfigFile.loadFile(fileURLToPath(new URL("../../tsdoc.json", import.meta.url)));
    if (config.hasErrors) throw new Error(config.getErrorSummary());
    config.configureParser(configuration);
    if (config.hasErrors) throw new Error(config.getErrorSummary());
    parser = new TSDocParser(configuration);
  }
  const context = parser.parseString(raw);
  return {
    context,
    raw,
    summary: prose(context.docComment.summarySection),
    remarks: prose(context.docComment.remarksBlock?.content),
  };
};
const comment = (source: Source, subject: Subject): string | undefined => {
  if (subject.key === "<package>") return source.text.slice(subject.node.start, subject.node.end);
  const found = source
    .getAllComments()
    .findLast(
      (item) =>
        item.type === "Block" &&
        item.value.startsWith("*") &&
        !item.value.includes("@packageDocumentation") &&
        item.end <= subject.node.start &&
        /^(?:export(?:\s+(?:default|declare))?)?$/u.test(source.text.slice(item.end, subject.node.start).trim()),
    );
  return found === undefined ? undefined : source.text.slice(found.start, found.end);
};
const placeholder =
  /\b(?:todo|tbd)\b|description here|^(?:returns? )?(?:the )?(?:return )?value$|^(?:the )?(\w+) \1$|^(?:the )?(?:string|number|boolean|object|array|value|type|interface|class|function|method|property)?$/u;
const meaningful = (value: string, declaration: string) => {
  const lower = value.toLowerCase().replaceAll("`", "");
  const normalized = lower.replace(/[.!:;]+$/gu, "").trim();
  const concept = declaration.toLowerCase();
  const words = normalized.replace(/^the /u, "").split(/\s+/u);
  return (
    normalized !== "" &&
    normalized !== concept &&
    normalized !== `the ${concept}` &&
    !(words.length === 2 && words[0] === concept && typeWords.has(words[1]!)) &&
    !placeholder.test(normalized)
  );
};
const exampleIssues = (raw: string) =>
  lines(raw)
    .join("\n")
    .split(/(?=^\s*@example\b)/gmu)
    .slice(1)
    .flatMap((example) => {
      const body = example.split(/(?=^\s*@\w+\b)/mu)[0] ?? "";
      const fence = /```(\w+)\s*\n([\s\S]*?)^\s*```;?\s*$/mu.exec(body);
      if (fence === null) return ["@example must contain one fenced program"];
      const language = fence[1] ?? "";
      const code = fence[2] ?? "";
      const issues: string[] = [];
      if (!/^(?:ts|typescript|js|javascript)$/u.test(language))
        issues.push("@example fence language must be TypeScript or JavaScript");
      if (code.trim() === "") issues.push("@example program must not be empty");
      if (/@ts-(?:nocheck|ignore|expect-error)|@effect-diagnostics(?:-next-line)?/iu.test(code))
        issues.push("@example must not suppress TypeScript or Effect diagnostics");
      for (const match of code.matchAll(/^\s*\/\/\s*@filename\b(.*)$/gmu)) {
        const path = /^:\s*(\S+)\s*$/u.exec(match[1] ?? "")?.[1];
        if (
          path === undefined ||
          /^(?:\/|[a-z]+:)/iu.test(path) ||
          path.includes("\\") ||
          path.split("/").includes("..")
        )
          issues.push("@filename must name a relative virtual path");
      }
      if (/^\s*\/\/\s*@errors\b(?!:\s+\d+(?:\s+\d+)*\s*$)/mu.test(code))
        issues.push("@errors must contain only numeric diagnostic codes");
      let open = false;
      for (const [, directive] of code.matchAll(/^\s*\/\/\s+(---cut\S*)\s*$/gmu)) {
        if (directive === "---cut-start---") {
          if (open) issues.push("cut regions must not nest");
          open = true;
        } else if (directive === "---cut-end---") {
          if (!open) issues.push("cut-end requires a preceding cut-start");
          open = false;
        } else if (!/^---(?:cut|cut-before|cut-after)---$/u.test(directive ?? ""))
          issues.push("unknown or malformed cut directive");
      }
      if (open) issues.push("cut-start and cut-end must be balanced");
      return issues;
    });
const effectReturn = (call: Node) => {
  const returned = annotation(call.returnType ?? call.typeAnnotation);
  const typeName = node(returned?.typeName);
  return (
    returned?.type === "TSTypeReference" &&
    typeName?.type === "TSQualifiedName" &&
    `${name(typeName.left)}.${name(typeName.right)}` === "Effect.Effect"
  );
};
const equal = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((item, index) => item === right[index]);
const message = {
  competing: "merged concept has competing @remarks",
  repeated: "non-owning facet must not repeat the narrative",
  inheritedTarget: "{@inheritDoc} must name a declaration",
  inheritedMix: "{@inheritDoc} must not mix a second local narrative",
  failure: "@failure must be `@failure {@link FailureType} - Explanation.`",
  overload: "overload facets need compatible parameter vocabularies",
  returnType: "exported or module callable needs a return annotation",
  noReturns: "constructor, setter, or void callable must not have @returns",
  returns: "non-void callable needs @returns",
  returnText: "@returns needs a description",
  effectFailure: "Effect error channels use @failure, not @throws",
} as const;

const audit = (program: ESTree.Program, source: Source) => {
  const issues: { node: Node; message: string }[] = [];
  const report = (node: Node, message: string) => void issues.push({ node, message });
  for (const group of Map.groupBy(collect(program, source), (item) => item.key).values()) {
    const docs = group.map((subject) => {
      const raw = comment(source, subject);
      if (raw === undefined) return;
      try {
        return parse(raw);
      } catch (cause) {
        report(subject.node, `TSDoc analysis failed: ${String(cause)}`);
      }
    });
    const owners = docs.flatMap((doc, index) => (doc?.remarks ? [index] : []));
    const owner = owners[0] ?? 0;
    const subject = group[owner]!;
    const fail = (bad: boolean, message: string, at = subject.node) => {
      if (bad) report(at, message);
    };
    fail(owners.length > 1, message.competing, group[owners[1] ?? owner]!.node);
    docs.forEach((doc, index) => {
      const repeated =
        index !== owner &&
        doc !== undefined &&
        Boolean(doc.summary || doc.remarks || doc.context.docComment.inheritDocTag);
      fail(repeated, message.repeated, group[index]!.node);
    });
    const doc = docs[owner];
    if (doc === undefined) {
      report(subject.node, `document ${subject.name} with TSDoc`);
      continue;
    }
    const parsed = doc.context.docComment;
    doc.context.log.messages.forEach((message) => report(subject.node, `TSDoc: ${message.unformattedText}`));
    const inherited = parsed.inheritDocTag !== undefined;
    fail(inherited && parsed.inheritDocTag?.declarationReference === undefined, message.inheritedTarget);
    const tagCount = parsed.params.count + parsed.typeParams.count + parsed.customBlocks.length;
    const localNarrative = Boolean(doc.summary || doc.remarks || tagCount || parsed.returnsBlock);
    fail(inherited && localNarrative, message.inheritedMix);
    fail(!inherited && !meaningful(doc.summary, subject.name), `${subject.name} needs a meaningful summary`);
    fail(
      !inherited && subject.public && (!meaningful(doc.remarks, subject.name) || doc.remarks === doc.summary),
      `${subject.name} needs substantive @remarks`,
    );
    for (const line of lines(doc.raw).filter((line) => line.trimStart().startsWith("@failure")))
      fail(!/^@failure\s+\{@link\s+[^|}\s]+(?:#[^|}\s]+)?\}\s+-\s+\S/u.test(line.trim()), message.failure);
    exampleIssues(doc.raw).forEach((message) => report(subject.node, message));

    const callableFacets = group.flatMap((item) => item.call ?? []);
    if (callableFacets.length === 0) continue;
    const shape = (call: Node) => [
      ...nodes(call.params ?? call.parameters).map((parameter) => name(unwrap(parameter)) ?? "<destructured>"),
      "|",
      ...nodes(node(call.typeParameters)?.params).map((type) => name(type.name) ?? "?"),
    ];
    const kinds = new Set(
      group.map((item) =>
        ["FunctionDeclaration", "TSDeclareFunction"].includes(item.node.type) ? "function" : item.node.type,
      ),
    );
    const accessors = group.some((item) => item.node.kind === "get" || item.node.kind === "set");
    const incompatible = callableFacets.some((call) => !equal(shape(callableFacets[0]!), shape(call)));
    fail(group.length > 1 && kinds.size === 1 && !accessors && incompatible, message.overload);
    const call = subject.call ?? callableFacets[0]!;
    const params = nodes(call.params ?? call.parameters);
    const types = nodes(node(call.typeParameters ?? subject.node.typeParameters)?.params);
    const returned = node(call.returnType ?? call.typeAnnotation);
    const noReturnKind = subject.node.kind === "constructor" || subject.node.kind === "set";
    for (const facet of group.filter((item) => item.annotated && item.call !== undefined)) {
      const facetCall = facet.call!;
      const skipsReturn = facet.node.kind === "constructor" || facet.node.kind === "set";
      fail(
        !skipsReturn && node(facetCall.returnType ?? facetCall.typeAnnotation) === undefined,
        message.returnType,
        facet.node,
      );
      for (const parameter of nodes(facetCall.params ?? facetCall.parameters))
        fail(
          node(unwrap(parameter).typeAnnotation) === undefined,
          `parameter ${name(unwrap(parameter)) ?? "<destructured>"} needs a type annotation`,
          facet.node,
        );
    }
    if (inherited) continue;
    const paramNames = params.map((parameter) => name(unwrap(parameter)) ?? "<destructured>");
    const typeNames = types.map((type) => name(type.name) ?? "<anonymous>");
    const docParams = parsed.params.blocks.map((block) => block.parameterName);
    const docTypes = parsed.typeParams.blocks.map((block) => block.parameterName);
    fail(!equal(paramNames, docParams), `@param order must be ${paramNames.join(", ") || "(empty)"}`);
    fail(!equal(typeNames, docTypes), `@typeParam order must be ${typeNames.join(", ") || "(empty)"}`);
    for (const block of [...parsed.params.blocks, ...parsed.typeParams.blocks])
      fail(!meaningful(prose(block.content), block.parameterName), `@param ${block.parameterName} needs a description`);
    const returnedType = annotation(returned);
    const noReturn =
      noReturnKind ||
      returnedType?.type === "TSVoidKeyword" ||
      (returnedType?.type === "TSTypePredicate" && returnedType.asserts === true) ||
      returned === undefined;
    fail((parsed.returnsBlock === undefined) === !noReturn, noReturn ? message.noReturns : message.returns);
    fail(
      parsed.returnsBlock !== undefined && !meaningful(prose(parsed.returnsBlock.content), "return"),
      message.returnText,
    );
    fail(callableFacets.some(effectReturn) && /@throws\b/iu.test(doc.raw), message.effectFailure);
  }
  return issues;
};
const safelyAudit = (program: ESTree.Program, source: Source) => {
  try {
    return audit(program, source);
  } catch (cause) {
    return [{ node: program as Node, message: `attune/tsdoc failed safely: ${String(cause)}` }];
  }
};

export const tsdoc = Rule.define({
  name: "tsdoc",
  meta: Rule.meta({
    type: "problem",
    description: "Keep production TypeScript TSDoc mechanically publishable",
  }),
  create: function* () {
    const context = yield* RuleContext;
    return Visitor.onExit("Program", (program) =>
      Effect.forEach(safelyAudit(program, context.sourceCode), (issue) => context.report(Diagnostic.make(issue)), {
        discard: true,
      }),
    );
  },
});

export default Plugin.define({ name: "attune", specifier: "./tooling/oxlint/attune.ts", rules: { tsdoc } });
