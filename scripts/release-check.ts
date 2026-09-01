import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  publishConfig?: { access?: string };
};

if (pkg.private) throw new Error("package must not be private");
if (pkg.version === "0.0.0")
  throw new Error("set a release version before publishing");
if (pkg.publishConfig?.access !== "public")
  throw new Error("scoped package must publish publicly");
for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
  if (/^(file:|workspace:|link:)/.test(range))
    throw new Error(`${name} uses local-only dependency ${range}`);
}
if (pkg.peerDependencies?.["@kokoa/clotho"] !== "^0.1.0") {
  throw new Error("editor peer range must match the first clotho release line");
}

const output = Bun.spawnSync(["bun", "pm", "pack", "--dry-run"], {
  cwd: root,
  stdout: "pipe",
  stderr: "pipe",
});
if (output.exitCode !== 0) throw new Error(output.stderr.toString());
const listing = output.stdout.toString();
for (const required of [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/clotho-editor.css",
]) {
  if (!listing.includes(required))
    throw new Error(`packed artifact is missing ${required}`);
}

console.log(
  `release check OK — @kokoa/clotho-editor@${pkg.version} is publishable`,
);
