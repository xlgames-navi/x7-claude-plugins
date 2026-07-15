import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = "8088";

export function resolvePort(env = process.env) {
  const raw = env.VIBEUE_MCP_PORT;
  if (raw === undefined || raw === "") return DEFAULT_PORT;
  if (!/^\d+$/u.test(raw) || Number(raw) < 1 || Number(raw) > 65535) {
    throw new Error(
      `VIBEUE_MCP_PORT must be an integer between 1 and 65535, got: ${raw}`,
    );
  }
  return raw;
}

export function buildMcpRemoteArgs(port) {
  return [
    "-y",
    "mcp-remote",
    `http://127.0.0.1:${port}/mcp`,
    "--transport",
    "http-only",
    "--allow-http",
    "--header",
  ];
}

export function buildLaunchCommand(
  port,
  platform = process.platform,
  env = process.env,
) {
  const args = buildMcpRemoteArgs(port);
  if (platform === "win32") {
    return {
      command: env.ComSpec || env.COMSPEC || "cmd.exe",
      args: ["/d", "/s", "/c", "npx.cmd", ...args],
    };
  }
  return { command: "npx", args };
}

function main() {
  const port = resolvePort();
  const { command, args } = buildLaunchCommand(port);
  const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  child.on("error", (error) => {
    process.stderr.write(`Failed to launch mcp-remote: ${error.message}\n`);
    process.exit(1);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
