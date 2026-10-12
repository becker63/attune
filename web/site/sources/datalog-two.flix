// Executed descriptor · real Theory owner
// content/theory-examples.flix:15-23
// Source SHA-256: 951ccb3cfa2c66bad25667f12b78c209940892c781a043e015e547b157c598d2
def twoAtoms(): Theory.Descriptor = {
    // Two Imports rows must agree on position 1: their shared target.
    atoms = { relation = Atom.Imports, subject = 0, object = 1 }
         :: { relation = Atom.Imports, subject = 2, object = 1 } :: Nil,
    // No inequality: positions 0 and 2 may hold the SAME file.
    denied = Nil,
    // Return the two consumers; do not return the shared target.
    outputs = 0 :: 2 :: Nil
}
