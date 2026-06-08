import http from "http";
import { env } from "./config/env";
import { createApp } from "./app";
import { configureSockets } from "./sockets";

const app = createApp();
const server = http.createServer(app);

configureSockets(server);

server.listen(env.PORT, () => {
  console.log(`Requests API listening on http://localhost:${env.PORT}`);
});
