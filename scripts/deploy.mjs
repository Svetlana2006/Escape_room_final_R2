import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_URL = "https://github.com/Svetlana2006/Escape_room_final_R2.git";
const GH_PAGES_BIN = process.platform === "win32"
  ? path.resolve("node_modules", ".bin", "gh-pages.cmd")
  : path.resolve("node_modules", ".bin", "gh-pages");
const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { capture: true }).trim();

if (branch !== "main") {
  fail(`Deploy from the main branch only. Current branch: ${branch}`);
}

const status = run("git", ["status", "--porcelain"], { capture: true }).trim();

if (status) {
  fail("Working tree is not clean. Commit your changes before running npm run deploy.");
}

console.log("Pushing main to GitHub for Render auto-deploy...");
run("git", ["push", "origin", "main"]);

console.log("Publishing public/ to gh-pages...");
run(GH_PAGES_BIN, ["-d", "public", "-r", REPO_URL]);

console.log("Deploy finished.");
console.log("Render will auto-deploy the pushed main commit if Auto-Deploy is enabled for the service.");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: false,
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(output || `${command} failed with exit code ${result.status}.`);
  }

  return result.stdout || "";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
