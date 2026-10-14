// Source: attune/src/Attune/../Attune.flix:155–167
// Source SHA-256: d90ba29ffff8e54d599d2e9929eed73089d8ffd3659d3759240ce3d756b85ed8
    /// The opposite of one directed atom. `defines`/`defined_in`,
    /// `imports`/`imported_by` and `calls`/`callers` are the three inverse
    /// pairs. Deriving an inverse relation reads this one typed table rather
    /// than a second string mapping, so the forward and inverse vocabularies
    /// cannot disagree.
    pub def inverse(atom: Atom): Atom = match atom {
        case Atom.Defines    => Atom.DefinedIn
        case Atom.DefinedIn  => Atom.Defines
        case Atom.Imports    => Atom.ImportedBy
        case Atom.ImportedBy => Atom.Imports
        case Atom.Calls      => Atom.Callers
        case Atom.Callers    => Atom.Calls
    }
