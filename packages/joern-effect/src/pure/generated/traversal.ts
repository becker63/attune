import {
  addPropertyFilterMethods,
  addStepGetters,
  type Traversal,
} from "../builder/traversal.js";
export const traversalStepNames = [
  "aliasOf",
  "annotation",
  "annotationLiteral",
  "annotationParameter",
  "annotationParameterAssign",
  "argument",
  "arrayInitializer",
  "ast",
  "binding",
  "binds",
  "bindsTo",
  "block",
  "call",
  "capture",
  "capturedBy",
  "catchBody",
  "cdg",
  "cfg",
  "closureBinding",
  "comment",
  "condition",
  "configFile",
  "contains",
  "controlStructure",
  "dependency",
  "doBody",
  "dominate",
  "evalType",
  "falseBody",
  "fieldIdentifier",
  "file",
  "finallyBody",
  "finding",
  "forBody",
  "forInit",
  "forUpdate",
  "identifier",
  "import",
  "imports",
  "inheritsFrom",
  "isCallForImport",
  "jumpArgument",
  "jumpLabel",
  "jumpTarget",
  "keyValuePair",
  "literal",
  "local",
  "member",
  "metaData",
  "method",
  "methodParameterIn",
  "methodParameterOut",
  "methodRef",
  "methodReturn",
  "modifier",
  "namespace",
  "namespaceBlock",
  "parameterLink",
  "postDominate",
  "reachingDef",
  "receiver",
  "ref",
  "return",
  "sourceFile",
  "tag",
  "tagNodePair",
  "taggedBy",
  "templateDom",
  "trueBody",
  "tryBody",
  "type",
  "typeArgument",
  "typeDecl",
  "typeParameter",
  "typeRef",
  "unknown",
] as const;

export const traversalPropertyFilters = {
  aliasTypeFullName: "aliasTypeFullName",
  argumentIndex: "argumentIndex",
  argumentLabel: "argumentLabel",
  argumentName: "argumentName",
  astParentFullName: "astParentFullName",
  astParentType: "astParentType",
  canonicalName: "canonicalName",
  closureBindingId: "closureBindingId",
  code: "code",
  columnNumber: "columnNumber",
  columnNumberEnd: "columnNumberEnd",
  containedRef: "containedRef",
  content: "content",
  controlStructureType: "controlStructureType",
  dependencyGroupId: "dependencyGroupId",
  dispatchType: "dispatchType",
  dynamicTypeHintFullName: "dynamicTypeHintFullName",
  evaluationStrategy: "evaluationStrategy",
  evidenceDescription: "evidenceDescription",
  explicitAs: "explicitAs",
  filename: "filename",
  fullName: "fullName",
  genericSignature: "genericSignature",
  hash: "hash",
  importedAs: "importedAs",
  importedEntity: "importedEntity",
  index: "index",
  inheritsFromTypeFullName: "inheritsFromTypeFullName",
  isExplicit: "isExplicit",
  isExternal: "isExternal",
  isModuleImport: "isModuleImport",
  isVariadic: "isVariadic",
  isWildcard: "isWildcard",
  key: "key",
  language: "language",
  lineNumber: "lineNumber",
  lineNumberEnd: "lineNumberEnd",
  methodFullName: "methodFullName",
  modifierType: "modifierType",
  name: "name",
  offset: "offset",
  offsetEnd: "offsetEnd",
  order: "order",
  overlays: "overlays",
  parserTypeName: "parserTypeName",
  possibleTypes: "possibleTypes",
  root: "root",
  signature: "signature",
  staticReceiver: "staticReceiver",
  typeDeclFullName: "typeDeclFullName",
  typeFullName: "typeFullName",
  value: "value",
  version: "version",
} as const;

declare module "../builder/traversal.js" {
  interface Traversal {
    /**
     * This edge represents an alias relation between a type declaration and a type.
     * The language frontend MUST NOT create `ALIAS_OF` edges as they are created
     * automatically based on `ALIAS_TYPE_FULL_NAME` fields when the CPG is first loaded.
     * Continue the traversal through Joern step `aliasOf`.
     */
    readonly aliasOf: Traversal;
    /**
     * A method annotation.
     * The semantics of the FULL_NAME property on this node differ from the usual FULL_NAME
     * semantics in the sense that FULL_NAME describes the represented annotation class/interface
     * itself and not the ANNOTATION node.
     * Continue the traversal through Joern step `annotation`.
     */
    readonly annotation: Traversal;
    /**
     * A literal value assigned to an ANNOTATION_PARAMETER
     * Continue the traversal through Joern step `annotationLiteral`.
     */
    readonly annotationLiteral: Traversal;
    /**
     * Formal annotation parameter
     * Continue the traversal through Joern step `annotationParameter`.
     */
    readonly annotationParameter: Traversal;
    /**
     * Assignment of annotation argument to annotation parameter
     * Continue the traversal through Joern step `annotationParameterAssign`.
     */
    readonly annotationParameterAssign: Traversal;
    /**
     * Argument edges connect call sites (node type `CALL`) to their arguments
     * (node type `EXPRESSION`) as well as `RETURN` nodes to the expressions
     * that return.
     * Continue the traversal through Joern step `argument`.
     */
    readonly argument: Traversal;
    /**
     * Initialization construct for arrays
     * Continue the traversal through Joern step `arrayInitializer`.
     */
    readonly arrayInitializer: Traversal;
    /**
     * This edge connects a parent node to its child in the syntax tree.
     * Continue the traversal through Joern step `ast`.
     */
    readonly ast: Traversal;
    /**
     * `BINDING` nodes represent name-signature pairs that can be resolved at a
     * type declaration (`TYPE_DECL`). They are connected to `TYPE_DECL` nodes via
     * incoming `BINDS` edges. The bound method is either associated with an outgoing
     * `REF` edge to a `METHOD` or with the `METHOD_FULL_NAME` property. The `REF` edge
     * if present has priority.
     * Continue the traversal through Joern step `binding`.
     */
    readonly binding: Traversal;
    /**
     * This edge connects a type declaration (`TYPE_DECL`) with a binding node (`BINDING`) and
     * indicates that the type declaration has the binding represented by the binding node, in
     * other words, there is a (name, signature) pair that can be resolved for the type
     * declaration as stored in the binding node.
     * Continue the traversal through Joern step `binds`.
     */
    readonly binds: Traversal;
    /**
     * This edge connects type arguments to type parameters to indicate
     * that the type argument is used to instantiate the type parameter.
     * Continue the traversal through Joern step `bindsTo`.
     */
    readonly bindsTo: Traversal;
    /**
     * This node represents a compound statement. Compound statements are used in many languages to allow
     * grouping a sequence of statements. For example, in C and Java, compound statements
     * are statements enclosed by curly braces. Function/Method bodies are compound
     * statements. We do not use the term "compound statement" because "statement" would
     * imply that the block does not yield a value upon evaluation, that is, that it is
     * not an expression. This is true in languages such as C and Java, but not for languages
     * such as Scala where the value of the block is given by that of the last expression it
     * contains. In fact, the Scala grammar uses the term "BlockExpr" (short for
     * "block expression") to describe what in the CPG we call "Block".
     * Continue the traversal through Joern step `block`.
     */
    readonly block: Traversal;
    /**
     * This edge connects call sites, i.e., nodes with the type `CALL`, to the
     * method node that represent the method they invoke. The frontend MAY create
     * `CALL` edges but is not required to do so. Instead, of the `METHOD_FULL_NAME`
     * field of the `CALL` node is set correctly, `CALL` edges are created
     * automatically as the CPG is first loaded.
     * Continue the traversal through Joern step `call`.
     */
    readonly call: Traversal;
    /**
     * Represents the capturing of a variable into a closure
     * Continue the traversal through Joern step `capture`.
     */
    readonly capture: Traversal;
    /**
     * Connection between a captured LOCAL and the corresponding CLOSURE_BINDING
     * Continue the traversal through Joern step `capturedBy`.
     */
    readonly capturedBy: Traversal;
    /**
     * The edge connects try control structure nodes to catch/handler bodies.
     * Continue the traversal through Joern step `catchBody`.
     */
    readonly catchBody: Traversal;
    /**
     * A CDG edge expresses that the destination node is control dependent on the source node.
     * Continue the traversal through Joern step `cdg`.
     */
    readonly cdg: Traversal;
    /**
     * This edge indicates control flow from the source to the destination node.
     * Continue the traversal through Joern step `cfg`.
     */
    readonly cfg: Traversal;
    /**
     * Represents the binding of a LOCAL or METHOD_PARAMETER_IN into the closure of a method
     * Continue the traversal through Joern step `closureBinding`.
     */
    readonly closureBinding: Traversal;
    /**
     * A source code comment
     * Continue the traversal through Joern step `comment`.
     */
    readonly comment: Traversal;
    /**
     * The edge connects control structure nodes to the expressions that holds their conditions.
     * Continue the traversal through Joern step `condition`.
     */
    readonly condition: Traversal;
    /**
     * This node type represent a configuration file, where `NAME` is the name
     * of the file and `content` is its content. The exact representation of the
     * name is left undefined and can be chosen as required by consumers of
     * the corresponding configuration files.
     * Continue the traversal through Joern step `configFile`.
     */
    readonly configFile: Traversal;
    /**
     * This edge connects a node to the method that contains it.
     * Continue the traversal through Joern step `contains`.
     */
    readonly contains: Traversal;
    /**
     * This node represents a control structure as introduced by control structure
     * statements as well as conditional and unconditional jumps. Its type is stored in the
     * `CONTROL_STRUCTURE_TYPE` field to be one of several pre-defined types. These types
     * are used in the construction of the control flow layer, making it possible to
     * generate the control flow layer from the abstract syntax tree layer automatically.
     *
     * In addition to the `CONTROL_STRUCTURE_TYPE` field, the `PARSER_TYPE_NAME` field
     * MAY be used by frontends to store the name of the control structure as emitted by
     * the parser or disassembler, however, the value of this field is not relevant
     * for construction of the control flow layer.
     * Continue the traversal through Joern step `controlStructure`.
     */
    readonly controlStructure: Traversal;
    /**
     * This node represents a dependency
     * Continue the traversal through Joern step `dependency`.
     */
    readonly dependency: Traversal;
    /**
     * The edge connects do-while control structure nodes to their body.
     * Continue the traversal through Joern step `doBody`.
     */
    readonly doBody: Traversal;
    /**
     * This edge indicates that the source node immediately dominates the destination node.
     * Continue the traversal through Joern step `dominate`.
     */
    readonly dominate: Traversal;
    /**
     * This edge connects a node to its evaluation type.
     * Continue the traversal through Joern step `evalType`.
     */
    readonly evalType: Traversal;
    /**
     * The edge connects control structure nodes to their false branch/body.
     * Continue the traversal through Joern step `falseBody`.
     */
    readonly falseBody: Traversal;
    /**
     * This node represents the field accessed in a field access, e.g., in
     * `a.b`, it represents `b`. The field name as it occurs in the code is
     * stored in the `CODE` field. This may mean that the `CODE` field holds
     * an expression. The `CANONICAL_NAME` field MAY contain the same value is
     * the `CODE` field but SHOULD contain the normalized name that results
     * from evaluating `CODE` as an expression if such an evaluation is
     * possible for the language frontend. The objective is to store an identifier
     * in `CANONICAL_NAME` that is the same for two nodes iff they refer to the
     * same field, regardless of whether they use the same expression to reference
     * it.
     * Continue the traversal through Joern step `fieldIdentifier`.
     */
    readonly fieldIdentifier: Traversal;
    /**
     * File nodes represent source files or a shared objects from which the CPG
     * was generated. File nodes serve as indices, that is, they allow looking up all
     * elements of the code by file.
     *
     * For each file, the graph CAN contain exactly one File node, if not File nodes
     * are created as indicated by `FILENAME` property of other nodes.
     * As file nodes are root nodes of abstract syntax tress, they are AstNodes and
     * their order field is set to 0. This is because they have no sibling nodes,
     * not because they are the first node of the AST.
     * Continue the traversal through Joern step `file`.
     */
    readonly file: Traversal;
    /**
     * The edge connects try control structure nodes to their finally body.
     * Continue the traversal through Joern step `finallyBody`.
     */
    readonly finallyBody: Traversal;
    /**
     * Finding nodes may be used to store analysis results in the graph
     * that are to be exposed to an end-user, e.g., information about
     * potential vulnerabilities or dangerous programming practices.
     * A Finding node may contain an abitrary list of key value pairs
     * that characterize the finding, as well as a list of nodes that
     * serve as evidence for the finding.
     * Continue the traversal through Joern step `finding`.
     */
    readonly finding: Traversal;
    /**
     * The edge connects for-loop control structure nodes to their body.
     * Continue the traversal through Joern step `forBody`.
     */
    readonly forBody: Traversal;
    /**
     * The edge connects for-loop control structure nodes to their initialization expression(s).
     * Continue the traversal through Joern step `forInit`.
     */
    readonly forInit: Traversal;
    /**
     * The edge connects for-loop control structure nodes to their update/step expression(s).
     * Continue the traversal through Joern step `forUpdate`.
     */
    readonly forUpdate: Traversal;
    /**
     * This node represents an identifier as used when referring to a variable by name.
     * It holds the identifier's name in the `NAME` field and its fully-qualified type
     * name in `TYPE_FULL_NAME`.
     * Continue the traversal through Joern step `identifier`.
     */
    readonly identifier: Traversal;
    /**
     * Declarative import as it is found in statically typed languages like Java.
     * This kind of node is not supposed to be used for imports in dynamically typed
     * languages like Javascript.
     * Continue the traversal through Joern step `import`.
     */
    readonly import: Traversal;
    /**
     * Edge from imports to dependencies
     * Continue the traversal through Joern step `imports`.
     */
    readonly imports: Traversal;
    /**
     * Inheritance relation between a type declaration and a type. This edge MUST NOT
     * be created by the language frontend as it is automatically created from
     * `INHERITS_FROM_TYPE_FULL_NAME` fields then the CPG is first loaded.
     * Continue the traversal through Joern step `inheritsFrom`.
     */
    readonly inheritsFrom: Traversal;
    /**
     * Edge from CALL statement in the AST to the IMPORT.
     * ￼        |We use this edge to traverse from the logical representation of the IMPORT
     * ￼        |to the corresponding import statement in the AST.
     * ￼        |
     * Continue the traversal through Joern step `isCallForImport`.
     */
    readonly isCallForImport: Traversal;
    /**
     * The edge connects jump-like control structures to the node encoding their jump target.
     * Continue the traversal through Joern step `jumpArgument`.
     */
    readonly jumpArgument: Traversal;
    /**
     * A jump label specifies the label and thus the JUMP_TARGET of control structures
     * BREAK and CONTINUE. The `NAME` field holds the name of the label while the
     * `PARSER_TYPE_NAME` field holds the name of language construct that this jump
     * label is created from, e.g., "Label".
     * Continue the traversal through Joern step `jumpLabel`.
     */
    readonly jumpLabel: Traversal;
    /**
     * A jump target is any location in the code that has been specifically marked
     * as the target of a jump, e.g., via a label. The `NAME` field holds the name of
     * the label while the `PARSER_TYPE_NAME` field holds the name of language construct
     * that this jump target is created from, e.g., "Label".
     * Continue the traversal through Joern step `jumpTarget`.
     */
    readonly jumpTarget: Traversal;
    /**
     * This node represents a key value pair, where both the key and the value are strings.
     * Continue the traversal through Joern step `keyValuePair`.
     */
    readonly keyValuePair: Traversal;
    /**
     * This node represents a literal such as an integer or string constant. Literals
     * are symbols included in the code in verbatim form and which are immutable.
     * The `TYPE_FULL_NAME` field stores the literal's fully-qualified type name,
     * e.g., `java.lang.Integer`.
     * Continue the traversal through Joern step `literal`.
     */
    readonly literal: Traversal;
    /**
     * This node represents a local variable. Its fully qualified type name is stored
     * in the `TYPE_FULL_NAME` field and its name in the `NAME` field. The `CODE` field
     * contains the entire local variable declaration without initialization, e.g., for
     * `int x = 10;`, it contains `int x`.
     * Continue the traversal through Joern step `local`.
     */
    readonly local: Traversal;
    /**
     * This node represents a type member of a class, struct or union, e.g., for the
     * type declaration `class Foo{ int i ; }`, it represents the declaration of the
     * variable `i`.
     * Continue the traversal through Joern step `member`.
     */
    readonly member: Traversal;
    /**
     * This node contains the CPG meta data. Exactly one node of this type
     * MUST exist per CPG. The `HASH` property MAY contain a hash value calculated
     * over the source files this CPG was generated from. The `VERSION` MUST be
     * set to the version of the specification ("1.1"). The language field indicates
     * which language frontend was used to generate the CPG and the list property
     * `OVERLAYS` specifies which overlays have been applied to the CPG.
     * Continue the traversal through Joern step `metaData`.
     */
    readonly metaData: Traversal;
    /**
     * Programming languages offer many closely-related concepts for describing blocks
     * of code that can be executed with input parameters and return output parameters,
     * possibly causing side effects. In the CPG specification, we refer to all of these
     * concepts (procedures, functions, methods, etc.) as methods. A single METHOD node
     * must exist for each method found in the source program.
     *
     * The `FULL_NAME` field specifies the method's fully-qualified name, including
     * information about the namespace it is contained in if applicable, the name field
     * is the function's short name. The field `IS_EXTERNAL` indicates whether it was
     * possible to identify a method body for the method. This is true for methods that
     * are defined in the source program, and false for methods that are dynamically
     * linked to the program, that is, methods that exist in an external dependency.
     *
     * Line and column number information is specified in the optional fields
     * `LINE_NUMBER`, `COLUMN_NUMBER`, `LINE_NUMBER_END`, and `COLUMN_NUMBER_END` and
     * the name of the source file is specified in `FILENAME`. An optional hash value
     * MAY be calculated over the function contents and included in the `HASH` field.
     *
     * Finally, the fully qualified name of the program constructs that the method
     * is immediately contained in is stored in the `AST_PARENT_FULL_NAME` field
     * and its type is indicated in the `AST_PARENT_TYPE` field to be one of
     * `METHOD`, `TYPE_DECL` or `NAMESPACE_BLOCK`.
     * Continue the traversal through Joern step `method`.
     */
    readonly method: Traversal;
    /**
     * This node represents a formal input parameter. The field `NAME` contains its
     * name, while the field `TYPE_FULL_NAME` contains the fully qualified type name.
     * Continue the traversal through Joern step `methodParameterIn`.
     */
    readonly methodParameterIn: Traversal;
    /**
     * This node represents a formal output parameter. Corresponding output parameters
     * for input parameters MUST NOT be created by the frontend as they are automatically
     * created upon first loading the CPG.
     * Continue the traversal through Joern step `methodParameterOut`.
     */
    readonly methodParameterOut: Traversal;
    /**
     * This node represents a reference to a method/function/procedure as it
     * appears when a method is passed as an argument in a call. The `METHOD_FULL_NAME`
     * field holds the fully-qualified name of the referenced method and the
     * `TYPE_FULL_NAME` holds its fully-qualified type name.
     * Continue the traversal through Joern step `methodRef`.
     */
    readonly methodRef: Traversal;
    /**
     * This node represents an (unnamed) formal method return parameter. It carries its
     * fully qualified type name in `TYPE_FULL_NAME`. The `CODE` field MAY be set freely,
     * e.g., to the constant `RET`, however, subsequent layer creators MUST NOT depend
     * on this value.
     * Continue the traversal through Joern step `methodReturn`.
     */
    readonly methodReturn: Traversal;
    /**
     * This field represents a (language-dependent) modifier such as `static`, `private`
     * or `public`. Unlike most other AST nodes, it is NOT an expression, that is, it
     * cannot be evaluated and cannot be passed as an argument in function calls.
     * Continue the traversal through Joern step `modifier`.
     */
    readonly modifier: Traversal;
    /**
     * This node represents a namespace. Similar to FILE nodes, NAMESPACE nodes
     * serve as indices that allow all definitions inside a namespace to be
     * obtained by following outgoing edges from a NAMESPACE node.
     *
     * NAMESPACE nodes MUST NOT be created by language frontends. Instead,
     * they are generated from NAMESPACE_BLOCK nodes automatically upon
     * first loading of the CPG.
     * Continue the traversal through Joern step `namespace`.
     */
    readonly namespace: Traversal;
    /**
     * A reference to a namespace.
     * We borrow the concept of a "namespace block" from C++, that is, a namespace block
     * is a block of code that has been placed in the same namespace by a programmer.
     * This block may be introduced via a `package` statement in Java or
     * a `namespace{ }` statement in C++.
     *
     * The `FULL_NAME` field contains a unique identifier to represent the namespace block
     * itself not just the namespace it references. So in addition to the namespace name
     * it can be useful to use the containing file name to derive a unique identifier.
     *
     * The `NAME` field contains the namespace name in a human-readable format.
     * The name should be given in dot-separated form where a dot indicates
     * that the right hand side is a sub namespace of the left hand side, e.g.,
     * `foo.bar` denotes the namespace `bar` contained in the namespace `foo`.
     * Continue the traversal through Joern step `namespaceBlock`.
     */
    readonly namespaceBlock: Traversal;
    /**
     * This edge connects a method input parameter to the corresponding
     * method output parameter.
     * Continue the traversal through Joern step `parameterLink`.
     */
    readonly parameterLink: Traversal;
    /**
     * This edge indicates that the source node immediately post dominates the destination node.
     * Continue the traversal through Joern step `postDominate`.
     */
    readonly postDominate: Traversal;
    /**
     * A reaching definition edge indicates that a variable produced at the source node reaches
     * the destination node without being reassigned on the way. The `VARIABLE` property indicates
     * which variable is propagated.
     * Continue the traversal through Joern step `reachingDef`.
     */
    readonly reachingDef: Traversal;
    /**
     * Similar to `ARGUMENT` edges, `RECEIVER` edges connect call sites
     * to their receiver arguments. A receiver argument is the object on
     * which a method operates, that is, it is the expression that is
     * assigned to the `this` pointer as control is transferred to the method.
     * Continue the traversal through Joern step `receiver`.
     */
    readonly receiver: Traversal;
    /**
     * This edge indicates that the source node is an identifier that denotes
     * access to the destination node. For example, an identifier may reference
     * a local variable.
     * Continue the traversal through Joern step `ref`.
     */
    readonly ref: Traversal;
    /**
     * This node represents a return instruction, e.g., `return x`. Note that it does
     * NOT represent a formal return parameter as formal return parameters are
     * represented via `METHOD_RETURN` nodes.
     * Continue the traversal through Joern step `return`.
     */
    readonly return: Traversal;
    /**
     * This edge connects a node to the node that represents its source file. These
     * edges MUST not be created by the language frontend but are automatically
     * created based on `FILENAME` fields.
     * Continue the traversal through Joern step `sourceFile`.
     */
    readonly sourceFile: Traversal;
    /**
     * This node represents a tag.
     * Continue the traversal through Joern step `tag`.
     */
    readonly tag: Traversal;
    /**
     * This node contains an arbitrary node and an associated tag node.
     * Continue the traversal through Joern step `tagNodePair`.
     */
    readonly tagNodePair: Traversal;
    /**
     * Edges from nodes to the tags they are tagged by.
     * Continue the traversal through Joern step `taggedBy`.
     */
    readonly taggedBy: Traversal;
    /**
     * This node represents a DOM node used in template languages, e.g., JSX/TSX
     * Continue the traversal through Joern step `templateDom`.
     */
    readonly templateDom: Traversal;
    /**
     * The edge connects control structure nodes to their true branch/body.
     * Continue the traversal through Joern step `trueBody`.
     */
    readonly trueBody: Traversal;
    /**
     * The edge connects try control structure nodes to their try body.
     * Continue the traversal through Joern step `tryBody`.
     */
    readonly tryBody: Traversal;
    /**
     * This node represents a type instance, that is, a concrete instantiation
     * of a type declaration.
     * Continue the traversal through Joern step `type`.
     */
    readonly type: Traversal;
    /**
     * An (actual) type argument as used to instantiate a parametrized type, in the
     * same way an (actual) arguments provides concrete values for a parameter
     * at method call sites. As it true for arguments, the method is not expected
     * to  interpret the type argument. It MUST however store its code in the
     * `CODE` field.
     * Continue the traversal through Joern step `typeArgument`.
     */
    readonly typeArgument: Traversal;
    /**
     * This node represents a type declaration as for example given by a class-, struct-,
     * or union declaration. In contrast to a `TYPE` node, this node does not represent a
     * concrete instantiation of a type, e.g., for the parametrized type `List[T]`, it represents
     * `List[T]`, but not `List[Integer]` where `Integer` is a concrete type.
     *
     * The language frontend MUST create type declarations for all types declared in the
     * source program and MAY provide type declarations for types that are not declared
     * but referenced by the source program. If a declaration is present in the source
     * program, the field `IS_EXTERNAL` is set to `false`. Otherwise, it is set to `true`.
     *
     * The `FULL_NAME` field specifies the type's fully-qualified name, including
     * information about the namespace it is contained in if applicable, the name field
     * is the type's short name. Line and column number information is specified in the
     * optional fields `LINE_NUMBER`, `COLUMN_NUMBER`, `LINE_NUMBER_END`, and
     * `COLUMN_NUMBER_END` and the name of the source file is specified in `FILENAME`.
     *
     * Base types can be specified via the `INHERITS_FROM_TYPE_FULL_NAME` list, where
     * each entry contains the fully-qualified name of a base type. If the type is
     * known to be an alias of another type (as for example introduced via the C
     * `typedef` statement), the name of the alias is stored in `ALIAS_TYPE_FULL_NAME`.
     *
     * Finally, the fully qualified name of the program constructs that the type declaration
     * is immediately contained in is stored in the `AST_PARENT_FULL_NAME` field
     * and its type is indicated in the `AST_PARENT_TYPE` field to be one of
     * `METHOD`, `TYPE_DECL` or `NAMESPACE_BLOCK`.
     * Continue the traversal through Joern step `typeDecl`.
     */
    readonly typeDecl: Traversal;
    /**
     * This node represents a formal type parameter, that is, the type parameter
     * as given in a type-parametrized method or type declaration. Examples for
     * languages that support type parameters are Java (via Generics) and C++
     * (via templates). Apart from the standard fields of AST nodes, the type
     * parameter carries only a `NAME` field that holds the parameters name.
     * Continue the traversal through Joern step `typeParameter`.
     */
    readonly typeParameter: Traversal;
    /**
     * Reference to a type/class
     * Continue the traversal through Joern step `typeRef`.
     */
    readonly typeRef: Traversal;
    /**
     * Any AST node that the frontend would like to include in the AST but for
     * which no suitable AST node is specified in the CPG specification may be
     * included using a node of type `UNKNOWN`.
     * Continue the traversal through Joern step `unknown`.
     */
    readonly unknown: Traversal;
    /**
     * This property holds the fully qualified name of the type that the node is
     * a type alias of.
     * CPG property `ALIAS_TYPE_FULL_NAME` exposed as `aliasTypeFullName`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: TYPE_DECL.
     * Filters with Joern CPGQL property `aliasTypeFullName`.
     */
    aliasTypeFullName(value: string | null | RegExp): Traversal;
    /**
     * AST-children of CALL nodes have an argument index, that is used to match
     * call-site arguments with callee parameters. Explicit parameters are numbered
     * from 1 to N, while index 0 is reserved for implicit self / this parameter.
     * CALLs without implicit parameter therefore have arguments starting with index 1.
     * AST-children of BLOCK nodes may have an argument index as well; in this case,
     * the last argument index determines the return expression of a BLOCK expression.
     * If the `PARAMETER_NAME` field is set, then the `ARGUMENT_INDEX` field is
     * ignored. It is suggested to set it to -1.
     * CPG property `ARGUMENT_INDEX` exposed as `argumentIndex`.
     * Type: number. Cardinality: one.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ARRAY_INITIALIZER, BLOCK, CALL, CONTROL_STRUCTURE, FIELD_IDENTIFIER, IDENTIFIER, JUMP_TARGET, LITERAL, METHOD_REF, RETURN, TEMPLATE_DOM, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `argumentIndex`.
     */
    argumentIndex(value: number): Traversal;
    /**
     * This field is used to keep track of the argument label for languages that support them, such as Swift.
     * It is used in addition to `ARGUMENT_INDEX` and can be used to reconstruct the original call syntax more faithfully.
     * For example, in Swift, a method call may look like `foo(arg1: 42, arg2: "hello")` where `arg1` and `arg2`
     * are argument labels. In this case, the `ARGUMENT_LABEL` field for the first argument would be set to `arg1`
     * and for the second argument it would be set to `arg2`.
     * Contrary to the `ARGUMENT_NAME` the label should not be expected to match the name of any parameter,
     * and is not needed for dataflow purposes at all.
     * CPG property `ARGUMENT_LABEL` exposed as `argumentLabel`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ARRAY_INITIALIZER, BLOCK, CALL, CONTROL_STRUCTURE, FIELD_IDENTIFIER, IDENTIFIER, LITERAL, METHOD_REF, RETURN, TEMPLATE_DOM, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `argumentLabel`.
     */
    argumentLabel(value: string | null | RegExp): Traversal;
    /**
     * For calls involving named parameters, the `ARGUMENT_NAME` field holds the
     * name of the parameter initialized by the expression. For all other calls,
     * this field is unset.
     * Note that the `ARGUMENT_NAME` should be an exact match of the NAME of a
     * METHOD_PARAMETER_{IN,OUT}. It overrides ARGUMENT_INDEX for dataflow purposes.
     * CPG property `ARGUMENT_NAME` exposed as `argumentName`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ARRAY_INITIALIZER, BLOCK, CALL, CONTROL_STRUCTURE, FIELD_IDENTIFIER, IDENTIFIER, LITERAL, METHOD_REF, RETURN, TEMPLATE_DOM, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `argumentName`.
     */
    argumentName(value: string | null | RegExp): Traversal;
    /**
     * This field holds the FULL_NAME of the AST parent of an entity.
     * CPG property `AST_PARENT_FULL_NAME` exposed as `astParentFullName`.
     * Type: string. Cardinality: one.
     * Owners: MEMBER, METHOD, TYPE_DECL.
     * Filters with Joern CPGQL property `astParentFullName`.
     */
    astParentFullName(value: string | RegExp): Traversal;
    /**
     * The type of the AST parent. Since this is only used in some parts of the graph,
     * the list does not include all possible parents by intention.
     * Possible parents: METHOD, TYPE_DECL, NAMESPACE_BLOCK.
     * CPG property `AST_PARENT_TYPE` exposed as `astParentType`.
     * Type: string. Cardinality: one.
     * Owners: MEMBER, METHOD, TYPE_DECL.
     * Filters with Joern CPGQL property `astParentType`.
     */
    astParentType(value: string | RegExp): Traversal;
    /**
     * This field holds the canonical name of a `FIELD_IDENTIFIER`. It is typically
     * identical to the CODE field, but canonicalized according to source language
     * semantics. Human readable names are preferable. `FIELD_IDENTIFIER` nodes must
     * share identical `CANONICAL_NAME` if and
     * only if they alias, e.g., in C-style unions (if the aliasing relationship is
     * unknown or there are partial overlaps, then one must make a reasonable guess,
     * and trade off between false negatives and false positives).
     * CPG property `CANONICAL_NAME` exposed as `canonicalName`.
     * Type: string. Cardinality: one.
     * Owners: FIELD_IDENTIFIER.
     * Filters with Joern CPGQL property `canonicalName`.
     */
    canonicalName(value: string | RegExp): Traversal;
    /**
     * Identifier which uniquely describes a CLOSURE_BINDING. This property is used to match captured LOCAL nodes with the corresponding CLOSURE_BINDING nodes
     * CPG property `CLOSURE_BINDING_ID` exposed as `closureBindingId`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: CLOSURE_BINDING, LOCAL, METHOD_PARAMETER_IN.
     * Filters with Joern CPGQL property `closureBindingId`.
     */
    closureBindingId(value: string | null | RegExp): Traversal;
    /**
     * This field holds the code snippet that the node represents.
     * CPG property `CODE` exposed as `code`.
     * Type: string. Cardinality: one.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `code`.
     */
    code(value: string | RegExp): Traversal;
    /**
     * This optional fields provides the column number of the program construct
     * represented by the node.
     * CPG property `COLUMN_NUMBER` exposed as `columnNumber`.
     * Type: number | null. Cardinality: zeroOrOne.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `columnNumber`.
     */
    columnNumber(value: number | null): Traversal;
    /**
     * This optional fields provides the column number at which the program construct
     * represented by the node ends.
     * CPG property `COLUMN_NUMBER_END` exposed as `columnNumberEnd`.
     * Type: number | null. Cardinality: zeroOrOne.
     * Owners: METHOD.
     * Filters with Joern CPGQL property `columnNumberEnd`.
     */
    columnNumberEnd(value: number | null): Traversal;
    /**
     * References to other nodes. This is not a real property; it exists here for the sake of proto serialization only. valueType and cardinality are meaningless.
     * CPG property `CONTAINED_REF` exposed as `containedRef`.
     * Type: string. Cardinality: one.
     * Owners: UNKNOWN.
     * Filters with Joern CPGQL property `containedRef`.
     */
    containedRef(value: string | RegExp): Traversal;
    /**
     * Certain files, e.g., configuration files, may be included in the CPG as-is.
     * For such files, the `CONTENT` field contains the files content.
     * CPG property `CONTENT` exposed as `content`.
     * Type: string. Cardinality: one.
     * Owners: CONFIG_FILE, FILE.
     * Filters with Joern CPGQL property `content`.
     */
    content(value: string | RegExp): Traversal;
    /**
     * The `CONTROL_STRUCTURE_TYPE` field indicates which kind of control structure
     * a `CONTROL_STRUCTURE` node represents. The available types are the following:
     * BREAK, CONTINUE, DO, WHILE, FOR, GOTO, IF, ELSE, TRY, THROW and SWITCH.
     * CPG property `CONTROL_STRUCTURE_TYPE` exposed as `controlStructureType`.
     * Type: string. Cardinality: one.
     * Owners: CONTROL_STRUCTURE.
     * Filters with Joern CPGQL property `controlStructureType`.
     */
    controlStructureType(value: string | RegExp): Traversal;
    /**
     * The group ID for a dependency
     * CPG property `DEPENDENCY_GROUP_ID` exposed as `dependencyGroupId`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: DEPENDENCY.
     * Filters with Joern CPGQL property `dependencyGroupId`.
     */
    dependencyGroupId(value: string | null | RegExp): Traversal;
    /**
     * This field holds the dispatch type of a call, which is either `STATIC_DISPATCH` or
     * `DYNAMIC_DISPATCH`. For statically dispatched method calls, the call target is known
     * at compile time while for dynamically dispatched calls, it can only be determined at
     * runtime as it may depend on the type of an object (as is the case for virtual method
     * calls) or calculation of an offset.
     * CPG property `DISPATCH_TYPE` exposed as `dispatchType`.
     * Type: string. Cardinality: one.
     * Owners: CALL.
     * Filters with Joern CPGQL property `dispatchType`.
     */
    dispatchType(value: string | RegExp): Traversal;
    /**
     * Type hint for the dynamic type. These are observed to be verifiable at runtime.
     * CPG property `DYNAMIC_TYPE_HINT_FULL_NAME` exposed as `dynamicTypeHintFullName`.
     * Type: readonly string[]. Cardinality: zeroOrMore.
     * Owners: BLOCK, CALL, IDENTIFIER, LITERAL, LOCAL, MEMBER, METHOD_PARAMETER_IN, METHOD_REF, METHOD_RETURN, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `dynamicTypeHintFullName`.
     */
    dynamicTypeHintFullName(value: readonly string[] | RegExp): Traversal;
    /**
     * For formal method input parameters, output parameters, and return parameters,
     * this field holds the evaluation strategy, which is one of the following:
     * 1) `BY_REFERENCE` indicates that the parameter is passed by reference, 2)
     * `BY_VALUE` indicates that it is passed by value, that is, a copy is made,
     * 3) `BY_SHARING` the parameter is a pointer/reference and it is shared with
     * the caller/callee. While a copy of the pointer is made, a copy of the object
     * that it points to is not made.
     * CPG property `EVALUATION_STRATEGY` exposed as `evaluationStrategy`.
     * Type: string. Cardinality: one.
     * Owners: CLOSURE_BINDING, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_RETURN.
     * Filters with Joern CPGQL property `evaluationStrategy`.
     */
    evaluationStrategy(value: string | RegExp): Traversal;
    /**
     * Optional description for nodes in evidence. Used to give a hint about the kind of evidence
     * provided by a node. The evidence description and evidence nodes are associated by index.
     * CPG property `EVIDENCE_DESCRIPTION` exposed as `evidenceDescription`.
     * Type: readonly string[]. Cardinality: zeroOrMore.
     * Owners: FINDING.
     * Filters with Joern CPGQL property `evidenceDescription`.
     */
    evidenceDescription(value: readonly string[] | RegExp): Traversal;
    /**
     * Specifies whether the IMPORTED_AS property was explicitly present in the code.
     * For languages like Java which do not allow a renaming during import this is
     * always false. For e.g. Kotlin it depends on the existence of the "as" keyword.
     * CPG property `EXPLICIT_AS` exposed as `explicitAs`.
     * Type: unknown | null. Cardinality: zeroOrOne.
     * Owners: IMPORT.
     * Filters with Joern CPGQL property `explicitAs`.
     */
    explicitAs(value: unknown | null): Traversal;
    /**
     * The path of the source file this node was generated from, relative to the root
     * path in the meta data node. This field must be set but may be set to the value `<unknown>` to
     * indicate that no source file can be associated with the node, e.g., because the node represents
     * an entity known to exist because it is referenced, but for which the file that is is declared in
     * is unknown.
     * CPG property `FILENAME` exposed as `filename`.
     * Type: string. Cardinality: one.
     * Owners: COMMENT, METHOD, NAMESPACE_BLOCK, TYPE_DECL.
     * Filters with Joern CPGQL property `filename`.
     */
    filename(value: string | RegExp): Traversal;
    /**
     * This is the fully-qualified name of an entity, e.g., the fully-qualified
     * name of a method or type. The details of what constitutes a fully-qualified
     * name are language specific. This field SHOULD be human readable.
     * CPG property `FULL_NAME` exposed as `fullName`.
     * Type: string. Cardinality: one.
     * Owners: ANNOTATION, METHOD, NAMESPACE_BLOCK, TYPE, TYPE_DECL.
     * Filters with Joern CPGQL property `fullName`.
     */
    fullName(value: string | RegExp): Traversal;
    /**
     * This field is experimental. It will likely be removed in the future without any notice.
     * It stores type information for generic types and methods as well as type information
     * for members and locals where the type either contains a type parameter reference or
     * an instantiated type reference.
     * CPG property `GENERIC_SIGNATURE` exposed as `genericSignature`.
     * Type: string. Cardinality: one.
     * Owners: LOCAL, MEMBER, METHOD, TYPE_DECL.
     * Filters with Joern CPGQL property `genericSignature`.
     */
    genericSignature(value: string | RegExp): Traversal;
    /**
     * This property contains a hash value in the form of a string.
     * Hashes can be used to summarize data, e.g., to summarize the
     * contents of source files or sub graphs. Such summaries are useful
     * to determine whether code has already been analyzed in incremental
     * analysis pipelines. This property is optional to allow its calculation
     * to be deferred or skipped if the hash is not needed.
     * CPG property `HASH` exposed as `hash`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: FILE, META_DATA, METHOD.
     * Filters with Joern CPGQL property `hash`.
     */
    hash(value: string | null | RegExp): Traversal;
    /**
     * The identifier under which the import can be accessed in the importing context.
     * For a Java import this is always identical to the class name. But e.g. for a
     * Kotlin import like "import java.nio.ByteBuffer as BBuffer" this would be "BBuffer".
     * This property is ignored if IS_WILDCARD is true.
     * CPG property `IMPORTED_AS` exposed as `importedAs`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: IMPORT.
     * Filters with Joern CPGQL property `importedAs`.
     */
    importedAs(value: string | null | RegExp): Traversal;
    /**
     * The identifying string of the imported entity.
     * For a Java import like "import java.nio.ByteBuffer;" this would be "java.nio.ByteBuffer".
     * CPG property `IMPORTED_ENTITY` exposed as `importedEntity`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: IMPORT.
     * Filters with Joern CPGQL property `importedEntity`.
     */
    importedEntity(value: string | null | RegExp): Traversal;
    /**
     * Specifies an index, e.g., for a parameter or argument.
     * Explicit parameters are numbered from 1 to N, while index 0 is reserved for implicit
     * self / this parameter.
     * CPG property `INDEX` exposed as `index`.
     * Type: number. Cardinality: one.
     * Owners: METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT.
     * Filters with Joern CPGQL property `index`.
     */
    index(value: number): Traversal;
    /**
     * The static types a TYPE_DECL inherits from. This property is matched against the
     * FULL_NAME of TYPE nodes and thus it is required to have at least one TYPE node
     * for each TYPE_FULL_NAME
     * CPG property `INHERITS_FROM_TYPE_FULL_NAME` exposed as `inheritsFromTypeFullName`.
     * Type: readonly string[]. Cardinality: zeroOrMore.
     * Owners: TYPE_DECL.
     * Filters with Joern CPGQL property `inheritsFromTypeFullName`.
     */
    inheritsFromTypeFullName(value: readonly string[] | RegExp): Traversal;
    /**
     * Specifies whether this is an explicit import.
     * Most languages have implicit default imports of some standard library elements
     * and this flag is used to distinguish those from explicit imports found in the
     * code base.
     * CPG property `IS_EXPLICIT` exposed as `isExplicit`.
     * Type: unknown | null. Cardinality: zeroOrOne.
     * Owners: IMPORT.
     * Filters with Joern CPGQL property `isExplicit`.
     */
    isExplicit(value: unknown | null): Traversal;
    /**
     * Indicates that the construct (METHOD or TYPE_DECL) is external, that is,
     * it is referenced but not defined in the code (applies both to insular
     * parsing and to library functions where we have header files only)
     * CPG property `IS_EXTERNAL` exposed as `isExternal`.
     * Type: unknown. Cardinality: one.
     * Owners: METHOD, TYPE_DECL.
     * Filters with Joern CPGQL property `isExternal`.
     */
    isExternal(value: unknown): Traversal;
    /**
     * Specifies whether this is a module import.
     * This is used for languages like Java >= 25 where packages exported by a module
     * can be imported via the module name (which does not need to match the package names in
     * any way).
     * CPG property `IS_MODULE_IMPORT` exposed as `isModuleImport`.
     * Type: unknown | null. Cardinality: zeroOrOne.
     * Owners: IMPORT.
     * Filters with Joern CPGQL property `isModuleImport`.
     */
    isModuleImport(value: unknown | null): Traversal;
    /**
     * Specifies whether a parameter is the variadic argument handling parameter of
     * a variadic method. Only one parameter of a method is allowed to have this
     * property set to true.
     * CPG property `IS_VARIADIC` exposed as `isVariadic`.
     * Type: unknown. Cardinality: one.
     * Owners: METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT.
     * Filters with Joern CPGQL property `isVariadic`.
     */
    isVariadic(value: unknown): Traversal;
    /**
     * Specifies whether this is a wildcard import.
     * For a Java import like "import java.nio.*;" IS_WILDCARD would be "true" and
     * IMPORTED_ENTITY would be "java.nio".
     * For wildcard imports the IMPORTED_AS property is ignored.
     * CPG property `IS_WILDCARD` exposed as `isWildcard`.
     * Type: unknown | null. Cardinality: zeroOrOne.
     * Owners: IMPORT.
     * Filters with Joern CPGQL property `isWildcard`.
     */
    isWildcard(value: unknown | null): Traversal;
    /**
     * This property denotes a key of a key-value pair.
     * CPG property `KEY` exposed as `key`.
     * Type: string. Cardinality: one.
     * Owners: KEY_VALUE_PAIR.
     * Filters with Joern CPGQL property `key`.
     */
    key(value: string | RegExp): Traversal;
    /**
     * This field indicates which CPG language frontend generated the CPG.
     * Frontend developers may freely choose a value that describes their frontend
     * so long as it is not used by an existing frontend. Reserved values are to date:
     * C, LLVM, GHIDRA, PHP.
     * CPG property `LANGUAGE` exposed as `language`.
     * Type: string. Cardinality: one.
     * Owners: META_DATA.
     * Filters with Joern CPGQL property `language`.
     */
    language(value: string | RegExp): Traversal;
    /**
     * This optional field provides the line number of the program construct
     * represented by the node.
     * CPG property `LINE_NUMBER` exposed as `lineNumber`.
     * Type: number | null. Cardinality: zeroOrOne.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `lineNumber`.
     */
    lineNumber(value: number | null): Traversal;
    /**
     * This optional fields provides the line number at which the program construct
     * represented by the node ends.
     * CPG property `LINE_NUMBER_END` exposed as `lineNumberEnd`.
     * Type: number | null. Cardinality: zeroOrOne.
     * Owners: METHOD.
     * Filters with Joern CPGQL property `lineNumberEnd`.
     */
    lineNumberEnd(value: number | null): Traversal;
    /**
     * The FULL_NAME of a method. Used to link CALL and METHOD nodes. It is required
     * to have exactly one METHOD node for each METHOD_FULL_NAME
     * CPG property `METHOD_FULL_NAME` exposed as `methodFullName`.
     * Type: string. Cardinality: one.
     * Owners: BINDING, CALL, METHOD_REF.
     * Filters with Joern CPGQL property `methodFullName`.
     */
    methodFullName(value: string | RegExp): Traversal;
    /**
     * The modifier type is a free-form string. The following are known modifier types:
     * `STATIC`, `PUBLIC`, `PROTECTED`, `PRIVATE`, `ABSTRACT`, `NATIVE`, `CONSTRUCTOR`, `VIRTUAL`.
     * CPG property `MODIFIER_TYPE` exposed as `modifierType`.
     * Type: string. Cardinality: one.
     * Owners: MODIFIER.
     * Filters with Joern CPGQL property `modifierType`.
     */
    modifierType(value: string | RegExp): Traversal;
    /**
     * Name of represented object, e.g., method name (e.g. \"run\")
     * CPG property `NAME` exposed as `name`.
     * Type: string. Cardinality: one.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, BINDING, CALL, CONFIG_FILE, DEPENDENCY, FILE, IDENTIFIER, JUMP_LABEL, JUMP_TARGET, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, NAMESPACE, NAMESPACE_BLOCK, TAG, TEMPLATE_DOM, TYPE, TYPE_DECL, TYPE_PARAMETER.
     * Filters with Joern CPGQL property `name`.
     */
    name(value: string | RegExp): Traversal;
    /**
     * Start offset into the CONTENT property of the corresponding FILE node.
     * The offset is such that parts of the content can easily
     * be accessed via `content.substring(offset, offsetEnd)`.
     * This means that the offset must be measured in utf16 encoding (i.e. neither in
     * characters/codeunits nor in byte-offsets into a utf8 encoding).
     * E.g. for METHOD nodes this start offset points to the start of the methods
     * source code in the string holding the source code of the entire file.
     * CPG property `OFFSET` exposed as `offset`.
     * Type: number | null. Cardinality: zeroOrOne.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `offset`.
     */
    offset(value: number | null): Traversal;
    /**
     * End offset (exclusive) into the CONTENT property of the corresponding FILE node.
     * See OFFSET documentation for finer details.
     * E.g. for METHOD nodes this end offset points to the first code position which is
     * not part of the method.
     * CPG property `OFFSET_END` exposed as `offsetEnd`.
     * Type: number | null. Cardinality: zeroOrOne.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `offsetEnd`.
     */
    offsetEnd(value: number | null): Traversal;
    /**
     * This integer indicates the position of the node among
     * its siblings in the AST. The left-most child has an
     * order of 0.
     * CPG property `ORDER` exposed as `order`.
     * Type: number. Cardinality: one.
     * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `order`.
     */
    order(value: number): Traversal;
    /**
     * The field contains the names of the overlays applied to this CPG, in order of their
     * application. Names are free-form strings, that is, this specification does not
     * dictate them but rather requires tool producers and consumers to communicate them
     * between each other.
     * CPG property `OVERLAYS` exposed as `overlays`.
     * Type: readonly string[]. Cardinality: zeroOrMore.
     * Owners: META_DATA.
     * Filters with Joern CPGQL property `overlays`.
     */
    overlays(value: readonly string[] | RegExp): Traversal;
    /**
     * AST node type name emitted by parser.
     * CPG property `PARSER_TYPE_NAME` exposed as `parserTypeName`.
     * Type: string. Cardinality: one.
     * Owners: CONTROL_STRUCTURE, JUMP_LABEL, JUMP_TARGET, UNKNOWN.
     * Filters with Joern CPGQL property `parserTypeName`.
     */
    parserTypeName(value: string | RegExp): Traversal;
    /**
     * Similar to `DYNAMIC_TYPE_HINT_FULL_NAME`, but that this makes no guarantee that types within this property are correct. This property is used to capture observations between node interactions during a 'may-analysis'.
     * CPG property `POSSIBLE_TYPES` exposed as `possibleTypes`.
     * Type: readonly string[]. Cardinality: zeroOrMore.
     * Owners: BLOCK, CALL, IDENTIFIER, LITERAL, LOCAL, MEMBER, METHOD_PARAMETER_IN, METHOD_REF, METHOD_RETURN, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `possibleTypes`.
     */
    possibleTypes(value: readonly string[] | RegExp): Traversal;
    /**
     * The path to the root directory of the source/binary this CPG is generated from.
     * CPG property `ROOT` exposed as `root`.
     * Type: string. Cardinality: one.
     * Owners: META_DATA.
     * Filters with Joern CPGQL property `root`.
     */
    root(value: string | RegExp): Traversal;
    /**
     * The method signature encodes the types of parameters in a string.
     * The string SHOULD be human readable and suitable for differentiating methods
     * with different parameter types sufficiently to allow for resolving of
     * function overloading. The present specification does not enforce a strict
     * format for the signature, that is, it can be chosen by the frontend
     * implementor to fit the source language.
     * CPG property `SIGNATURE` exposed as `signature`.
     * Type: string. Cardinality: one.
     * Owners: BINDING, CALL, METHOD.
     * Filters with Joern CPGQL property `signature`.
     */
    signature(value: string | RegExp): Traversal;
    /**
     * The `STATIC_RECEIVER` field is used to keep track of the type on which a static method
     * is called for static methods which may be inherited. This information can then be used to find
     * the true `METHOD_FULL_NAME` of the method being called during call linking. For example, if a
     * class `Foo` defines a static method `foo` and a class `Bar extends Foo`, then the `STATIC_RECEIVER`
     * of a`Bar.foo()` call is `Bar` and the `METHOD_FULL_NAME` of the `foo` call is rewritten to
     * `Foo.foo:<signature>`.
     * CPG property `STATIC_RECEIVER` exposed as `staticReceiver`.
     * Type: string | null. Cardinality: zeroOrOne.
     * Owners: CALL.
     * Filters with Joern CPGQL property `staticReceiver`.
     */
    staticReceiver(value: string | null | RegExp): Traversal;
    /**
     * The static type decl of a TYPE. This property is matched against the FULL_NAME
     * of TYPE_DECL nodes. It is required to have exactly one TYPE_DECL for each
     * different TYPE_DECL_FULL_NAME
     * CPG property `TYPE_DECL_FULL_NAME` exposed as `typeDeclFullName`.
     * Type: string. Cardinality: one.
     * Owners: TYPE.
     * Filters with Joern CPGQL property `typeDeclFullName`.
     */
    typeDeclFullName(value: string | RegExp): Traversal;
    /**
     * This field contains the fully-qualified static type name of the program
     * construct represented by a node. It is the name of an instantiated type, e.g.,
     * `java.util.List<Integer>`, rather than `java.util.List[T]`. If the type
     * cannot be determined, this field should be set to the empty string.
     * CPG property `TYPE_FULL_NAME` exposed as `typeFullName`.
     * Type: string. Cardinality: one.
     * Owners: BLOCK, CALL, IDENTIFIER, LITERAL, LOCAL, MEMBER, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, TYPE_REF, UNKNOWN.
     * Filters with Joern CPGQL property `typeFullName`.
     */
    typeFullName(value: string | RegExp): Traversal;
    /**
     * This property denotes a string value as used in a key-value pair.
     * CPG property `VALUE` exposed as `value`.
     * Type: string. Cardinality: one.
     * Owners: KEY_VALUE_PAIR, TAG.
     * Filters with Joern CPGQL property `value`.
     */
    value(value: string | RegExp): Traversal;
    /**
     * A version, given as a string. Used, for example, in the META_DATA node to
     * indicate which version of the CPG spec this CPG conforms to
     * CPG property `VERSION` exposed as `version`.
     * Type: string. Cardinality: one.
     * Owners: DEPENDENCY, META_DATA.
     * Filters with Joern CPGQL property `version`.
     */
    version(value: string | RegExp): Traversal;
  }
}

addStepGetters(traversalStepNames);
addPropertyFilterMethods(traversalPropertyFilters);
