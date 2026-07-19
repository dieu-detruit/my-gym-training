const STORAGE_KEY = "my-gym-training-v2";

const exercises = [
  { id: "ez-bar-curl", name: "EZ BAR CURL", jp: "EZバーカール", target: "3 SETS", guide: "反動なし。下ろしを2〜3秒。", weight: 20, reps: 10 },
  { id: "overhead-extension", name: "OVERHEAD EXTENSION", jp: "ケーブル・オーバーヘッド", target: "3 SETS", guide: "ロープを斜め前上へ。肘は頭の横。", weight: 10, reps: 12 },
  { id: "hammer-curl", name: "HAMMER CURL", jp: "ハンマーカール", target: "3 SETS", guide: "親指を上。重量は片手分。", weight: 7, reps: 12 },
  { id: "rope-pushdown", name: "ROPE PUSHDOWN", jp: "ローププレスダウン", target: "3 SETS", guide: "肘を脇腹に固定。背中で押さない。", weight: 12.5, reps: 12 },
];

const today = () => new Date().toLocaleDateString("sv-SE");
const initialState = () => ({
  date: today(),
  endpoint: "",
  exercises: exercises.map((exercise) => ({
    ...exercise,
    sets: Array.from({ length: 3 }, () => ({
      weight: String(exercise.weight),
      reps: String(exercise.reps),
      note: "",
      completed: false,
      synced: false,
    })),
  })),
});

let state = load();
const list = document.querySelector("#exercise-list");
const dateInput = document.querySelector("#date");
const endpointInput = document.querySelector("#endpoint");
const status = document.querySelector("#status");

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

function renderMetrics() {
  const sets = state.exercises.flatMap((exercise) => exercise.sets);
  const done = sets.filter((set) => set.completed).length;
  const volume = state.exercises.reduce(
    (total, exercise) => total + exercise.sets.reduce(
      (exerciseTotal, set) => exerciseTotal + (set.completed ? Number(set.weight) * Number(set.reps) : 0),
      0,
    ),
    0,
  );
  document.querySelector("#progress-count").textContent = String(done);
  document.querySelector("#volume").textContent = `${Math.round(volume).toLocaleString()} kg`;
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
  endpointInput.value = state.endpoint;
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
  set.synced = false;
  save();
}

async function toggleComplete(exerciseIndex, setIndex) {
  const exercise = state.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  if (!set.weight || !set.reps) {
    save("重量と回数を入力してください");
    return;
  }

  set.completed = !set.completed;
  set.synced = false;
  save(set.completed ? `${exercise.jp} SET ${setIndex + 1} 完了` : "完了を取り消しました");
  render();

  if (set.completed && state.endpoint) {
    await syncSet(exerciseIndex, setIndex);
  }
}

async function syncSet(exerciseIndex, setIndex) {
  const exercise = state.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  const payload = {
    date: state.date,
    session: "Day A",
    exerciseId: exercise.id,
    exercise: exercise.jp,
    setNumber: setIndex + 1,
    weightKg: Number(set.weight),
    reps: Number(set.reps),
    note: set.note,
    recordedAt: new Date().toISOString(),
  };

  try {
    await fetch(state.endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    set.synced = true;
    save(`${exercise.jp} SET ${setIndex + 1} をGoogle Sheetsへ送信`);
  } catch {
    save("Google Sheetsへの送信に失敗しました");
  }
}

dateInput.addEventListener("input", (event) => {
  state.date = event.target.value;
  save();
});

endpointInput.addEventListener("input", (event) => {
  state.endpoint = event.target.value.trim();
  save(state.endpoint ? "Google Sheets接続URLを保存しました" : "接続URLを消去しました");
});

document.querySelector("#new-session").addEventListener("click", () => {
  const endpoint = state.endpoint;
  state = initialState();
  state.endpoint = endpoint;
  save("新しいセッションを開始しました");
  render();
});

document.querySelector("#copy-json").addEventListener("click", async () => {
  const data = {
    date: state.date,
    session: "Day A",
    exercises: state.exercises.map((exercise) => ({
      name: exercise.jp,
      sets: exercise.sets
        .map((set, index) => ({
          set: index + 1,
          weightKg: Number(set.weight),
          reps: Number(set.reps),
          note: set.note,
          completed: set.completed,
        }))
        .filter((set) => set.completed),
    })),
  };
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  save("ChatGPT向けJSONをコピーしました");
});

document.querySelector("#download-csv").addEventListener("click", () => {
  const rows = [["date", "session", "exercise", "set", "weight_kg", "reps", "note"]];
  state.exercises.forEach((exercise) => exercise.sets.forEach((set, index) => {
    if (set.completed) {
      rows.push([state.date, "Day A", exercise.jp, String(index + 1), set.weight, set.reps, set.note]);
    }
  }));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `arm-workout-${state.date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

render();
