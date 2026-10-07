use Attune.Study.Jev
use Attune.Study.Metrics

/// The corpus-free JEV rerank laws (`VAL-JEV-003`).
///
/// These drive the exact production promotion statement in `Attune.Study.Jev`
/// with hand-built immutable rankings and typed decisions, so the promotion rule
/// the report depends on is pinned by a declared target rather than by an ad-hoc
/// recomputation:
///
/// - only `Relevant` promotes; `NotRelevant`, `Unknown` and `Failed` receive no
///   promotion and no negative penalty;
/// - the promotion key is `(Relevant ? 0 : 1, original base rank)`, so both
///   partitions stay in original base order and a candidate with no receipt row
///   at all is `Unknown` rather than a negative;
/// - the promoted ranking carries the identical complete base candidate
///   population with contiguous new positions: nothing is deleted, invented or
///   re-scored;
/// - a cutoff's gold membership change is classified improved, regressed or
///   unchanged without inventing a score.
///
/// No corpus, world, Grit, receipt or label artifact is touched here.

// ---------------------------------------------------------------- fixtures

def entries(pairs: List[(Int32, String)]): Metrics.Ranking =
    List.map(pair -> match pair { case (rank, path) => (rank, path, 0) }, pairs)

def decisions(pairs: List[(Int32, String)]): List[(Int32 , Jev.JevOutcome)] =
    List.map(pair -> match pair { case (rank, name) => (rank, Jev.parseOutcome(name)) }, pairs)

def positions(ranking: List[(Int32, String, Int32)]): List[Int32] =
    List.map(entry -> match entry { case (position, _, _) => position }, ranking)

def paths(ranking: List[(Int32, String, Int32)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, ranking)

// ------------------------------------------------------------------- laws

/// Only `Relevant` promotes. A `Relevant` candidate at original base rank 2
/// moves ahead of the `NotRelevant` rank-1 candidate, while the `Unknown` rank-3
/// candidate stays behind both and takes no penalty.
@Test
def onlyRelevantPromotesAndTheRestKeepTheirOrder(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: Nil);
    let typed = decisions((1, "NotRelevant") :: (2, "Relevant") :: (3, "Unknown") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = true, Jev.promotes(Jev.JevOutcome.Relevant));
    Assert.assertEq(expected = false, Jev.promotes(Jev.JevOutcome.NotRelevant));
    Assert.assertEq(expected = false, Jev.promotes(Jev.JevOutcome.Unknown));
    Assert.assertEq(expected = false, Jev.promotes(Jev.JevOutcome.Failed("Transport")));
    Assert.assertEq(expected = "b.ts" :: "a.ts" :: "c.ts" :: Nil, paths(promoted));
    Assert.assertEq(expected = 1 :: 2 :: 3 :: Nil, positions(promoted))
}

/// A typed failure is never a negative and never a promotion: it stays with the
/// non-`Relevant` partition in original base order, exactly like `Unknown`.
@Test
def aFailedDecisionIsNeitherANegativeNorAPromotion(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: Nil);
    let typed = decisions((1, "Unknown") :: (2, "Failed:Timeout") :: (3, "Relevant") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = "c.ts" :: "a.ts" :: "b.ts" :: Nil, paths(promoted));
    Assert.assertEq(expected = "Failed:Timeout", Jev.outcomeName(Jev.decisionAt(2, typed)))
}

/// A candidate with no receipt row at all is `Unknown`, never a negative, and
/// the complete population is preserved: nothing is deleted, invented or
/// re-scored, and every position is contiguous.
@Test
def aMissingReceiptRowIsUnknownAndThePopulationIsPreserved(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: Nil);
    let typed = decisions((3, "Relevant") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = Jev.JevOutcome.Unknown, Jev.decisionAt(1, typed));
    Assert.assertEq(expected = 3, List.length(promoted));
    Assert.assertEq(expected = List.sort(paths(d)), List.sort(paths(promoted)));
    Assert.assertEq(expected = 1 :: 2 :: 3 :: Nil, positions(promoted));
    Assert.assertEq(expected = "c.ts" :: "a.ts" :: "b.ts" :: Nil, paths(promoted))
}

/// The promotion key is `(Relevant ? 0 : 1, original base rank)`: two promoted
/// candidates keep their original base order among themselves, and two
/// non-promoted candidates keep theirs.
@Test
def thePromotionKeyKeepsBothPartitionsStable(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: (4, "d.ts") :: Nil);
    let typed = decisions((4, "Relevant") :: (2, "Relevant") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = (0, 2), Jev.promotionKey(Jev.JevOutcome.Relevant, 2));
    Assert.assertEq(expected = (1, 2), Jev.promotionKey(Jev.JevOutcome.NotRelevant, 2));
    Assert.assertEq(expected = "b.ts" :: "d.ts" :: "a.ts" :: "c.ts" :: Nil, paths(promoted))
}

/// A cutoff's gold membership change is classified from the two immutable
/// rankings without inventing a score: a promotion that brings gold inside the
/// cutoff is `Improved`, a promotion of a non-gold distractor that pushes gold
/// out is `Regressed`, and an unchanged membership is `Unchanged`.
@Test
def theCutoffChangeIsClassifiedFromTheImmutableRankings(): Unit \ Assert = {
    let goldFirst = entries((1, "g.ts") :: (2, "z.ts") :: Nil);
    let goldSecond = entries((1, "z.ts") :: (2, "g.ts") :: Nil);
    let promotedGold = Jev.promoted(goldSecond, decisions((2, "Relevant") :: Nil));
    let promotedDistractor = Jev.promoted(goldFirst, decisions((2, "Relevant") :: Nil));
    let gold = "g.ts" :: Nil;
    Assert.assertEq(expected = "improved", Jev.changeName(Jev.changeAt(1, goldSecond, promotedGold, gold)));
    Assert.assertEq(expected = "unchanged", Jev.changeName(Jev.changeAt(1, goldFirst, goldFirst, gold)));
    Assert.assertEq(expected = "regressed", Jev.changeName(Jev.changeAt(1, goldFirst, promotedDistractor, gold)))
}
