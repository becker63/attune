import { Schema } from "effect";
import { property } from "../builder/property.js";
export const prop = {
  /**
   * This property holds the fully qualified name of the type that the node is
   * a type alias of.
   * CPG property `ALIAS_TYPE_FULL_NAME` exposed as `aliasTypeFullName`.
   * Type: string | null. Cardinality: zeroOrOne.
   * Owners: TYPE_DECL.
   */
  aliasTypeFullName: property({
    cpgName: "ALIAS_TYPE_FULL_NAME",
    cpgql: "aliasTypeFullName",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["TYPE_DECL"],
  }),
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
   */
  argumentIndex: property({
    cpgName: "ARGUMENT_INDEX",
    cpgql: "argumentIndex",
    schema: Schema.Number,
    nullable: false,
    cardinality: "one",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "IDENTIFIER",
      "JUMP_TARGET",
      "LITERAL",
      "METHOD_REF",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
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
   */
  argumentLabel: property({
    cpgName: "ARGUMENT_LABEL",
    cpgql: "argumentLabel",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "IDENTIFIER",
      "LITERAL",
      "METHOD_REF",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * For calls involving named parameters, the `ARGUMENT_NAME` field holds the
   * name of the parameter initialized by the expression. For all other calls,
   * this field is unset.
   * Note that the `ARGUMENT_NAME` should be an exact match of the NAME of a
   * METHOD_PARAMETER_{IN,OUT}. It overrides ARGUMENT_INDEX for dataflow purposes.
   * CPG property `ARGUMENT_NAME` exposed as `argumentName`.
   * Type: string | null. Cardinality: zeroOrOne.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, ARRAY_INITIALIZER, BLOCK, CALL, CONTROL_STRUCTURE, FIELD_IDENTIFIER, IDENTIFIER, LITERAL, METHOD_REF, RETURN, TEMPLATE_DOM, TYPE_REF, UNKNOWN.
   */
  argumentName: property({
    cpgName: "ARGUMENT_NAME",
    cpgql: "argumentName",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "IDENTIFIER",
      "LITERAL",
      "METHOD_REF",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * This field holds the FULL_NAME of the AST parent of an entity.
   * CPG property `AST_PARENT_FULL_NAME` exposed as `astParentFullName`.
   * Type: string. Cardinality: one.
   * Owners: MEMBER, METHOD, TYPE_DECL.
   */
  astParentFullName: property({
    cpgName: "AST_PARENT_FULL_NAME",
    cpgql: "astParentFullName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["MEMBER", "METHOD", "TYPE_DECL"],
  }),
  /**
   * The type of the AST parent. Since this is only used in some parts of the graph,
   * the list does not include all possible parents by intention.
   * Possible parents: METHOD, TYPE_DECL, NAMESPACE_BLOCK.
   * CPG property `AST_PARENT_TYPE` exposed as `astParentType`.
   * Type: string. Cardinality: one.
   * Owners: MEMBER, METHOD, TYPE_DECL.
   */
  astParentType: property({
    cpgName: "AST_PARENT_TYPE",
    cpgql: "astParentType",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["MEMBER", "METHOD", "TYPE_DECL"],
  }),
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
   */
  canonicalName: property({
    cpgName: "CANONICAL_NAME",
    cpgql: "canonicalName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["FIELD_IDENTIFIER"],
  }),
  /**
   * Identifier which uniquely describes a CLOSURE_BINDING. This property is used to match captured LOCAL nodes with the corresponding CLOSURE_BINDING nodes
   * CPG property `CLOSURE_BINDING_ID` exposed as `closureBindingId`.
   * Type: string | null. Cardinality: zeroOrOne.
   * Owners: CLOSURE_BINDING, LOCAL, METHOD_PARAMETER_IN.
   */
  closureBindingId: property({
    cpgName: "CLOSURE_BINDING_ID",
    cpgql: "closureBindingId",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["CLOSURE_BINDING", "LOCAL", "METHOD_PARAMETER_IN"],
  }),
  /**
   * This field holds the code snippet that the node represents.
   * CPG property `CODE` exposed as `code`.
   * Type: string. Cardinality: one.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
   */
  code: property({
    cpgName: "CODE",
    cpgql: "code",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ANNOTATION_PARAMETER",
      "ANNOTATION_PARAMETER_ASSIGN",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "COMMENT",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "FILE",
      "IDENTIFIER",
      "IMPORT",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "MODIFIER",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_ARGUMENT",
      "TYPE_DECL",
      "TYPE_PARAMETER",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * This optional fields provides the column number of the program construct
   * represented by the node.
   * CPG property `COLUMN_NUMBER` exposed as `columnNumber`.
   * Type: number | null. Cardinality: zeroOrOne.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
   */
  columnNumber: property({
    cpgName: "COLUMN_NUMBER",
    cpgql: "columnNumber",
    schema: Schema.NullOr(Schema.Number),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ANNOTATION_PARAMETER",
      "ANNOTATION_PARAMETER_ASSIGN",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "COMMENT",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "FILE",
      "IDENTIFIER",
      "IMPORT",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "MODIFIER",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_ARGUMENT",
      "TYPE_DECL",
      "TYPE_PARAMETER",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * This optional fields provides the column number at which the program construct
   * represented by the node ends.
   * CPG property `COLUMN_NUMBER_END` exposed as `columnNumberEnd`.
   * Type: number | null. Cardinality: zeroOrOne.
   * Owners: METHOD.
   */
  columnNumberEnd: property({
    cpgName: "COLUMN_NUMBER_END",
    cpgql: "columnNumberEnd",
    schema: Schema.NullOr(Schema.Number),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["METHOD"],
  }),
  /**
   * References to other nodes. This is not a real property; it exists here for the sake of proto serialization only. valueType and cardinality are meaningless.
   * CPG property `CONTAINED_REF` exposed as `containedRef`.
   * Type: string. Cardinality: one.
   * Owners: UNKNOWN.
   */
  containedRef: property({
    cpgName: "CONTAINED_REF",
    cpgql: "containedRef",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["UNKNOWN"],
  }),
  /**
   * Certain files, e.g., configuration files, may be included in the CPG as-is.
   * For such files, the `CONTENT` field contains the files content.
   * CPG property `CONTENT` exposed as `content`.
   * Type: string. Cardinality: one.
   * Owners: CONFIG_FILE, FILE.
   */
  content: property({
    cpgName: "CONTENT",
    cpgql: "content",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["CONFIG_FILE", "FILE"],
  }),
  /**
   * The `CONTROL_STRUCTURE_TYPE` field indicates which kind of control structure
   * a `CONTROL_STRUCTURE` node represents. The available types are the following:
   * BREAK, CONTINUE, DO, WHILE, FOR, GOTO, IF, ELSE, TRY, THROW and SWITCH.
   * CPG property `CONTROL_STRUCTURE_TYPE` exposed as `controlStructureType`.
   * Type: string. Cardinality: one.
   * Owners: CONTROL_STRUCTURE.
   */
  controlStructureType: property({
    cpgName: "CONTROL_STRUCTURE_TYPE",
    cpgql: "controlStructureType",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["CONTROL_STRUCTURE"],
  }),
  /**
   * The group ID for a dependency
   * CPG property `DEPENDENCY_GROUP_ID` exposed as `dependencyGroupId`.
   * Type: string | null. Cardinality: zeroOrOne.
   * Owners: DEPENDENCY.
   */
  dependencyGroupId: property({
    cpgName: "DEPENDENCY_GROUP_ID",
    cpgql: "dependencyGroupId",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["DEPENDENCY"],
  }),
  /**
   * This field holds the dispatch type of a call, which is either `STATIC_DISPATCH` or
   * `DYNAMIC_DISPATCH`. For statically dispatched method calls, the call target is known
   * at compile time while for dynamically dispatched calls, it can only be determined at
   * runtime as it may depend on the type of an object (as is the case for virtual method
   * calls) or calculation of an offset.
   * CPG property `DISPATCH_TYPE` exposed as `dispatchType`.
   * Type: string. Cardinality: one.
   * Owners: CALL.
   */
  dispatchType: property({
    cpgName: "DISPATCH_TYPE",
    cpgql: "dispatchType",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["CALL"],
  }),
  /**
   * Type hint for the dynamic type. These are observed to be verifiable at runtime.
   * CPG property `DYNAMIC_TYPE_HINT_FULL_NAME` exposed as `dynamicTypeHintFullName`.
   * Type: readonly string[]. Cardinality: zeroOrMore.
   * Owners: BLOCK, CALL, IDENTIFIER, LITERAL, LOCAL, MEMBER, METHOD_PARAMETER_IN, METHOD_REF, METHOD_RETURN, TYPE_REF, UNKNOWN.
   */
  dynamicTypeHintFullName: property({
    cpgName: "DYNAMIC_TYPE_HINT_FULL_NAME",
    cpgql: "dynamicTypeHintFullName",
    schema: Schema.Array(Schema.String),
    nullable: false,
    cardinality: "zeroOrMore",
    owners: [
      "BLOCK",
      "CALL",
      "IDENTIFIER",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD_PARAMETER_IN",
      "METHOD_REF",
      "METHOD_RETURN",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
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
   */
  evaluationStrategy: property({
    cpgName: "EVALUATION_STRATEGY",
    cpgql: "evaluationStrategy",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: [
      "CLOSURE_BINDING",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_RETURN",
    ],
  }),
  /**
   * Optional description for nodes in evidence. Used to give a hint about the kind of evidence
   * provided by a node. The evidence description and evidence nodes are associated by index.
   * CPG property `EVIDENCE_DESCRIPTION` exposed as `evidenceDescription`.
   * Type: readonly string[]. Cardinality: zeroOrMore.
   * Owners: FINDING.
   */
  evidenceDescription: property({
    cpgName: "EVIDENCE_DESCRIPTION",
    cpgql: "evidenceDescription",
    schema: Schema.Array(Schema.String),
    nullable: false,
    cardinality: "zeroOrMore",
    owners: ["FINDING"],
  }),
  /**
   * Specifies whether the IMPORTED_AS property was explicitly present in the code.
   * For languages like Java which do not allow a renaming during import this is
   * always false. For e.g. Kotlin it depends on the existence of the "as" keyword.
   * CPG property `EXPLICIT_AS` exposed as `explicitAs`.
   * Type: unknown | null. Cardinality: zeroOrOne.
   * Owners: IMPORT.
   */
  explicitAs: property({
    cpgName: "EXPLICIT_AS",
    cpgql: "explicitAs",
    schema: Schema.NullOr(Schema.Unknown),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["IMPORT"],
  }),
  /**
   * The path of the source file this node was generated from, relative to the root
   * path in the meta data node. This field must be set but may be set to the value `<unknown>` to
   * indicate that no source file can be associated with the node, e.g., because the node represents
   * an entity known to exist because it is referenced, but for which the file that is is declared in
   * is unknown.
   * CPG property `FILENAME` exposed as `filename`.
   * Type: string. Cardinality: one.
   * Owners: COMMENT, METHOD, NAMESPACE_BLOCK, TYPE_DECL.
   */
  filename: property({
    cpgName: "FILENAME",
    cpgql: "filename",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["COMMENT", "METHOD", "NAMESPACE_BLOCK", "TYPE_DECL"],
  }),
  /**
   * This is the fully-qualified name of an entity, e.g., the fully-qualified
   * name of a method or type. The details of what constitutes a fully-qualified
   * name are language specific. This field SHOULD be human readable.
   * CPG property `FULL_NAME` exposed as `fullName`.
   * Type: string. Cardinality: one.
   * Owners: ANNOTATION, METHOD, NAMESPACE_BLOCK, TYPE, TYPE_DECL.
   */
  fullName: property({
    cpgName: "FULL_NAME",
    cpgql: "fullName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["ANNOTATION", "METHOD", "NAMESPACE_BLOCK", "TYPE", "TYPE_DECL"],
  }),
  /**
   * This field is experimental. It will likely be removed in the future without any notice.
   * It stores type information for generic types and methods as well as type information
   * for members and locals where the type either contains a type parameter reference or
   * an instantiated type reference.
   * CPG property `GENERIC_SIGNATURE` exposed as `genericSignature`.
   * Type: string. Cardinality: one.
   * Owners: LOCAL, MEMBER, METHOD, TYPE_DECL.
   */
  genericSignature: property({
    cpgName: "GENERIC_SIGNATURE",
    cpgql: "genericSignature",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["LOCAL", "MEMBER", "METHOD", "TYPE_DECL"],
  }),
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
   */
  hash: property({
    cpgName: "HASH",
    cpgql: "hash",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["FILE", "META_DATA", "METHOD"],
  }),
  /**
   * The identifier under which the import can be accessed in the importing context.
   * For a Java import this is always identical to the class name. But e.g. for a
   * Kotlin import like "import java.nio.ByteBuffer as BBuffer" this would be "BBuffer".
   * This property is ignored if IS_WILDCARD is true.
   * CPG property `IMPORTED_AS` exposed as `importedAs`.
   * Type: string | null. Cardinality: zeroOrOne.
   * Owners: IMPORT.
   */
  importedAs: property({
    cpgName: "IMPORTED_AS",
    cpgql: "importedAs",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["IMPORT"],
  }),
  /**
   * The identifying string of the imported entity.
   * For a Java import like "import java.nio.ByteBuffer;" this would be "java.nio.ByteBuffer".
   * CPG property `IMPORTED_ENTITY` exposed as `importedEntity`.
   * Type: string | null. Cardinality: zeroOrOne.
   * Owners: IMPORT.
   */
  importedEntity: property({
    cpgName: "IMPORTED_ENTITY",
    cpgql: "importedEntity",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["IMPORT"],
  }),
  /**
   * Specifies an index, e.g., for a parameter or argument.
   * Explicit parameters are numbered from 1 to N, while index 0 is reserved for implicit
   * self / this parameter.
   * CPG property `INDEX` exposed as `index`.
   * Type: number. Cardinality: one.
   * Owners: METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT.
   */
  index: property({
    cpgName: "INDEX",
    cpgql: "index",
    schema: Schema.Number,
    nullable: false,
    cardinality: "one",
    owners: ["METHOD_PARAMETER_IN", "METHOD_PARAMETER_OUT"],
  }),
  /**
   * The static types a TYPE_DECL inherits from. This property is matched against the
   * FULL_NAME of TYPE nodes and thus it is required to have at least one TYPE node
   * for each TYPE_FULL_NAME
   * CPG property `INHERITS_FROM_TYPE_FULL_NAME` exposed as `inheritsFromTypeFullName`.
   * Type: readonly string[]. Cardinality: zeroOrMore.
   * Owners: TYPE_DECL.
   */
  inheritsFromTypeFullName: property({
    cpgName: "INHERITS_FROM_TYPE_FULL_NAME",
    cpgql: "inheritsFromTypeFullName",
    schema: Schema.Array(Schema.String),
    nullable: false,
    cardinality: "zeroOrMore",
    owners: ["TYPE_DECL"],
  }),
  /**
   * Specifies whether this is an explicit import.
   * Most languages have implicit default imports of some standard library elements
   * and this flag is used to distinguish those from explicit imports found in the
   * code base.
   * CPG property `IS_EXPLICIT` exposed as `isExplicit`.
   * Type: unknown | null. Cardinality: zeroOrOne.
   * Owners: IMPORT.
   */
  isExplicit: property({
    cpgName: "IS_EXPLICIT",
    cpgql: "isExplicit",
    schema: Schema.NullOr(Schema.Unknown),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["IMPORT"],
  }),
  // TODO: unknown Joern schema type; generated conservatively.
  /**
   * Indicates that the construct (METHOD or TYPE_DECL) is external, that is,
   * it is referenced but not defined in the code (applies both to insular
   * parsing and to library functions where we have header files only)
   * CPG property `IS_EXTERNAL` exposed as `isExternal`.
   * Type: unknown. Cardinality: one.
   * Owners: METHOD, TYPE_DECL.
   */
  isExternal: property({
    cpgName: "IS_EXTERNAL",
    cpgql: "isExternal",
    schema: Schema.Unknown,
    nullable: false,
    cardinality: "one",
    owners: ["METHOD", "TYPE_DECL"],
  }),
  /**
   * Specifies whether this is a module import.
   * This is used for languages like Java >= 25 where packages exported by a module
   * can be imported via the module name (which does not need to match the package names in
   * any way).
   * CPG property `IS_MODULE_IMPORT` exposed as `isModuleImport`.
   * Type: unknown | null. Cardinality: zeroOrOne.
   * Owners: IMPORT.
   */
  isModuleImport: property({
    cpgName: "IS_MODULE_IMPORT",
    cpgql: "isModuleImport",
    schema: Schema.NullOr(Schema.Unknown),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["IMPORT"],
  }),
  // TODO: unknown Joern schema type; generated conservatively.
  /**
   * Specifies whether a parameter is the variadic argument handling parameter of
   * a variadic method. Only one parameter of a method is allowed to have this
   * property set to true.
   * CPG property `IS_VARIADIC` exposed as `isVariadic`.
   * Type: unknown. Cardinality: one.
   * Owners: METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT.
   */
  isVariadic: property({
    cpgName: "IS_VARIADIC",
    cpgql: "isVariadic",
    schema: Schema.Unknown,
    nullable: false,
    cardinality: "one",
    owners: ["METHOD_PARAMETER_IN", "METHOD_PARAMETER_OUT"],
  }),
  /**
   * Specifies whether this is a wildcard import.
   * For a Java import like "import java.nio.*;" IS_WILDCARD would be "true" and
   * IMPORTED_ENTITY would be "java.nio".
   * For wildcard imports the IMPORTED_AS property is ignored.
   * CPG property `IS_WILDCARD` exposed as `isWildcard`.
   * Type: unknown | null. Cardinality: zeroOrOne.
   * Owners: IMPORT.
   */
  isWildcard: property({
    cpgName: "IS_WILDCARD",
    cpgql: "isWildcard",
    schema: Schema.NullOr(Schema.Unknown),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["IMPORT"],
  }),
  /**
   * This property denotes a key of a key-value pair.
   * CPG property `KEY` exposed as `key`.
   * Type: string. Cardinality: one.
   * Owners: KEY_VALUE_PAIR.
   */
  key: property({
    cpgName: "KEY",
    cpgql: "key",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["KEY_VALUE_PAIR"],
  }),
  /**
   * This field indicates which CPG language frontend generated the CPG.
   * Frontend developers may freely choose a value that describes their frontend
   * so long as it is not used by an existing frontend. Reserved values are to date:
   * C, LLVM, GHIDRA, PHP.
   * CPG property `LANGUAGE` exposed as `language`.
   * Type: string. Cardinality: one.
   * Owners: META_DATA.
   */
  language: property({
    cpgName: "LANGUAGE",
    cpgql: "language",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["META_DATA"],
  }),
  /**
   * This optional field provides the line number of the program construct
   * represented by the node.
   * CPG property `LINE_NUMBER` exposed as `lineNumber`.
   * Type: number | null. Cardinality: zeroOrOne.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
   */
  lineNumber: property({
    cpgName: "LINE_NUMBER",
    cpgql: "lineNumber",
    schema: Schema.NullOr(Schema.Number),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ANNOTATION_PARAMETER",
      "ANNOTATION_PARAMETER_ASSIGN",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "COMMENT",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "FILE",
      "IDENTIFIER",
      "IMPORT",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "MODIFIER",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_ARGUMENT",
      "TYPE_DECL",
      "TYPE_PARAMETER",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * This optional fields provides the line number at which the program construct
   * represented by the node ends.
   * CPG property `LINE_NUMBER_END` exposed as `lineNumberEnd`.
   * Type: number | null. Cardinality: zeroOrOne.
   * Owners: METHOD.
   */
  lineNumberEnd: property({
    cpgName: "LINE_NUMBER_END",
    cpgql: "lineNumberEnd",
    schema: Schema.NullOr(Schema.Number),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["METHOD"],
  }),
  /**
   * The FULL_NAME of a method. Used to link CALL and METHOD nodes. It is required
   * to have exactly one METHOD node for each METHOD_FULL_NAME
   * CPG property `METHOD_FULL_NAME` exposed as `methodFullName`.
   * Type: string. Cardinality: one.
   * Owners: BINDING, CALL, METHOD_REF.
   */
  methodFullName: property({
    cpgName: "METHOD_FULL_NAME",
    cpgql: "methodFullName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["BINDING", "CALL", "METHOD_REF"],
  }),
  /**
   * The modifier type is a free-form string. The following are known modifier types:
   * `STATIC`, `PUBLIC`, `PROTECTED`, `PRIVATE`, `ABSTRACT`, `NATIVE`, `CONSTRUCTOR`, `VIRTUAL`.
   * CPG property `MODIFIER_TYPE` exposed as `modifierType`.
   * Type: string. Cardinality: one.
   * Owners: MODIFIER.
   */
  modifierType: property({
    cpgName: "MODIFIER_TYPE",
    cpgql: "modifierType",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["MODIFIER"],
  }),
  /**
   * Name of represented object, e.g., method name (e.g. \"run\")
   * CPG property `NAME` exposed as `name`.
   * Type: string. Cardinality: one.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, BINDING, CALL, CONFIG_FILE, DEPENDENCY, FILE, IDENTIFIER, JUMP_LABEL, JUMP_TARGET, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, NAMESPACE, NAMESPACE_BLOCK, TAG, TEMPLATE_DOM, TYPE, TYPE_DECL, TYPE_PARAMETER.
   */
  name: property({
    cpgName: "NAME",
    cpgql: "name",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "BINDING",
      "CALL",
      "CONFIG_FILE",
      "DEPENDENCY",
      "FILE",
      "IDENTIFIER",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "TAG",
      "TEMPLATE_DOM",
      "TYPE",
      "TYPE_DECL",
      "TYPE_PARAMETER",
    ],
  }),
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
   */
  offset: property({
    cpgName: "OFFSET",
    cpgql: "offset",
    schema: Schema.NullOr(Schema.Number),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ANNOTATION_PARAMETER",
      "ANNOTATION_PARAMETER_ASSIGN",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "COMMENT",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "FILE",
      "IDENTIFIER",
      "IMPORT",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "MODIFIER",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_ARGUMENT",
      "TYPE_DECL",
      "TYPE_PARAMETER",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * End offset (exclusive) into the CONTENT property of the corresponding FILE node.
   * See OFFSET documentation for finer details.
   * E.g. for METHOD nodes this end offset points to the first code position which is
   * not part of the method.
   * CPG property `OFFSET_END` exposed as `offsetEnd`.
   * Type: number | null. Cardinality: zeroOrOne.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
   */
  offsetEnd: property({
    cpgName: "OFFSET_END",
    cpgql: "offsetEnd",
    schema: Schema.NullOr(Schema.Number),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ANNOTATION_PARAMETER",
      "ANNOTATION_PARAMETER_ASSIGN",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "COMMENT",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "FILE",
      "IDENTIFIER",
      "IMPORT",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "MODIFIER",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_ARGUMENT",
      "TYPE_DECL",
      "TYPE_PARAMETER",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * This integer indicates the position of the node among
   * its siblings in the AST. The left-most child has an
   * order of 0.
   * CPG property `ORDER` exposed as `order`.
   * Type: number. Cardinality: one.
   * Owners: ANNOTATION, ANNOTATION_LITERAL, ANNOTATION_PARAMETER, ANNOTATION_PARAMETER_ASSIGN, ARRAY_INITIALIZER, BLOCK, CALL, COMMENT, CONTROL_STRUCTURE, FIELD_IDENTIFIER, FILE, IDENTIFIER, IMPORT, JUMP_LABEL, JUMP_TARGET, LITERAL, LOCAL, MEMBER, METHOD, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, MODIFIER, NAMESPACE, NAMESPACE_BLOCK, RETURN, TEMPLATE_DOM, TYPE_ARGUMENT, TYPE_DECL, TYPE_PARAMETER, TYPE_REF, UNKNOWN.
   */
  order: property({
    cpgName: "ORDER",
    cpgql: "order",
    schema: Schema.Number,
    nullable: false,
    cardinality: "one",
    owners: [
      "ANNOTATION",
      "ANNOTATION_LITERAL",
      "ANNOTATION_PARAMETER",
      "ANNOTATION_PARAMETER_ASSIGN",
      "ARRAY_INITIALIZER",
      "BLOCK",
      "CALL",
      "COMMENT",
      "CONTROL_STRUCTURE",
      "FIELD_IDENTIFIER",
      "FILE",
      "IDENTIFIER",
      "IMPORT",
      "JUMP_LABEL",
      "JUMP_TARGET",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "MODIFIER",
      "NAMESPACE",
      "NAMESPACE_BLOCK",
      "RETURN",
      "TEMPLATE_DOM",
      "TYPE_ARGUMENT",
      "TYPE_DECL",
      "TYPE_PARAMETER",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * The field contains the names of the overlays applied to this CPG, in order of their
   * application. Names are free-form strings, that is, this specification does not
   * dictate them but rather requires tool producers and consumers to communicate them
   * between each other.
   * CPG property `OVERLAYS` exposed as `overlays`.
   * Type: readonly string[]. Cardinality: zeroOrMore.
   * Owners: META_DATA.
   */
  overlays: property({
    cpgName: "OVERLAYS",
    cpgql: "overlays",
    schema: Schema.Array(Schema.String),
    nullable: false,
    cardinality: "zeroOrMore",
    owners: ["META_DATA"],
  }),
  /**
   * AST node type name emitted by parser.
   * CPG property `PARSER_TYPE_NAME` exposed as `parserTypeName`.
   * Type: string. Cardinality: one.
   * Owners: CONTROL_STRUCTURE, JUMP_LABEL, JUMP_TARGET, UNKNOWN.
   */
  parserTypeName: property({
    cpgName: "PARSER_TYPE_NAME",
    cpgql: "parserTypeName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["CONTROL_STRUCTURE", "JUMP_LABEL", "JUMP_TARGET", "UNKNOWN"],
  }),
  /**
   * Similar to `DYNAMIC_TYPE_HINT_FULL_NAME`, but that this makes no guarantee that types within this property are correct. This property is used to capture observations between node interactions during a 'may-analysis'.
   * CPG property `POSSIBLE_TYPES` exposed as `possibleTypes`.
   * Type: readonly string[]. Cardinality: zeroOrMore.
   * Owners: BLOCK, CALL, IDENTIFIER, LITERAL, LOCAL, MEMBER, METHOD_PARAMETER_IN, METHOD_REF, METHOD_RETURN, TYPE_REF, UNKNOWN.
   */
  possibleTypes: property({
    cpgName: "POSSIBLE_TYPES",
    cpgql: "possibleTypes",
    schema: Schema.Array(Schema.String),
    nullable: false,
    cardinality: "zeroOrMore",
    owners: [
      "BLOCK",
      "CALL",
      "IDENTIFIER",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD_PARAMETER_IN",
      "METHOD_REF",
      "METHOD_RETURN",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * The path to the root directory of the source/binary this CPG is generated from.
   * CPG property `ROOT` exposed as `root`.
   * Type: string. Cardinality: one.
   * Owners: META_DATA.
   */
  root: property({
    cpgName: "ROOT",
    cpgql: "root",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["META_DATA"],
  }),
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
   */
  signature: property({
    cpgName: "SIGNATURE",
    cpgql: "signature",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["BINDING", "CALL", "METHOD"],
  }),
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
   */
  staticReceiver: property({
    cpgName: "STATIC_RECEIVER",
    cpgql: "staticReceiver",
    schema: Schema.NullOr(Schema.String),
    nullable: true,
    cardinality: "zeroOrOne",
    owners: ["CALL"],
  }),
  /**
   * The static type decl of a TYPE. This property is matched against the FULL_NAME
   * of TYPE_DECL nodes. It is required to have exactly one TYPE_DECL for each
   * different TYPE_DECL_FULL_NAME
   * CPG property `TYPE_DECL_FULL_NAME` exposed as `typeDeclFullName`.
   * Type: string. Cardinality: one.
   * Owners: TYPE.
   */
  typeDeclFullName: property({
    cpgName: "TYPE_DECL_FULL_NAME",
    cpgql: "typeDeclFullName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["TYPE"],
  }),
  /**
   * This field contains the fully-qualified static type name of the program
   * construct represented by a node. It is the name of an instantiated type, e.g.,
   * `java.util.List<Integer>`, rather than `java.util.List[T]`. If the type
   * cannot be determined, this field should be set to the empty string.
   * CPG property `TYPE_FULL_NAME` exposed as `typeFullName`.
   * Type: string. Cardinality: one.
   * Owners: BLOCK, CALL, IDENTIFIER, LITERAL, LOCAL, MEMBER, METHOD_PARAMETER_IN, METHOD_PARAMETER_OUT, METHOD_REF, METHOD_RETURN, TYPE_REF, UNKNOWN.
   */
  typeFullName: property({
    cpgName: "TYPE_FULL_NAME",
    cpgql: "typeFullName",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: [
      "BLOCK",
      "CALL",
      "IDENTIFIER",
      "LITERAL",
      "LOCAL",
      "MEMBER",
      "METHOD_PARAMETER_IN",
      "METHOD_PARAMETER_OUT",
      "METHOD_REF",
      "METHOD_RETURN",
      "TYPE_REF",
      "UNKNOWN",
    ],
  }),
  /**
   * This property denotes a string value as used in a key-value pair.
   * CPG property `VALUE` exposed as `value`.
   * Type: string. Cardinality: one.
   * Owners: KEY_VALUE_PAIR, TAG.
   */
  value: property({
    cpgName: "VALUE",
    cpgql: "value",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["KEY_VALUE_PAIR", "TAG"],
  }),
  /**
   * A version, given as a string. Used, for example, in the META_DATA node to
   * indicate which version of the CPG spec this CPG conforms to
   * CPG property `VERSION` exposed as `version`.
   * Type: string. Cardinality: one.
   * Owners: DEPENDENCY, META_DATA.
   */
  version: property({
    cpgName: "VERSION",
    cpgql: "version",
    schema: Schema.String,
    nullable: false,
    cardinality: "one",
    owners: ["DEPENDENCY", "META_DATA"],
  }),
} as const;
