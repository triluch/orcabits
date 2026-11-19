import { parseArgs } from "node:util";
import { preview } from "astro";

const { values } = parseArgs({
  options: { port: { type: "string", default: "4321" } },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("--port must be a valid TCP port");
}
const server = await preview({ server: { host: "127.0.0.1", port } });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
