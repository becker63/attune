require("tsx/cjs")

const mod = require("./executor.ts")

module.exports = mod.default ?? mod
