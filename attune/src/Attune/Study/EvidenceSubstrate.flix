/// A source answer carries the identity of the bytes it describes.
///
/// world + revision + path + digest + range -> delivered evidence -> observation
///
/// Incomplete delivery cannot establish that something is absent.
pub mod Attune.Study.EvidenceSubstrate {
    use Attune.Coverage.Outcome

    /// The one version of the wire contract. A change to any exported meaning
    /// below is a change to this version, so a drifted artifact is a different
    /// contract rather than a silently accepted one.
    pub def contractVersion(): String = "attune.evidence-substrate/2"

    /// How complete a delivered piece of evidence is. `Complete` is an honest
    /// claim that the named range is the whole relevant source; `Partial`,
    /// `Overflow` and `Unsupported` can never be reported as complete coverage.
    pub enum Delivery with Eq, ToString {
        case Complete
        case Partial
        case Overflow
        case Unsupported
    }

    /// The stable delivery name, so a serialized checkpoint is readable.
    pub def deliveryName(delivery: Delivery): String = match delivery {
        case Delivery.Complete    => "complete"
        case Delivery.Partial     => "partial"
        case Delivery.Overflow    => "overflow"
        case Delivery.Unsupported => "unsupported"
    }

    /// One exact piece of delivered evidence: the world and revision it was read
    /// from, the path, the source digest, the exact inclusive line range, the
    /// byte count and how complete that delivery is. World and revision are part
    /// of the identity, so bytes from another world can never be substituted.
    pub type alias EvidenceRef = {
        world = String,
        revision = String,
        path = String,
        sha256 = String,
        startLine = Int32,
        endLine = Int32,
        bytes = Int32,
        delivery = Delivery
    }

    /// The identity findings of one evidence reference: identity, range and
    /// provenance only. It never judges whether the evidence shows a defect.
    pub def refFindings(ref: EvidenceRef): List[String] =
        (if (String.isEmpty(ref#world) or String.isEmpty(ref#revision)) List#{"evidence reference has no world/revision identity"} else Nil)
            ::: (if (String.isEmpty(ref#path)) List#{"evidence reference has no path"} else Nil)
            ::: (if (String.length(ref#sha256) != 64) List#{"evidence reference digest is not a 64-character source digest"} else Nil)
            ::: (if (ref#startLine < 1 or ref#endLine < ref#startLine) List#{"evidence reference carries an impossible line range"} else Nil)
            ::: (if (ref#bytes < 0) List#{"evidence reference carries a negative byte count"} else Nil)

    /// Whether one delivered reference may be reported as complete coverage. A
    /// partial, overflowed or unsupported delivery never may.
    pub def completeCoverage(ref: EvidenceRef): Bool = match ref#delivery {
        case Delivery.Complete => true
        case _                 => false
    }

    /// One evidence observation: the logical outcome carried with the exact
    /// evidence reference and its provenance. The outcome vocabulary is the
    /// canonical `Attune.Coverage.Outcome`, so Unknown and Failed stay distinct
    /// and neither can be read as a negative.
    pub type alias EvidenceObservation = {
        outcome = Outcome,
        ref = EvidenceRef,
        provenance = String
    }

    /// Whether one observation is a negative fact. Only an explicit `NoMatch`
    /// over complete coverage is; `Unknown` and `Failed` never are.
    pub def observationIsNegative(observation: EvidenceObservation): Bool =
        observation#outcome == Outcome.NoMatch and completeCoverage(observation#ref)

    // ------------------------------------------- checkpoints and the guard

    /// The exact identity of one acquired piece of evidence. World, revision,
    /// path, source digest and line range all participate, so bytes from another
    /// world or revision can never satisfy a request.
    pub def evidenceKey(ref: EvidenceRef): String =
        ref#world + "|" + ref#revision + "|" + ref#path + "|" + ref#sha256 + "|"
            + Int32.toString(ref#startLine) + "|" + Int32.toString(ref#endLine)

    /// The selected canonical exported surface of this contract: the sorted,
    /// deduplicated member names a consumer may rely on. Every member is trimmed
    /// and a whitespace-only member is dropped, so padding or repetition cannot
    /// move an identity. It excludes paths, timestamps and any other volatile
    /// metadata, so it is a stable identity rather than a snapshot.
    pub def canonicalSurface(surface: List[String]): List[String] =
        List.sort(List.distinct(List.filter(line -> not String.isEmpty(line), List.map(String.trim, surface))))

    /// The contract digest: the canonical exported surface itself, prefixed by
    /// the contract version. It fails closed with `None` when the selected
    /// surface cannot be computed (it is empty), instead of publishing an empty
    /// or partial identity as if it were the contract.
    pub def contractDigest(surface: List[String]): Option[String] =
        let canonical = canonicalSurface(surface);
        if (List.isEmpty(canonical)) None
        else Some(contractVersion() + ":" + String.intercalate("\n", canonical))

    /// The declared exported surface of the contract: one line per exported
    /// declaration of the narrow contract, followed by one `Name.member` line
    /// per exported member. It is the Flix declaration of exactly the surface
    /// the generated TypeScript declaration and the frozen parity fixture
    /// (`platform/dsh/typert/contract-surface.v2.txt`) must agree on, and its
    /// canonical form is the contract digest's surface. A member added here
    /// without regenerating the fixture is a contract change, not a silent
    /// extension.
    pub def declaredContractSurface(): List[String] = List#{
        "EvidenceRef",
        "EvidenceRef.world",
        "EvidenceRef.revision",
        "EvidenceRef.path",
        "EvidenceRef.sha256",
        "EvidenceRef.startLine",
        "EvidenceRef.endLine",
        "EvidenceRef.bytes",
        "EvidenceRef.delivery",
        "EvidenceObservation",
        "EvidenceObservation.outcome",
        "EvidenceObservation.ref",
        "EvidenceObservation.provenance"
    }
}
