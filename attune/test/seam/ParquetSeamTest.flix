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

/// The evidence schema keeps a tri-state observation and a classified error
/// separate: `observed` is nullable, so an unmeasured or failed observation is
/// null and can never read back as a boolean `false`.
def evidenceSchema(): String =
    "{\"format\":\"attune-evidence-rows-v1\",\"columns\":[{\"name\":\"scope\",\"type\":\"string\",\"nullable\":false},{\"name\":\"subject\",\"type\":\"string\",\"nullable\":false},{\"name\":\"atom\",\"type\":\"string\",\"nullable\":false},{\"name\":\"outcome\",\"type\":\"string\",\"nullable\":false},{\"name\":\"observed\",\"type\":\"boolean\",\"nullable\":true},{\"name\":\"error\",\"type\":\"string\",\"nullable\":true}]}"

def evidenceRows(): String =
    "[{\"scope\":\"shop-v1\",\"subject\":\"pricing.rb\",\"atom\":\"defines\",\"outcome\":\"WITNESS\",\"observed\":true,\"error\":null},{\"scope\":\"shop-v1\",\"subject\":\"receipt.rb\",\"atom\":\"defines\",\"outcome\":\"NO-MATCH\",\"observed\":false,\"error\":null},{\"scope\":\"shop-v1\",\"subject\":\"ghost.rb\",\"atom\":\"defines\",\"outcome\":\"UNKNOWN\",\"observed\":null,\"error\":null},{\"scope\":\"shop-v1\",\"subject\":\"pricing.rb\",\"atom\":\"calls\",\"outcome\":\"FAILED\",\"observed\":null,\"error\":\"acquisition-error\"}]"

/// Witness/no-match/unknown/failure and the tri-state observation/error survive
/// the real Arrow Dataset write/read. A missing row is not invented, and an
/// unmeasured observation stays null rather than becoming false.
@Test
def parquetPreservesEvidenceAndTriStateDistinctions(): Unit \ {Assert, IO} = {
    let expected = "{\"version\":1,\"status\":\"ok\",\"kind\":\"parquet\",\"rows\":" + evidenceRows() + "}";
    let written = AttuneParquet.writeTable("evidence-rows.parquet", evidenceSchema(), evidenceRows());
    let read = AttuneParquet.readTable("evidence-rows.parquet", evidenceSchema());
    Assert.assertEq(expected = expected, written);
    Assert.assertEq(expected = expected, read);
    Assert.assertEq(expected = Outcome.Decoded("parquet"), outcome(read));
    Assert.assertTrue(String.contains(substr = "\"outcome\":\"UNKNOWN\",\"observed\":null", read));
    Assert.assertTrue(String.contains(substr = "\"outcome\":\"NO-MATCH\",\"observed\":false", read));
    Assert.assertTrue(String.contains(substr = "\"outcome\":\"FAILED\",\"observed\":null,\"error\":\"acquisition-error\"", read));
    Assert.assertEq(expected = false,
        String.contains(substr = "\"outcome\":\"UNKNOWN\",\"observed\":false", read))
}
