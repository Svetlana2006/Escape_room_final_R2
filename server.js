import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const submissionsFile = path.join(dataDir, "submissions.json");

const PORT = Number(process.env.PORT) || 3000;
const ACCEPTED_LAST_ANSWERS = new Set([
  "\u0938\u0902\u0915\u0941\u0932 \u0928\u0935\u093e\u091a\u093e\u0930 \u0915\u0947\u0902\u0926\u094d\u0930",
  "C:\\Users\\Svetlana\\ESCAPE_ROOM_Round2",
]);
const ADMIN_CREDENTIALS = {
  teamName: "admin",
  teamLeaderName: "admin",
  email: "svetlana.neogi@gmail.com",
  phone: "9999999999",
};
const ADMIN_TOKEN = randomUUID();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

let writeQueue = Promise.resolve();

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      sendJson(res, 400, { error: "Request URL is missing." });
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (requestUrl.pathname === "/api/session/start" && req.method === "POST") {
      await handleSessionStart(req, res);
      return;
    }

    if (requestUrl.pathname === "/api/session/answer" && req.method === "POST") {
      await handleAnswerSubmit(req, res);
      return;
    }

    if (requestUrl.pathname === "/api/admin/submissions" && req.method === "GET") {
      await handleAdminSubmissions(req, res);
      return;
    }

    if (requestUrl.pathname === "/api/admin/export" && req.method === "GET") {
      await handleAdminExport(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(requestUrl.pathname, res);
      return;
    }

    sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(PORT, async () => {
  await ensureStore();
  console.log(`Escape room server listening on http://localhost:${PORT}`);
});

async function handleSessionStart(req, res) {
  const body = await readJson(req);
  const payload = {
    teamName: normalizeText(body.teamName),
    teamLeaderName: normalizeText(body.teamLeaderName),
    email: normalizeText(body.email),
    phone: normalizeText(body.phone),
  };

  if (!payload.teamName || !payload.teamLeaderName || !payload.email || !payload.phone) {
    sendJson(res, 400, { error: "All fields are required." });
    return;
  }

  if (isAdmin(payload)) {
    sendJson(res, 200, {
      mode: "admin",
      adminToken: ADMIN_TOKEN,
      lastAnswerPrompt: "Admin access granted.",
    });
    return;
  }

  const loggedInAtMs = Date.now();
  const submission = {
    id: randomUUID(),
    teamName: payload.teamName,
    teamLeaderName: payload.teamLeaderName,
    email: payload.email,
    phone: payload.phone,
    loggedInAtMs,
    firstAnswerAttemptAtMs: null,
    solvedAtMs: null,
    durationToFirstAttemptMs: null,
    durationToSolveMs: null,
    answerCorrect: false,
    finalAnswer: null,
  };

  await mutateStore((store) => {
    store.submissions.push(submission);
    return store;
  });

  sendJson(res, 200, {
    mode: "player",
    sessionId: submission.id,
    loggedInAtMs,
    prompt: "Enter the final answer exactly as your team discovered it.",
  });
}

async function handleAnswerSubmit(req, res) {
  const body = await readJson(req);
  const sessionId = normalizeText(body.sessionId);
  const answer = normalizeAnswer(body.answer);

  if (!sessionId || !answer) {
    sendJson(res, 400, { error: "Session and answer are required." });
    return;
  }

  let outcome = null;

  await mutateStore((store) => {
    const submission = store.submissions.find((entry) => entry.id === sessionId);

    if (!submission) {
      outcome = { status: 404, payload: { error: "Session not found." } };
      return store;
    }

    const now = Date.now();

    if (!submission.firstAnswerAttemptAtMs) {
      submission.firstAnswerAttemptAtMs = now;
      submission.durationToFirstAttemptMs = now - submission.loggedInAtMs;
    }

    if (ACCEPTED_LAST_ANSWERS.has(answer)) {
      submission.answerCorrect = true;
      submission.finalAnswer = answer;
      submission.solvedAtMs = now;
      submission.durationToSolveMs = now - submission.loggedInAtMs;
      outcome = {
        status: 200,
        payload: {
          success: true,
          loggedInAtMs: submission.loggedInAtMs,
          firstAnswerAttemptAtMs: submission.firstAnswerAttemptAtMs,
          solvedAtMs: submission.solvedAtMs,
        },
      };
      return store;
    }

    submission.finalAnswer = answer;
    outcome = {
      status: 400,
      payload: {
        error: "That answer does not unlock the final gate.",
        firstAnswerAttemptAtMs: submission.firstAnswerAttemptAtMs,
      },
    };
    return store;
  });

  sendJson(res, outcome.status, outcome.payload);
}

async function handleAdminSubmissions(req, res) {
  if (!isAuthorizedAdmin(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  const store = await readStore();
  const submissions = [...store.submissions].sort((left, right) => right.loggedInAtMs - left.loggedInAtMs);
  sendJson(res, 200, { submissions });
}

async function handleAdminExport(req, res) {
  if (!isAuthorizedAdmin(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  const store = await readStore();
  const rows = store.submissions
    .map(
      (submission) => `
        <tr>
          <td>${escapeHtmlText(submission.teamName)}</td>
          <td>${escapeHtmlText(submission.teamLeaderName)}</td>
          <td>${escapeHtmlText(submission.email)}</td>
          <td>${escapeHtmlText(submission.phone)}</td>
          <td>${escapeHtmlText(formatExactTimestamp(submission.loggedInAtMs))}</td>
          <td>${escapeHtmlText(formatExactTimestamp(submission.firstAnswerAttemptAtMs))}</td>
          <td>${escapeHtmlText(formatExactTimestamp(submission.solvedAtMs))}</td>
          <td>${escapeHtmlText(submission.durationToFirstAttemptMs ?? "")}</td>
          <td>${escapeHtmlText(submission.durationToSolveMs ?? "")}</td>
          <td>${escapeHtmlText(submission.answerCorrect ? "Yes" : "No")}</td>
          <td>${escapeHtmlText(submission.finalAnswer ?? "")}</td>
        </tr>
      `
    )
    .join("");

  const workbookHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Escape Room Submissions</title>
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>
          <th>Team Name</th>
          <th>Team Leader Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Login Date And Time</th>
          <th>First Answer Date And Time</th>
          <th>Solved Date And Time</th>
          <th>Duration To First Attempt (ms)</th>
          <th>Duration To Solve (ms)</th>
          <th>Answer Correct</th>
          <th>Final Answer</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;

  res.writeHead(200, {
    "Content-Type": "application/vnd.ms-excel; charset=utf-8",
    "Content-Disposition": 'attachment; filename="escape-room-submissions.xls"',
    "Cache-Control": "no-store",
  });
  res.end(workbookHtml);
}

async function serveStatic(requestPath, res) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(file);
  } catch {
    const fallback = await fs.readFile(path.join(publicDir, "index.html"));
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(fallback);
  }
}

function isAdmin(payload) {
  return (
    payload.teamName === ADMIN_CREDENTIALS.teamName &&
    payload.teamLeaderName === ADMIN_CREDENTIALS.teamLeaderName &&
    payload.email === ADMIN_CREDENTIALS.email &&
    payload.phone === ADMIN_CREDENTIALS.phone
  );
}

function isAuthorizedAdmin(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(submissionsFile);
  } catch {
    await fs.writeFile(submissionsFile, JSON.stringify({ submissions: [] }, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(submissionsFile, "utf8");
  return JSON.parse(raw);
}

function mutateStore(mutator) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    const nextStore = (await mutator(store)) || store;
    await fs.writeFile(submissionsFile, JSON.stringify(nextStore, null, 2), "utf8");
    return nextStore;
  });

  return writeQueue;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAnswer(value) {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/g, " ")
    : "";
}

function escapeHtmlText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatExactTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.${milliseconds} IST`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}
