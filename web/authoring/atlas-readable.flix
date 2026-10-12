// Read this example as a sentence:
// "The starting file defines a function,
//  that function calls another function,
//  and the called function is defined in the result file."
//
// Explanatory Flix rule with readable names, not an executed query.
// This translates the saved Defines ; Calls ; DefinedIn path.
RelatedFile(world, startingFile, resultFile) :-
    Defines(world, startingFile, startingFunction),
    Calls(world, startingFunction, calledFunction),
    DefinedIn(world, calledFunction, resultFile).

// Every row uses the SAME world: facts from different revisions
// cannot fill in a missing connection.
// Repeated names join the rows at the SAME function.
// This rule describes a connection, not a relevance judgment.
