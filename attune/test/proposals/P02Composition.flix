use Attune.Envelope
use Attune.Envelope.{Atom, Domain, Frontier, World}
use Attune.View

/// P02 - typed composition.
///
/// Question. Can one typed walk compose the six directed atoms, and what does a
/// legal empty answer keep?
///
///   Files -> defines -> Symbols -> defined_in -> Files        Ok(Files)
///   Symbols -> imports                                        Err(needs files)
///   Files{} -> defines -> Symbols{} -> defined_in -> Files{}  Ok(Files)
///
/// Proposition. A composition is a domain walk over the one signature table:
/// each atom's declared source must equal the current domain and yields its
/// declared target. A rejected sequence is a typed error, never an empty
/// success, and emptiness stays a property of an answer rather than a route.
///
/// Reused envelope. `Attune.Envelope.atoms/atomSource/atomTarget` is the single
/// atom vocabulary and `Attune.View.empty/frontierLabel` presents an answer.
/// This proposal adds only the walk and its refusal text.
///
/// Enforcement. Honest split. The sequence check is RUNTIME: `Symbols` and
/// `imports` are ordinary values of the shared types, so the compiler accepts
/// the call and the walk rejects it. The one STATIC witness is narrower, that a
/// `Frontier` constructor fixes its member domain; the isolated compiler
/// negative `P02DomainWitnessNegative.flix` demonstrates it. No extra
/// compile-time domain witnesses are added, so no static sequencing claim is
/// made.
///
/// Open. Whether those extra witnesses are worth their complexity stays
/// undecided.

/// One step of a domain walk: the atom's declared source must equal the current
/// domain and the result is the atom's declared target.
pub def step(domain: Domain, atom: Atom): Result[String, Domain] =
    if (Envelope.atomSource(atom) != domain)
        Err(Envelope.atomName(atom) + " needs " + Envelope.domainName(Envelope.atomSource(atom))
            + " but the current domain is " + Envelope.domainName(domain) + ".")
    else Ok(Envelope.atomTarget(atom))

/// Walk a whole atom sequence from one starting domain.
pub def compose(domain: Domain, atoms: List[Atom]): Result[String, Domain] = match atoms {
    case Nil => Ok(domain)
    case atom :: rest => match step(domain, atom) {
        case Err(error) => Err(error)
        case Ok(next)   => compose(next, rest)
    }
}

/// The legal route closes back onto Files by the declared domains.
@Test
def filesDefinesSymbolsDefinedInFilesComposes(): Unit \ Assert = {
    Assert.assertEq(expected = Ok(Domain.Symbols), compose(Domain.Files, Atom.Defines :: Nil));
    Assert.assertEq(expected = Ok(Domain.Files), compose(Domain.Files, Atom.Defines :: Atom.DefinedIn :: Nil))
}

/// A Symbols frontier does not accept `imports`; the walk says so at runtime.
@Test
def symbolsThenImportsRejectsAtRuntime(): Unit \ Assert = {
    Assert.assertErr(compose(Domain.Symbols, Atom.Imports :: Nil));
    Assert.assertEq(expected = true, String.contains(substr = "needs files",
        match compose(Domain.Symbols, Atom.Imports :: Nil) {
            case Err(error) => error
            case Ok(_)      => ""
        }))
}

/// The same law from the other side: `defined_in` needs Symbols, not Files.
@Test
def filesThenDefinedInAlsoRejectsAtRuntime(): Unit \ Assert =
    Assert.assertErr(compose(Domain.Files, Atom.DefinedIn :: Nil))

/// A legal empty continuation keeps its world and domain and stays distinct
/// from the other empty domain's answer.
@Test
def legalEmptinessKeepsItsDomain(): Unit \ Assert = {
    let world = World.World("shop-v1");
    let seed = Envelope.files(world, Nil);
    Assert.assertEq(expected = Ok(Domain.Files),
        compose(Envelope.domainOf(seed), Atom.Defines :: Atom.DefinedIn :: Nil));
    let afterDefines = Envelope.symbols(world, Nil);
    Assert.assertEq(expected = true, View.empty(seed) and View.empty(afterDefines));
    Assert.assertEq(expected = "Files{}", View.frontierLabel(seed));
    Assert.assertEq(expected = "Symbols{}", View.frontierLabel(afterDefines));
    Assert.assertEq(expected = false, seed == afterDefines)
}
