/// Concrete repository-policy study values; native patterns and ranking are inherited.
pub mod Specialization {
    use Attune.{Artifacts, Study}
    pub enum Signed with Eq, ToString { case Signed(BigInt, BigInt) }
    pub type alias Pair = (String, String)
    pub type alias Metric = (String, Option[Pair])
    pub type alias Changes = (List[String], List[String], List[String])
    pub type alias Response = (String, String, Bool, List[String], List[Metric], List[Metric], Pair, Pair, String, (Int32, Changes, Changes))
    pub type alias TaskResponse = (String, String, String, String, String, Bool, Int32, List[Response])
    pub type alias CalTask = (String, String, String, List[(String, Pair, Pair, String)])
    pub type alias Config = (String, Int32, Bool, String)
    pub type alias Plan = (String, String, String, String, List[String])
    pub type alias Context = (String, String, List[(String, String)], List[(String, List[(String, List[String])])], List[Plan])
    pub type alias Profile = (String, String, String, List[String], (Int32, Int32), String, (Pair, Pair), (List[Int32], List[Int32], List[Int32]), List[(String, List[Int32])], List[(Int32, Pair, Pair, Pair, Pair)])
    pub type alias Fit = (String, String, List[Profile])
    pub type alias Prediction = (String, Campaign.Ranked, List[String], List[(String, Float64)], String, List[String])
    pub def signed(n: BigInt, d: BigInt): Signed = {
        let divisor = BigInt.gcd(BigInt.abs(n), BigInt.abs(d));
        if (d <= 0ii) Signed.Signed(0ii, 1ii)
        else if (n == 0ii) Signed.Signed(0ii, 1ii)
        else Signed.Signed(n / divisor, d / divisor)
    }
    pub def read(pair: Pair): Signed \ IO = {
        let (n, d) = pair;
        let numerator = Artifacts.required(Option.toOk("Malformed signed numerator.", BigInt.fromString(n)));
        let denominator = Artifacts.required(Option.toOk("Malformed signed denominator.", BigInt.fromString(d)));
        Artifacts.required(if (denominator > 0ii) Ok(signed(numerator, denominator)) else Err("Nonpositive signed denominator."))
    }
    pub def wire(value: Signed): Pair = match value {
        case Signed.Signed(n, d) => (ToString.toString(n), ToString.toString(d))
    }
    pub def zero(): Signed = signed(0ii, 1ii)
    pub def plus(a: Signed, b: Signed): Signed = match (a, b) {
        case (Signed.Signed(n, d), Signed.Signed(m, e)) => signed(n * e + m * d, d * e)
    }
    pub def minus(a: Signed, b: Signed): Signed = match b {
        case Signed.Signed(n, d) => plus(a, signed(-n, d))
    }
    pub def scale(value: Signed, n: Int32, d: Int32): Signed = match value {
        case Signed.Signed(a, b) => signed(a * Int32.toBigInt(n), b * Int32.toBigInt(d))
    }
    pub def mean(values: List[Signed]): Signed =
        if (List.isEmpty(values)) zero() else scale(List.foldLeft(plus, zero(), values), 1, List.length(values))
    pub def compare(a: Signed, b: Signed): Comparison = match (a, b) {
        case (Signed.Signed(n, d), Signed.Signed(m, e)) => Order.compare(n * e, m * d)
    }
    pub def shrink(local: Signed, pooled: Signed, n: Int32, others: Int32): Signed =
        if (n == 0 and others == 0) zero()
        else if (n == 0) pooled
        else if (others == 0) local
        else plus(scale(local, n, n + 2), scale(pooled, 2, n + 2))
    pub def metric(name: String, values: List[Metric]): Signed \ IO =
        Artifacts.required(Option.toOk("Missing canonical metric: " + name, List.find(match (key, _) -> key == name, values) |> Option.flatMap(snd))) |> read
    pub def effective(config: String, state: String, valid: Bool, qwenValid: Bool): Result[String, (String, Bool)] =
        if (not qwenValid) Err("Qwen unavailable; no fallback prediction exists.")
        else if (state != "Completed" or not valid) Ok(("Qwen", true))
        else Ok((config, false))
}
