// Source: attune/src/Attune/Study/SolInspected.flix:148–151
// Source SHA-256: 65b681bde7cf841334732968aed5cffe3131892136c331c8cab663127a36045d
    pub def protocolFailure(status: String, nonemptyImplementationReads: Int32): Option[String] =
        if (status != "ok") Some("result-status:" + status)
        else if (nonemptyImplementationReads <= 0) Some("protocol-failed:zero-nonempty-read")
        else None
