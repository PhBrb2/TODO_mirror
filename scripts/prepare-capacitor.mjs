import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = path.join(root, "docs", "vendor", "capacitor");
const plugins = ["local-notifications", "haptics"];

await rm(vendorDir, { recursive: true, force: true });
await mkdir(vendorDir, { recursive: true });

await cp(
  path.join(root, "node_modules", "@capacitor", "core", "dist", "index.js"),
  path.join(vendorDir, "core.js")
);

for (const plugin of plugins) {
  const src = path.join(root, "node_modules", "@capacitor", plugin, "dist", "esm");
  const dest = path.join(vendorDir, plugin);
  await mkdir(dest, { recursive: true });
  for (const file of await readdir(src)) {
    if (file.endsWith(".js")) await cp(path.join(src, file), path.join(dest, file));
  }
}

console.log(`Vendored Capacitor web runtime into ${path.relative(root, vendorDir)}`);
