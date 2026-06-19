import { Runtime } from "foldkit"

import { Message, Model, init, update, view } from "@attune/dispatch-foldkit"

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById("root"),
  devTools: {
    Message,
  },
})

Runtime.run(program)
