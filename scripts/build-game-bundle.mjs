// Bundles the pure game logic (docs/game-*.js) into a single IIFE that the
// Android plugin evaluates with Rhino to recompute the widget ranking while
// the app is closed. Regenerate with: npm run build:game-bundle
// (also runs as part of `npm run cap:sync`, so CI builds always bundle fresh).
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const out = "plugins/todo-assistant/android/src/main/assets/game-bundle.js";
mkdirSync(dirname(out), { recursive: true });

await build({
  entryPoints: ["docs/game.js"],
  bundle: true,
  format: "iife",
  globalName: "GameBundle",
  target: "es2015", // lowered so Rhino (VERSION_ES6) can run it
  outfile: out,
  logLevel: "info",
});
console.log("wrote", out);
