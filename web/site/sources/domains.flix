// Source: attune/src/Attune/Theory.flix:275–285
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
    /// One role slot must mean one nominal domain. The domains come from the core
    /// signature table, so an atom that reads a role as a file and an atom that
    /// writes it as a symbol cannot be composed into one conjunction.
    def domainsConsistent(atoms: List[AtomPattern]): Bool =
        List.forAll(role -> List.length(List.distinct(domainsOf(role, atoms))) <= 1, List.distinct(roleList(atoms)))

    def domainsOf(role: Int32, atoms: List[AtomPattern]): List[Domain] =
        List.flatMap(atom ->
            (if (atom#subject == role) Attune.atomSource(atom#relation) :: Nil else Nil)
                ::: (if (atom#object == role) Attune.atomTarget(atom#relation) :: Nil else Nil),
            atoms)
