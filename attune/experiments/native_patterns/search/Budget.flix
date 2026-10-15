/// Micro-dollar reservations. Unknown charges retain the full context reservation.
pub mod Budget {
    pub type alias Ledger = (Int32,Int32)
    pub def reserve(ledger: Ledger): Result[String,Ledger] = {
        let(committed,attempts)=ledger;
        if(committed < 0 or attempts < 0 or attempts >= 800 or committed > 3000000-2688)Err("Jev budget exhausted.")
        else Ok((committed+2688,attempts+1))
    }
    pub def reconcile(before: Ledger, reserved: Ledger, knownInputTokens: Option[Int32]): Ledger = {
        let(committed,attempts)=reserved;
        match knownInputTokens {
            case Some(tokens) if tokens >= 0 and tokens <= 64000 =>
                // ceil(tokens * .042 dollars / million * million micro-dollars)
                let cost=(tokens*42+999)/1000;
                (fst(before)+cost,attempts)
            case _ => (committed,attempts)
        }
    }
    pub def reserveScale(ledger: Ledger): Result[String,Ledger] = {
        let(committed,attempts)=ledger;
        if(committed < 0 or attempts < 0 or attempts >= 20000 or committed > 3000000-2688)Err("Scale Jev budget exhausted.")
        else Ok((committed+2688,attempts+1))
    }
    pub def reserveQuality(ledger: Ledger): Result[String,Ledger] = {
        let(committed,attempts)=ledger;
        if(committed < 0 or attempts < 0 or attempts >= 1000 or committed > 250000-2688)Err("Quality Jev budget exhausted.")
        else Ok((committed+2688,attempts+1))
    }
    /// Cadence campaign v1: one $10 ledger shared by every guided arm. Each attempt
    /// reserves the 64k-token ceiling before dispatch; releaseScale reconciles it.
    pub def cadenceCapMicros(): Int32 = 10000000
    pub def reserveCadence(ledger: Ledger): Result[String,Ledger] = {
        let(committed,attempts)=ledger;
        if(committed < 0 or attempts < 0 or attempts >= 3000 or committed > cadenceCapMicros()-2688)Err("Cadence Jev budget exhausted.")
        else Ok((committed+2688,attempts+1))
    }
    /// Reconcile one independent reservation against the shared current ledger.
    pub def releaseScale(ledger: Ledger, knownInputTokens: Option[Int32]): Ledger = {
        let(committed,attempts)=ledger;
        match knownInputTokens {
            case Some(tokens) if tokens >= 0 and tokens <= 64000 => (committed-2688+(tokens*42+999)/1000,attempts)
            case _ => ledger
        }
    }

}
