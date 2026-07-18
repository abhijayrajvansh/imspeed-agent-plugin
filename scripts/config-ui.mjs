import os from "node:os";
import path from "node:path";
import { createConfigServer } from "../src/config-ui.mjs";

const rawPort = process.env.PORT;
const port = rawPort === undefined ? 62266 : Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a numeric port from 1 to 65535");

const repositoryRoot = path.resolve(".");
const server = createConfigServer({
  repositoryRoot,
  configPath: path.join(repositoryRoot, "config", "imspeed-agent-defaults.toml"),
  profileDirectory: path.join(repositoryRoot, "agents"),
  codexHome: process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
});
server.listen(port, "127.0.0.1", () => console.log(`IMSpeed config UI: http://127.0.0.1:${port}`));
