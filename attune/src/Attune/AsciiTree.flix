/// The one bounded ASCII tree writer.
///
/// A tree is only a label and an ordered list of children. This module makes no
/// inference and holds no repository vocabulary: a Flix view has already chosen
/// which labels and branches belong and in which order. Child order is checked
/// view data, so recorded run events and rule premises are never sorted here as
/// though their order were an accident.
///
/// The writer emits ASCII with LF line endings and exactly one final newline,
/// keeps every line within the declared column bound, and enforces finite depth,
/// node, label and output-byte limits before it can allocate an oversized
/// diagram. A label that is not printable ASCII, or that would read as a
/// connector or a status token, is rejected by one explicit policy rather than
/// clipped or merged, so two distinct identities never collapse into one line.
pub mod Attune.AsciiTree {

    /// A label and its ordered children.
    pub enum Tree with Eq {
        case Node(String, List[Tree])
    }

    /// The finite presentation budget. A diagram that exceeds any bound is a
    /// typed rejection, never a clipped or unbounded rendering.
    pub type alias Limits = {
        maxDepth   = Int32,
        maxNodes   = Int32,
        maxColumns = Int32,
        maxLabel   = Int32,
        maxBytes   = Int32
    }

    /// Build the presentation budget.
    pub def limits(maxDepth: Int32, maxNodes: Int32, maxColumns: Int32, maxLabel: Int32, maxBytes: Int32): Limits =
        {
            maxDepth = maxDepth,
            maxNodes = maxNodes,
            maxColumns = maxColumns,
            maxLabel = maxLabel,
            maxBytes = maxBytes
        }

    /// Render a named root. A non-empty `lead` aligns every descendant beneath
    /// the root label rather than beneath the lead's first character; passing ""
    /// gives the ordinary root-first form. Every line, including the last, ends
    /// in LF, so the whole document has exactly one final newline.
    pub def draw(lead: String, tree: Tree): String = match tree {
        case Tree.Node(label, children) =>
            lead + label + "\n" + branches(String.repeat(String.length(lead), " "), children)
    }

    /// The whole layout rule is whether another sibling follows this one.
    ///
    /// parent                 parent
    /// +-- first              `-- last
    /// |   `-- descendant         `-- descendant
    /// `-- last
    ///
    /// The vertical bar stays alive only while another sibling needs it.
    def branches(prefix: String, children: List[Tree]): String = match children {
        case Nil => ""
        case Tree.Node(label, nested) :: rest =>
            let last = List.isEmpty(rest);
            let connector = if (last) "`-- " else "+-- ";
            let continuation = if (last) "    " else "|   ";
            prefix + connector + label + "\n" +
                branches(prefix + continuation, nested) +
                branches(prefix, rest)
    }

    /// The one label policy. It preserves identity exactly: a label is either
    /// accepted unchanged or rejected with an explicit reason. Nothing is
    /// truncated and no character is rewritten, so a filename cannot inject a
    /// connector, a status bracket or a terminal control sequence.
    pub def label(limits: Limits, text: String): Result[String, String] =
        if (String.isEmpty(text)) Err("Diagram label must not be empty.")
        else if (not String.forAll(c -> c >= ' ' and c <= '~', text))
            Err("Diagram label contains non-ASCII or control characters.")
        else if (injects(text)) Err("Diagram label would inject a connector or status token.")
        else if (String.length(text) > limits#maxLabel)
            Err("Diagram label exceeds " + Int32.toString(limits#maxLabel) + " columns.")
        else Ok(text)

    /// The reserved display tokens a raw label must not contain.
    def injects(text: String): Bool =
        String.contains(substr = "->", text) or String.contains(substr = "[", text) or
            String.contains(substr = "]", text) or String.contains(substr = "|", text) or
            String.contains(substr = "`", text)

    /// The whole output policy in one place: printable ASCII, LF only, exactly
    /// one final newline, no trailing spaces and at most `maxColumns` columns.
    /// It validates bytes; it makes no claim about the graph's meaning.
    pub def checked(limits: Limits, text: String): Result[String, String] = {
        let ascii = String.forAll(c -> c == '\n' or (c >= ' ' and c <= '~'), text);
        let lines = if (String.isEmpty(text)) Nil else String.lines(text);
        let width = List.forAll(line -> String.length(line) <= limits#maxColumns, lines);
        let trim = List.forAll(line -> String.trimRight(line) == line, lines);
        if (not ascii) Err("Diagram contains non-ASCII or control characters.")
        else if (not String.endsWith(suffix = "\n", text)) Err("Diagram must end with one final newline.")
        else if (String.endsWith(suffix = "\n\n", text)) Err("Diagram must not end with a blank line.")
        else if (not width) Err("Diagram exceeds " + Int32.toString(limits#maxColumns) + " columns; do not clip it.")
        else if (not trim) Err("Diagram contains trailing spaces.")
        else Ok(text)
    }

    /// The finite structural bounds, checked before any output is allocated.
    pub def bounds(limits: Limits, tree: Tree): Result[String, Unit] =
        if (depthOf(tree) > limits#maxDepth)
            Err("Diagram exceeds depth limit " + Int32.toString(limits#maxDepth) + ".")
        else if (countNodes(tree) > limits#maxNodes)
            Err("Diagram exceeds node limit " + Int32.toString(limits#maxNodes) + ".")
        else if (overlongLabel(limits#maxLabel, tree))
            Err("Diagram contains a label over " + Int32.toString(limits#maxLabel) + " columns.")
        else Ok(())

    /// The output-byte bound, then the full text policy, over a whole document.
    pub def withinBytes(limits: Limits, text: String): Result[String, String] =
        if (Vector.length(String.toBytes(text)) > limits#maxBytes)
            Err("Diagram exceeds " + Int32.toString(limits#maxBytes) + " output bytes.")
        else checked(limits, text)

    /// Render one tree under the whole policy, after the structural bounds.
    pub def render(limits: Limits, lead: String, tree: Tree): Result[String, String] =
        match bounds(limits, tree) {
            case Err(error) => Err(error)
            case Ok(_)      => withinBytes(limits, draw(lead, tree))
        }

    /// The number of nested levels, counting the root as one.
    def depthOf(tree: Tree): Int32 = match tree {
        case Tree.Node(_, Nil)      => 1
        case Tree.Node(_, children) => 1 + List.foldLeft((best, child) -> bigger(best, depthOf(child)), 0, children)
    }

    /// The number of nodes in the tree.
    def countNodes(tree: Tree): Int32 = match tree {
        case Tree.Node(_, children) => 1 + List.foldLeft((sum, child) -> sum + countNodes(child), 0, children)
    }

    def overlongLabel(maxLabel: Int32, tree: Tree): Bool = match tree {
        case Tree.Node(label, children) =>
            String.length(label) > maxLabel or List.exists(child -> overlongLabel(maxLabel, child), children)
    }

    def bigger(left: Int32, right: Int32): Int32 = if (left > right) left else right
}
