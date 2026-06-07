import { Runtime } from 'foldkit'

import './styles.css'
import { Message } from './message'
import { Model } from './model'
import { init } from './main'
import { update } from './update'
import { view } from './view'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(program)
