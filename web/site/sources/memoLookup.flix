// Source: attune/src/Attune/../Attune.flix:237–250
// Source SHA-256: d90ba29ffff8e54d599d2e9929eed73089d8ffd3659d3759240ce3d756b85ed8
        let key = (worldOf(input), namespace, input, atom);
        match List.find(entry -> match entry { case (k, _, _) => k == key }, memo) {
            case Some(entry) => match entry {
                case (_, ordinal, output) => (Ok(output), memo, Lookup.Hit(ordinal) :: Nil, next)
            }
            case None => match apply(facts, input, atom) {
                case Ok(output) =>
                    (Ok(output), (key, next, output) :: memo, Lookup.Miss(next) :: Nil, next + 1)
                case Err(error) =>
                    (Err(error), memo, Lookup.Miss(next) :: Nil, next + 1)
            }
        }
    }

