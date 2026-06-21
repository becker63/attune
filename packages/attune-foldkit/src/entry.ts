import { Runtime } from "foldkit"

import { Message, Model, init, update, view } from "./index.js"

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
