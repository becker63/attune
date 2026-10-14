import attune.browser.{Port, Port$Program => Program}

def main(): Unit \ IO =
    Port.install(new Program {
        def evaluate(_this: Program, input: String): String = Attune.Studio.evaluate(input)
    })
