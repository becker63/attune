import { createServer } from "node:net"
import { Effect } from "effect"

export const chooseFreePort: Effect.Effect<number, Error> = Effect.async<
  number,
  Error
>((resume) => {
  const server = createServer()
  server.listen(0, "127.0.0.1", () => {
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    server.close(() => resume(Effect.succeed(port)))
  })
  server.on("error", (error) => resume(Effect.fail(error)))
})
