import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const constantsPath = path.join(root, "docs", "game-constants.js");
const constants = await readFile(constantsPath, "utf8");
const match = constants.match(/const VERSION = "([^"]+)"/);
if (!match) throw new Error(`VERSION not found in ${constantsPath}`);

const [major, minor, patch] = match[1].split(".").map(Number);
if (![major, minor, patch].every(Number.isFinite)) {
  throw new Error(`Invalid VERSION "${match[1]}"`);
}
const versionName = match[1];
const versionCode = major * 10000 + minor * 100 + patch;

const gradlePropsPath = path.join(root, "android", "gradle.properties");
const gradleProps = await readFile(gradlePropsPath, "utf8");
const kspProp = "android.disallowKotlinSourceSets=false";
if (!gradleProps.includes(kspProp)) {
  await writeFile(gradlePropsPath, gradleProps.replace(/\n*$/, "\n") + kspProp + "\n");
}

const gradlePath = path.join(root, "android", "app", "build.gradle");
const gradle = await readFile(gradlePath, "utf8");
const updated = gradle
  .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`)
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
if (updated === gradle) throw new Error(`versionName/versionCode not found in ${gradlePath}`);
await writeFile(gradlePath, updated);

console.log(`Android versionName=${versionName} versionCode=${versionCode}, gradle.properties patched`);
