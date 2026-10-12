// Source: attune/src/Attune/../Attune.flix:128–136
// Source SHA-256: d90ba29ffff8e54d599d2e9929eed73089d8ffd3659d3759240ce3d756b85ed8
    /// The nominal domain an atom consumes.
    pub def atomSource(atom: Atom): Domain = match atom {
        case Atom.Defines    => Domain.Files
        case Atom.DefinedIn  => Domain.Symbols
        case Atom.Imports    => Domain.Files
        case Atom.ImportedBy => Domain.Files
        case Atom.Calls      => Domain.Symbols
        case Atom.Callers    => Domain.Symbols
    }
