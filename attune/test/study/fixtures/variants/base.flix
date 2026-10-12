/// Declared fixture baseline source for the study source-variant trees.
///
/// It is carried as bytes: the variant tree is an immutable regular-file
/// artifact, not a mutable shared worktree.

mod Variant {
    pub def baseline(): Int32 = 0
}
