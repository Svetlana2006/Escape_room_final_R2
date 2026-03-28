import { spawnSync } from "node:child_process";

const REPO_URL = "https://github.com/Svetlana2006/Escape_room_final_R2.git";
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
run(bin("npx"), ["gh-pages", "-d", "public", "-r", REPO_URL]);

console.log("Deploy finished.");
console.log("Render will auto-deploy the pushed main commit if Auto-Deploy is enabled for the service.");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(output || `${command} failed with exit code ${result.status}.`);
  }

  return result.stdout || "";
}

function bin(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
