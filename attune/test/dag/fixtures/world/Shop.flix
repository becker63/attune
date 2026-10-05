/// The fixture world source the declared producer exports as an immutable tree.
///
/// It is deliberately self-contained: the producer compiles and executes it
/// through the pinned compiler's authentic native Tester, and the downstream
/// consumer compiles the exported copy again, so the artifact's content is
/// exercised rather than only listed. It declares a plain top-level computation
/// rather than a nested module so the same bytes stay a valid single
/// compilation unit from either the declared location or the exported tree.
def answer(): Int32 = 42
