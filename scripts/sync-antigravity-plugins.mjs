import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetRoot = path.join(root, ".agents", "plugins");
const pluginNames = ["antigravity-guidance", "ripgrep", "git", "internal-web"];
const checkOnly = process.argv.includes("--check");

function expectedFiles(pluginName) {
  const sourceRoot = path.join(root, "plugins", pluginName);
  const codexManifestPath = path.join(sourceRoot, ".codex-plugin", "plugin.json");
  const sourceManifest = JSON.parse(fs.readFileSync(
    fs.existsSync(codexManifestPath) ? codexManifestPath : path.join(sourceRoot, "plugin.json"),
    "utf8"
  ));
  const files = new Map([
    ["plugin.json", `${JSON.stringify({
      $schema: "https://antigravity.google/schemas/v1/plugin.json",
      name: pluginName,
      description: sourceManifest.description
    }, null, 2)}\n`]
  ]);

  for (const component of ["skills", "scripts", "references", "assets"]) {
    const componentRoot = path.join(sourceRoot, component);
    if (!fs.existsSync(componentRoot)) continue;
    for (const absolutePath of fs.readdirSync(componentRoot, { recursive: true, withFileTypes: true })) {
      if (!absolutePath.isFile()) continue;
      const fullPath = path.join(absolutePath.parentPath, absolutePath.name);
      const relativePath = path.join(component, path.relative(componentRoot, fullPath));
      files.set(relativePath, fs.readFileSync(fullPath));
    }
  }
  return files;
}

for (const pluginName of pluginNames) {
  const target = path.join(targetRoot, pluginName);
  const files = expectedFiles(pluginName);
  if (checkOnly) {
    const actualFiles = fs.existsSync(target)
      ? fs.readdirSync(target, { recursive: true, withFileTypes: true })
        .filter((item) => item.isFile())
        .map((item) => path.relative(target, path.join(item.parentPath, item.name)))
        .sort()
      : [];
    const wantedFiles = [...files.keys()].sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(wantedFiles)) {
      throw new Error(`Antigravity package has missing or unexpected files: ${path.relative(root, target)}`);
    }
    for (const [relativePath, expected] of files) {
      const targetPath = path.join(target, relativePath);
      if (!fs.existsSync(targetPath) || !fs.readFileSync(targetPath).equals(Buffer.from(expected))) {
        throw new Error(`Antigravity package is stale: ${path.relative(root, targetPath)}`);
      }
    }
    continue;
  }

  fs.rmSync(target, { recursive: true, force: true });
  for (const [relativePath, contents] of files) {
    const targetPath = path.join(target, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, contents);
  }
}

process.stdout.write(checkOnly ? "Antigravity plugin packages are current.\n" : "Antigravity plugin packages synchronized.\n");
