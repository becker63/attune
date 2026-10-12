// Source: attune/src/Attune/Theory.flix:224–243
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
    /// True exactly when the descriptor is inside the admitted grammar.
    pub def safe(candidate: Descriptor): Bool = {
        let atoms = candidate#atoms;
        let count = List.length(atoms);
        count >= 1 and count <= maxAtoms()
            and List.forAll(slotInRange, roleList(atoms))
            and List.forAll(atom -> atom#subject != atom#object, atoms)
            and connected(atoms)
            and domainsConsistent(atoms)
            and List.length(candidate#outputs) >= 1
            and List.length(candidate#outputs) <= maxOutputs()
            and List.length(List.distinct(candidate#outputs)) == List.length(candidate#outputs)
            and List.forAll(output -> bound(output, atoms), candidate#outputs)
            and List.length(candidate#denied) <= maxInequalities()
            and List.forAll(pair -> match pair {
                case (left, right) => left != right and bound(left, atoms) and bound(right, atoms)
            }, candidate#denied)
    }

    def slotInRange(slot: Int32): Bool = slot >= 0 and slot < maxRoles()
