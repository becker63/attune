@Test
def unchangedCanonicalIdentitiesAndMenus(): Unit \ Assert = {
    let samples=List.map(snd,CanonicalReference.controls()) ::: List#{
        Nil,List#{(0,0,1)},List#{(0,0,1),(0,0,1)},
        List#{(0,0,1),(3,0,0)},List#{(0,0,1),(1,3,0)},
        List#{(0,0,1),(2,0,3)},List#{(0,0,1),(3,0,3)}
    };
    let vocabulary=List.flatMap(k -> List.flatMap(a -> List.map(b -> (k,a,b),List.range(0,7)),List.range(0,7)),List.range(0,4));
    List.forEach(p -> {
        Assert.assertEq(expected=CanonicalReference.canonical(p),Language.canonical(p));
        Assert.assertEq(expected=CanonicalReference.valid(p),Language.valid(p));
        Assert.assertEq(expected=CanonicalReference.mutationInventory(p),Language.mutationInventory(p));
        List.forEach(atom -> {
            let q=atom::p;
            Assert.assertEq(expected=CanonicalReference.canonical(q),Language.canonical(q));
            Assert.assertEq(expected=CanonicalReference.valid(q),Language.valid(q))
        },vocabulary)
    },samples)
}
