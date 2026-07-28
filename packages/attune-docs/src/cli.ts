import { mkdir, writeFile } from "node:fs/promises";
import * as Path from "node:path";

import { isIsoTimestamp, prettyJson } from "./canonical.ts";
import { extractApiManifest } from "./extract.ts";
import {
  createGuideApproval,
  materializeGuide,
  readGuideApprovals,
  readGuideTemplates,
  validateGuide,
} from "./guides.ts";
import { normalizeBasePath } from "./html.ts";
import { parseProseDraft } from "./parse.ts";
import { paths } from "./paths.ts";
import { collectRepositoryMap } from "./repository.ts";
import { buildSite } from "./site.ts";
import { readTraceExports } from "./traces.ts";

const command = process.argv[2] ?? "build";
const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const requireUnique = <Value>(
  values: readonly Value[],
  key: (value: Value) => string,
  label: string,
): void => {
  const seen = new Set<string>();
  for (const value of values) {
    const identity = key(value);
    if (seen.has(identity)) {
      throw new Error(`Duplicate ${label}: ${identity}`);
    }
    seen.add(identity);
  }
};

const load = async (
  requireApproval = true,
  traces: Awaited<ReturnType<typeof readTraceExports>> = [],
) => {
  const manifest = await extractApiManifest();
  const templates = await readGuideTemplates(paths.content);
  const approvals = await readGuideApprovals(paths.approvals);
  requireUnique(templates, (template) => template.id, "guide id");
  requireUnique(templates, (template) => template.slug, "guide slug");
  requireUnique(approvals, (approval) => approval.guideId, "guide approval");
  const approvalsByGuide = new Map(
    approvals.map((approval) => [approval.guideId, approval]),
  );
  const guides = templates.map((template) =>
    parseProseDraft(
      JSON.parse(
        JSON.stringify(
          materializeGuide(
            template,
            manifest,
            approvalsByGuide.get(template.id),
          ),
        ),
      ),
    ),
  );
  const guideSlugs = new Set(guides.map((guide) => guide.slug));
  const tracedGuides = new Set(
    traces
      .filter((artifact) => artifact.kind === "publication")
      .map((artifact) => artifact.trace.guide_id),
  );
  const validations = guides.map((guide) => ({
    guide,
    validation: validateGuide(guide, manifest, guideSlugs, {
      requireApproval,
      allowApprovalCarryForward:
        tracedGuides.has(guide.id) || tracedGuides.has(guide.slug),
    }),
  }));
  return { manifest, guides, validations };
};

const printValidation = (
  validations: Awaited<ReturnType<typeof load>>["validations"],
): boolean => {
  let valid = true;
  for (const { guide, validation } of validations) {
    if (validation.valid) continue;
    valid = false;
    process.stderr.write(`${guide.slug}:\n`);
    for (const issue of validation.issues) {
      process.stderr.write(`  ${issue.code} ${issue.path}: ${issue.message}\n`);
    }
  }
  return valid;
};

const main = async (): Promise<void> => {
  if (command === "manifest") {
    const manifest = await extractApiManifest();
    const output =
      argument("--output") ??
      Path.join(paths.package, ".tmp", "api-manifest.json");
    await mkdir(Path.dirname(output), { recursive: true });
    await writeFile(output, prettyJson(manifest));
    process.stdout.write(
      `Wrote ${manifest.symbols.length} symbols to ${Path.relative(paths.repository, output)}\n`,
    );
    return;
  }

  if (command === "audit") {
    const manifest = await extractApiManifest();
    for (const diagnostic of manifest.diagnostics) {
      process.stderr.write(
        `${diagnostic.severity} ${diagnostic.code} ${diagnostic.symbolId}: ${diagnostic.message}\n`,
      );
    }
    const errors = manifest.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    process.stdout.write(
      `${manifest.symbols.length} exports; ${errors.length} documentation policy errors.\n`,
    );
    if (errors.length > 0) process.exitCode = 1;
    return;
  }

  if (command === "guides:validate") {
    const traces = await readTraceExports();
    const { validations } = await load(true, traces);
    const valid = printValidation(validations);
    if (!valid) process.exitCode = 1;
    else process.stdout.write(`${validations.length} grounded guides valid.\n`);
    return;
  }

  if (command === "guides:approve") {
    const reviewer = argument("--reviewer");
    const decisionId = argument("--decision-id");
    const decidedAt = argument("--decision-time");
    const selectedGuide = argument("--guide");
    if (
      reviewer === undefined ||
      decisionId === undefined ||
      decidedAt === undefined ||
      (selectedGuide === undefined && !process.argv.includes("--all"))
    ) {
      throw new Error(
        "guides:approve is an explicit review action and requires --reviewer, --decision-id, --decision-time, and either --guide <slug> or --all.",
      );
    }
    if (!isIsoTimestamp(decidedAt)) {
      throw new Error(
        "--decision-time must be an ISO-8601 timestamp with a timezone.",
      );
    }
    const { manifest, guides } = await load(false);
    const selected = guides.filter(
      (guide) => selectedGuide === undefined || guide.slug === selectedGuide,
    );
    if (selected.length === 0) {
      throw new Error(`No guide matched ${selectedGuide}.`);
    }
    await mkdir(paths.approvals, { recursive: true });
    for (const guide of selected) {
      const approval = createGuideApproval(guide, manifest, {
        reviewer,
        decisionId,
        decidedAt,
      });
      await writeFile(
        Path.join(paths.approvals, `${guide.slug}.json`),
        prettyJson(approval),
      );
    }
    process.stdout.write(
      `Persisted ${selected.length} explicit guide approval${selected.length === 1 ? "" : "s"} for ${manifest.source.revision}.\n`,
    );
    return;
  }

  if (command === "build") {
    const traces = await readTraceExports();
    const { manifest, guides, validations } = await load(true, traces);
    if (!printValidation(validations)) {
      process.exitCode = 1;
      return;
    }
    const basePath = normalizeBasePath(
      argument("--base-path") ?? process.env.DOCS_BASE_PATH ?? "/attune/",
    );
    const output = Path.resolve(argument("--output") ?? paths.dist);
    const repository = await collectRepositoryMap({
      revision: manifest.source.revision,
      sourceRef: manifest.source.ref,
      repositoryUrl: manifest.source.repositoryUrl,
    });
    await buildSite(
      manifest,
      repository,
      guides,
      {
        basePath,
        outputDirectory: output,
        siteUrl:
          process.env.DOCS_SITE_URL ?? "https://becker63.github.io/attune/",
        publicationRevision:
          process.env.DOCS_PUBLICATION_REVISION ?? manifest.source.ref,
      },
      traces,
    );
    process.stdout.write(
      `Built ${guides.length} guides and ${manifest.symbols.length} API pages at ${Path.relative(paths.repository, output)} (base ${basePath}).\n`,
    );
    return;
  }

  throw new Error(
    `Unknown command ${command}. Expected build, manifest, audit, guides:validate, or guides:approve.`,
  );
};

await main();
