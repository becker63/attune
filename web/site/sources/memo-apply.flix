    pub def apply(facts: List[Fact], input: Frontier, atom: Atom): Result[String, Frontier] = {
        let world = worldOf(input);
        let domain = domainOf(input);
        if (domain != atomSource(atom))
            Err(atomName(atom) + " needs " + domainName(atomSource(atom))
                + " but the current domain is " + domainName(domain) + ".")
        else match List.find(fact -> fact#world != world, facts) {
            case Some(_) => Err("a fact from another world cannot apply here.")
            case None =>
                let targets = List.filterMap(fact ->
                    if (fact#atom == atom and holds(input, fact#source)) Some(fact#target) else None,
                    facts);
                Ok(frontierOf(world, atomTarget(atom), targets))
        }
    }
