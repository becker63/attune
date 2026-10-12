// One source-resolved fact, written using Atlas's Fact record.
// This is an explanatory value for the retained Greenwood world.
// `world` stands for its pinned source snapshot, w49.
{
    world = world,
    source = "packages/cli/src/lifecycles/bundle.js",
    atom = Atom.Imports,
    target = "packages/cli/src/lib/resource-utils.js"
}

// Read it as: "In this world, bundle.js imports resource-utils.js."
// The relation is Imports. The endpoints are FILES, not functions.
