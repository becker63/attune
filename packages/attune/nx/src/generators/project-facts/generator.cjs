require("tsx/cjs")

const mod = require("./generator.ts")

module.exports = mod.default ?? mod
