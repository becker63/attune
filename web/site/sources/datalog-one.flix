// Executed descriptor · real Theory owner
// content/theory-examples.flix:6-13
// Source SHA-256: 951ccb3cfa2c66bad25667f12b78c209940892c781a043e015e547b157c598d2
def oneAtom(): Theory.Descriptor = {
    // Position 0 is a file; position 1 is the file it imports.
    atoms = { relation = Atom.Imports, subject = 0, object = 1 } :: Nil,
    // An empty list of position pairs that must be different.
    denied = Nil,
    // Return positions 0 and 1. Read :: as "followed by"; Nil ends the list.
    outputs = 0 :: 1 :: Nil
}
