// Deliberately invalid: the answer cannot invent a value for y.
def unsafeRule(): #{ Edge(Int32, Int32) } = #{
    Edge(x, y) :- Edge(x, x).
}
