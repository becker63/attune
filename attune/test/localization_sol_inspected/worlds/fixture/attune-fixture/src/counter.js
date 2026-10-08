// A tiny counter with an explicit value.
//
// The fixture's hidden information lives in `src/format.js`, not here: this
// module is correct and only needs to be found and read to rule it out.
const ATTUNE_FIXTURE_COUNTER_MARKER = "attune-fixture-counter-v1";

function createCounter() {
  let value = 0;
  return {
    increment() {
      value += 1;
      return value;
    },
    value() {
      return value;
    }
  };
}

module.exports = { createCounter, ATTUNE_FIXTURE_COUNTER_MARKER };
