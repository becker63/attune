// The fixture's test file. A read of this file is not an implementation read.
const { createCounter } = require("../src/counter");
const { renderStatus } = require("../src/format");

test("a fresh counter renders the initial total", () => {
  expect(renderStatus(createCounter())).toBe("total=0");
});

test("an incremented counter renders the current total", () => {
  const counter = createCounter();
  counter.increment();
  expect(renderStatus(counter)).toBe("total=1");
});
