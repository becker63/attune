/// The one bounded Flix evidence operation of the DSH review substrate.
///
/// This is the semantic half of the smallest genuine substrate path: a declared
/// acquisition request over one exact world region plus the canonical coverage
/// and world facts that decide whether that region witnesses the asked relation.
/// It reuses the ONE canonical observation meaning — `Attune.Coverage.observe`,
/// the same function `Attune.Repository.ask` applies — instead of restating it,
/// so a witness, a no-match, an unknown and a failure here mean exactly what
/// they mean everywhere else in the workspace.
///
/// It is pure and provider-free: given the same declared facts it returns the
/// same observation, which is what lets the DSH tool's mechanical acquisition
/// projection and a Flix replay compare the same bytes without re-acquiring
/// anything. The mechanical source read, digest and byte count are the Java/DSH
/// seam's job; this module only binds the canonical outcome to the exact
/// delivered reference.
pub mod Attune.Study.EvidenceOperation {

    use Attune.Coverage
    use Attune.Coverage.Outcome
    use Attune.Study.EvidenceSubstrate.{
        Delivery, EvidenceObservation, EvidenceRef, deliveryName, observationIsNegative, refFindings
    }

    /// The one version of the bounded evidence operation. It is deliberately
    /// separate from the wire contract version: the contract is the transport
    /// shape, this is the operation's own semantics, and the two never have to
    /// move together.
    pub def operationVersion(): String = "attune.evidence-operation/1"

    /// One declared acquisition request: the exact world region to read plus the
    /// canonical coverage and the exact world facts the world extraction already
    /// materialized. Nothing here re-lowers a fact, and the request's reference
    /// is the exact delivered evidence identity rather than a path lookup.
    pub type alias AcquisitionRequest = {
        world = Attune.World,
        subject = String,
        atom = Attune.Atom,
        coverage = Coverage.Coverage,
        facts = List[Attune.Fact],
        ref = EvidenceRef
    }

    /// The canonical bounded evidence operation. It applies the one canonical
    /// observation meaning to the declared query, coverage and facts, and binds
    /// the outcome to the exact delivered evidence reference, so the outcome can
    /// never be read against bytes from another world or revision.
    pub def observeEvidence(request: AcquisitionRequest): EvidenceObservation =
        { outcome = Coverage.observe(
              { scope = request#world, subject = request#subject, atom = request#atom },
              request#coverage,
              request#facts),
          ref = request#ref,
          provenance = operationVersion() }

    /// The findings of one request: the reference identity and range must be
    /// well formed and the request must name a subject. It never judges whether
    /// the evidence shows a defect.
    pub def requestFindings(request: AcquisitionRequest): List[String] =
        refFindings(request#ref) :::
            (if (String.isEmpty(request#subject)) List#{"acquisition request names no subject"} else Nil)

    /// The canonical projection of one delivered reference: the exact identity a
    /// DSH tool returns after a bounded acquisition. It is derived from the
    /// canonical reference, never authored separately, so the tool projection and
    /// the Flix replay compare the same fields.
    pub def referenceProjection(ref: EvidenceRef): List[(String, String)] =
        List#{
            ("world", ref#world),
            ("revision", ref#revision),
            ("path", ref#path),
            ("sha256", ref#sha256),
            ("startLine", Int32.toString(ref#startLine)),
            ("endLine", Int32.toString(ref#endLine)),
            ("bytes", Int32.toString(ref#bytes)),
            ("delivery", deliveryName(ref#delivery))
        }

    /// The canonical projection of one observation: the exact outcome, the exact
    /// reference identity and the honest negative flag. This is the projection a
    /// DSH tool returns after the operation; it is derived from the canonical
    /// observation, never authored separately.
    pub def observationProjection(observation: EvidenceObservation): List[(String, String)] =
        ("outcome", Coverage.outcomeName(observation#outcome)) ::
            referenceProjection(observation#ref) :::
            List#{
                ("negative", if (observationIsNegative(observation)) "true" else "false"),
                ("provenance", observation#provenance)
            }

    /// One projection as a stable serialized record, so a DSH projection and a
    /// Flix replay compare the same bytes.
    pub def projectionLine(projection: List[(String, String)]): String =
        String.intercalate("\t", List.map(match (key, value) -> key + "=" + value, projection))

    /// The declared field names of the reference projection, in order. The DSH
    /// tool's parameter/projection bridge is projected from the same generated
    /// contract, and this list is the Flix side of that agreement.
    pub def referenceProjectionFields(): List[String] =
        List.map(match (key, _) -> key, referenceProjection(
            { world = "", revision = "", path = "", sha256 = "", startLine = 1, endLine = 1, bytes = 0,
              delivery = Delivery.Complete }))
}
