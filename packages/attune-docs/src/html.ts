import { renderCodeBlock } from "./highlight.ts";
import type {
  ApiCallSignature,
  ApiExample,
  ApiManifest,
  ApiMember,
  ApiProvenance,
  ApiSymbol,
  ApiTypeReference,
  DocumentationText,
  LifecycleRelation,
  SourceSpan,
  TypeParameterDoc,
} from "./model.ts";
import type { StaticPage } from "./static-pages.ts";

export const MIN_CHECKED_EXAMPLES_PER_PAGE = 3;

const requestsEmittedFile = (code: string): boolean =>
  /^\s*\/\/\s*@show(?:Emit|EmittedFile)\b/mu.test(code);

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const normalizeBasePath = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return "/";
  const segments = trimmed.replace(/^\/+|\/+$/gu, "").split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        !/^[a-zA-Z0-9._~-]+$/u.test(segment),
    )
  ) {
    throw new Error(`Unsafe documentation base path: ${JSON.stringify(value)}`);
  }
  return `/${segments.join("/")}/`;
};

export const withBase = (basePath: string, path = ""): string =>
  `${normalizeBasePath(basePath)}${path.replace(/^\/+/u, "")}`;

const symbolHref = (basePath: string, symbol: ApiSymbol): string =>
  withBase(basePath, `api/${symbol.slug}.html`);

const memberHref = (
  basePath: string,
  symbol: ApiSymbol,
  member: ApiMember,
): string => withBase(basePath, `api/${symbol.slug}/${member.slug}.html`);

const primarySymbol = (manifest: ApiManifest): ApiSymbol => {
  const subject =
    manifest.symbols.find((symbol) => symbol.exportName === "Attune") ??
    manifest.symbols[0];
  if (subject === undefined) {
    throw new Error("The reference needs at least one public type.");
  }
  return subject;
};

const inline = (
  value: string,
  manifest: ApiManifest,
  basePath: string,
): string =>
  value
    .split(/(\{@link\s+[^}]+\}|`[^`]+`)/gu)
    .map((part) => {
      const linked = /^\{@link\s+([^|\s}]+)(?:\s*\|[^}]*)?\}$/u.exec(part);
      const code =
        linked?.[1] ??
        (part.startsWith("`") && part.endsWith("`")
          ? part.slice(1, -1)
          : undefined);
      if (code === undefined) return escapeHtml(part);
      const [symbolName, memberName] = code.split(/[.#]/u);
      const symbol = manifest.symbols.find(
        (candidate) =>
          candidate.exportName === symbolName || candidate.id === code,
      );
      if (symbol === undefined) {
        return `<code class="inline-code">${escapeHtml(code)}</code>`;
      }
      const member = symbol.members.find(
        (candidate) => candidate.name === memberName,
      );
      const destination =
        member === undefined
          ? symbolHref(basePath, symbol)
          : memberHref(basePath, symbol, member);
      return `<a class="inline-type" href="${escapeHtml(destination)}"><code>${escapeHtml(code)}</code></a>`;
    })
    .join("");

const prose = (text: string, manifest: ApiManifest, basePath: string): string =>
  text
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p data-prose>${inline(paragraph, manifest, basePath)}</p>`,
    )
    .join("");

interface LayoutOptions {
  readonly basePath: string;
  readonly title: string;
  readonly description: string;
  readonly currentPath: string;
  readonly pageId: string;
  readonly manifest: ApiManifest;
  readonly staticPages: readonly StaticPage[];
  readonly body: string;
}

export const layout = (options: LayoutOptions): string => {
  const revision = options.manifest.source.revision.replace(
    /^(?:git|sha256):/u,
    "",
  );
  return `<!doctype html>
<html lang="en" data-base-path="${escapeHtml(normalizeBasePath(options.basePath))}" data-page-id="${escapeHtml(options.pageId)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(options.description)}">
    <title>${escapeHtml(options.title)} · Attune reference</title>
    <link rel="stylesheet" href="${escapeHtml(withBase(options.basePath, "assets/styles.css"))}">
    <link rel="stylesheet" href="${escapeHtml(withBase(options.basePath, "assets/twoslash.css"))}">
    <script type="module" src="${escapeHtml(withBase(options.basePath, "assets/site.js"))}"></script>
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="mobile-header">
      <button type="button" class="menu-button" aria-controls="docs-sidebar" aria-expanded="false">Menu</button>
      <a href="${escapeHtml(withBase(options.basePath))}">Attune reference</a>
    </header>
    <aside class="sidebar" id="docs-sidebar">
      <div class="site-name">
        <a href="${escapeHtml(withBase(options.basePath))}">attune-mcp</a>
        <span>API reference</span>
      </div>
      <div class="search">
        <label for="doc-search">Search reference</label>
        <input id="doc-search" type="search" autocomplete="off" placeholder="Search symbols and members">
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <nav aria-label="API reference">
        <div class="nav-section">
          <p class="nav-label">Package</p>
          <a href="${escapeHtml(withBase(options.basePath))}"${options.currentPath === "" ? ' aria-current="page"' : ""}>${escapeHtml(options.manifest.package.name)}</a>
        </div>
        <div class="nav-section api-navigation">
          <p class="nav-label">Public API</p>
          ${options.manifest.symbols
            .map((symbol) => {
              const path = `api/${symbol.slug}.html`;
              return `<a href="${escapeHtml(symbolHref(options.basePath, symbol))}"${path === options.currentPath ? ' aria-current="page"' : ""}>${escapeHtml(symbol.exportName)}</a>${symbol.members.length === 0 ? "" : `<div class="nav-symbols">${symbol.members.map((member) => `<a href="${escapeHtml(memberHref(options.basePath, symbol, member))}"${`api/${symbol.slug}/${member.slug}.html` === options.currentPath ? ' aria-current="page"' : ""}>${escapeHtml(member.name)}</a>`).join("")}</div>`}`;
            })
            .join("")}
        </div>
        ${
          options.staticPages.length === 0
            ? ""
            : `<div class="nav-section"><p class="nav-label">Evidence</p>${options.staticPages.map((page) => `<a href="${escapeHtml(withBase(options.basePath, `experiments/${page.slug}.html`))}">${escapeHtml(page.title)}</a>`).join("")}</div>`
        }
      </nav>
      <div class="revision">
        <span>Source revision</span>
        <code title="${escapeHtml(options.manifest.source.revision)}">${escapeHtml(revision.length > 16 ? `${revision.slice(0, 12)}…` : revision)}</code>
      </div>
    </aside>
    <main id="content" class="content">
      ${options.body}
    </main>
  </body>
</html>
`;
};

export const renderTypeReference = (
  typeText: string,
  destination: string,
): string =>
  `<a data-type-reference href="${escapeHtml(destination)}"><code>${escapeHtml(typeText)}</code></a>`;

export const renderTypeHeading = (
  level: number,
  typeText: string,
  destination: string,
  suffix: string,
): string => {
  if (!Number.isInteger(level) || level < 1 || level > 6) {
    throw new Error(`Invalid documentation heading level: ${level}`);
  }
  return `<h${level} class="type-heading">${renderTypeReference(typeText, destination)}${suffix === "" ? "" : `<span> · ${escapeHtml(suffix)}</span>`}</h${level}>`;
};

const spanLink = (label: string, source: SourceSpan, attribute = ""): string =>
  `<a${attribute} href="${escapeHtml(source.url)}">${escapeHtml(label)} <code>${escapeHtml(source.path)}:${source.line}${source.endLine === source.line ? "" : `-${source.endLine}`}</code></a>`;

interface TypeTarget {
  readonly text: string;
  readonly href: string;
  readonly identifier: string;
  readonly source: SourceSpan;
  readonly documentation: string;
}

interface RelatedTarget {
  readonly key: string;
  readonly text: string;
  readonly href?: string;
  readonly source?: SourceSpan;
  readonly description: string;
}

interface ReferenceRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly currentPath: string;
  readonly kind: string;
  readonly subject: TypeTarget;
  readonly principal: string;
  readonly documentation: DocumentationText;
  readonly typeParameters: readonly TypeParameterDoc[];
  readonly callSignatures: readonly ApiCallSignature[];
  readonly valueType?: ApiTypeReference;
  readonly symbol: ApiSymbol;
  readonly member?: ApiMember;
  readonly examples: readonly ApiExample[];
  readonly ownedExamples: readonly ApiExample[];
  readonly related: readonly RelatedTarget[];
  readonly provenance: ApiProvenance;
  readonly breadcrumbs: readonly {
    readonly label: string;
    readonly href?: string;
  }[];
  readonly storyLead: string;
  readonly artifactHtml?: string;
}

const typeTarget = (
  symbol: ApiSymbol,
  basePath: string,
  member?: ApiMember,
): TypeTarget => {
  const owner = symbol.typeExpression;
  return member === undefined
    ? {
        text: owner,
        href: symbolHref(basePath, symbol),
        identifier: symbol.exportName,
        source: symbol.provenance.tsdoc ?? symbol.provenance.declaration,
        documentation: symbol.documentation.summary,
      }
    : {
        text: `${owner}["${member.name}"]`,
        href: memberHref(basePath, symbol, member),
        identifier: member.name,
        source: member.provenance.tsdoc ?? member.provenance.declaration,
        documentation: member.documentation.summary,
      };
};

const twoslashCandidate = (target: TypeTarget) => ({
  apiHref: target.href,
  apiLabel: `${target.text} reference`,
  sourceHref: target.source.url,
  target: target.identifier,
  documentation: target.documentation,
});

const allCandidates = (manifest: ApiManifest, basePath: string) => [
  ...manifest.symbols.map((symbol) =>
    twoslashCandidate(typeTarget(symbol, basePath)),
  ),
  ...manifest.symbols.flatMap((symbol) =>
    symbol.members.map((member) =>
      twoslashCandidate(typeTarget(symbol, basePath, member)),
    ),
  ),
];

const checkedExamples = (
  owned: readonly ApiExample[],
  context: readonly ApiExample[],
): readonly ApiExample[] => {
  const examples = [...owned];
  const ids = new Set(examples.map((example) => example.id));
  for (const example of context) {
    if (examples.length >= MIN_CHECKED_EXAMPLES_PER_PAGE) break;
    if (!ids.has(example.id)) {
      examples.push(example);
      ids.add(example.id);
    }
  }
  return examples;
};

const renderExamples = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
): string => {
  if (record.examples.length < MIN_CHECKED_EXAMPLES_PER_PAGE) {
    throw new Error(
      `${record.id} has ${record.examples.length} checked examples; expected at least ${MIN_CHECKED_EXAMPLES_PER_PAGE}.`,
    );
  }
  const renderedIds = new Set(record.examples.map((example) => example.id));
  if (
    !record.ownedExamples.some(
      (example) =>
        renderedIds.has(example.id) &&
        example.principal === record.principal &&
        !requestsEmittedFile(example.code),
    )
  ) {
    throw new Error(
      `${record.id} has no hover-bearing source example for its own principal "${record.principal}".`,
    );
  }
  const candidates = allCandidates(manifest, basePath);
  return `<section data-section="examples" class="example-sequence" data-page-examples="${escapeHtml(record.id)}" data-page-principal="${escapeHtml(record.principal)}">
    ${renderTypeHeading(2, record.subject.text, record.subject.href, "Examples")}
    <p data-prose>These programs come from the subject's reviewed <code>@example</code> blocks. Twoslash checks each complete virtual project before applying its cut markers, so hidden setup still contributes identifiers, diagnostics, and hover documentation while the reader sees only the lifecycle decision under discussion.</p>
    ${record.examples
      .map((example, index) => {
        const identifiers = candidates.filter(
          (candidate, candidateIndex) =>
            new RegExp(
              `\\b${candidate.target.replaceAll("$", String.raw`\\$`)}\\b`,
              "u",
            ).test(example.code) &&
            candidates.findIndex(
              (other) => other.target === candidate.target,
            ) === candidateIndex,
        );
        const emitted = requestsEmittedFile(example.code);
        const id = `${record.id}:example:${index + 1}`;
        return `<article class="page-example" id="${escapeHtml(id)}" data-page-example="${escapeHtml(record.id)}" data-example-id="${escapeHtml(example.id)}" data-example-principal="${escapeHtml(example.principal)}">
          ${renderTypeHeading(3, record.subject.text, record.subject.href, example.title)}
          <p data-prose>This source-owned scene keeps the checked program attached to <code>${escapeHtml(example.principal)}</code>. Hover the visible identifiers to read their compiler type and TSDoc, then use the API or immutable source destination rather than guessing from an isolated snippet.</p>
          ${renderCodeBlock(example.code, {
            labelPrefix: example.principal,
            twoslash: {
              idPrefix: id,
              identifiers,
              requiredTargets: emitted ? [] : [example.principal],
            },
          })}
          <p class="source-link">${spanLink("Example source", example.source)}</p>
        </article>`;
      })
      .join("")}
  </section>`;
};

const safeComment = (value: string): string =>
  value.replaceAll("*/", "* /").replace(/\s+/gu, " ").trim();

const concreteOwner = (symbol: ApiSymbol): string =>
  symbol.typeParameters.length === 0
    ? symbol.typeExpression
    : `${symbol.exportName}<${symbol.typeParameters
        .map((parameter) => parameter.default ?? '"active"')
        .join(", ")}>`;

const syntheticOwnerParameters = (symbol: ApiSymbol): string =>
  symbol.typeParameters.length === 0
    ? ""
    : `<${symbol.typeParameters
        .map(
          (parameter) =>
            `${parameter.name}${parameter.constraint === undefined ? "" : ` extends ${parameter.constraint === "InvestigationState" ? "string" : parameter.constraint}`}${parameter.default === undefined ? "" : ` = ${parameter.default}`}`,
        )
        .join(", ")}>`;

const syntheticSupportTypes = (
  types: readonly ApiTypeReference[],
  manifest: ApiManifest,
  owner: ApiSymbol,
): string => {
  const targets = new Map<string, ApiSymbol>();
  for (const type of types) {
    for (const reference of type.references) {
      const target = manifest.symbols.find(
        (candidate) => candidate.id === reference.targetSymbolId,
      );
      if (target !== undefined && target.id !== owner.id) {
        targets.set(target.id, target);
      }
    }
  }
  return [...targets.values()]
    .map((target) => {
      const parameters =
        target.typeParameters.length === 0
          ? ""
          : `<${target.typeParameters
              .map((parameter) => `${parameter.name} = never`)
              .join(", ")}>`;
      return `interface ${target.exportName}${parameters} { readonly __type?: ${target.typeParameters[0]?.name ?? "never"}; }`;
    })
    .join("\n");
};

const syntheticMemberShape = (member: ApiMember): string => {
  if (member.callSignatures.length === 0) {
    return `readonly ${member.name}: ${member.valueType?.text ?? "never"};`;
  }
  const generic =
    member.typeParameters.length === 0
      ? ""
      : `<${member.typeParameters
          .map(
            (parameter) =>
              `${parameter.name}${parameter.constraint === undefined ? "" : ` extends ${parameter.constraint}`}${parameter.default === undefined ? "" : ` = ${parameter.default}`}`,
          )
          .join(", ")}>`;
  return member.callSignatures
    .map(
      (signature) =>
        `${member.name}${generic}(${signature.parameters
          .map((parameter) => parameter.declaration)
          .join(", ")}): ${signature.returns.text};`,
    )
    .join("\n  ");
};

const syntheticSymbolProgram = (symbol: ApiSymbol): string => {
  const docs = `/** ${safeComment(symbol.documentation.summary)} */`;
  if (symbol.kind === "class") {
    return `${docs}\nclass ${symbol.exportName} extends Error {}\n// ---cut-before---\ntype Subject = ${symbol.exportName};`;
  }
  if (symbol.typeExpression.startsWith("typeof ")) {
    return `${docs}\ndeclare const ${symbol.exportName}: unique symbol;\n// ---cut-before---\ntype Subject = typeof ${symbol.exportName};`;
  }
  return `${docs}\ninterface ${symbol.exportName}${syntheticOwnerParameters(symbol)} {}\n// ---cut-before---\ntype Subject = ${concreteOwner(symbol)};`;
};

const productionSymbolProgram = (symbol: ApiSymbol): string =>
  symbol.typeExpression.startsWith("typeof ")
    ? `import { ${symbol.exportName} } from "attune-mcp";\n// ---cut-before---\ntype Subject = typeof ${symbol.exportName};`
    : `import type { ${symbol.exportName} } from "attune-mcp";\n// ---cut-before---\ntype Subject = ${concreteOwner(symbol)};`;

const memberProgram = (
  symbol: ApiSymbol,
  member: ApiMember,
  synthetic: boolean,
  manifest: ApiManifest,
): string => {
  const owner = concreteOwner(symbol);
  if (!synthetic) {
    return `import type { ${symbol.exportName} } from "attune-mcp";\ndeclare const subject: ${owner};\n// ---cut-before---\nconst value = subject.${member.name};`;
  }
  const types = [
    ...(member.valueType === undefined ? [] : [member.valueType]),
    ...member.callSignatures.flatMap((signature) => [
      ...signature.parameters.map((parameter) => parameter.type),
      signature.returns,
    ]),
  ];
  const support = syntheticSupportTypes(types, manifest, symbol);
  return `${support}${support === "" ? "" : "\n"}/** ${safeComment(symbol.documentation.summary)} */\ninterface ${symbol.exportName}${syntheticOwnerParameters(symbol)} {\n  /** ${safeComment(member.documentation.summary)} */\n  ${syntheticMemberShape(member)}\n}\ndeclare const subject: ${concreteOwner(symbol)};\n// ---cut-before---\nconst value = subject.${member.name};`;
};

const renderShapeScene = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
): string => {
  const synthetic = manifest.package.name !== "attune-mcp";
  const source =
    record.member === undefined
      ? synthetic
        ? syntheticSymbolProgram(record.symbol)
        : productionSymbolProgram(record.symbol)
      : memberProgram(record.symbol, record.member, synthetic, manifest);
  const identifiers =
    record.member === undefined
      ? [
          {
            apiHref: record.subject.href,
            apiLabel: `${record.subject.text} reference`,
            sourceHref: record.subject.source.url,
            target: record.symbol.exportName,
            documentation: record.symbol.documentation.summary,
          },
        ]
      : [
          twoslashCandidate(typeTarget(record.symbol, basePath)),
          twoslashCandidate(record.subject),
        ];
  return renderCodeBlock(source, {
    label: "Checked type shape",
    twoslash: {
      idPrefix: `${record.id}:shape`,
      identifiers,
      requiredTargets: [record.subject.identifier],
    },
  });
};

const projection = (
  member: ApiMember,
  kind: "input" | "output",
  index = 0,
): string => {
  const instantiate = member.typeParameters.length === 0 ? "" : '<"maude_run">';
  const method = `typeof attune.${member.name}${instantiate}`;
  return kind === "input"
    ? `type Input = Parameters<${method}>[${index}];`
    : `type Output = ReturnType<${method}>;`;
};

const syntheticContractProgram = (
  symbol: ApiSymbol,
  member: ApiMember,
  visible: string,
  manifest: ApiManifest,
): string => {
  const types = member.callSignatures.flatMap((signature) => [
    ...signature.parameters.map((parameter) => parameter.type),
    signature.returns,
  ]);
  const support = syntheticSupportTypes(types, manifest, symbol);
  return `${support}${support === "" ? "" : "\n"}/** ${safeComment(symbol.documentation.summary)} */\ninterface ${symbol.exportName}${syntheticOwnerParameters(symbol)} {\n  /** ${safeComment(member.documentation.summary)} */\n  ${syntheticMemberShape(member)}\n}\ndeclare const attune: ${concreteOwner(symbol)};\n// ---cut-before---\n${visible}`;
};

const renderReferenceLinks = (
  type: ApiTypeReference,
  manifest: ApiManifest,
  basePath: string,
): string => {
  if (type.references.length === 0) {
    return `<p class="type-references" data-prose>The annotation is intrinsic or locally quantified, so its exact annotation span is the complete declaration provenance for this use.</p>`;
  }
  return `<ul class="type-references">${type.references
    .map((reference) => {
      const symbol = manifest.symbols.find(
        (candidate) => candidate.id === reference.targetSymbolId,
      );
      return `<li>${symbol === undefined ? `<code>${escapeHtml(reference.name)}</code>` : `<a href="${escapeHtml(symbolHref(basePath, symbol))}"><code>${escapeHtml(reference.name)}</code></a>`} <span>${spanLink("declaration", reference.source)}</span></li>`;
    })
    .join("")}</ul>`;
};

const renderContract = (
  kind: "input" | "output",
  type: ApiTypeReference,
  description: string,
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
  index = 0,
  declaration = type.text,
  declarationSource = type.source,
): string => {
  const member = record.member;
  if (member === undefined) {
    throw new Error(`${record.id} cannot render a callable contract.`);
  }
  const alias = kind === "input" ? "Input" : "Output";
  const visible = `/** ${safeComment(description)} */\n${projection(member, kind, index)}`;
  const source =
    manifest.package.name === "attune-mcp"
      ? `import type { ${record.symbol.exportName} } from "attune-mcp";\ndeclare const attune: ${concreteOwner(record.symbol)};\n// ---cut-before---\n${visible}`
      : syntheticContractProgram(record.symbol, member, visible, manifest);
  const ownerTarget = typeTarget(record.symbol, basePath);
  return `<article class="contract" data-contract-kind="${kind}">
    <p class="contract-name"><code>${kind === "input" ? `input ${index + 1}` : "return"}</code></p>
    <p data-prose>${inline(description, manifest, basePath)}</p>
    <div class="type-declaration" data-type-declaration><code>${escapeHtml(declaration)}</code></div>
    <p class="source-link">${spanLink(kind === "input" ? "Exact input declaration" : "Exact return annotation", declarationSource, " data-type-source")}</p>
    ${renderReferenceLinks(type, manifest, basePath)}
    <div data-type-lens>${renderCodeBlock(source, {
      label: `${kind === "input" ? "Input" : "Output"} inference lens`,
      twoslash: {
        idPrefix: `${record.id}:${kind}:${index}`,
        identifiers: [
          twoslashCandidate(ownerTarget),
          twoslashCandidate(record.subject),
          {
            apiHref: record.subject.href,
            apiLabel: `${alias} contract`,
            sourceHref: declarationSource.url,
            target: alias,
            documentation: description,
          },
        ],
        requiredTargets: [member.name, alias],
      },
    })}</div>
  </article>`;
};

const renderTypeParameters = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
): string =>
  record.typeParameters.length === 0
    ? `<p class="not-applicable" data-prose>This subject introduces no type parameter of its own. Its checked shape therefore stands without another caller-supplied type choice; any state or operation correlation remains on the linked types used by its members.</p>`
    : `<dl class="type-parameters">${record.typeParameters
        .map(
          (parameter) =>
            `<div><dt><code>${escapeHtml(parameter.name)}</code>${parameter.constraint === undefined ? "" : ` extends <code>${escapeHtml(parameter.constraint)}</code>`}${parameter.default === undefined ? "" : ` = <code>${escapeHtml(parameter.default)}</code>`}</dt><dd data-prose>${inline(parameter.description, manifest, basePath)}</dd></div>`,
        )
        .join("")}</dl>`;

const renderShape = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
): string => {
  const callableCount = record.callSignatures.length;
  const parameters = record.callSignatures.flatMap((callable) =>
    callable.parameters.map((parameter) => ({
      parameter,
      description:
        record.documentation.parameters.find(
          (candidate) => candidate.name === parameter.name,
        )?.description ?? `The source names this input ${parameter.name}.`,
    })),
  );
  return `<section data-section="shape" class="reference-shape">
    ${renderTypeHeading(2, record.subject.text, record.subject.href, "Shape")}
    <p data-prose>The shape below is a compact projection of the recorded TypeScript declaration, not a second hand-written API. It keeps the source spelling and immutable span for each type use, while checked inference lenses let the browser expose the same editor information a caller receives.</p>
    ${renderTypeHeading(3, record.subject.text, record.subject.href, "Checked declaration")}
    ${renderShapeScene(record, manifest, basePath)}
    <p class="source-link">${spanLink("Declaration source", record.provenance.declaration)}</p>
    ${renderTypeHeading(3, record.subject.text, record.subject.href, "Type parameters")}
    ${renderTypeParameters(record, manifest, basePath)}
    ${renderTypeHeading(3, record.subject.text, record.subject.href, "Inputs")}
    ${
      parameters.length === 0
        ? `<p class="not-applicable" data-prose>${record.valueType === undefined ? "This document is not a callable contract, so it accepts no caller input. Follow the related member types below when you need the lifecycle operation that consumes this subject." : "This member is a readable property rather than a callable transition. Reading it needs no argument; the owning Investigation value already carries the state or evidence needed to determine its result."}</p>`
        : parameters
            .map(({ parameter, description }) =>
              renderContract(
                "input",
                parameter.type,
                description,
                record,
                manifest,
                basePath,
                parameter.index,
                parameter.declaration,
                parameter.source,
              ),
            )
            .join("")
    }
    ${renderTypeHeading(3, record.subject.text, record.subject.href, "Output")}
    ${
      callableCount === 0
        ? record.valueType === undefined
          ? `<p class="not-applicable" data-prose>This document has no callable return channel. Its useful output is the understanding of the linked public type itself; concrete values appear on the service members and properties listed in the related-types section.</p>`
          : `<article class="value-contract"><p data-prose>This property exposes the following source-authored value type. The annotation link identifies the exact use, and the checked declaration above lets the property name reveal its compiler documentation without inventing a return type.</p><div class="type-declaration" data-type-declaration><code>${escapeHtml(record.valueType.text)}</code></div><p class="source-link">${spanLink("Exact value annotation", record.valueType.source, " data-type-source")}</p>${renderReferenceLinks(record.valueType, manifest, basePath)}</article>`
        : record.callSignatures
            .map((callable, index) =>
              renderContract(
                "output",
                callable.returns,
                record.documentation.returns,
                record,
                manifest,
                basePath,
                index,
              ),
            )
            .join("")
    }
    ${renderTypeHeading(3, record.subject.text, record.subject.href, "Failures")}
    ${
      record.documentation.failures.length === 0
        ? `<p class="not-applicable" data-prose>This source declaration documents no thrown failure channel of its own. That does not erase failures carried inside an Effect or result type: those remain visible in the exact output annotation and in the linked error declarations beside it.</p>`
        : `<ul class="failure-list">${record.documentation.failures.map((failure) => `<li data-prose>${inline(failure, manifest, basePath)}</li>`).join("")}</ul>`
    }
  </section>`;
};

const renderRelated = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
): string => {
  const entries = [
    ...new Map(record.related.map((entry) => [entry.key, entry])).values(),
  ];
  return `<section data-section="related" class="related-types">
    ${renderTypeHeading(2, record.subject.text, record.subject.href, "Related types")}
    <p data-prose>These destinations come from source order, lifecycle tags, member ownership, and the type identifiers resolved inside the recorded annotations. Public nouns stay inside the six-type surface; implementation aliases receive source provenance without being promoted into another API concept.</p>
    ${
      entries.length === 0
        ? `<p class="not-applicable" data-prose>No additional public destination is recorded for this subject. Continue through its source link and checked examples rather than inferring an undocumented relationship.</p>`
        : `<ol class="symbol-list">${entries
            .map(
              (entry) =>
                `<li>${entry.href === undefined ? `<code>${escapeHtml(entry.text)}</code>` : `<a href="${escapeHtml(entry.href)}"><code>${escapeHtml(entry.text)}</code></a>`}<span data-prose>${inline(entry.description, manifest, basePath)}${entry.source === undefined ? "" : ` ${spanLink("source", entry.source)}`}</span></li>`,
            )
            .join("")}</ol>`
    }
  </section>`;
};

const renderSource = (record: ReferenceRecord, manifest: ApiManifest): string =>
  `<section data-section="source" class="provenance">
    ${renderTypeHeading(2, record.subject.text, record.subject.href, "Source")}
    <p data-prose>This page is reproducible from manifest schema <code>${escapeHtml(manifest.schemaVersion)}</code> at source revision <code>${escapeHtml(manifest.source.revision)}</code>. The narrative comes from reviewed TSDoc, the shape comes from TypeScript syntax nodes, and every link below retains the immutable line range and digest validated during extraction.</p>
    <ul>
      ${record.provenance.tsdoc === undefined ? "" : `<li>${spanLink("TSDoc", record.provenance.tsdoc)}</li>`}
      <li>${spanLink("Declaration", record.provenance.declaration)}</li>
      <li>${spanLink("Implementation", record.provenance.implementation)}</li>
    </ul>
  </section>`;

const renderBreadcrumbs = (record: ReferenceRecord): string =>
  record.breadcrumbs.length === 0
    ? ""
    : `<nav class="breadcrumbs" aria-label="Breadcrumb">${record.breadcrumbs
        .map((part) =>
          part.href === undefined
            ? `<span>${escapeHtml(part.label)}</span>`
            : `<a href="${escapeHtml(part.href)}">${escapeHtml(part.label)}</a>`,
        )
        .join("<span>/</span>")}</nav>`;

const renderStory = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  basePath: string,
): string =>
  `<section data-section="story" class="reference-story">
    ${renderBreadcrumbs(record)}
    <header class="page-header">
      <p class="page-meta">${escapeHtml(record.kind)}</p>
      ${renderTypeHeading(1, record.subject.text, record.subject.href, record.title)}
      <p data-prose>${inline(record.documentation.summary, manifest, basePath)}</p>
    </header>
    <p data-prose>${inline(record.storyLead, manifest, basePath)}</p>
    ${prose(record.documentation.remarks, manifest, basePath)}
    ${record.artifactHtml ?? ""}
  </section>`;

const renderReference = (
  record: ReferenceRecord,
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string =>
  layout({
    basePath,
    title: record.title,
    description: record.description,
    currentPath: record.currentPath,
    pageId: record.id,
    manifest,
    staticPages,
    body: `${renderStory(record, manifest, basePath)}
      ${renderShape(record, manifest, basePath)}
      ${renderExamples(record, manifest, basePath)}
      ${renderRelated(record, manifest, basePath)}
      ${renderSource(record, manifest)}`,
  });

const relationTargets = (
  relations: readonly LifecycleRelation[],
  manifest: ApiManifest,
  basePath: string,
): readonly RelatedTarget[] =>
  relations.map((relation) => {
    const target = manifest.symbols.find(
      (symbol) => symbol.id === relation.targetSymbolId,
    );
    return {
      key: `relation:${relation.kind}:${relation.target}`,
      text: target?.exportName ?? relation.target,
      ...(target === undefined ? {} : { href: symbolHref(basePath, target) }),
      source: relation.source,
      description: `Source lifecycle relation: ${relation.kind}.`,
    };
  });

const typeTargets = (
  references: readonly ApiTypeReference[],
  manifest: ApiManifest,
  basePath: string,
): readonly RelatedTarget[] =>
  references.flatMap((type) =>
    type.references.map((reference) => {
      const symbol = manifest.symbols.find(
        (candidate) => candidate.id === reference.targetSymbolId,
      );
      return {
        key: `type:${reference.name}:${reference.source.path}:${reference.source.start}`,
        text: reference.name,
        ...(symbol === undefined ? {} : { href: symbolHref(basePath, symbol) }),
        source: reference.source,
        description:
          symbol === undefined
            ? "Internal declaration used by this source annotation."
            : "Public type referenced by this source annotation.",
      };
    }),
  );

export const renderPackageReference = (
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const subject = primarySymbol(manifest);
  const target = typeTarget(subject, basePath);
  return renderReference(
    {
      id: `package:${manifest.package.name}`,
      title: manifest.package.name,
      description: manifest.package.documentation.summary,
      currentPath: "",
      kind: "package",
      subject: target,
      principal: manifest.package.examples[0]?.principal ?? subject.exportName,
      documentation: manifest.package.documentation,
      typeParameters: subject.typeParameters,
      callSignatures: [],
      symbol: subject,
      examples: manifest.package.examples,
      ownedExamples: manifest.package.examples,
      related: [
        ...manifest.symbols.map((symbol) => ({
          key: symbol.id,
          text: symbol.exportName,
          href: symbolHref(basePath, symbol),
          source: symbol.provenance.declaration,
          description: symbol.documentation.summary,
        })),
        ...relationTargets(manifest.package.relations, manifest, basePath),
      ],
      provenance: manifest.package.provenance,
      breadcrumbs: [],
      storyLead: `This package record exposes ${manifest.symbols.length} public root types in reviewed source order. Start with {@link ${subject.exportName}}, then follow the linked lifecycle types and members; the renderer does not insert an onboarding model or publish a second vocabulary.`,
    },
    manifest,
    staticPages,
    basePath,
  );
};

export const renderApiSymbol = (
  symbol: ApiSymbol,
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string =>
  renderReference(
    {
      id: symbol.id,
      title: symbol.exportName,
      description: symbol.documentation.summary,
      currentPath: `api/${symbol.slug}.html`,
      kind: symbol.kind,
      subject: typeTarget(symbol, basePath),
      principal: symbol.exportName,
      documentation: symbol.documentation,
      typeParameters: symbol.typeParameters,
      callSignatures: [],
      symbol,
      examples: checkedExamples(symbol.examples, manifest.package.examples),
      ownedExamples: symbol.examples,
      related: [
        ...symbol.members.map((member) => ({
          key: member.id,
          text: `${symbol.exportName}["${member.name}"]`,
          href: memberHref(basePath, symbol, member),
          source: member.provenance.declaration,
          description: member.documentation.summary,
        })),
        ...relationTargets(symbol.relations, manifest, basePath),
      ],
      provenance: symbol.provenance,
      breadcrumbs: [
        { label: manifest.package.name, href: withBase(basePath) },
        { label: symbol.exportName },
      ],
      storyLead: `This document is the complete source-backed reference for {@link ${symbol.exportName}}. Its declaration, examples, relationships, and provenance are kept together so a reader can move from narrative intent to a checked type without learning an intermediate documentation noun.`,
    },
    manifest,
    staticPages,
    basePath,
  );

export const renderApiMember = (
  member: ApiMember,
  symbol: ApiSymbol,
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const typeReferences = [
    ...(member.valueType === undefined ? [] : [member.valueType]),
    ...member.callSignatures.flatMap((callable) => [
      ...callable.parameters.map((parameter) => parameter.type),
      callable.returns,
    ]),
  ];
  return renderReference(
    {
      id: member.id,
      title: `${symbol.exportName}.${member.name}`,
      description: member.documentation.summary,
      currentPath: `api/${symbol.slug}/${member.slug}.html`,
      kind: "member",
      subject: typeTarget(symbol, basePath, member),
      principal: member.name,
      documentation: member.documentation,
      typeParameters: member.typeParameters,
      callSignatures: member.callSignatures,
      ...(member.valueType === undefined
        ? {}
        : { valueType: member.valueType }),
      symbol,
      member,
      examples: checkedExamples(member.examples, symbol.examples),
      ownedExamples: member.examples,
      related: [
        {
          key: symbol.id,
          text: symbol.exportName,
          href: symbolHref(basePath, symbol),
          source: symbol.provenance.declaration,
          description: `Owning public type for ${member.name}.`,
        },
        ...relationTargets(member.relations, manifest, basePath),
        ...typeTargets(typeReferences, manifest, basePath),
      ],
      provenance: member.provenance,
      breadcrumbs: [
        { label: manifest.package.name, href: withBase(basePath) },
        { label: symbol.exportName, href: symbolHref(basePath, symbol) },
        { label: member.name },
      ],
      storyLead: `This member remains part of {@link ${symbol.exportName}} rather than becoming another root concept. Read its inputs and output in source order, use the checked lenses to inspect the compiler's view, and follow the exact annotation links when a private supporting alias needs explanation.`,
    },
    manifest,
    staticPages,
    basePath,
  );
};

export const renderStaticReference = (
  page: StaticPage,
  artifactHtml: string,
  manifest: ApiManifest,
  basePath: string,
): string => {
  const symbol = primarySymbol(manifest);
  return renderReference(
    {
      id: `experiment:${page.slug}`,
      title: page.title,
      description: `Approved static publication: ${page.title}.`,
      currentPath: `experiments/${page.slug}.html`,
      kind: "evidence",
      subject: typeTarget(symbol, basePath),
      principal: manifest.package.examples[0]?.principal ?? symbol.exportName,
      documentation: manifest.package.documentation,
      typeParameters: symbol.typeParameters,
      callSignatures: [],
      symbol,
      examples: manifest.package.examples,
      ownedExamples: manifest.package.examples,
      related: manifest.symbols.map((candidate) => ({
        key: candidate.id,
        text: candidate.exportName,
        href: symbolHref(basePath, candidate),
        source: candidate.provenance.declaration,
        description: candidate.documentation.summary,
      })),
      provenance: manifest.package.provenance,
      breadcrumbs: [
        { label: manifest.package.name, href: withBase(basePath) },
        { label: "Evidence" },
        { label: page.title },
      ],
      storyLead:
        "This approved evidence artifact is kept opaque to the TypeScript renderer. Its authored Markdown appears below inside the same reference structure, while the surrounding type links and provenance come only from the audited API manifest.",
      artifactHtml,
    },
    manifest,
    [page],
    basePath,
  );
};

export const renderNotFound = (
  manifest: ApiManifest,
  staticPages: readonly StaticPage[],
  basePath: string,
): string => {
  const symbol = primarySymbol(manifest);
  return renderReference(
    {
      id: "not-found",
      title: "Reference path not found",
      description: "The requested reference page does not exist.",
      currentPath: "404.html",
      kind: "not found",
      subject: typeTarget(symbol, basePath),
      principal: manifest.package.examples[0]?.principal ?? symbol.exportName,
      documentation: manifest.package.documentation,
      typeParameters: symbol.typeParameters,
      callSignatures: [],
      symbol,
      examples: manifest.package.examples,
      ownedExamples: manifest.package.examples,
      related: manifest.symbols.map((candidate) => ({
        key: candidate.id,
        text: candidate.exportName,
        href: symbolHref(basePath, candidate),
        source: candidate.provenance.declaration,
        description: candidate.documentation.summary,
      })),
      provenance: manifest.package.provenance,
      breadcrumbs: [{ label: "Unknown path" }],
      storyLead: `The requested path has no record in manifest schema ${manifest.schemaVersion}. Return to {@link ${symbol.exportName}} and use the source-ordered public links below; a missing route cannot create a placeholder API type or an undocumented alternative learning path.`,
    },
    manifest,
    staticPages,
    basePath,
  );
};
