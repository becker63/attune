use Attune.Artifacts

/// Declare one source embedding. Separate targets can run independently.
def main(): Unit \ IO = Artifacts.declare(Artifacts.input("text"))
