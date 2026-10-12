// Executed descriptor · outside the frozen 72
// content/theory-examples.flix:25-33
// Source SHA-256: 951ccb3cfa2c66bad25667f12b78c209940892c781a043e015e547b157c598d2
def threeAtoms(): Theory.Descriptor = {
    // File 0 defines caller 1; caller 1 calls symbol 2; file 3 contains 2.
    atoms = { relation = Atom.Defines, subject = 0, object = 1 }
         :: { relation = Atom.Calls, subject = 1, object = 2 }
         :: { relation = Atom.DefinedIn, subject = 2, object = 3 } :: Nil,
    denied = Nil,
    // Keep the files at the ends; the intermediate symbols are not returned.
    outputs = 0 :: 3 :: Nil
}
