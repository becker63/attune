use Seam.{Outcome, outcome}

import attune.parquet.AttuneParquet

/// Native `@Test` laws for the typed Arrow Dataset Parquet codec.
///
/// Flix owns the tiny authored schema and rows; the seam performs the real
/// Arrow Dataset JNI write/read and returns the admitted rows or a classified
/// rejection. No corpus or alternative serializer is acquired for this check.

def seamSchema(): String =
    "{\"format\":\"attune-seam-rows-v1\",\"columns\":[{\"name\":\"identity\",\"type\":\"string\",\"nullable\":false},{\"name\":\"depth\",\"type\":\"int32\",\"nullable\":false},{\"name\":\"ordinal\",\"type\":\"int64\",\"nullable\":false},{\"name\":\"score\",\"type\":\"float64\",\"nullable\":true},{\"name\":\"extinct\",\"type\":\"boolean\",\"nullable\":false},{\"name\":\"route\",\"type\":\"list<string>\",\"nullable\":false}]}"

def seamRows(): String =
    "[{\"identity\":\"seed-0\",\"depth\":7,\"ordinal\":0,\"score\":null,\"extinct\":false,\"route\":[\"calls\",\"defined_in\"]},{\"identity\":\"seed-1\",\"depth\":2,\"ordinal\":1,\"score\":0.5,\"extinct\":true,\"route\":[\"imports\"]}]"

@Test
def parquetRoundTripPreservesAuthoredSchemaAndValues(): Unit \ {Assert, IO} = {
    let expected = "{\"version\":1,\"status\":\"ok\",\"kind\":\"parquet\",\"rows\":" + seamRows() + "}";
    let written = AttuneParquet.writeTable("seam-rows.parquet", seamSchema(), seamRows());
    let read = AttuneParquet.readTable("seam-rows.parquet", seamSchema());
    Assert.assertEq(expected = expected, written);
    Assert.assertEq(expected = expected, read);
    Assert.assertEq(expected = Outcome.Decoded("parquet"), outcome(read))
}

/// A physical schema that differs from the declaration must reject, and the
/// rejection is classified rather than crashing across the interop boundary.
@Test
def parquetRejectsWrongSchema(): Unit \ {Assert, IO} = {
    let wrong = "{\"format\":\"attune-seam-rows-v1\",\"columns\":[{\"name\":\"identity\",\"type\":\"string\",\"nullable\":false},{\"name\":\"depth\",\"type\":\"int32\",\"nullable\":false},{\"name\":\"ordinal\",\"type\":\"string\",\"nullable\":false},{\"name\":\"score\",\"type\":\"float64\",\"nullable\":true},{\"name\":\"extinct\",\"type\":\"boolean\",\"nullable\":false},{\"name\":\"route\",\"type\":\"list<string>\",\"nullable\":false}]}";
    let _ = AttuneParquet.writeTable("seam-wrong.parquet", seamSchema(), seamRows());
    let out = AttuneParquet.readTable("seam-wrong.parquet", wrong);
    Assert.assertEq(expected = Outcome.Rejected("schema"), outcome(out));
    Assert.assertEq(expected = false, String.contains(substr = "\"rows\"", out))
}
