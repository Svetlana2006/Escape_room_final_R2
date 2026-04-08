const app = document.getElementById("app");
const API_BASE_URL = window.ESCAPE_ROOM_CONFIG?.apiBaseUrl || window.location.origin;

const storageKeys = {
  adminToken: "escape-room-admin-token",
  sessionId: "escape-room-session-id",
  playerState: "escape-room-player-state",
  playerTimes: "escape-room-player-times",
};

const state = {
  view: "login",
  pending: false,
  loginMessage: "",
  answerMessage: "",
  keyMessage: "",
  sessionId: "",
  adminToken: "",
  prompt: "Enter the final answer exactly as your team discovered it.",
  playerTimes: null,
  submissions: [],
  dashboardMessage: "",
};

restoreState();
render();

if (state.view === "admin") {
  loadDashboard();
}

function restoreState() {
  const adminToken = sessionStorage.getItem(storageKeys.adminToken);
  const sessionId = sessionStorage.getItem(storageKeys.sessionId);
  const playerState = sessionStorage.getItem(storageKeys.playerState);
  const playerTimes = sessionStorage.getItem(storageKeys.playerTimes);

  if (adminToken) {
    state.adminToken = adminToken;
    state.view = "admin";
    return;
  }

  if (sessionId) {
    state.sessionId = sessionId;
    state.playerTimes = playerTimes ? JSON.parse(playerTimes) : null;
    state.view = ["success", "key"].includes(playerState) ? playerState : "player";
  }
}

function render() {
  if (!app) return;

  app.innerHTML = `
    <section class="page-shell">
      <div class="hero-panel">
        <div class="eyebrow">CONVOKE 8.0 SIGNAL ARCHIVE</div>
        <h1 class="title" data-text="RIFT REGISTRY">RIFT REGISTRY</h1>
        <p class="lead">
          A final checkpoint stitched together from the Puzzle Arena dread and the
          Stranger Things signal-room mood. Every team leaves a trace. Every trace keeps time.
        </p>
      </div>
      <div class="panel-frame">
        ${renderView()}
      </div>
    </section>
  `;

  bindEvents();
}

function renderView() {
  if (state.view === "admin") return renderAdmin();
  if (state.view === "player") return renderPlayerQuestion();
  if (state.view === "key") return renderKeyQuestion();
  if (state.view === "success") return renderSuccess();
  return renderLogin();
}

function renderLogin() {
  return `
    <section class="panel glass-panel">
      <div class="classified-stamp">CLASSIFIED</div>
      <div class="panel-heading">
        <div class="gate-label">Entry Protocol</div>
        <h2>Open The Registry</h2>
        <p>Enter your team details to unlock the final checkpoint.</p>
      </div>
      <form id="login-form" class="stack-form">
        <label>
          <span>Team Name</span>
          <input name="teamName" type="text" placeholder="Team name" autocomplete="off" required />
        </label>
        <label>
          <span>Team Leader Name</span>
          <input name="teamLeaderName" type="text" placeholder="Team leader" autocomplete="off" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" placeholder="leader@email.com" autocomplete="off" required />
        </label>
        <label>
          <span>Phone Number</span>
          <input name="phone" type="tel" placeholder="10 digit phone number" autocomplete="off" required />
        </label>
        <button class="action-button" type="submit" ${state.pending ? "disabled" : ""}>
          ${state.pending ? "Opening..." : "Enter The Rift"}
        </button>
      </form>
      <p class="feedback ${state.loginMessage.startsWith("error:") ? "error" : ""}">
        ${escapeHtml(cleanFeedback(state.loginMessage))}
      </p>
    </section>
  `;
}

function renderPlayerQuestion() {
  return `
    <section class="panel glass-panel">
      <div class="panel-heading">
        <div class="gate-label">Final Gate</div>
        <h2>State The Last Answer</h2>
        <p>${escapeHtml(state.prompt)}</p>
      </div>
      <form id="answer-form" class="stack-form">
        <label>
          <span>Last Answer</span>
          <input name="answer" type="text" placeholder="Type the exact answer" autocomplete="off" required />
        </label>
        <button class="action-button" type="submit" ${state.pending ? "disabled" : ""}>
          ${state.pending ? "Recording..." : "Seal The Answer"}
        </button>
      </form>
      <p class="feedback ${state.answerMessage.startsWith('error:') ? 'error' : ''}">
        ${escapeHtml(cleanFeedback(state.answerMessage))}
      </p>
    </section>
  `;
}

function renderKeyQuestion() {
  return `
    <section class="panel glass-panel" style="max-width: 600px;">
      <div class="panel-heading">
        <div class="gate-label">Final Interrogation</div>
        <h2>Review The Transcript</h2>
        <p>A fragmented recording was recovered. Read it carefully.</p>
      </div>
      <div class="transcript-box" style="background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; margin-bottom: 1.5rem; border-left: 2px solid cyan; text-align: left; line-height: 1.4;">CASE FILE: 44-D
Recording Begins

Officer: Where were you last night?
Suspect: There are moments you don’t realize you’re being seen.
Officer: Answer properly.
Suspect: It’s already too late for proper answers.
Officer: A man was killed at 9 PM.
Suspect: What matters isn’t when… it’s how long.
Officer: No one entered the room.
Suspect: He believed that too.
Officer: Then how did it happen?
Suspect: Ask yourself what you missed.
Officer: Missed what?
Suspect: Very small things tend to matter most.
Officer: You’re not helping.
Suspect: Everything I say is help.
Officer: Did you know the victim?
Suspect: Not the way you understand knowing.
Officer: Then how?
Suspect: Guessing won’t get you there.
Officer: Stop speaking in riddles.
Suspect: Because you’re not ready for clarity.
Officer: Try me.
Suspect: Even now, you’re ignoring the obvious.
Officer: What obvious thing?
Suspect: Eyes tend to look outward, not inward.
Officer: What are you implying?
Suspect: Once you see it, it’s hard to breathe.
Officer: See what?
Suspect: Until then, it stays simple.
Officer: Simple how?
Suspect: He thought he was alone.
Officer: And?
Suspect: And that was his mistake.
Officer: You’re enjoying this.
Suspect: In a way, yes.
Officer: Why?
Suspect: Now you’re starting to understand.
Officer: Understand what?
Suspect: You’re closer than you think.
Officer: Closer to what?
Suspect: Every answer you need is already here.

Recording Ends</div>
      <form id="key-form" class="stack-form">
        <label>
          <span>Extract the Key</span>
          <input name="key" type="text" placeholder="Enter the key..." autocomplete="off" required />
        </label>
        <button class="action-button" type="submit" ${state.pending ? "disabled" : ""}>
          ${state.pending ? "Verifying..." : "Submit Key"}
        </button>
      </form>
      <p class="feedback ${state.keyMessage.startsWith('error:') ? 'error' : ''}">
        ${escapeHtml(cleanFeedback(state.keyMessage))}
      </p>
    </section>
  `;
}

function renderSuccess() {
  const loggedIn = state.playerTimes?.loggedInAtMs ? formatExactTimestamp(state.playerTimes.loggedInAtMs) : "Recorded";
  const firstAttempt = state.playerTimes?.firstAnswerAttemptAtMs ? formatExactTimestamp(state.playerTimes.firstAnswerAttemptAtMs) : "Recorded";
  const solvedAt = state.playerTimes?.solvedAtMs ? formatExactTimestamp(state.playerTimes.solvedAtMs) : "Recorded";
  const keySolvedAt = state.playerTimes?.keySolvedAtMs ? formatExactTimestamp(state.playerTimes.keySolvedAtMs) : "Recorded";

  return `
    <section class="panel success-panel">
      <div class="gate-label">Signal Logged</div>
      <h2>Response Archived</h2>
      <p>Your login and answer timestamps have been written to the watcher console.</p>
      <div class="metrics-grid">
        <article class="metric-card">
          <span>Login</span>
          <strong>${escapeHtml(String(loggedIn))}</strong>
        </article>
        <article class="metric-card">
          <span>First Response</span>
          <strong>${escapeHtml(String(firstAttempt))}</strong>
        </article>
        <article class="metric-card">
          <span>Puzzle Solved</span>
          <strong>${escapeHtml(String(solvedAt))}</strong>
        </article>
        <article class="metric-card">
          <span>Key Verified</span>
          <strong>${escapeHtml(String(keySolvedAt))}</strong>
        </article>
      </div>
      <button id="reset-player" class="ghost-button" type="button">Start A New Entry</button>
    </section>
  `;
}

function renderAdmin() {
  const totalTeams = state.submissions.length;
  const solvedTeams = state.submissions.filter((item) => item.answerCorrect).length;
  const fastest = state.submissions
    .filter((item) => typeof item.durationToSolveMs === "number")
    .sort((left, right) => left.durationToSolveMs - right.durationToSolveMs)[0];

  return `
    <section class="panel dashboard-panel">
      <div class="panel-heading">
        <div class="gate-label">Watcher Console</div>
        <h2>Admin Dashboard</h2>
        <p>Review every login, answer timestamp, and final response from the backend store.</p>
      </div>
      <div class="metrics-grid admin-metrics">
        <article class="metric-card">
          <span>Total Teams</span>
          <strong>${totalTeams}</strong>
        </article>
        <article class="metric-card">
          <span>Solved</span>
          <strong>${solvedTeams}</strong>
        </article>
        <article class="metric-card">
          <span>Fastest Solve</span>
          <strong>${fastest ? `${escapeHtml(fastest.teamName)} - ${fastest.durationToSolveMs} ms` : "Pending"}</strong>
        </article>
      </div>
      <div class="dashboard-actions">
        <button id="refresh-dashboard" class="action-button" type="button">Refresh</button>
        <button id="export-dashboard" class="ghost-button" type="button">Export To Excel</button>
        <button id="logout-admin" class="ghost-button" type="button">Logout</button>
      </div>
      <p class="feedback ${state.dashboardMessage.startsWith("error:") ? "error" : ""}">
        ${escapeHtml(cleanFeedback(state.dashboardMessage))}
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Leader</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Login Date And Time</th>
              <th>First Response Date And Time</th>
              <th>Solved Date And Time</th>
              <th>Answer</th>
              <th>Correct</th>
              <th>Key Attempted</th>
              <th>Key Solved</th>
              <th>Key Correct</th>
              <th>Final Key</th>
            </tr>
          </thead>
          <tbody>
            ${
              state.submissions.length
                ? state.submissions
                    .map(
                      (item) => `
                        <tr>
                          <td>${escapeHtml(item.teamName)}</td>
                          <td>${escapeHtml(item.teamLeaderName)}</td>
                          <td>${escapeHtml(item.email)}</td>
                          <td>${escapeHtml(item.phone)}</td>
                          <td>${escapeHtml(formatExactTimestamp(item.loggedInAtMs))}</td>
                          <td>${escapeHtml(formatExactTimestamp(item.firstAnswerAttemptAtMs))}</td>
                          <td>${escapeHtml(formatExactTimestamp(item.solvedAtMs))}</td>
                          <td>${escapeHtml(item.finalAnswer || "-")}</td>
                          <td>${item.answerCorrect ? "Yes" : "No"}</td>
                          <td>${escapeHtml(formatExactTimestamp(item.keyAttemptAtMs))}</td>
                          <td>${escapeHtml(formatExactTimestamp(item.keySolvedAtMs))}</td>
                          <td>${item.keyCorrect ? "Yes" : "No"}</td>
                          <td>${escapeHtml(item.finalKey || "-")}</td>
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="13" class="empty-state">No submissions yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function bindEvents() {
  document.getElementById("login-form")?.addEventListener("submit", handleLoginSubmit);
  document.getElementById("answer-form")?.addEventListener("submit", handleAnswerSubmit);
  document.getElementById("key-form")?.addEventListener("submit", handleKeySubmit);
  document.getElementById("refresh-dashboard")?.addEventListener("click", () => loadDashboard(true));
  document.getElementById("export-dashboard")?.addEventListener("click", exportDashboard);
  document.getElementById("logout-admin")?.addEventListener("click", logoutAdmin);
  document.getElementById("reset-player")?.addEventListener("click", resetPlayerSession);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  state.pending = true;
  state.loginMessage = "";
  render();

  try {
    const response = await fetch(apiUrl("/api/session/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName: form.get("teamName"),
        teamLeaderName: form.get("teamLeaderName"),
        email: form.get("email"),
        phone: form.get("phone"),
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to enter the registry.");

    if (payload.mode === "admin") {
      state.adminToken = payload.adminToken;
      state.view = "admin";
      state.pending = false;
      state.dashboardMessage = "Admin access granted.";
      sessionStorage.setItem(storageKeys.adminToken, payload.adminToken);
      sessionStorage.removeItem(storageKeys.sessionId);
      sessionStorage.removeItem(storageKeys.playerState);
      sessionStorage.removeItem(storageKeys.playerTimes);
      render();
      await loadDashboard();
      return;
    }

    state.sessionId = payload.sessionId;
    state.view = "player";
    state.pending = false;
    state.prompt = payload.prompt;
    state.loginMessage = "";
    state.answerMessage = "";
    state.keyMessage = "";
    state.playerTimes = { loggedInAtMs: payload.loggedInAtMs };
    sessionStorage.setItem(storageKeys.sessionId, payload.sessionId);
    sessionStorage.setItem(storageKeys.playerState, "player");
    sessionStorage.setItem(storageKeys.playerTimes, JSON.stringify(state.playerTimes));
    render();
  } catch (error) {
    state.pending = false;
    state.loginMessage = `error: ${error.message}`;
    render();
  }
}

async function handleAnswerSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  state.pending = true;
  state.answerMessage = "";
  render();

  try {
    const response = await fetch(apiUrl("/api/session/answer"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: state.sessionId,
        answer: form.get("answer"),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      state.pending = false;
      state.playerTimes = {
        ...state.playerTimes,
        firstAnswerAttemptAtMs: payload.firstAnswerAttemptAtMs ?? state.playerTimes?.firstAnswerAttemptAtMs,
      };
      sessionStorage.setItem(storageKeys.playerTimes, JSON.stringify(state.playerTimes));
      state.answerMessage = `error: ${payload.error || "That answer is incorrect."}`;
      render();
      return;
    }

    state.pending = false;
    state.view = "key";
    state.playerTimes = {
      loggedInAtMs: payload.loggedInAtMs,
      firstAnswerAttemptAtMs: payload.firstAnswerAttemptAtMs,
      solvedAtMs: payload.solvedAtMs,
    };
    sessionStorage.setItem(storageKeys.playerState, "key");
    sessionStorage.setItem(storageKeys.playerTimes, JSON.stringify(state.playerTimes));
    render();
  } catch (error) {
    state.pending = false;
    state.answerMessage = `error: ${error.message}`;
    render();
  }
}

async function handleKeySubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  state.pending = true;
  state.keyMessage = "";
  render();

  try {
    const response = await fetch(apiUrl("/api/session/key"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: state.sessionId,
        key: form.get("key"),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      state.pending = false;
      state.keyMessage = `error: ${payload.error || "That key is incorrect."}`;
      render();
      return;
    }

    state.pending = false;
    state.view = "success";
    state.playerTimes = {
      ...state.playerTimes,
      keySolvedAtMs: payload.keySolvedAtMs,
    };
    sessionStorage.setItem(storageKeys.playerState, "success");
    sessionStorage.setItem(storageKeys.playerTimes, JSON.stringify(state.playerTimes));
    render();
  } catch (error) {
    state.pending = false;
    state.keyMessage = `error: ${error.message}`;
    render();
  }
}

async function loadDashboard(showRefreshMessage = false) {
  if (!state.adminToken) {
    state.view = "login";
    render();
    return;
  }

  try {
    const response = await fetch(apiUrl("/api/admin/submissions"), {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");

    state.submissions = payload.submissions;
    state.dashboardMessage = showRefreshMessage ? "Dashboard refreshed." : state.dashboardMessage;
    render();
  } catch (error) {
    state.dashboardMessage = `error: ${error.message}`;
    if (error.message === "Unauthorized.") {
      logoutAdmin();
      return;
    }
    render();
  }
}

async function exportDashboard() {
  try {
    const response = await fetch(apiUrl("/api/admin/export"), {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Unable to export submissions.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "escape-room-submissions.xls";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    state.dashboardMessage = "Excel export downloaded.";
    render();
  } catch (error) {
    state.dashboardMessage = `error: ${error.message}`;
    render();
  }
}

function logoutAdmin() {
  state.adminToken = "";
  state.submissions = [];
  state.dashboardMessage = "";
  state.view = "login";
  sessionStorage.removeItem(storageKeys.adminToken);
  sessionStorage.removeItem(storageKeys.playerTimes);
  render();
}

function resetPlayerSession() {
  state.sessionId = "";
  state.playerTimes = null;
  state.answerMessage = "";
  state.loginMessage = "";
  state.view = "login";
  sessionStorage.removeItem(storageKeys.sessionId);
  sessionStorage.removeItem(storageKeys.playerState);
  sessionStorage.removeItem(storageKeys.playerTimes);
  render();
}

function formatExactTimestamp(value) {
  if (!value) return "Pending";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanFeedback(value) {
  return value.replace(/^error:\s*/i, "");
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
