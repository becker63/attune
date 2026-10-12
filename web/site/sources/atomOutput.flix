// Source: attune/src/Attune/../Attune.flix:138–146
// Source SHA-256: d90ba29ffff8e54d599d2e9929eed73089d8ffd3659d3759240ce3d756b85ed8
    /// The nominal domain an atom produces.
    pub def atomTarget(atom: Atom): Domain = match atom {
        case Atom.Defines    => Domain.Symbols
        case Atom.DefinedIn  => Domain.Files
        case Atom.Imports    => Domain.Files
        case Atom.ImportedBy => Domain.Files
        case Atom.Calls      => Domain.Symbols
        case Atom.Callers    => Domain.Symbols
    }
