import { readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineDocumentationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { JoernGeneratedSchemaModulesResource } from "../../pure/codegen/generate.js"

const joernReadmeRenderRecipeId = "joern-effect.generation-readme-render"
const joernReadmeRenderSourcePath = "packages/attune/joern-effect/src/internal/generation/JoernReadme.ts"

const PackageJson = Schema.Struct({
  packageManager: Schema.optional(Schema.String),
})

export interface JoernReadmeRenderInput {
  readonly workspaceRoot?: string
  readonly packageRoot?: string
}

export const JoernReadmeRenderInputSchema = Schema.Struct({
  workspaceRoot: Schema.optional(Schema.String),
  packageRoot: Schema.optional(Schema.String),
})
export type JoernReadmeRenderInputSchema = typeof JoernReadmeRenderInputSchema.Type

export const JoernReadmeRenderOutputSchema = Schema.Struct({
  readmePath: Schema.String,
  rendered: Schema.Boolean,
})
export type JoernReadmeRenderOutput = typeof JoernReadmeRenderOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernReadmeResource = defineAlchemyResource({
  id: "joern-effect.generation-readme-render.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: joernReadmeRenderRecipeId,
  producedBy: [joernReadmeRenderRecipeId],
  consumedBy: [joernReadmeRenderRecipeId],
  addressFields: ["packageRoot"],
  addressSchema: JoernReadmeRenderInputSchema as never,
  stateSchema: JoernReadmeRenderOutputSchema as never,
  modes: ["project", "write", "check"],
  programmaticResourceExport: "JoernReadmeRenderLive",
  programmaticBridgeSourcePath: joernReadmeRenderSourcePath,
})

export const renderJoernReadme = async (
  input: JoernReadmeRenderInput = {},
): Promise<void> => {
  const packageRoot = input.packageRoot ?? process.cwd()
  const workspaceRoot = input.workspaceRoot ?? resolve(packageRoot, "../../..")

  const flake = await readFile(join(workspaceRoot, "flake.nix"), "utf8")
  const joernToolchain = await readFile(
    join(workspaceRoot, "nix", "toolchains", "joern.nix"),
    "utf8",
  )
  const template = await readFile(
    join(packageRoot, "src", "internal", "generation", "README.template.md"),
    "utf8",
  )
  const packageJson = Schema.decodeUnknownSync(PackageJson)(
    JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf8")),
  )

  const readNixString = (name: string): string => {
    const match = joernToolchain.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, "u"))
    if (!match) throw new Error(`Could not find ${name} in nix/toolchains/joern.nix`)
    return match[1] ?? ""
  }

  const readNixPackage = (name: string): string => {
    const match = flake.match(new RegExp(`pkgs\\.${name}\\b`, "u"))
    if (!match) throw new Error(`Could not find pkgs.${name} in flake.nix`)
    return name
  }

  const replacements: Record<string, string> = {
    JOERN_VERSION: readNixString("joernVersion"),
    CPG_VERSION: readNixString("cpgVersion"),
    NODE_PACKAGE: readNixPackage("nodejs_22"),
    JDK_PACKAGE: readNixPackage("jdk21"),
    PNPM_PACKAGE_MANAGER: packageJson.packageManager ?? "pnpm",
  }

  const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/gu, (_, key: string) => {
    const value = replacements[key]
    if (!value) throw new Error(`No README replacement for ${key}`)
    return value
  })

  await writeFile(join(packageRoot, "README.md"), rendered)
}

export interface JoernReadmeRenderService {
  readonly render: (
    input: JoernReadmeRenderInputSchema,
  ) => Effect.Effect<JoernReadmeRenderOutput, Error>
}

export class JoernReadmeRender extends Context.Tag("joern-effect/ReadmeRender")<
  JoernReadmeRender,
  JoernReadmeRenderService
>() {}

export const renderJoernReadmeEffect = (
  input: JoernReadmeRenderInputSchema,
): Effect.Effect<JoernReadmeRenderOutput, Error> =>
  Effect.tryPromise({
    catch: (cause) => new Error(String(cause)),
    try: async () => {
      const packageRoot = input.packageRoot ?? process.cwd()
      await renderJoernReadme({
        ...(input.workspaceRoot === undefined ? {} : { workspaceRoot: input.workspaceRoot }),
        ...(input.packageRoot === undefined ? {} : { packageRoot: input.packageRoot }),
      })
      return {
        readmePath: join(packageRoot, "README.md"),
        rendered: true,
      }
    },
  })

export const JoernReadmeRenderLive = Layer.succeed(JoernReadmeRender, {
  render: renderJoernReadmeEffect,
})

export const JoernReadmeRenderLayer = defineRecipeLayer({
  id: "joern-effect.generation-readme-render.layer",
  sourcePath: joernReadmeRenderSourcePath,
  exportName: "JoernReadmeRenderLive",
  layer: JoernReadmeRenderLive as never,
  provides: [{
    id: "joern-effect.generation-readme-render.service",
    service: JoernReadmeRender as never,
  }],
})

export const renderJoernReadmeViaLayer = (
  input: JoernReadmeRenderInputSchema,
): Effect.Effect<JoernReadmeRenderOutput, Error, JoernReadmeRender> =>
  Effect.gen(function* renderJoernReadmeViaLayerBody() {
    const renderer = yield* JoernReadmeRender
    return yield* renderer.render(input)
  })

export const JoernReadmeRenderHandler = defineRecipeHandler<
  JoernReadmeRenderInputSchema,
  JoernReadmeRenderOutput,
  Error,
  JoernReadmeRender
>({
  id: "joern-effect.generation-readme-render.handler",
  recipeId: joernReadmeRenderRecipeId,
  sourcePath: joernReadmeRenderSourcePath,
  exportName: "renderJoernReadmeViaLayer",
  layer: JoernReadmeRenderLayer,
  emitsReceipts: ["joern.generation-readme.rendered"],
  handler: (input) => renderJoernReadmeViaLayer(input) as never,
})

export const JoernReadmeRenderRecipe = defineDocumentationRecipe({
  id: joernReadmeRenderRecipeId,
  projectId: "joern-effect",
  title: "Render Joern README from typed toolchain and package metadata",
  inputSchema: JoernReadmeRenderInputSchema as never,
  outputSchema: JoernReadmeRenderOutputSchema as never,
  allowedFiles: [joernReadmeRenderSourcePath],
  validationEvidence: ["joern-effect:generate", "joern-effect:test"],
  io: {
    inputSchema: JoernReadmeRenderInputSchema as never,
    outputSchema: JoernReadmeRenderOutputSchema as never,
    inputResources: [JoernGeneratedSchemaModulesResource],
    outputResources: [JoernReadmeResource],
  },
  handler: JoernReadmeRenderHandler,
  alchemyDag: [{
    fromRecipeId: "joern-effect.codegen.schema-modules",
    toRecipeId: joernReadmeRenderRecipeId,
    resource: JoernGeneratedSchemaModulesResource,
    kind: "projects",
    modes: ["project", "write", "check"],
  }],
})

export const JoernReadmeRenderRecipes = [JoernReadmeRenderRecipe] as const
