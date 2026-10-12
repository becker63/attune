// Executed teaching example · separate authored paths
// content/datalog-primer.flix:40-45
// Source SHA-256: 0d9cf401a9dcd1f13bfe30396d318066817dac639da524cc500ea6cbdc7b8d3c
    let facts = #{ Imports("screen", "format"). Imports("format", "units"). };
    let rules = #{
        Reaches(a, b) :- Imports(a, b).
        Reaches(a, c) :- Reaches(a, b), Imports(b, c).
    };
    query facts, rules select (a, b) from Reaches(a, b)
