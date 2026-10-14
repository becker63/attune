# Frozen native pattern catalogue

64 patterns selected from 113 canonical candidates; 595 ranking configurations. Named seeds precede the remaining candidates sorted by primitive atom count and canonical identity. The cap cuts the three-atom import tier deterministically. All 49 unselected candidates remain below as `RejectedCap`; they were not evaluated.

`a` is the Qwen anchor file; `b` is the candidate file. `I(x,y)` means x imports y. `D(f,s)` means file f owns/defines nominal symbol s. `C(s,t)` means symbol s calls symbol t. All rules require a != b. Other variables may coincide unless an inequality explicitly forbids it; an intermediate is not automatically a third distinct file. Complete witness tuples retain every variable, with its File or Symbol type. One world is validated before solving.

The 44 selected generated import variants add oriented branches and cycles around the anchor/output roles. Some existential additions can give the same candidate set as a simpler rule while retaining different witness participants. They are retained as frozen controls, not claimed as distinct architectural mechanisms. Same answers on benchmark data are not a general equivalence proof.

Production implementation: [Patterns.flix](/home/becker/projects/attune/attune/src/Attune/Patterns.flix). SHA256 `1d3765cb7498401749585af47eb23cd772f686e1e5f32e252633497d4f167259`. The generator only assembles native syntax; no production joins execute in Python. Finite reference: exhaustive independent assignments over 13 tiny worlds, all 64 patterns, exact typed witness equality. Native alpha-renaming and atom-order permutation also passed.

The named SameFileDistinctCallers contrast has six primitive atoms and seven variables, a disclosed exception to the six-variable suggested seed bound. The diamond is the explicit four-edge branch tier. Every execution is bounded to 600 seconds; complete results are never witness-truncated. Explanation display is separate from support, which deduplicates (pattern, anchor, candidate).

Future hypotheses not executed: registration needs register(handler,registry); exports need exports(file,symbol); event dispatch needs subscribes/publishes(event,symbol); lifecycle obligations need explicit phase/order/contract evidence. Imports and names alone do not establish any of those meanings.

## DirectImport — Selected

The anchor imports the candidate.

Identity: `I(a,b)|a!=b`. Cost: 1 primitive atoms, 2 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("DirectImport", a, b, List#{}) :- Seed(a), I(a, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["DirectImport", "a", "h", [["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## DirectImporter — Selected

The candidate imports the anchor.

Identity: `I(b,a)|a!=b`. Cost: 1 primitive atoms, 2 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("DirectImporter", a, b, List#{}) :- Seed(a), I(b, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["DirectImporter", "a", "h", [["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportChain2 — Selected

An import path reaches the candidate in two edges; retain the intermediate file.

Identity: `I(a,f0),I(f0,b)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportChain2", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, f0), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportChain2", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImporterChain2 — Selected

The candidate reaches the anchor through two import edges.

Identity: `I(b,f0),I(f0,a)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImporterChain2", a, b, List#{Participant.File(f0)}) :- Seed(a), I(b, f0), I(f0, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImporterChain2", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportChain3 — Selected

An import path reaches the candidate in three edges; retain both intermediate roles.

Identity: `I(a,f0),I(f0,f1),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportChain3", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(f0, f1), I(f1, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportChain3", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## SharedDependency — Selected

Anchor and candidate import the same file; retain that shared dependency.

Identity: `I(a,f0),I(b,f0)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SharedDependency", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, f0), I(b, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["SharedDependency", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## SharedConsumer — Selected

One file imports both anchor and candidate; retain that shared consumer.

Identity: `I(f0,a),I(f0,b)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SharedConsumer", a, b, List#{Participant.File(f0)}) :- Seed(a), I(f0, a), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["SharedConsumer", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportTriangle — Selected

The anchor imports the candidate directly and through an intermediate.

Identity: `I(a,b),I(a,f0),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportTriangle", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(a, f0), I(f0, b), if (a != b).
```

Executed positive fixture: `random-0`; exact witness `["ImportTriangle", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportCycle2 — Selected

Anchor and candidate import each other.

Identity: `I(a,b),I(b,a)|a!=b`. Cost: 2 primitive atoms, 2 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportCycle2", a, b, List#{}) :- Seed(a), I(a, b), I(b, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportCycle2", "a", "h", [["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportCycle3 — Selected

Anchor imports an intermediate, which imports the candidate, which imports the anchor.

Identity: `I(a,f0),I(b,a),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportCycle3", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, f0), I(b, a), I(f0, b), if (a != b).
```

Executed positive fixture: `random-3`; exact witness `["ImportCycle3", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportDiamond — Selected

Two distinct intermediate files provide two two-edge import paths from anchor to candidate.

Identity: `I(a,f0),I(a,f1),I(f0,b),I(f1,b)|a!=b,f0!=f1`. Cost: 4 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportDiamond", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(a, f1), I(f0, b), I(f1, b), if (a != b), if (f0 != f1).
```

Executed positive fixture: `random-3`; exact witness `["ImportDiamond", "b", "a", [["File", "b"], ["File", "a"], ["File", "a"], ["File", "b"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## CrossFileCall — Selected

A symbol owned by the anchor calls a symbol owned by the candidate.

Identity: `C(s0,s1),D(a,s0),D(b,s1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("CrossFileCall", a, b, List#{Participant.Symbol(s0), Participant.Symbol(s1)}) :- Seed(a), C(s0, s1), D(a, s0), D(b, s1), if (a != b).
```

Executed positive fixture: `random-0`; exact witness `["CrossFileCall", "a", "b", [["File", "a"], ["File", "b"], ["Symbol", "u"], ["Symbol", "sa"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## CrossFileCaller — Selected

A symbol owned by the candidate calls a symbol owned by the anchor.

Identity: `C(s0,s1),D(a,s1),D(b,s0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("CrossFileCaller", a, b, List#{Participant.Symbol(s0), Participant.Symbol(s1)}) :- Seed(a), C(s0, s1), D(a, s1), D(b, s0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["CrossFileCaller", "a", "h", [["File", "a"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sa"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## SharedCallee — Selected

Distinct symbols owned by anchor and candidate call the same specific callee symbol.

Identity: `C(s0,s1),C(s2,s1),D(a,s0),D(b,s2)|a!=b,s0!=s2`. Cost: 4 primitive atoms, 5 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SharedCallee", a, b, List#{Participant.Symbol(s0), Participant.Symbol(s1), Participant.Symbol(s2)}) :- Seed(a), C(s0, s1), C(s2, s1), D(a, s0), D(b, s2), if (a != b), if (s0 != s2).
```

Executed positive fixture: `random-0`; exact witness `["SharedCallee", "a", "h", [["File", "a"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sb"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## SameCaller — Selected

One specific caller symbol calls distinct target symbols owned by anchor and candidate. The common caller owner is not constrained.

Identity: `C(s0,s1),C(s0,s2),D(a,s1),D(b,s2)|a!=b,s1!=s2`. Cost: 4 primitive atoms, 5 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SameCaller", a, b, List#{Participant.Symbol(s0), Participant.Symbol(s1), Participant.Symbol(s2)}) :- Seed(a), C(s0, s1), C(s0, s2), D(a, s1), D(b, s2), if (a != b), if (s1 != s2).
```

Executed positive fixture: `same-caller`; exact witness `["SameCaller", "a", "b", [["File", "a"], ["File", "b"], ["Symbol", "u"], ["Symbol", "sa"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## SameCallerDifferentOwner — Selected

SameCaller, additionally requiring the caller to belong to a third file distinct from anchor and candidate.

Identity: `C(s0,s1),C(s0,s2),D(a,s1),D(b,s2),D(f0,s0)|a!=b,a!=f0,b!=f0,s1!=s2`. Cost: 5 primitive atoms, 6 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SameCallerDifferentOwner", a, b, List#{Participant.File(f0), Participant.Symbol(s0), Participant.Symbol(s1), Participant.Symbol(s2)}) :- Seed(a), C(s0, s1), C(s0, s2), D(a, s1), D(b, s2), D(f0, s0), if (a != b), if (a != f0), if (b != f0), if (s1 != s2).
```

Executed positive fixture: `same-caller`; exact witness `["SameCallerDifferentOwner", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sa"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## SameFileDistinctCallers — Selected

Two distinct caller symbols in one common file call the anchor-owned and candidate-owned targets separately. Their common owner may equal the anchor or candidate.

Identity: `C(s0,s1),C(s2,s3),D(a,s1),D(b,s3),D(f0,s0),D(f0,s2)|a!=b,s0!=s2,s1!=s3`. Cost: 6 primitive atoms, 7 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SameFileDistinctCallers", a, b, List#{Participant.File(f0), Participant.Symbol(s0), Participant.Symbol(s1), Participant.Symbol(s2), Participant.Symbol(s3)}) :- Seed(a), C(s0, s1), C(s2, s3), D(a, s1), D(b, s3), D(f0, s0), D(f0, s2), if (a != b), if (s0 != s2), if (s1 != s3).
```

Executed positive fixture: `different-callers`; exact witness `["SameFileDistinctCallers", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sa"], ["Symbol", "v"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportCallAgreement — Selected

The anchor imports the candidate and an anchor-owned symbol calls a candidate-owned symbol.

Identity: `C(s0,s1),D(a,s0),D(b,s1),I(a,b)|a!=b`. Cost: 4 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportCallAgreement", a, b, List#{Participant.Symbol(s0), Participant.Symbol(s1)}) :- Seed(a), C(s0, s1), D(a, s0), D(b, s1), I(a, b), if (a != b).
```

Executed positive fixture: `random-0`; exact witness `["ImportCallAgreement", "a", "h", [["File", "a"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## SharedImportedCallee — Selected

Anchor and candidate import the same helper file, and an anchor-owned symbol calls a specific symbol owned by that helper. A candidate-side call is not required.

Identity: `C(s0,s1),D(a,s0),D(f0,s1),I(a,f0),I(b,f0)|a!=b`. Cost: 5 primitive atoms, 5 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("SharedImportedCallee", a, b, List#{Participant.File(f0), Participant.Symbol(s0), Participant.Symbol(s1)}) :- Seed(a), C(s0, s1), D(a, s0), D(f0, s1), I(a, f0), I(b, f0), if (a != b).
```

Executed positive fixture: `random-0`; exact witness `["SharedImportedCallee", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportChainCallAgreement — Selected

A two-edge import path and an owned call independently connect the same anchor and candidate.

Identity: `C(s0,s1),D(a,s0),D(b,s1),I(a,f0),I(f0,b)|a!=b`. Cost: 5 primitive atoms, 5 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportChainCallAgreement", a, b, List#{Participant.File(f0), Participant.Symbol(s0), Participant.Symbol(s1)}) :- Seed(a), C(s0, s1), D(a, s0), D(b, s1), I(a, f0), I(f0, b), if (a != b).
```

Executed positive fixture: `random-0`; exact witness `["ImportChainCallAgreement", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["Symbol", "u"], ["Symbol", "sb"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportJoin_98c1f6701c — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0.

Identity: `I(a,b),I(a,f0)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_98c1f6701c", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(a, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_98c1f6701c", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_55efc2bad3 — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0.

Identity: `I(a,b),I(b,f0)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_55efc2bad3", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(b, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_55efc2bad3", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_4a5b43c1ba — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports a.

Identity: `I(a,b),I(f0,a)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_4a5b43c1ba", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(f0, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_4a5b43c1ba", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_d72513b3b8 — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports b.

Identity: `I(a,b),I(f0,b)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_d72513b3b8", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_d72513b3b8", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_1e628a95ca — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a.

Identity: `I(a,f0),I(b,a)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_1e628a95ca", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, f0), I(b, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_1e628a95ca", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_d55f5090b0 — Selected

The same variable must satisfy every following import constraint: b imports a; b imports f0.

Identity: `I(b,a),I(b,f0)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_d55f5090b0", a, b, List#{Participant.File(f0)}) :- Seed(a), I(b, a), I(b, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_d55f5090b0", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_fcc2f584d9 — Selected

The same variable must satisfy every following import constraint: b imports a; f0 imports a.

Identity: `I(b,a),I(f0,a)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_fcc2f584d9", a, b, List#{Participant.File(f0)}) :- Seed(a), I(b, a), I(f0, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_fcc2f584d9", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_0da85eee12 — Selected

The same variable must satisfy every following import constraint: b imports a; f0 imports b.

Identity: `I(b,a),I(f0,b)|a!=b`. Cost: 2 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_0da85eee12", a, b, List#{Participant.File(f0)}) :- Seed(a), I(b, a), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_0da85eee12", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_64b25509af — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; b imports a.

Identity: `I(a,b),I(a,f0),I(b,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_64b25509af", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(a, f0), I(b, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_64b25509af", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_b0cd2bae61 — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; b imports f0.

Identity: `I(a,b),I(a,f0),I(b,f0)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_b0cd2bae61", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(a, f0), I(b, f0), if (a != b).
```

Executed positive fixture: `random-0`; exact witness `["ImportJoin_b0cd2bae61", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportJoin_eeadb39812 — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; f0 imports a.

Identity: `I(a,b),I(a,f0),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_eeadb39812", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(a, f0), I(f0, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_eeadb39812", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_febad17af3 — Selected

The same variable must satisfy every following import constraint: a imports b; b imports a; b imports f0.

Identity: `I(a,b),I(b,a),I(b,f0)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_febad17af3", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(b, a), I(b, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_febad17af3", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_9a4b07c76d — Selected

The same variable must satisfy every following import constraint: a imports b; b imports a; f0 imports a.

Identity: `I(a,b),I(b,a),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_9a4b07c76d", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(b, a), I(f0, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_9a4b07c76d", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_4f60005e4f — Selected

The same variable must satisfy every following import constraint: a imports b; b imports a; f0 imports b.

Identity: `I(a,b),I(b,a),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_4f60005e4f", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(b, a), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_4f60005e4f", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_ea2e7c3f05 — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; f0 imports a.

Identity: `I(a,b),I(b,f0),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_ea2e7c3f05", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(b, f0), I(f0, a), if (a != b).
```

Executed positive fixture: `random-3`; exact witness `["ImportJoin_ea2e7c3f05", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportJoin_fb9dc012cd — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; f0 imports b.

Identity: `I(a,b),I(b,f0),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_fb9dc012cd", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(b, f0), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_fb9dc012cd", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_3731db8057 — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports a; f0 imports b.

Identity: `I(a,b),I(f0,a),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_3731db8057", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, b), I(f0, a), I(f0, b), if (a != b).
```

Executed positive fixture: `random-3`; exact witness `["ImportJoin_3731db8057", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportJoin_275ccb6bb1 — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a; b imports f0.

Identity: `I(a,f0),I(b,a),I(b,f0)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_275ccb6bb1", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, f0), I(b, a), I(b, f0), if (a != b).
```

Executed positive fixture: `random-3`; exact witness `["ImportJoin_275ccb6bb1", "a", "b", [["File", "a"], ["File", "b"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `different-callers`.

## ImportJoin_c8762e6282 — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a; f0 imports a.

Identity: `I(a,f0),I(b,a),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_c8762e6282", a, b, List#{Participant.File(f0)}) :- Seed(a), I(a, f0), I(b, a), I(f0, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_c8762e6282", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_1b18ca6f07 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; f0 imports a.

Identity: `I(a,f0),I(b,f0),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_1b18ca6f07, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(f0, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_21ed8c14b6 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; f0 imports b.

Identity: `I(a,f0),I(b,f0),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_21ed8c14b6, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(f0, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_a777b3b70f — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f0 imports a; f0 imports b.

Identity: `I(a,f0),I(f0,a),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_a777b3b70f, a, b, participants) :- Seed(a), I(a, f0), I(f0, a), I(f0, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_e39f94e61d — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; f0 imports a.

Identity: `I(b,a),I(b,f0),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_e39f94e61d, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(f0, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_34922c7c16 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; f0 imports b.

Identity: `I(b,a),I(b,f0),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_34922c7c16, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(f0, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_21386dc72b — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports a; f0 imports b.

Identity: `I(b,a),I(f0,a),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_21386dc72b, a, b, participants) :- Seed(a), I(b, a), I(f0, a), I(f0, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_92a43c0610 — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f0 imports a; f0 imports b.

Identity: `I(b,f0),I(f0,a),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 3 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_92a43c0610, a, b, participants) :- Seed(a), I(b, f0), I(f0, a), I(f0, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_8742a6b3b3 — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; a imports f1.

Identity: `I(a,b),I(a,f0),I(a,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_8742a6b3b3", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(a, f0), I(a, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_8742a6b3b3", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_7e526a447c — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; b imports f1.

Identity: `I(a,b),I(a,f0),I(b,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_7e526a447c", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(a, f0), I(b, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_7e526a447c", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_d24f39d401 — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; f0 imports f1.

Identity: `I(a,b),I(a,f0),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_d24f39d401", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(a, f0), I(f0, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_d24f39d401", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_58d460cea4 — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; f1 imports a.

Identity: `I(a,b),I(a,f0),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_58d460cea4", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(a, f0), I(f1, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_58d460cea4", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_0c47bd6212 — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; f1 imports b.

Identity: `I(a,b),I(a,f0),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_0c47bd6212", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(a, f0), I(f1, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_0c47bd6212", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_e6f3c73e4a — Selected

The same variable must satisfy every following import constraint: a imports b; a imports f0; f1 imports f0.

Identity: `I(a,b),I(a,f0),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_e6f3c73e4a", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(a, f0), I(f1, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_e6f3c73e4a", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_9d2d16eb5e — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; b imports f1.

Identity: `I(a,b),I(b,f0),I(b,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_9d2d16eb5e", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(b, f0), I(b, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_9d2d16eb5e", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_dab71014f7 — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; f0 imports f1.

Identity: `I(a,b),I(b,f0),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_dab71014f7", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(b, f0), I(f0, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_dab71014f7", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_62e3492a69 — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; f1 imports a.

Identity: `I(a,b),I(b,f0),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_62e3492a69", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(b, f0), I(f1, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_62e3492a69", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_ce5e19cc46 — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; f1 imports b.

Identity: `I(a,b),I(b,f0),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_ce5e19cc46", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(b, f0), I(f1, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_ce5e19cc46", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_d0606227eb — Selected

The same variable must satisfy every following import constraint: a imports b; b imports f0; f1 imports f0.

Identity: `I(a,b),I(b,f0),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_d0606227eb", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(b, f0), I(f1, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_d0606227eb", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_887da153a3 — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports a; f0 imports f1.

Identity: `I(a,b),I(f0,a),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_887da153a3", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, a), I(f0, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_887da153a3", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_ce43360f40 — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports a; f1 imports a.

Identity: `I(a,b),I(f0,a),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_ce43360f40", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, a), I(f1, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_ce43360f40", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_0c03138e3c — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports a; f1 imports b.

Identity: `I(a,b),I(f0,a),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_0c03138e3c", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, a), I(f1, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_0c03138e3c", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_68d128a6da — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports a; f1 imports f0.

Identity: `I(a,b),I(f0,a),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_68d128a6da", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, a), I(f1, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_68d128a6da", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_2530710a7d — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports b; f0 imports f1.

Identity: `I(a,b),I(f0,b),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_2530710a7d", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, b), I(f0, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_2530710a7d", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_1c7f337784 — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports b; f1 imports b.

Identity: `I(a,b),I(f0,b),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_1c7f337784", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, b), I(f1, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_1c7f337784", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_57c10927b2 — Selected

The same variable must satisfy every following import constraint: a imports b; f0 imports b; f1 imports f0.

Identity: `I(a,b),I(f0,b),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_57c10927b2", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, b), I(f0, b), I(f1, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_57c10927b2", "a", "h", [["File", "a"], ["File", "h"], ["File", "a"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_f5f4f47889 — Selected

The same variable must satisfy every following import constraint: a imports f0; a imports f1; b imports a.

Identity: `I(a,f0),I(a,f1),I(b,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_f5f4f47889", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(a, f1), I(b, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_f5f4f47889", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_15564dd27d — Selected

The same variable must satisfy every following import constraint: a imports f0; a imports f1; b imports f0.

Identity: `I(a,f0),I(a,f1),I(b,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_15564dd27d", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(a, f1), I(b, f0), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_15564dd27d", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_8f4402eb86 — Selected

The same variable must satisfy every following import constraint: a imports f0; a imports f1; f0 imports b.

Identity: `I(a,f0),I(a,f1),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_8f4402eb86", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(a, f1), I(f0, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_8f4402eb86", "a", "b", [["File", "a"], ["File", "b"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_ef437fe349 — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a; b imports f1.

Identity: `I(a,f0),I(b,a),I(b,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_ef437fe349", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(b, a), I(b, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_ef437fe349", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_d98c3642b4 — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a; f0 imports f1.

Identity: `I(a,f0),I(b,a),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_d98c3642b4", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(b, a), I(f0, f1), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_d98c3642b4", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_7828373cf9 — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a; f1 imports a.

Identity: `I(a,f0),I(b,a),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_7828373cf9", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(b, a), I(f1, a), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_7828373cf9", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "h"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_3c1a709c3b — Selected

The same variable must satisfy every following import constraint: a imports f0; b imports a; f1 imports b.

Identity: `I(a,f0),I(b,a),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match("ImportJoin_3c1a709c3b", a, b, List#{Participant.File(f0), Participant.File(f1)}) :- Seed(a), I(a, f0), I(b, a), I(f1, b), if (a != b).
```

Executed positive fixture: `different-callers`; exact witness `["ImportJoin_3c1a709c3b", "a", "h", [["File", "a"], ["File", "h"], ["File", "h"], ["File", "a"]]]`.

Negative example: the empty fact set with anchor a has no witness. Executed fixture `empty`.

## ImportJoin_2598fab0c7 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports a; f1 imports f0.

Identity: `I(a,f0),I(b,a),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_2598fab0c7, a, b, participants) :- Seed(a), I(a, f0), I(b, a), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_7eecd808c7 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; b imports f1.

Identity: `I(a,f0),I(b,f0),I(b,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_7eecd808c7, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(b, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_7fc23d6bfb — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; f0 imports f1.

Identity: `I(a,f0),I(b,f0),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_7fc23d6bfb, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_7325b67c21 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; f1 imports a.

Identity: `I(a,f0),I(b,f0),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_7325b67c21, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_8ca5023ce7 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; f1 imports b.

Identity: `I(a,f0),I(b,f0),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_8ca5023ce7, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_40cdbd1e5e — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f0; f1 imports f0.

Identity: `I(a,f0),I(b,f0),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_40cdbd1e5e, a, b, participants) :- Seed(a), I(a, f0), I(b, f0), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_9f291c159b — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f1; f0 imports b.

Identity: `I(a,f0),I(b,f1),I(f0,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_9f291c159b, a, b, participants) :- Seed(a), I(a, f0), I(b, f1), I(f0, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_21d7aa11da — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f1; f0 imports f1.

Identity: `I(a,f0),I(b,f1),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_21d7aa11da, a, b, participants) :- Seed(a), I(a, f0), I(b, f1), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_59147fc204 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f1; f1 imports a.

Identity: `I(a,f0),I(b,f1),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_59147fc204, a, b, participants) :- Seed(a), I(a, f0), I(b, f1), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_69cd718f8f — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; b imports f1; f1 imports f0.

Identity: `I(a,f0),I(b,f1),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_69cd718f8f, a, b, participants) :- Seed(a), I(a, f0), I(b, f1), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_f65db731f3 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f0 imports b; f0 imports f1.

Identity: `I(a,f0),I(f0,b),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_f65db731f3, a, b, participants) :- Seed(a), I(a, f0), I(f0, b), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_0c8964ab9f — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f0 imports b; f1 imports a.

Identity: `I(a,f0),I(f0,b),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_0c8964ab9f, a, b, participants) :- Seed(a), I(a, f0), I(f0, b), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_3b1c24be2e — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f0 imports b; f1 imports b.

Identity: `I(a,f0),I(f0,b),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_3b1c24be2e, a, b, participants) :- Seed(a), I(a, f0), I(f0, b), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_2daadfd77c — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f0 imports b; f1 imports f0.

Identity: `I(a,f0),I(f0,b),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_2daadfd77c, a, b, participants) :- Seed(a), I(a, f0), I(f0, b), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_7abb7ea54c — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f1 imports a; f1 imports b.

Identity: `I(a,f0),I(f1,a),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_7abb7ea54c, a, b, participants) :- Seed(a), I(a, f0), I(f1, a), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_52e0262163 — RejectedCap

The same variable must satisfy every following import constraint: a imports f0; f1 imports b; f1 imports f0.

Identity: `I(a,f0),I(f1,b),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_52e0262163, a, b, participants) :- Seed(a), I(a, f0), I(f1, b), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_0afb0d4726 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; b imports f1.

Identity: `I(b,a),I(b,f0),I(b,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_0afb0d4726, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(b, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_1c2ded31dd — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; f0 imports f1.

Identity: `I(b,a),I(b,f0),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_1c2ded31dd, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_8f2cdfab05 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; f1 imports a.

Identity: `I(b,a),I(b,f0),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_8f2cdfab05, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_2162e0e9af — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; f1 imports b.

Identity: `I(b,a),I(b,f0),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_2162e0e9af, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_4e2cd00d83 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; b imports f0; f1 imports f0.

Identity: `I(b,a),I(b,f0),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_4e2cd00d83, a, b, participants) :- Seed(a), I(b, a), I(b, f0), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_67daa32b47 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports a; f0 imports f1.

Identity: `I(b,a),I(f0,a),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_67daa32b47, a, b, participants) :- Seed(a), I(b, a), I(f0, a), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_70235ddab5 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports a; f1 imports a.

Identity: `I(b,a),I(f0,a),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_70235ddab5, a, b, participants) :- Seed(a), I(b, a), I(f0, a), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_a93f8fe006 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports a; f1 imports b.

Identity: `I(b,a),I(f0,a),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_a93f8fe006, a, b, participants) :- Seed(a), I(b, a), I(f0, a), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_a82d860b57 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports a; f1 imports f0.

Identity: `I(b,a),I(f0,a),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_a82d860b57, a, b, participants) :- Seed(a), I(b, a), I(f0, a), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_1faf3c0e22 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports b; f0 imports f1.

Identity: `I(b,a),I(f0,b),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_1faf3c0e22, a, b, participants) :- Seed(a), I(b, a), I(f0, b), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_8f76b6b875 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports b; f1 imports b.

Identity: `I(b,a),I(f0,b),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_8f76b6b875, a, b, participants) :- Seed(a), I(b, a), I(f0, b), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_8b668f9b10 — RejectedCap

The same variable must satisfy every following import constraint: b imports a; f0 imports b; f1 imports f0.

Identity: `I(b,a),I(f0,b),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_8b668f9b10, a, b, participants) :- Seed(a), I(b, a), I(f0, b), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_4edf40cfa3 — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; b imports f1; f0 imports a.

Identity: `I(b,f0),I(b,f1),I(f0,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_4edf40cfa3, a, b, participants) :- Seed(a), I(b, f0), I(b, f1), I(f0, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_ab4ae2a37e — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f0 imports a; f0 imports f1.

Identity: `I(b,f0),I(f0,a),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_ab4ae2a37e, a, b, participants) :- Seed(a), I(b, f0), I(f0, a), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_51aaba3cf9 — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f0 imports a; f1 imports a.

Identity: `I(b,f0),I(f0,a),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_51aaba3cf9, a, b, participants) :- Seed(a), I(b, f0), I(f0, a), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_8b308d015d — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f0 imports a; f1 imports b.

Identity: `I(b,f0),I(f0,a),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_8b308d015d, a, b, participants) :- Seed(a), I(b, f0), I(f0, a), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_06c399ccb2 — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f0 imports a; f1 imports f0.

Identity: `I(b,f0),I(f0,a),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_06c399ccb2, a, b, participants) :- Seed(a), I(b, f0), I(f0, a), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_3a9f4119de — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f0 imports f1; f1 imports a.

Identity: `I(b,f0),I(f0,f1),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_3a9f4119de, a, b, participants) :- Seed(a), I(b, f0), I(f0, f1), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_026c927fd1 — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f1 imports a; f1 imports b.

Identity: `I(b,f0),I(f1,a),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_026c927fd1, a, b, participants) :- Seed(a), I(b, f0), I(f1, a), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_9c242b3fba — RejectedCap

The same variable must satisfy every following import constraint: b imports f0; f1 imports a; f1 imports f0.

Identity: `I(b,f0),I(f1,a),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_9c242b3fba, a, b, participants) :- Seed(a), I(b, f0), I(f1, a), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_2bbcadd70a — RejectedCap

The same variable must satisfy every following import constraint: f0 imports a; f0 imports b; f0 imports f1.

Identity: `I(f0,a),I(f0,b),I(f0,f1)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_2bbcadd70a, a, b, participants) :- Seed(a), I(f0, a), I(f0, b), I(f0, f1), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_7dffc38988 — RejectedCap

The same variable must satisfy every following import constraint: f0 imports a; f0 imports b; f1 imports a.

Identity: `I(f0,a),I(f0,b),I(f1,a)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_7dffc38988, a, b, participants) :- Seed(a), I(f0, a), I(f0, b), I(f1, a), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_a85e200ab0 — RejectedCap

The same variable must satisfy every following import constraint: f0 imports a; f0 imports b; f1 imports b.

Identity: `I(f0,a),I(f0,b),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_a85e200ab0, a, b, participants) :- Seed(a), I(f0, a), I(f0, b), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_6667e553a0 — RejectedCap

The same variable must satisfy every following import constraint: f0 imports a; f0 imports b; f1 imports f0.

Identity: `I(f0,a),I(f0,b),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_6667e553a0, a, b, participants) :- Seed(a), I(f0, a), I(f0, b), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_f6bd435ee7 — RejectedCap

The same variable must satisfy every following import constraint: f0 imports a; f0 imports f1; f1 imports b.

Identity: `I(f0,a),I(f0,f1),I(f1,b)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_f6bd435ee7, a, b, participants) :- Seed(a), I(f0, a), I(f0, f1), I(f1, b), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

## ImportJoin_9b010d58dd — RejectedCap

The same variable must satisfy every following import constraint: f0 imports a; f1 imports b; f1 imports f0.

Identity: `I(f0,a),I(f1,b),I(f1,f0)|a!=b`. Cost: 3 primitive atoms, 4 typed variables; anchor-conditioned positive joins, no recursion.

```flix
Match(ImportJoin_9b010d58dd, a, b, participants) :- Seed(a), I(f0, a), I(f1, b), I(f1, f0), if (a != b). // Native rule not emitted because of cap.
```

Constructive positive example: assign a distinct correctly typed entity to each variable and provide exactly the listed atoms. Not executed: deterministic cap.

Negative example: the empty fact set with anchor a has no witness. Not executed.

