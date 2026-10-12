/// The declared fixture world source for the study panel.
///
/// It is carried as bytes by the study graph, not compiled: the immutable
/// world-source tree holds it, and the declared fixture facts name its
/// entities. A real corpus world exports and analyzes its source; this fixture
/// world keeps the declared-graph facts explicit and separately labelled.

mod Shop {
    pub def render(): Int32 = 42

    pub def total_cents(): Int32 = 7
}
