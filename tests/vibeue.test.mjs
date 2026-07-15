import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildLaunchCommand,
  resolvePort,
  buildMcpRemoteArgs,
} from "../plugins/vibeue/scripts/launch-mcp-remote.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.join(root, "plugins", "vibeue");

test("port resolution defaults to 8088 and accepts a valid override", () => {
  assert.equal(resolvePort({}), "8088");
  assert.equal(resolvePort({ VIBEUE_MCP_PORT: "" }), "8088");
  assert.equal(resolvePort({ VIBEUE_MCP_PORT: "9090" }), "9090");
});

test("port resolution rejects invalid overrides", () => {
  assert.throws(
    () => resolvePort({ VIBEUE_MCP_PORT: "abc" }),
    /integer between 1 and 65535/,
  );
  assert.throws(
    () => resolvePort({ VIBEUE_MCP_PORT: "0" }),
    /integer between 1 and 65535/,
  );
  assert.throws(
    () => resolvePort({ VIBEUE_MCP_PORT: "70000" }),
    /integer between 1 and 65535/,
  );
  assert.throws(
    () => resolvePort({ VIBEUE_MCP_PORT: "8088; rm -rf /" }),
    /integer between 1 and 65535/,
  );
});

test("mcp-remote args target the resolved port with the expected proxy flags", () => {
  assert.deepEqual(buildMcpRemoteArgs("8088"), [
    "-y",
    "mcp-remote",
    "http://127.0.0.1:8088/mcp",
    "--transport",
    "http-only",
    "--allow-http",
    "--header",
  ]);
  assert.deepEqual(buildMcpRemoteArgs("9090")[2], "http://127.0.0.1:9090/mcp");
});

test("launcher uses cmd.exe for npx.cmd on Windows", () => {
  assert.deepEqual(
    buildLaunchCommand("8088", "win32", {
      ComSpec: "C:\\Windows\\System32\\cmd.exe",
    }),
    {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        "npx.cmd",
        "-y",
        "mcp-remote",
        "http://127.0.0.1:8088/mcp",
        "--transport",
        "http-only",
        "--allow-http",
        "--header",
      ],
    },
  );
});

test("launcher invokes npx directly on non-Windows platforms", () => {
  assert.deepEqual(buildLaunchCommand("9090", "linux", {}), {
    command: "npx",
    args: [
      "-y",
      "mcp-remote",
      "http://127.0.0.1:9090/mcp",
      "--transport",
      "http-only",
      "--allow-http",
      "--header",
    ],
  });
});

test("host-specific MCP configuration points to the port-aware launcher script", () => {
  const claude = JSON.parse(
    fs.readFileSync(path.join(plugin, ".mcp.json"), "utf8"),
  );
  const codexManifest = JSON.parse(
    fs.readFileSync(path.join(plugin, ".codex-plugin", "plugin.json"), "utf8"),
  );
  const antigravity = JSON.parse(
    fs.readFileSync(path.join(plugin, "mcp_config.json"), "utf8"),
  );
  const antigravityServers = Object.values(antigravity.mcpServers);
  assert.match(
    claude.mcpServers["VibeUE"].args[0],
    /CLAUDE_PLUGIN_ROOT.*launch-mcp-remote\.mjs/,
  );
  assert.equal(
    codexManifest.mcpServers["VibeUE"].args[0],
    "./scripts/launch-mcp-remote.mjs",
  );
  assert.equal(codexManifest.mcpServers["VibeUE"].cwd, ".");
  assert.equal(antigravityServers.length, 1);
  assert.equal(
    antigravityServers[0].args[0],
    "./scripts/launch-mcp-remote.mjs",
  );
  assert.ok(
    fs.existsSync(path.join(plugin, "scripts", "launch-mcp-remote.mjs")),
  );
});
