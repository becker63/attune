// Explanatory descriptor value. Display only; not a new query.
// Slot 0 = the starting file.
// Slot 1 = the file it imports.
// Slot 2 = a file that imports that same file.
{
    atoms =
        // Start file -> imported file.
        { relation = Atom.Imports, subject = 0, object = 1 } ::
        // Shared file -> a file that imports it (read the import backward).
        { relation = Atom.ImportedBy, subject = 1, object = 2 } ::
        Nil,

    // No "must be different" constraint in this example.
    // A match could also return the starting file itself.
    denied = Nil,

    // Return the file in slot 2, not the shared file in slot 1.
    outputs = 2 :: Nil
}
