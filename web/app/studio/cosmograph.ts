import { Cosmograph, type CosmographConfig } from "@cosmograph/cosmograph";
import { AsyncDuckDB, VoidLogger } from "@duckdb/duckdb-wasm";
import { tableFromJSON } from "apache-arrow";

// Cosmograph owns clustering and rendering. Its local database contains only
// display records; Attune's admission and ranking still run in compiled Flix.
export async function createGraph(
  element: HTMLElement,
  config: CosmographConfig,
  points: Record<string, unknown>[],
  links: Record<string, unknown>[],
) {
  const worker = new Worker("/runtime/cosmograph/duckdb-browser-eh.worker.js");
  const db = new AsyncDuckDB(new VoidLogger(), worker);
  let graph: Cosmograph | undefined;
  const close = async () => {
    try {
      await graph?.destroy();
    } finally {
      await db.terminate();
      worker.terminate();
    }
  };
  try {
    await db.instantiate("/runtime/cosmograph/duckdb-eh.wasm");
    const connection = await db.connect();
    await connection.query("SET memory_limit = '512MB'");
    // External connections take table names, not uploadable arrays.
    await connection.insertArrowTable(tableFromJSON(points), {
      name: "attune_points",
    });
    if (links.length)
      await connection.insertArrowTable(tableFromJSON(links), {
        name: "attune_links",
      });
    graph = new Cosmograph(element, config, { duckdb: db, connection });
    await graph.dataUploaded();
    if (graph.stats.pointsCount !== points.length)
      throw new Error("Cosmograph could not load the indexed files.");
    return { graph, close };
  } catch (error) {
    await close();
    throw error;
  }
}
