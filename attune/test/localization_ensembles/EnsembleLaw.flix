// The corpus-free replicated ensemble and working-set laws
// (`VAL-REPL-002`..`VAL-REPL-005`).
//
// These laws drive the exact production statements in `Attune.Study.Ensemble`
// with hand-built immutable values, so the stability categories, the cumulative
// vote order, the three fixed ensembles, the union working set and the reported
// statistics are pinned by a declared target rather than by an ad-hoc
// recomputation. No corpus, world, Grit, receipt, label, ranking tree or
// provider artifact is touched.

use Attune.Study.Ensemble
use Attune.Study.Jev
use Attune.Study.Metrics

// ---------------------------------------------------------------- fixtures

def entries(pairs: List[(Int32, String)]): List[(Int32, String, Int32)] =
    List.map(pair -> match pair { case (rank, path) => (rank, path, 0) }, pairs)

def candidate(rank: Int32, votes: Int32): Ensemble.VotedCandidate =
    { rank = rank, path = "c" + Int32.toString(rank) + ".ts", votes = votes }

def population(votes: List[Int32]): List[Ensemble.VotedCandidate] =
    List.map(index -> candidate(index + 1, Ensemble.at(votes, index)), List.range(0, List.length(votes)))

def ranked(candidates: List[Ensemble.VotedCandidate]): String =
    List.join(",", List.map(candidateOf -> candidateOf#path, candidates))

def rankingPaths(ranking: Metrics.Ranking): String =
    List.join(",", List.map(entry -> match entry { case (_, path, _) => path }, ranking))

def pathAt(index: Int32, paths: List[String]): String = match List.drop(index, paths) {
    case path :: _ => path
    case Nil       => ""
}

def ratioText(value: Metrics.Ratio): String =
    Int32.toString(value#numerator) + "/" + Int32.toString(value#denominator)

// ------------------------------------------------------------------- laws

/// Only an explicit `Relevant` observation votes, cumulative counts use only the
/// first preregistered replicate ids, and a typed `Failed` stays visible with no
/// vote rather than becoming a negative or an `Unknown`.
@Test
def onlyRelevantVotesAndFailedStaysDistinct(): Unit \ Assert = {
    let observations = (1, Jev.JevOutcome.Relevant) :: (2, Jev.JevOutcome.NotRelevant)
        :: (3, Jev.JevOutcome.Unknown) :: (4, Jev.JevOutcome.Failed("Timeout"))
        :: (5, Jev.JevOutcome.Relevant) :: Nil;
    Assert.assertEq(expected = 1, Ensemble.cumulativeVotes(1, observations));
    Assert.assertEq(expected = 1, Ensemble.cumulativeVotes(4, observations));
    Assert.assertEq(expected = 2, Ensemble.cumulativeVotes(5, observations));
    Assert.assertEq(expected = 5, List.length(Ensemble.voteCurve(observations)));
    Assert.assertEq(expected = "R", Ensemble.outcomeCategory(Jev.JevOutcome.Relevant));
    Assert.assertEq(expected = "N", Ensemble.outcomeCategory(Jev.JevOutcome.NotRelevant));
    Assert.assertEq(expected = "U", Ensemble.outcomeCategory(Jev.JevOutcome.Unknown));
    Assert.assertEq(expected = "F", Ensemble.outcomeCategory(Jev.JevOutcome.Failed("Transport")));
    Assert.assertEq(expected = false, Ensemble.outcomeCategory(Jev.JevOutcome.Failed("Transport")) == "U");
    Assert.assertEq(expected = false, Ensemble.outcomeCategory(Jev.JevOutcome.Failed("Transport")) == "N")
}

/// The cumulative vote ranking is ordered by `(-votes, original P+A rank)`, an
/// unjudged candidate with no vote follows the voted ones in its own original
/// order, and at `N=1` the ranking is exactly the published ordinary
/// Relevant-first promotion of the same base ranking.
@Test
def theVoteOrderIsVotesThenOriginalRankAndN1ReproducesTheOneShotRanking(): Unit \ Assert = {
    let votes = 0 :: 2 :: 2 :: 0 :: 1 :: Nil;
    Assert.assertEq(expected = "c2.ts,c3.ts,c5.ts,c1.ts,c4.ts", ranked(Ensemble.voteOrdered(population(votes))));
    let positions = Ensemble.voteRanking(population(votes));
    Assert.assertEq(expected = 5, List.length(positions));
    Assert.assertEq(expected = "c2.ts", pathAt(0, List.map(entry -> match entry { case (_, path, _) => path }, positions)));
    Assert.assertEq(expected = "c4.ts", pathAt(4, List.map(entry -> match entry { case (_, path, _) => path }, positions)));
    Assert.assertEq(expected = "c1.ts", pathAt(3, Ensemble.topPaths(Ensemble.voteOrdered(population(votes)), 5)));
    let base = entries((1, "c1.ts") :: (2, "c2.ts") :: (3, "c3.ts") :: Nil);
    let decisions = (1, Jev.JevOutcome.NotRelevant) :: (2, Jev.JevOutcome.Relevant) :: Nil;
    Assert.assertEq(expected = Jev.promotedRanking(base, decisions),
        Ensemble.voteRanking(population(0 :: 1 :: 0 :: Nil)))
}

/// The three fixed ensembles publish their own selected/unselected partition:
/// `ANY` selects votes >= 1, `MAJ` votes >= 3 and `CONS` votes == 5, the selected
/// candidates come first under the vote order, and the population is unchanged.
@Test
def theFixedEnsemblesSelectTheirDeclaredThresholdsOverTheSamePopulation(): Unit \ Assert = {
    let votes = 0 :: 5 :: 3 :: 1 :: 0 :: Nil;
    Assert.assertEq(expected = "ANY,MAJ,CONS", List.join(",", List.map(Ensemble.ensembleName, Ensemble.ensembles())));
    Assert.assertEq(expected = "c2.ts,c3.ts,c4.ts,c1.ts,c5.ts",
        ranked(Ensemble.ensembleOrdered(Ensemble.Ensemble.Any, population(votes))));
    Assert.assertEq(expected = "c2.ts,c3.ts,c1.ts,c4.ts,c5.ts",
        ranked(Ensemble.ensembleOrdered(Ensemble.Ensemble.Majority, population(votes))));
    Assert.assertEq(expected = "c2.ts,c1.ts,c3.ts,c4.ts,c5.ts",
        ranked(Ensemble.ensembleOrdered(Ensemble.Ensemble.Consensus, population(votes))));
    Assert.assertEq(expected = 5, List.length(Ensemble.ensembleOrdered(Ensemble.Ensemble.Consensus, population(votes))));
    Assert.assertEq(expected = "c2.ts,c3.ts,c4.ts", List.join(",",
        Ensemble.selectedPaths(Ensemble.Ensemble.Any, population(votes))));
    Assert.assertEq(expected = true, Ensemble.ensembleSelected(Ensemble.Ensemble.Any, 1));
    Assert.assertEq(expected = false, Ensemble.ensembleSelected(Ensemble.Ensemble.Any, 0));
    Assert.assertEq(expected = true, Ensemble.ensembleSelected(Ensemble.Ensemble.Majority, 3));
    Assert.assertEq(expected = false, Ensemble.ensembleSelected(Ensemble.Ensemble.Majority, 2));
    Assert.assertEq(expected = true, Ensemble.ensembleSelected(Ensemble.Ensemble.Consensus, 5));
    Assert.assertEq(expected = false, Ensemble.ensembleSelected(Ensemble.Ensemble.Consensus, 4))
}

/// The stability categories: `5/5`, `4/5`, `3/5` and the explicit `other`
/// bucket, the full multiset pattern, and the ever-Relevant-versus-non-Relevant
/// flip.
@Test
def theAgreementLevelsAndPatternsStayExplicit(): Unit \ Assert = {
    let unanimous = "R" :: "R" :: "R" :: "R" :: "R" :: Nil;
    Assert.assertEq(expected = "5/5", Ensemble.agreementLevel(unanimous));
    Assert.assertEq(expected = "R5", Ensemble.patternSignature(unanimous));
    Assert.assertEq(expected = true, Ensemble.stable(unanimous));
    Assert.assertEq(expected = false, Ensemble.everFlips(unanimous));
    let four = "R" :: "R" :: "R" :: "R" :: "N" :: Nil;
    Assert.assertEq(expected = "4/5", Ensemble.agreementLevel(four));
    Assert.assertEq(expected = "R4+N1", Ensemble.patternSignature(four));
    Assert.assertEq(expected = true, Ensemble.everFlips(four));
    let three = "R" :: "R" :: "R" :: "N" :: "N" :: Nil;
    Assert.assertEq(expected = "3/5", Ensemble.agreementLevel(three));
    Assert.assertEq(expected = "R3+N2", Ensemble.patternSignature(three));
    let split = "R" :: "R" :: "N" :: "N" :: "U" :: Nil;
    Assert.assertEq(expected = "other", Ensemble.agreementLevel(split));
    Assert.assertEq(expected = "R2+N2+U1", Ensemble.patternSignature(split));
    let failedSplit = "U" :: "F" :: "F" :: "N" :: "N" :: Nil;
    Assert.assertEq(expected = "other", Ensemble.agreementLevel(failedSplit));
    Assert.assertEq(expected = "N2+U1+F2", Ensemble.patternSignature(failedSplit));
    Assert.assertEq(expected = false, Ensemble.everFlips("N" :: "N" :: "N" :: "N" :: "N" :: Nil));
    Assert.assertEq(expected = 1, Ensemble.pairwiseAgreement("R" :: "N" :: Nil, "R" :: "U" :: Nil));
    Assert.assertEq(expected = 1, Ensemble.intersectionSize("a" :: "b" :: Nil, "b" :: "c" :: Nil));
    Assert.assertEq(expected = 3, Ensemble.unionOfSizes("a" :: "b" :: Nil, "b" :: "c" :: Nil))
}

/// The union working set: the cumulative union of runs `1..n` only ever grows,
/// and a set is measured at its own size by the canonical reducer, so a set that
/// cannot hold every gold path is a measured false rather than an undefined
/// value.
@Test
def theCumulativeUnionIsASetMeasuredAtItsOwnSize(): Unit \ Assert = {
    let runs = (1, "a" :: "b" :: Nil) :: (2, "b" :: "c" :: Nil) :: (3, "d" :: Nil) :: Nil;
    Assert.assertEq(expected = "a,b", List.join(",", Ensemble.cumulativeUnion(1, runs)));
    Assert.assertEq(expected = "a,b,c", List.join(",", Ensemble.cumulativeUnion(2, runs)));
    Assert.assertEq(expected = "a,b,c,d", List.join(",", Ensemble.cumulativeUnion(3, runs)));
    let populationOfTask = List.map(index -> candidate(index, 0), List.range(1, 6));
    let unionSet = Ensemble.workingSetRanking(populationOfTask, "c3.ts" :: "c1.ts" :: Nil);
    Assert.assertEq(expected = 2, List.length(unionSet));
    Assert.assertEq(expected = "c1.ts,c3.ts", rankingPaths(unionSet));
    Assert.assertEq(expected = true, Ensemble.coversAll(unionSet, "c1.ts" :: "c3.ts" :: Nil, 2));
    Assert.assertEq(expected = false, Ensemble.coversAll(unionSet, "c1.ts" :: "c3.ts" :: "c5.ts" :: Nil, 2));
    Assert.assertEq(expected = true, Ensemble.coversAny(unionSet, "c3.ts" :: Nil, 2));
    Assert.assertEq(expected = false, Ensemble.coversAny(unionSet, "c5.ts" :: Nil, 2));
    Assert.assertEq(expected = 2, Ensemble.retrieved(unionSet, "c1.ts" :: "c3.ts" :: "c5.ts" :: Nil, 2));
    // The mandatory equal-budget control has exactly the union's size, so the
    // two sets are compared at one declared budget.
    let control = Ensemble.equalBudgetTop(2, entries((1, "x.ts") :: (2, "y.ts") :: (3, "z.ts") :: Nil));
    Assert.assertEq(expected = 2, List.length(control));
    Assert.assertEq(expected = true, Ensemble.coversAll(control, "x.ts" :: "y.ts" :: Nil, 2));
    Assert.assertEq(expected = false, Ensemble.coversAll(control, "x.ts" :: "y.ts" :: "z.ts" :: Nil, 2))
}

/// The reported statistics are the declared exact ones: the lower median, the
/// nearest-rank 95th percentile, an exact mean, an exact variance and a signed
/// difference for a reported comparison.
@Test
def theReportedStatisticsAreExact(): Unit \ Assert = {
    Assert.assertEq(expected = 2, Ensemble.medianIndex(5));
    Assert.assertEq(expected = 0, Ensemble.medianIndex(1));
    Assert.assertEq(expected = 4, Ensemble.percentileIndex(5, 95));
    Assert.assertEq(expected = 18, Ensemble.percentileIndex(20, 95));
    Assert.assertEq(expected = 5, Ensemble.at(List.sort(3 :: 5 :: 7 :: Nil), 1));
    Assert.assertEq(expected = "3/2", ratioText(Ensemble.meanOf(1 :: 2 :: Nil)));
    Assert.assertEq(expected = "56/25", ratioText(Ensemble.varianceOf(188 :: 187 :: 191 :: 189 :: 187 :: Nil)));
    Assert.assertEq(expected = "0/1", ratioText(Ensemble.varianceOf(7 :: 7 :: 7 :: Nil)));
    Assert.assertEq(expected = 2, Ensemble.countOf(1, 1 :: 1 :: 2 :: Nil));
    Assert.assertEq(expected = "1/6", ratioText(Ensemble.difference(Metrics.ratio(1, 2), Metrics.ratio(1, 3))));
    Assert.assertEq(expected = "+16.7%", Ensemble.signedPercentage(Ensemble.difference(Metrics.ratio(1, 2), Metrics.ratio(1, 3))));
    Assert.assertEq(expected = "-16.7%", Ensemble.signedPercentage(Ensemble.difference(Metrics.ratio(1, 3), Metrics.ratio(1, 2))));
    Assert.assertEq(expected = "+0.0%", Ensemble.signedPercentage(Ensemble.difference(Metrics.ratio(1, 3), Metrics.ratio(1, 3))))
}
