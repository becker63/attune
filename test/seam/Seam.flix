/// The narrow typed Flix view over the two JVM seams.
///
/// Each seam returns a versioned JSON envelope because a Java exception cannot
/// cross the interop boundary. This module is the small typed vocabulary the
/// fixtures assert against, so a rejected exchange is a typed value instead of
/// an ad-hoc substring search repeated in every case.
pub mod Seam {

    /// The classified outcome of one seam exchange.
    pub enum Outcome with Eq, ToString {
        /// The exchange decoded; the label carries the declared result kind.
        case Decoded(String)
        /// The exchange was rejected; the label carries the classified kind.
        case Rejected(String)
    }

    /// Classify a seam envelope by its declared status and kind.
    pub def outcome(envelope: String): Outcome =
        if (String.contains(substr = "\"status\":\"error\"", envelope))
            Outcome.Rejected(kind(envelope))
        else Outcome.Decoded(kind(envelope))

    /// The declared kind of a seam envelope, normalised to a stable label.
    ///
    /// `transport` collapses every `http-<status>` classification, because the
    /// status itself is asserted on the envelope where the exact code matters.
    pub def kind(envelope: String): String =
        if (String.contains(substr = "\"kind\":\"http-", envelope)) "transport"
        else if (String.contains(substr = "\"kind\":\"decode\"", envelope)) "decode"
        else if (String.contains(substr = "\"kind\":\"request\"", envelope)) "request"
        else if (String.contains(substr = "\"kind\":\"schema\"", envelope)) "schema"
        else if (String.contains(substr = "\"kind\":\"io\"", envelope)) "io"
        else if (String.contains(substr = "\"kind\":\"native\"", envelope)) "native"
        else if (String.contains(substr = "\"kind\":\"provider\"", envelope)) "provider"
        else if (String.contains(substr = "\"kind\":\"embedding\"", envelope)) "embedding"
        else if (String.contains(substr = "\"kind\":\"decision\"", envelope)) "decision"
        else if (String.contains(substr = "\"kind\":\"parquet\"", envelope)) "parquet"
        else "unknown"
}
