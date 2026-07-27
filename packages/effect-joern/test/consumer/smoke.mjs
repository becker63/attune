import { cpg, generatedSchema, prop } from "joern-effect";

const query = cpg.method.name("main").select({ name: prop.name });
if (!query.cpgql.includes("cpg.method.name") || generatedSchema.nodeCount < 1) {
  throw new Error("ESM package smoke test failed");
}
