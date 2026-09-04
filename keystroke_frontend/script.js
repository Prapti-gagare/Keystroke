// ============================================================
// CONFIG
// ============================================================
const API_BASE = "https://keystroke-zs6y.onrender.com";; // change this after deploying backend to Render

// ============================================================
// STATE
// ============================================================
let candidateId = null;
let questions = [];
// per-question tracking state, keyed by question_id
const trackers = {};
let overallTimerInterval = null;
let overallStartTime = null;

// ============================================================
// DOM ELEMENTS
// ============================================================
const introScreen = document.getElementById("intro-screen");
const testScreen = document.getElementById("test-screen");
const doneScreen = document.getElementById("done-screen");
const questionsContainer = document.getElementById("questions-container");
const startBtn = document.getElementById("start-btn");
const submitBtn = document.getElementById("submit-btn");
const introError = document.getElementById("intro-error");
const submitError = document.getElementById("submit-error");
const overallTimerEl = document.getElementById("overall-timer");

// ============================================================
// STEP 1: START — create candidate, fetch questions, render page
// ============================================================
startBtn.addEventListener("click", async () => {
  const name = document.getElementById("candidate-name").value.trim();
  const email = document.getElementById("candidate-email").value.trim();

  if (!name || !email) {
    introError.textContent = "Please enter your name and email.";
    return;
  }

  startBtn.disabled = true;
  introError.textContent = "";

  try {
    // create candidate record
    const candRes = await fetch(`${API_BASE}/candidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });
    if (!candRes.ok) throw new Error("Could not create candidate");
    const candidate = await candRes.json();
    candidateId = candidate.candidate_id;

    // fetch the 10 questions
    const qRes = await fetch(`${API_BASE}/questions`);
    if (!qRes.ok) throw new Error("Could not load questions");
    questions = await qRes.json();

    renderQuestions(questions);
    introScreen.classList.add("hidden");
    testScreen.classList.remove("hidden");
    startOverallTimer();
  } catch (err) {
    introError.textContent = "Something went wrong. Please try again.";
    startBtn.disabled = false;
    console.error(err);
  }
});

function startOverallTimer() {
  overallStartTime = Date.now();
  overallTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - overallStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    overallTimerEl.textContent = `${mins}:${secs}`;
  }, 1000);
}

// ============================================================
// STEP 2: RENDER QUESTIONS + ATTACH TRACKING
// ============================================================
function renderQuestions(qs) {
  questionsContainer.innerHTML = "";

  qs.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "q-card";
    card.innerHTML = `
      <div class="q-head">
        <span class="q-number">Question ${idx + 1} of ${qs.length}</span>
        <span class="q-status" id="status-${q.question_id}">answered</span>
      </div>
      <p class="q-text">${escapeHtml(q.question_text)}</p>
      <textarea class="q-textarea" id="answer-${q.question_id}"
        placeholder="Type your answer here (about 6-7 lines)..."></textarea>
    `;
    questionsContainer.appendChild(card);

    initTracker(q.question_id);
    attachListeners(q.question_id);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// STEP 3: PER-QUESTION TRACKING LOGIC
// ============================================================
function initTracker(questionId) {
  trackers[questionId] = {
    backspaceCount: 0,
    pasteCount: 0,
    pasteWordCount: 0,
    tabSwitchCount: 0,
    keystrokeLog: [],       // [{key, t}] relative timestamps in ms
    startTime: null,        // set on first keystroke/focus
    lastKeyTime: null,
    charCount: 0,           // total chars typed via keydown (not pasted)
    endTime: null
  };
}

function attachListeners(questionId) {
  const textarea = document.getElementById(`answer-${questionId}`);
  const statusEl = document.getElementById(`status-${questionId}`);
  const t = trackers[questionId];

  // start the per-question timer on first interaction
  const ensureStarted = () => {
    if (t.startTime === null) {
      t.startTime = Date.now();
    }
  };

  textarea.addEventListener("keydown", (e) => {
    ensureStarted();
    const now = Date.now();
    t.keystrokeLog.push({ key: e.key, t: now - t.startTime });
    t.lastKeyTime = now;

    if (e.key === "Backspace" || e.key === "Delete") {
      t.backspaceCount++;
    } else if (e.key.length === 1) {
      // a single printable character (letters, numbers, punctuation, space)
      t.charCount++;
    }
  });

  textarea.addEventListener("paste", (e) => {
    ensureStarted();
    t.pasteCount++;
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const wordCount = pasted.trim().split(/\s+/).filter(Boolean).length;
    t.pasteWordCount += wordCount;
  });

  textarea.addEventListener("input", () => {
    t.endTime = Date.now();
    statusEl.classList.toggle("visible", textarea.value.trim().length > 0);
  });

  // tab switch / window blur — tracked globally, but we log against
  // whichever question is currently focused
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && document.activeElement === textarea) {
      t.tabSwitchCount++;
    }
  });
}

// ============================================================
// STEP 4: COMPUTE METRICS FOR ONE QUESTION
// ============================================================
function computeMetrics(questionId) {
  const textarea = document.getElementById(`answer-${questionId}`);
  const t = trackers[questionId];
  const answerText = textarea.value;

  const start = t.startTime || Date.now();
  const end = t.endTime || start;
  const timeTakenSeconds = Math.max((end - start) / 1000, 0.1);

  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
  const typingSpeedWpm = (wordCount / timeTakenSeconds) * 60;

  return {
    candidate_id: candidateId,
    question_id: questionId,
    answer_text: answerText,
    typing_speed_wpm: Math.round(typingSpeedWpm * 100) / 100,
    backspace_count: t.backspaceCount,
    paste_count: t.pasteCount,
    paste_word_count: t.pasteWordCount,
    tab_switch_count: t.tabSwitchCount,
    time_taken_seconds: Math.round(timeTakenSeconds * 100) / 100,
    keystroke_log: t.keystrokeLog
  };
}

// ============================================================
// STEP 5: SUBMIT ALL ANSWERS
// ============================================================
submitBtn.addEventListener("click", async () => {
  submitBtn.disabled = true;
  submitError.textContent = "";

  try {
    const payloads = questions.map(q => computeMetrics(q.question_id));

    // send one request per question response
    for (const payload of payloads) {
      const res = await fetch(`${API_BASE}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to submit a response");
    }

    clearInterval(overallTimerInterval);
    testScreen.classList.add("hidden");
    doneScreen.classList.remove("hidden");
  } catch (err) {
    submitError.textContent = "Submission failed. Please try again.";
    submitBtn.disabled = false;
    console.error(err);
  }
});