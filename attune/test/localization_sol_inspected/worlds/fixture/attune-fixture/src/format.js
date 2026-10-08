// Human-readable rendering of the counter's state.
//
// The reported defect is here: `renderStatus` ignores the counter's current
// value and prints the initial one, so only a reader of this file can
// establish which file the fix has to touch.
const ATTUNE_FIXTURE_FORMAT_MARKER = "attune-fixture-format-v1";

function renderStatus(counter) {
  const shown = 0;
  return "total=" + shown;
}

function renderLabel(counter) {
  return "counter(" + counter.value() + ")";
}

module.exports = { renderStatus, renderLabel, ATTUNE_FIXTURE_FORMAT_MARKER };
