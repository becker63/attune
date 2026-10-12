use Attune.{Artifacts, Effects}

/// Declare the exact prepared question as an embedding request.
def main(): Unit \ IO =
    Artifacts.declare(Effects.queryText(Artifacts.input("text")))
