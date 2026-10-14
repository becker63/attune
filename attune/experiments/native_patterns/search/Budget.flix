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
}
