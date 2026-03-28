import { spawnSync } from "node:child_process";
import ghpages from "gh-pages";

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
await publishPages();

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

function publishPages() {
  return new Promise((resolve, reject) => {
    ghpages.publish(
      "public",
      {
        repo: REPO_URL,
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );
  }).catch((error) => fail(error.message || "gh-pages publish failed."));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
