// Source: attune/src/Attune/Theory.flix:302–313
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
    /// The canonical descriptor: the least of the consistent renamings, with the
    /// atoms sorted and de-duplicated and the roles renumbered by first
    /// appearance.
    pub def canonical(candidate: Descriptor): Descriptor =
        match bestOption(candidate, renamings(), None) {
            case None         => emptyDescriptor()
            case Some(option) => renumber(renamed(candidate, option))
        }

    /// The canonical identity key. Two descriptors share it exactly when they are
    /// the same candidate up to a consistent renaming of their role slots.
    pub def identityKey(candidate: Descriptor): String = render(canonical(candidate))
