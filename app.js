const STORAGE_KEY = "my-gym-training-v3";
const TOKEN_KEY = "my-gym-training-github-token";
const REPOSITORY = "dieu-detruit/my-gym-training";
const TARGET_BRANCH = "main";

const exercises = [
  { id: "ez-bar-curl", name: "EZ BAR CURL", jp: "EZバーカール", target: "3 SETS", guide: "反動なし。下ろしを2〜3秒。", weight: 20, reps: 10 },
  { id: "overhead-extension", name: "OVERHEAD EXTENSION", jp: "ケーブル・オーバーヘッド", target: "3 SETS", guide: "ロープを斜め前上へ。肘は頭の横。", weight: 10, reps: 12 },
  { id: "hammer-curl", name: "HAMMER CURL", jp: "ハンマーカール", target: "3 SETS", guide: "親指を上。重量は片手分。", weight: 7, reps: 12 },
  { id: "rope-pushdown", name: "ROPE PUSHDOWN", jp: "ローププレスダウン", target: "3 SETS", guide: "肘を脇腹に固定。背中で押さない。", weight: 12.5, reps: 12 },
];

const today = () => new Date().toLocaleDateString("sv-SE");

const initialState = () => ({
  date: today(),
  startedAt: new Date().toISOString(),
  lastSavedPath: "",
  exercises: exercises.map((exercise) => ({
    ...exercise,
    sets: Array.from({ length: 3 }, () => ({
      weight: String(exercise.weight),
      reps: String(exercise.reps),
      note: "",
      completed: false,
    })),
  })),
});

let state = load();
const list = document.querySelector("#exercise-list");
const dateInput = document.querySelector("#date");
const status = document.querySelector("#status");
const settings = document.querySelector("#github-settings");
const tokenInput = document.querySelector("#github-token");

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved || initialState();
  } catch {
    return initialState();
  }
}

function save(message = "保存しました") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  status.textContent = message;
  renderMetrics();
}

function completedSets() {
  return state.exercises.flatMap((exercise) =>
    exercise.sets
      .map((set, index) => ({ exercise, set, setNumber: index + 1 }))
      .filter(({ set }) => set.completed),
  );
}

function totalVolume() {
  return completedSets().reduce(
    (total, { set }) => total + Number(set.weight) * Number(set.reps),
    0,
  );
}

function renderMetrics() {
  document.querySelector("#progress-count").textContent = String(completedSets().length);
  document.querySelector("#volume").textContent = `${Math.round(totalVolume()).toLocaleString()} kg`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  dateInput.value = state.date;
  list.replaceChildren();

  state.exercises.forEach((exercise, exerciseIndex) => {
    const card = document.createElement("section");
    card.className = "exercise-card";
    card.innerHTML = `
      <div class="exercise-head">
        <div>
          <p class="exercise-code">0${exerciseIndex + 1}</p>
          <h2>${exercise.name}</h2>
          <p class="exercise-jp">${exercise.jp}</p>
        </div>
        <span class="set-badge">${exercise.target}</span>
      </div>
      <p class="guide">${exercise.guide}</p>
      <div class="set-list"></div>`;

    const setList = card.querySelector(".set-list");
    exercise.sets.forEach((set, setIndex) => {
      const row = document.createElement("div");
      row.className = `set-row ${set.completed ? "is-complete" : ""}`;
      row.innerHTML = `
        <div class="set-number">SET <strong>${setIndex + 1}</strong></div>
        <label class="number-field">
          <span>KG</span>
          <input inputmode="decimal" value="${escapeHtml(set.weight)}" aria-label="重量" />
        </label>
        <label class="number-field">
          <span>REPS</span>
          <input inputmode="numeric" value="${escapeHtml(set.reps)}" aria-label="回数" />
        </label>
        <button class="done-button ${set.completed ? "active" : ""}">${set.completed ? "DONE ✓" : "DONE"}</button>
        <input class="note" value="${escapeHtml(set.note)}" placeholder="メモ" aria-label="メモ" />`;

      const [weightInput, repsInput, noteInput] = row.querySelectorAll("input");
      weightInput.addEventListener("input", (event) => updateSet(set, "weight", event.target.value));
      repsInput.addEventListener("input", (event) => updateSet(set, "reps", event.target.value));
      noteInput.addEventListener("input", (event) => updateSet(set, "note", event.target.value));
      row.querySelector("button").addEventListener("click", () => toggleComplete(exerciseIndex, setIndex));
      setList.append(row);
    });
    list.append(card);
  });

  renderMetrics();
}

function updateSet(set, field, value) {
  set[field] = value;
  state.lastSavedPath = "";
  save();
}

function toggleComplete(exerciseIndex, setIndex) {
  const exercise = state.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  if (!set.weight || !set.reps) {
    save("重量と回数を入力してください");
    return;
  }

  set.completed = !set.completed;
  state.lastSavedPath = "";
  save(set.completed ? `${exercise.jp} SET ${setIndex + 1} 完了` : "完了を取り消しました");
  render();
}

function workoutData() {
  const finishedAt = new Date().toISOString();
  const completed = completedSets();
  return {
    schemaVersion: 1,
    date: state.date,
    session: "Day A",
    focus: "arm hypertrophy",
    startedAt: state.startedAt,
    finishedAt,
    summary: {
      completedSets: completed.length,
      plannedSets: 12,
      totalVolumeKg: Math.round(totalVolume() * 10) / 10,
    },
    exercises: state.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.jp,
      sets: exercise.sets
        .map((set, index) => ({
          setNumber: index + 1,
          weightKg: Number(set.weight),
          reps: Number(set.reps),
          note: set.note,
          completed: set.completed,
        }))
        .filter((set) => set.completed),
    })),
  };
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function archivePath() {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return `data/workouts/${state.date}/session-${timestamp}.json`;
}

async function saveToGitHub() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    settings.open = true;
    tokenInput.focus();
    save("最初にGitHubトークンを設定してください");
    return;
  }

  const data = workoutData();
  if (data.summary.completedSets === 0) {
    save("完了したセットがありません");
    return;
  }

  const path = archivePath();
  const button = document.querySelector("#save-github");
  button.disabled = true;
  button.textContent = "SAVING...";
  save("GitHubへ保存しています...");

  try {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/contents/${path}`, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `Log arm workout ${state.date}`,
        content: toBase64(`${JSON.stringify(data, null, 2)}\n`),
        branch: TARGET_BRANCH,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    state.lastSavedPath = path;
    save(`保存完了: ${path}`);
    button.textContent = "SAVED ✓";
  } catch (error) {
    console.error(error);
    save(`保存失敗: ${error.message}`);
    button.textContent = "RETRY SAVE";
  } finally {
    button.disabled = false;
  }
}

function downloadJson() {
  const data = `${JSON.stringify(workoutData(), null, 2)}\n`;
  const url = URL.createObjectURL(new Blob([data], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `arm-workout-${state.date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

dateInput.addEventListener("input", (event) => {
  state.date = event.target.value;
  state.lastSavedPath = "";
  save();
});

document.querySelector("#new-session").addEventListener("click", () => {
  state = initialState();
  save("新しいセッションを開始しました");
  document.querySelector("#save-github").textContent = "WORKOUT COMPLETE →";
  render();
});

document.querySelector("#save-token").addEventListener("click", () => {
  const token = tokenInput.value.trim();
  if (!token) {
    save("トークンを入力してください");
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  tokenInput.value = "";
  tokenInput.placeholder = "保存済み";
  settings.open = false;
  save("GitHubトークンをこの端末に保存しました");
});

document.querySelector("#clear-token").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  tokenInput.value = "";
  tokenInput.placeholder = "github_pat_...";
  save("GitHubトークンを削除しました");
});

document.querySelector("#save-github").addEventListener("click", saveToGitHub);

document.querySelector("#copy-json").addEventListener("click", async () => {
  await navigator.clipboard.writeText(JSON.stringify(workoutData(), null, 2));
  save("ChatGPT向けJSONをコピーしました");
});

document.querySelector("#download-json").addEventListener("click", downloadJson);

if (localStorage.getItem(TOKEN_KEY)) tokenInput.placeholder = "保存済み";
render();
