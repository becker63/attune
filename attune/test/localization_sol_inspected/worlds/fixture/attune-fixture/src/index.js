// The CLI entry point. It merely wires the counter to the formatter, so the
// defect reported in the issue is not in this file.
const { createCounter } = require("./counter");
const { renderStatus } = require("./format");

function main() {
  const counter = createCounter();
  counter.increment();
  counter.increment();
  return renderStatus(counter);
}

module.exports = { main };
